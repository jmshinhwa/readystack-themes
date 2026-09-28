/* Bitnami Image Gate engine — one file for VS Code and the browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.BN_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.id] = r; });

  var IMAGE_CTX = /(\bimage:|^\s*FROM\s|docker\s+(?:run|pull)\b|--image[= ])/i;
  var REF = /(?:^|[\s"'=])((?:docker\.io\/)?bitnami\/[a-z0-9][a-z0-9._-]*)(?::([A-Za-z0-9][A-Za-z0-9._-]*))?(@sha256:[a-f0-9]{8,})?/;
  var LEGACY = /((?:docker\.io\/)?bitnamilegacy\/[a-z0-9][a-z0-9._-]*(?::[A-Za-z0-9._-]+)?)/;
  var HELM_REPO = /^\s*repository:\s*["']?((?:docker\.io\/)?bitnami\/[a-z0-9][a-z0-9._-]*)["']?\s*(#.*)?$/;
  var HELM_TAG = /^\s*tag:\s*["']?([^"'\s#]+)/;
  var INSECURE = /allowInsecureImages:\s*["']?true/i;
  var CHART_SRC = /(charts\.bitnami\.com\/bitnami|oci:\/\/registry-1\.docker\.io\/bitnamicharts)/;

  function sevFor(id, today) {
    var r = BY[id];
    if (r.cutoff && today && today < r.cutoff) return 'warning';
    return r.sev;
  }
  function add(out, id, line, subject, today) {
    var r = BY[id];
    var s = sevFor(id, today);
    var when = (r.cutoff && today && today < r.cutoff) ? ' (breaks on ' + r.cutoff + ')' : '';
    out.push({ check: id, sev: s, line: line, subject: subject,
      msg: r.title + when + ': ' + subject + '. ' + r.why + ' Fix: ' + r.fix, fix: r.fix });
  }

  function check(text, opts) {
    opts = opts || {};
    var today = String(opts.today || new Date().toISOString()).slice(0, 10);
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (/^\s*#/.test(raw)) continue;
      var ln = i + 1, m;
      if ((m = LEGACY.exec(raw))) { add(out, 'BN02', ln, m[1], today); continue; }
      if (INSECURE.test(raw)) { add(out, 'BN05', ln, raw.trim(), today); continue; }
      if ((m = CHART_SRC.exec(raw))) { add(out, 'BN07', ln, m[1], today); continue; }
      if ((m = HELM_REPO.exec(raw))) {
        for (var j = i + 1; j < Math.min(lines.length, i + 6); j++) {
          var t = HELM_TAG.exec(lines[j]);
          if (t) {
            if (t[1] !== 'latest') add(out, 'BN03', ln, m[1] + ' tag ' + t[1], today);
            break;
          }
        }
        continue;
      }
      if (IMAGE_CTX.test(raw) && (m = REF.exec(raw))) {
        var name = m[1], tag = m[2], digest = m[3];
        if (digest) add(out, 'BN06', ln, name + digest.slice(0, 19) + '…', today);
        else if (!tag || tag === 'latest') add(out, 'BN04', ln, name + ':' + (tag || 'latest'), today);
        else add(out, 'BN01', ln, name + ':' + tag, today);
      }
    }
    return { findings: out };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof window !== 'undefined') window.BNENGINE = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
