/* EUDI Wallet Request Lint — one brain, used by the extension, the report and the web page. */
(function () {
  'use strict';

  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.EUDI_RULES;

  var CLIENT_ID_PREFIXES = [
    'x509_san_dns:', 'x509_san_uri:', 'x509_hash:',
    'decentralized_identifier:', 'verifier_attestation:', 'openid_federation:'
  ];
  var KNOWN_TYPES = [
    'urn:eudi:pid:1', 'eu.europa.ec.eudi.pid.1',
    'urn:eudi:mdl:1', 'org.iso.18013.5.1.mDL',
    'urn:eudi:ehic:1', 'urn:eudi:pda1:1'
  ];
  var AGE_CLAIMS = ['birth_date', 'birthdate', 'age_birth_year', 'age_in_years', 'birth_year'];
  var DATE_KEYS = ['registration_valid_until', 'valid_until', 'certificate_valid_until', 'registration_expires'];

  function lineOf(lines, needle) {
    for (var i = 0; i < lines.length; i++) { if (lines[i].indexOf(needle) !== -1) return i + 1; }
    return 1;
  }
  function flat(text) { return String(text).replace(/\s+/g, ' '); }
  function daysBetween(a, b) {
    return Math.round((Date.parse(b + 'T00:00:00Z') - Date.parse(a + 'T00:00:00Z')) / 86400000);
  }
  function isDate(s) { return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s); }

  function walk(node, visit, path) {
    path = path || [];
    if (node === null || typeof node !== 'object') return;
    if (Object.prototype.toString.call(node) === '[object Array]') {
      for (var i = 0; i < node.length; i++) walk(node[i], visit, path.concat(String(i)));
      return;
    }
    for (var k in node) {
      if (!Object.prototype.hasOwnProperty.call(node, k)) continue;
      visit(k, node[k], path.concat(k), node);
      walk(node[k], visit, path.concat(k));
    }
  }

  function credentialQueries(doc) {
    var out = [];
    var q = doc && doc.dcql_query;
    if (q && Object.prototype.toString.call(q.credentials) === '[object Array]') {
      for (var i = 0; i < q.credentials.length; i++) {
        var c = q.credentials[i] || {};
        var meta = c.meta || {};
        var types = [].concat(meta.vct_values || [], meta.doctype_value ? [meta.doctype_value] : [],
                              meta.doctype_values || []);
        out.push({ id: c.id || ('credential ' + (i + 1)), purpose: c.purpose, claims: c.claims, types: types });
      }
    }
    var pd = doc && doc.presentation_definition;
    if (pd && Object.prototype.toString.call(pd.input_descriptors) === '[object Array]') {
      for (var j = 0; j < pd.input_descriptors.length; j++) {
        var d = pd.input_descriptors[j] || {};
        var fields = (d.constraints && d.constraints.fields) || null;
        out.push({ id: d.id || ('descriptor ' + (j + 1)), purpose: d.purpose, claims: fields, types: d.doctype ? [d.doctype] : [] });
      }
    }
    return out;
  }

  function claimNames(claims) {
    var names = [];
    if (Object.prototype.toString.call(claims) !== '[object Array]') return names;
    for (var i = 0; i < claims.length; i++) {
      var c = claims[i] || {};
      var p = c.path || c.claim_name || c.id;
      if (Object.prototype.toString.call(p) === '[object Array]') names.push(p.join('.'));
      else if (typeof p === 'string') names.push(p);
      if (Object.prototype.toString.call(c.path) === '[object Array]') {
        for (var k = 0; k < c.path.length; k++) if (typeof c.path[k] === 'string') names.push(c.path[k]);
      }
    }
    return names;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = isDate(opts.today) ? opts.today : '';
    var src = String(text == null ? '' : text);
    var lines = src.split(/\r?\n/);
    var one = flat(src);
    var findings = [];
    function add(id, msg, line) { findings.push({ check: id, sev: sevOf(id), msg: msg, line: line || 1 }); }

    var doc = null;
    try { doc = JSON.parse(src); } catch (e) { doc = null; }
    if (!doc || typeof doc !== 'object') {
      return { findings: findings, parsed: false, ruleCount: RULES.length };
    }

    /* 1 — registered relying-party identifier */
    if (typeof doc.client_id === 'string') {
      var ok = false;
      for (var p = 0; p < CLIENT_ID_PREFIXES.length; p++) {
        if (doc.client_id.indexOf(CLIENT_ID_PREFIXES[p]) === 0) ok = true;
      }
      if (!ok) {
        add('client_id_unregistered',
          'client_id "' + doc.client_id + '" has no registered identifier prefix (expected one of ' +
          CLIENT_ID_PREFIXES.join(', ') + ')', lineOf(lines, '"client_id"'));
      }
    } else {
      add('client_id_unregistered', 'No client_id in the request, so the wallet cannot resolve a relying party', 1);
    }

    var queries = credentialQueries(doc);

    for (var i = 0; i < queries.length; i++) {
      var q = queries[i];
      var anchor = lineOf(lines, '"' + q.id + '"');

      /* 2 — purpose per credential query */
      if (typeof q.purpose !== 'string' || q.purpose.replace(/\s+/g, '') === '') {
        add('purpose_absent', 'Credential query "' + q.id + '" states no purpose for the attributes it asks for', anchor);
      }

      /* 3 — whole credential asked */
      var hasClaims = Object.prototype.toString.call(q.claims) === '[object Array]' && q.claims.length > 0;
      if (!hasClaims) {
        add('whole_credential_asked', 'Credential query "' + q.id + '" names no claims, so it releases every attribute in the credential', anchor);
      }

      /* 4 — date of birth where an age flag exists */
      var names = claimNames(q.claims);
      var wantsDob = null, hasAgeFlag = false;
      for (var n = 0; n < names.length; n++) {
        for (var a = 0; a < AGE_CLAIMS.length; a++) if (names[n] === AGE_CLAIMS[a]) wantsDob = names[n];
        if (names[n].indexOf('age_equal_or_over') === 0 || names[n].indexOf('age_over') === 0) hasAgeFlag = true;
      }
      if (wantsDob && !hasAgeFlag) {
        add('birth_date_over_age_flag', 'Credential query "' + q.id + '" asks for ' + wantsDob +
          ' — the PID carries age_equal_or_over flags for an age check', anchor);
      }

      /* 9 — credential type known to the wallet */
      for (var t = 0; t < q.types.length; t++) {
        var known = false;
        for (var kt = 0; kt < KNOWN_TYPES.length; kt++) if (q.types[t] === KNOWN_TYPES[kt]) known = true;
        if (!known) {
          add('unknown_credential_type', 'Credential type "' + q.types[t] + '" is not an EUDI-recognised PID or attestation identifier',
            lineOf(lines, q.types[t]));
        }
      }
    }
    if (queries.length === 0) {
      add('whole_credential_asked', 'No dcql_query or presentation_definition, so there is no bounded attribute request to check', 1);
    }

    /* 5 — encrypted response */
    if (doc.response_mode === 'direct_post') {
      add('response_unencrypted', 'response_mode is direct_post — the vp_token is posted unencrypted; use direct_post.jwt',
        lineOf(lines, '"response_mode"'));
    }

    /* 6 — nonce */
    if (typeof doc.nonce !== 'string' || doc.nonce.length < 8) {
      add('nonce_absent', 'No nonce of at least 8 characters, so the presentation is not bound to this request', 1);
    }

    /* 7 — signed or fetched request */
    if (!doc.request_uri && !doc.request && !(doc.client_metadata && doc.client_metadata.jwks_uri)) {
      add('request_unsigned', 'Neither request_uri, a signed request object nor a jwks_uri — nothing ties this request to your certificate', 1);
    }

    /* 8 — registration window, read against today */
    walk(doc, function (key, value) {
      for (var d = 0; d < DATE_KEYS.length; d++) {
        if (key === DATE_KEYS[d] && isDate(value)) {
          if (today && daysBetween(today, value) < 0) {
            add('registration_expired', key + ' is ' + value + ', ' + Math.abs(daysBetween(today, value)) +
              ' days before ' + today + ' — the register no longer backs this request', lineOf(lines, '"' + key + '"'));
          }
        }
      }
    });

    return { findings: findings, parsed: true, ruleCount: RULES.length };
  }

  function sevOf(id) {
    for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i].sev;
    return 'warn';
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = API;
  if (typeof window !== 'undefined') window.EUDIENGINE = API;
})();
