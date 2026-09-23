/* VVT-Prüfer — Art. 30 DSGVO
 * Prüft ein als Markdown geführtes Verzeichnis von Verarbeitungstätigkeiten.
 * Dieselbe Datei läuft in VS Code (require) und im Browser (window.VVT_RULES).
 */
var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined')
  ? require('./rules.json')
  : (typeof window !== 'undefined' ? window.VVT_RULES : []);

function rx(src, flags) { return new RegExp(src, flags || 'i'); }

/* Zeilen werden entschärft: Tabs, geschützte Leerzeichen und Mehrfachabstände
   werden zu einem Leerzeichen, damit weich umbrochene Dateien keine Fehlfunde erzeugen. */
function normLines(text) {
  return String(text == null ? '' : text)
    .replace(/ /g, ' ')
    .split(/\r?\n/)
    .map(function (l) { return l.replace(/\t/g, ' ').replace(/\s{2,}/g, ' ').trim(); });
}

function parseISO(s) {
  var m = /^\s*(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
  if (!m) return null;
  var d = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return isFinite(d) ? d : null;
}

function byId(id) {
  for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i];
  return null;
}

function check(text, opts) {
  opts = opts || {};
  var lines = normLines(text);
  var findings = [];

  /* ① Abschnitte: jede Verarbeitungstätigkeit ist eine "## "-Überschrift */
  var starts = [];
  for (var i = 0; i < lines.length; i++) if (/^##\s+\S/.test(lines[i])) starts.push(i);
  var head = lines.slice(0, starts.length ? starts[0] : lines.length);

  /* ② Stand-Datum: Alter in Tagen gegenüber opts.today */
  var standRule = byId('vvt_stand_veraltet');
  var today = parseISO(opts.today) ;
  if (today === null) today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  var standLine = -1, standAge = null;
  if (standRule) {
    var sre = rx(standRule.re);
    for (var h = 0; h < head.length; h++) {
      var sm = sre.exec(head[h]);
      if (sm) { standLine = h; standAge = Math.round((today - parseISO(sm[1] + '-' + sm[2] + '-' + sm[3])) / 86400000); break; }
    }
  }
  /* Das Alter des Verzeichnisses hängt an jedem Fund — es ist die Frist, die alle
     anderen Mängel teuer macht (Art. 30 Abs. 1 DSGVO: das Verzeichnis ist fortzuschreiben). */
  var tail = standAge === null ? ' · VVT-Stand: unbekannt' : ' · VVT-Stand: ' + standAge + ' Tage alt';
  function add(rule, line, msg) {
    findings.push({ check: rule.id, sev: rule.sev || 'error', msg: (msg || rule.msg) + tail, line: line + 1 });
  }

  /* ③ Kopfangaben (Art. 30 Abs. 1 lit. a) */
  for (var r = 0; r < RULES.length; r++) {
    var rule = RULES[r];
    if (rule.kind !== 'doc_require') continue;
    var re = rx(rule.re), hit = false;
    for (var k = 0; k < head.length; k++) if (re.test(head[k])) { hit = true; break; }
    if (!hit) add(rule, 0);
  }
  if (standRule) {
    if (standLine < 0) add(standRule, 0, standRule.msg_missing);
    else if (standAge > (standRule.max_days || 365)) add(standRule, standLine);
  }

  /* ④ Je Verarbeitungstätigkeit */
  for (var s = 0; s < starts.length; s++) {
    var from = starts[s], to = (s + 1 < starts.length) ? starts[s + 1] : lines.length;
    var block = lines.slice(from, to);
    for (var q = 0; q < RULES.length; q++) {
      var ru = RULES[q];
      if (ru.kind === 'act_require') {
        var are = rx(ru.re), found = false;
        for (var a = 0; a < block.length; a++) if (are.test(block[a])) { found = true; break; }
        if (!found) add(ru, from);
      } else if (ru.kind === 'act_guard') {
        var fre = rx(ru.field_re), nre = rx(ru.none_re), need = rx(ru.need_re);
        for (var b = 0; b < block.length; b++) {
          var fm = fre.exec(block[b]);
          if (!fm) continue;
          var val = String(fm[1] || '').trim();
          if (!val || nre.test(val)) break;
          if (!need.test(val) && !need.test(block.join(' '))) add(ru, from + b);
          break;
        }
      } else if (ru.kind === 'act_value_bad') {
        var vre = rx(ru.field_re), bad = rx(ru.bad_re);
        for (var c = 0; c < block.length; c++) {
          var vm = vre.exec(block[c]);
          if (!vm) continue;
          if (bad.test(String(vm[1] || '').trim())) add(ru, from + c);
          break;
        }
      } else if (ru.kind === 'act_forbid') {
        var pre = rx(ru.re);
        for (var d = 0; d < block.length; d++) if (pre.test(block[d])) add(ru, from + d);
      }
    }
  }

  findings.sort(function (x, y) { return x.line - y.line; });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.VVTENGINE = API;
