/* Conda channel licence engine: environment.yml and .condarc, node + browser. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.CONDA_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  function clean(v) {
    v = String(v).replace(/\s+#.*$/, '').trim();
    return v.replace(/^['"]|['"]$/g, '').trim();
  }

  // Which Anaconda-repository rule a channel value trips, or null.
  function paidRule(ch) {
    var c = ch.toLowerCase().replace(/\/+$/, '');
    if (c === 'defaults') return 'defaults-channel';
    if (c === 'anaconda' || /(^|\/\/)(conda\.)?anaconda\.org\/anaconda$/.test(c)) return 'anaconda-channel';
    if (/repo\.anaconda\.com/.test(c)) return 'repo-anaconda-url';
    if (/^pkgs\/(main|r|msys2|free|pro)$/.test(c)) return 'pkgs-channel-name';
    return null;
  }

  function finding(id, line, detail) {
    var r = BY_ID[id];
    return { check: id, sev: r.sev, line: line, msg: r.title + ': ' + detail + ' — ' + r.why + ' Fix: ' + r.fix + '.' };
  }

  function validDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || ''));
    return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
  }

  function check(text, opts) {
    opts = opts || {};
    var today = validDay(opts.today) || new Date().toISOString().slice(0, 10);
    var lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var findings = [];
    var key = null, channelsLine = 0, hasDeps = false, nodefaults = false, forge = false, paidLine = 0;

    function channelValue(v, n, inDefaultChannels) {
      if (!v) return;
      var lc = v.toLowerCase();
      if (lc === 'nodefaults') { nodefaults = true; return; }
      if (lc === 'conda-forge' || /anaconda\.org\/conda-forge/.test(lc)) forge = true;
      var id = paidRule(v);
      if (!id) return;
      if (!paidLine) paidLine = n;
      if (inDefaultChannels) findings.push(finding('condarc-default-channels', n, '"' + v + '" under default_channels'));
      else findings.push(finding(id, n, '"' + v + '" in channels'));
    }

    lines.forEach(function (raw, i) {
      var n = i + 1;
      if (/^\s*(#|$)/.test(raw)) return;
      var top = /^([A-Za-z_][\w-]*)\s*:\s*(.*)$/.exec(raw);
      if (top) {
        key = top[1];
        var rest = clean(top[2]);
        if (key === 'channels') channelsLine = n;
        if (key === 'dependencies') hasDeps = true;
        var inline = /^\[(.*)\]$/.exec(rest);
        if (inline && (key === 'channels' || key === 'default_channels')) {
          inline[1].split(',').forEach(function (v) { channelValue(clean(v), n, key === 'default_channels'); });
        }
        return;
      }
      var item = /^(\s*)-\s*(.+)$/.exec(raw);
      if (!item) return;
      var v = clean(item[2]);
      if (key === 'channels') channelValue(v, n, false);
      else if (key === 'default_channels') channelValue(v, n, true);
      else if (key === 'dependencies') {
        var pin = /^([^\s:=<>!]+)::(\S+)/.exec(v);
        if (pin && paidRule(pin[1])) {
          if (!paidLine) paidLine = n;
          findings.push(finding('channel-pinned-dependency', n, '"' + v + '" is fetched from ' + pin[1]));
        }
      }
    });

    if (channelsLine && hasDeps && !nodefaults && !paidLine) {
      findings.push(finding('implicit-defaults', channelsLine, 'channels list has no nodefaults (checked ' + today + ')'));
    }
    if (forge && paidLine) {
      findings.push(finding('mixed-with-conda-forge', paidLine, 'conda-forge is listed but an Anaconda channel is still in use'));
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.CONDAENGINE = api;
})();
