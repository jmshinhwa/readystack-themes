/* kaigo-unei-kitei-check-2026 — 運営規程 checker. Same file runs in node (VS Code) and in the browser. */
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.KUK_RULES;

  function norm(s) {
    return String(s || '')
      .replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[Ａ-Ｚａ-ｚ]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0xFEE0); })
      .replace(/[一壱]割/g, '1割').replace(/[二弐]割/g, '2割').replace(/三割/g, '3割');
  }
  function flat(s) { return s.replace(/\s+/g, ''); }

  function parseDay(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!m) return null;
    var d = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(d) ? null : d;
  }
  var DAY = 86400000;
  function iso(d) { return new Date(d).toISOString().slice(0, 10); }

  function tail(kind, today) {
    var t = parseDay(today);
    if (t === null) return '';
    var ref = { abuse: '2024-04-01', r6: '2024-04-01', bcp: '2025-04-01', web: '2025-04-01' }[kind];
    if (!ref) return '';
    var r = parseDay(ref), n = Math.round((t - r) / DAY), label = iso(t);
    var what = { abuse: '虐待防止措置の経過措置終了(2024-03-31)', r6: '令和6年度改定の施行(2024-04-01)', bcp: '業務継続計画の減算経過措置終了(2025-03-31)', web: 'ウェブサイト掲載の経過措置終了(2025-03-31)' }[kind];
    return n >= 0 ? ' ' + label + ' 時点で ' + what + ' から ' + n + ' 日経過。' : ' ' + label + ' 時点で ' + what + ' まで残り ' + (-n) + ' 日。';
  }

  // Latest 施行日 in the 附則 (令和N年M月D日 / YYYY年M月D日 / YYYY-MM-DD on a line mentioning 施行).
  function latestEnforced(lines) {
    var best = null, bestLine = 0;
    lines.forEach(function (ln, i) {
      if (!/施行/.test(ln)) return;
      var re = /(令和|平成)?\s*(元|\d{1,4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日|(\d{4})-(\d{2})-(\d{2})/g, m;
      while ((m = re.exec(ln))) {
        var y, mo, d;
        if (m[5]) { y = +m[5]; mo = +m[6]; d = +m[7]; }
        else {
          var n = m[2] === '元' ? 1 : +m[2];
          y = m[1] === '令和' ? 2018 + n : m[1] === '平成' ? 1988 + n : n;
          mo = +m[3]; d = +m[4];
        }
        if (y < 1989 || y > 2100) continue;
        var t = Date.UTC(y, mo - 1, d);
        if (best === null || t > best) { best = t; bestLine = i + 1; }
      }
    });
    return best === null ? null : { day: best, line: bestLine };
  }

  function check(text, opts) {
    opts = opts || {};
    var src = norm(text), lines = src.split(/\r?\n/), doc = flat(src), findings = [];
    RULES.forEach(function (r) {
      if (r.when && !new RegExp(r.when, 'i').test(doc)) return;
      var add = function (line, extra) {
        findings.push({ check: r.id, sev: r.sev, line: line, msg: r.msg + (extra || '') + ' 根拠: ' + r.law + ' → ' + r.fix });
      };
      if (r.kind === 'absent') {
        var ok = r.need.every(function (p) { return new RegExp(p, 'i').test(doc); });
        if (!ok) add(1, r.tail ? tail(r.tail, opts.today) : '');
      } else if (r.kind === 'present') {
        if (r.unlessDoc && new RegExp(r.unlessDoc, 'i').test(doc)) return;
        var re = new RegExp(r.pattern);
        lines.forEach(function (ln, i) { if (re.test(ln)) add(i + 1, ''); });
      } else if (r.kind === 'revision') {
        var last = latestEnforced(lines), cut = parseDay(r.cutoff);
        if (last && last.day < cut) add(last.line, ' 最新の施行日 ' + iso(last.day) + '。' + tail(r.tail, opts.today));
      }
    });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.KUKENGINE = API;
})();
