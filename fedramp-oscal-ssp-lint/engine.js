// FedRAMP OSCAL SSP Lint — one engine, two homes (VS Code extension host + the free web page).
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OSCALSSP_RULES;

var UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var DT_TZ_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
var DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;
var CONTROL_RE = /^[a-z]{2}-\d{1,2}(\.\d{1,2})?$/;
var FIPS = ['fips-199-low', 'fips-199-moderate', 'fips-199-high'];
var STATUS = ['implemented', 'partial', 'planned', 'alternative', 'not-applicable'];
var PLACEHOLDER = /(\bTBD\b|\bTODO\b|Lorem ipsum|\bXXX\b|<insert|FILL ME)/i;
var REQUIRED = ['metadata', 'import-profile', 'system-characteristics', 'system-implementation', 'control-implementation'];
var META_FIELDS = ['title', 'last-modified', 'version', 'oscal-version'];
var STAMPS = ['last-modified', 'published'];
var PROSE = ['description', 'remarks'];

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) { BY_ID[RULES[i].id] = RULES[i]; }

function lineOf(text, needle) {
  if (!needle) { return 1; }
  var at = text.indexOf(needle);
  if (at < 0) { return 1; }
  return text.slice(0, at).split('\n').length;
}

function days(fromISO, toISO) {
  var a = DATE_RE.exec(fromISO), b = DATE_RE.exec(toISO);
  if (!a || !b) { return null; }
  var ms = Date.UTC(+b[1], +b[2] - 1, +b[3]) - Date.UTC(+a[1], +a[2] - 1, +a[3]);
  return Math.round(ms / 86400000);
}

function walk(node, path, fn) {
  fn(node, path);
  if (Array.isArray(node)) {
    for (var i = 0; i < node.length; i++) { walk(node[i], path + '[' + i + ']', fn); }
  } else if (node && typeof node === 'object') {
    var keys = Object.keys(node);
    for (var k = 0; k < keys.length; k++) { walk(node[keys[k]], path + '.' + keys[k], fn); }
  }
}

function propOf(obj, name) {
  if (!obj || !Array.isArray(obj.props)) { return null; }
  for (var i = 0; i < obj.props.length; i++) {
    if (obj.props[i] && obj.props[i].name === name) { return obj.props[i]; }
  }
  return null;
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || '1970-01-01';
  var findings = [];
  var seen = {};
  function add(id, detail, needle) {
    var rule = BY_ID[id] || { sev: 'med', msg: id, fix: '' };
    var key = id + '|' + detail;
    if (seen[key]) { return; }
    seen[key] = 1;
    findings.push({
      check: id,
      sev: rule.sev,
      msg: rule.msg + (detail ? ' — ' + detail : '') + ' · ' + rule.fix,
      line: lineOf(text, needle)
    });
  }

  var doc;
  try { doc = JSON.parse(text); } catch (e) {
    add('json_parse', String(e.message).slice(0, 80), null);
    return { findings: findings };
  }
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) {
    add('root_key', 'the document is not a JSON object', null);
    return { findings: findings };
  }

  var ssp = doc['system-security-plan'];
  if (!ssp) {
    var rootKeys = Object.keys(doc).slice(0, 3).join(', ');
    add('root_key', 'found ' + (rootKeys || 'nothing') + ' instead', null);
    return { findings: findings };
  }

  // required assemblies
  for (var r = 0; r < REQUIRED.length; r++) {
    if (!ssp[REQUIRED[r]]) { add('required_assembly', REQUIRED[r], '"system-security-plan"'); }
  }

  // metadata
  var meta = ssp.metadata || {};
  for (var m = 0; m < META_FIELDS.length; m++) {
    if (!meta[META_FIELDS[m]]) { add('metadata_field', META_FIELDS[m], '"metadata"'); }
  }
  if (typeof meta['oscal-version'] === 'string' && /^1\.0(\.|$)/.test(meta['oscal-version'])) {
    add('oscal_version_old', meta['oscal-version'], '"oscal-version"');
  }
  if (typeof meta['last-modified'] === 'string' && DT_TZ_RE.test(meta['last-modified'])) {
    var age = days(meta['last-modified'], today);
    if (age !== null && age > 365) {
      add('conmon_stale', age + ' days since ' + meta['last-modified'].slice(0, 10), meta['last-modified']);
    }
  }

  // one pass over the tree: timestamps, uuids, prose, uuid index
  var defined = {}, refs = [];
  walk(ssp, 'system-security-plan', function (node, path) {
    if (node && typeof node === 'object' && !Array.isArray(node)) {
      var keys = Object.keys(node);
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i], v = node[k];
        if (typeof v === 'string') {
          if (STAMPS.indexOf(k) >= 0 && !DT_TZ_RE.test(v)) { add('dt_no_timezone', k + ' = ' + v, v); }
          if (k === 'uuid') {
            if (UUID_RE.test(v)) { defined[v.toLowerCase()] = 1; } else { add('uuid_shape', path + '.uuid = ' + v, v); }
          }
          if (/-uuid$/.test(k)) {
            if (!UUID_RE.test(v)) { add('uuid_shape', path + '.' + k + ' = ' + v, v); }
            else { refs.push([v.toLowerCase(), path + '.' + k]); }
          }
          if (PROSE.indexOf(k) >= 0 && PLACEHOLDER.test(v)) {
            add('placeholder_text', path + '.' + k + ': "' + v.slice(0, 40) + '"', v.slice(0, 40));
          }
        }
        if (k === 'party-uuids' && Array.isArray(v)) {
          for (var p = 0; p < v.length; p++) {
            if (typeof v[p] !== 'string' || !UUID_RE.test(v[p])) { add('uuid_shape', path + '.party-uuids = ' + v[p], String(v[p])); }
            else { refs.push([v[p].toLowerCase(), path + '.party-uuids']); }
          }
        }
      }
    }
  });
  for (var x = 0; x < refs.length; x++) {
    if (!defined[refs[x][0]]) { add('dangling_uuid', refs[x][1] + ' = ' + refs[x][0], refs[x][0]); }
  }

  // system characteristics
  var sc = ssp['system-characteristics'] || {};
  if (sc['security-sensitivity-level'] !== undefined && FIPS.indexOf(sc['security-sensitivity-level']) < 0) {
    add('sensitivity_level', String(sc['security-sensitivity-level']), String(sc['security-sensitivity-level']));
  }
  var sil = sc['security-impact-level'];
  var objectives = ['security-objective-confidentiality', 'security-objective-integrity', 'security-objective-availability'];
  if (sc['security-impact-level'] !== undefined || sc['security-sensitivity-level'] !== undefined) {
    for (var o = 0; o < objectives.length; o++) {
      var val = sil ? sil[objectives[o]] : undefined;
      if (val === undefined) { add('impact_objective', objectives[o] + ' is missing', '"security-impact-level"'); }
      else if (FIPS.indexOf(val) < 0) { add('impact_objective', objectives[o] + ' = ' + val, String(val)); }
    }
  }

  // implemented requirements
  var ci = ssp['control-implementation'] || {};
  var irs = Array.isArray(ci['implemented-requirements']) ? ci['implemented-requirements'] : [];
  for (var q = 0; q < irs.length; q++) {
    var ir = irs[q] || {};
    var cid = ir['control-id'];
    if (typeof cid === 'string' && !CONTROL_RE.test(cid)) { add('control_id_case', cid, cid); }
    var st = propOf(ir, 'implementation-status');
    var label = typeof cid === 'string' ? cid : 'implemented-requirement[' + q + ']';
    if (!st || typeof st.value !== 'string' || STATUS.indexOf(st.value) < 0) {
      add('impl_status', label + (st && st.value ? ' has value ' + st.value : ' has none'), cid);
    } else if (st.value === 'planned') {
      var pcd = propOf(ir, 'planned-completion-date');
      if (!pcd || typeof pcd.value !== 'string' || !DATE_RE.test(pcd.value)) {
        add('planned_no_date', label, cid);
      } else if (days(pcd.value, today) > 0) {
        add('planned_overdue', label + ' was due ' + pcd.value.slice(0, 10) + ' (' + days(pcd.value, today) + ' days ago)', pcd.value);
      }
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.OSCALSSPENGINE = API; }
