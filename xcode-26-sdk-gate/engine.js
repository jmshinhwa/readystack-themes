/* Xcode 26 SDK Gate — engine shared by the VS Code extension and the free web page. */
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.XCG_RULES;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  // GitHub-hosted macOS images (actions/runner-images, macos-14 20260629, macos-15 20260824/20260907, macos-26 20260824)
  var IMAGES = {
    '14': { name: 'macos-14', def: '15.4', xcodes: ['15.0.1', '15.1', '15.2', '15.3', '15.4', '16.1', '16.2'] },
    '15': { name: 'macos-15', def: '16.4', xcodes: ['16.0', '16.1', '16.2', '16.3', '16.4', '26.0.1', '26.1.1', '26.2', '26.3'] },
    '26': { name: 'macos-26', def: '26.6', xcodes: ['26.0.1', '26.1.1', '26.2', '26.3', '26.4.1', '26.5', '26.6'] }
  };
  IMAGES.latest = { name: 'macos-latest (macos-26)', def: '26.6', xcodes: IMAGES['26'].xcodes };

  var SHIPS = /xcodebuild|fastlane|\bgym\b|build_app|upload_to_testflight|upload_to_app_store|\bpilot\b|altool|flutter\s+build\s+(ipa|ios)|exportArchive|\.ipa\b|testflight/i;
  var LABEL = /\bmacos-(\d+|latest)(?:-(?:large|xlarge|intel|arm64))?\b/ig;
  var SEL = [
    /xcode-version:\s*['"]?([0-9][\w.]*|latest-stable|latest)['"]?/i,
    /xcode-select\s+(?:-s|--switch)\s+['"]?\/Applications\/Xcode(?:[_-]([0-9][0-9.]*))?(?:[_-]beta)?\.app/i,
    /DEVELOPER_DIR\s*[:=]\s*['"]?\/Applications\/Xcode(?:[_-]([0-9][0-9.]*))?(?:[_-]beta)?\.app/i
  ];

  function indentOf(s) { return s.match(/^\s*/)[0].length; }
  function major(v) { return parseInt(String(v).split('.')[0], 10); }
  function installed(img, v) {
    return img.xcodes.some(function (x) { return x === v || x.indexOf(v + '.') === 0; });
  }
  function newest(img) { return img.xcodes[img.xcodes.length - 1]; }

  function findSelection(lines, from, to) {
    for (var i = from; i < to; i++) {
      if (/^\s*#/.test(lines[i])) continue;
      for (var k = 0; k < SEL.length; k++) {
        var m = lines[i].match(SEL[k]);
        if (m) return { version: m[1] || '', line: i + 1, text: lines[i].trim() };
      }
    }
    return null;
  }

  function splitJobs(lines) {
    var j = -1, i;
    for (i = 0; i < lines.length; i++) if (/^jobs:\s*$/.test(lines[i])) { j = i; break; }
    if (j < 0) return { head: [0, 0], jobs: [{ name: '(file)', start: 0, end: lines.length }] };
    var ind = -1, jobs = [];
    for (i = j + 1; i < lines.length; i++) {
      var s = lines[i];
      if (!s.trim() || /^\s*#/.test(s)) continue;
      var d = indentOf(s);
      if (ind < 0) ind = d;
      if (d < ind) break;
      var m = d === ind && s.match(/^\s*([A-Za-z0-9_.-]+):\s*$/);
      if (m) {
        if (jobs.length) jobs[jobs.length - 1].end = i;
        jobs.push({ name: m[1], start: i, end: lines.length });
      }
    }
    if (jobs.length) jobs[jobs.length - 1].end = i;
    return { head: [0, j], jobs: jobs };
  }

  function check(text, opts) {
    opts = opts || {};
    var lines = String(text || '').split(/\r?\n/);
    var findings = [], map = [];
    function add(id, line, extra) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, line: line, msg: r.title + (extra ? ' — ' + extra : '') + (r.fix ? ' · Fix: ' + r.fix : ''), fix: r.fix, source: r.source });
    }
    var parts = splitJobs(lines);
    var globalSel = findSelection(lines, parts.head[0], parts.head[1]);

    parts.jobs.forEach(function (job) {
      var body = lines.slice(job.start, job.end);
      var code = body.filter(function (l) { return !/^\s*#/.test(l); }).join('\n');
      if (!SHIPS.test(code)) return;
      var labels = [], selfHosted = 0;
      for (var i = job.start; i < job.end; i++) {
        var l = lines[i];
        if (/^\s*#/.test(l)) continue;
        if (/runs-on:/.test(l) && /self-hosted/i.test(l) && /mac/i.test(l)) selfHosted = i + 1;
        var m; LABEL.lastIndex = 0;
        while ((m = LABEL.exec(l))) labels.push({ key: m[1].toLowerCase(), label: m[0], line: i + 1 });
      }
      var sel = findSelection(lines, job.start, job.end) || globalSel;
      if (sel && sel.version && !/^latest/i.test(sel.version) && major(sel.version) < 26) {
        add('xcode-pin-below-26', sel.line, 'job "' + job.name + '" selects Xcode ' + sel.version);
      }
      if (selfHosted && !sel) add('self-hosted-unpinned', selfHosted, 'job "' + job.name + '"');
      if (selfHosted && !labels.length) map.push({ job: job.name, line: selfHosted, runner: 'self-hosted', xcode: sel && sel.version ? sel.version : 'unknown', via: sel ? 'pin' : 'machine default', ok: sel && sel.version ? major(sel.version) >= 26 : null });

      labels.forEach(function (lb) {
        var n = parseInt(lb.key, 10);
        if (lb.key !== 'latest' && n <= 13) { add('runner-removed', lb.line, lb.label + ' in job "' + job.name + '"'); return; }
        var img = IMAGES[lb.key];
        if (!img) return;
        var xc = img.def, via = 'image default';
        if (sel) {
          if (!sel.version) { via = 'Xcode.app = image default'; }
          else if (/^latest/i.test(sel.version)) { xc = newest(img); via = 'setup-xcode ' + sel.version; }
          else if (!installed(img, sel.version)) {
            add('xcode-not-on-image', sel.line, 'Xcode ' + sel.version + ' on ' + img.name + ' (has ' + img.xcodes.join(', ') + ')');
            xc = sel.version + ' (missing)'; via = 'pin';
          } else { xc = sel.version; via = 'pin'; }
        }
        if (lb.key === '14') add('runner-macos-14', lb.line, 'job "' + job.name + '" builds with Xcode ' + xc);
        else if (lb.key === '15' && !sel) add('macos-15-default-xcode', lb.line, 'job "' + job.name + '"');
        else if (lb.key === 'latest') add('macos-latest-floating', lb.line, 'job "' + job.name + '"');
        var ok = major(xc) >= 26 && !/missing/.test(xc);
        map.push({ job: job.name, line: lb.line, runner: lb.label, xcode: xc, via: via, ok: ok });
      });
    });

    lines.forEach(function (l, i) {
      if (/^\s*#/.test(l)) return;
      var m = l.match(/IPHONEOS_DEPLOYMENT_TARGET\s*[=:]\s*['"]?(\d+)(?:\.\d+)?/);
      if (m && parseInt(m[1], 10) < 13) add('deployment-target-below-13', i + 1, 'targets iOS ' + m[1]);
      var s = l.match(/-sdk\s+['"]?(iphoneos|appletvos|xros|watchos)(\d+)(\.\d+)?/);
      if (s && parseInt(s[2], 10) < 26) add('sdk-flag-below-26', i + 1, s[1] + s[2] + (s[3] || ''));
    });

    if (opts.map !== false) map.forEach(function (e) {
      findings.push({ check: 'job-xcode-map', sev: 'info', line: e.line, msg: 'job "' + e.job + '" → ' + e.runner + ' → Xcode ' + e.xcode + ' (' + e.via + ') → ' + (e.ok === null ? 'not provable from the workflow — add xcode-select' : e.ok ? 'meets the Xcode 26 upload minimum' : 'rejected by App Store Connect since 28 Apr 2026') });
    });
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, map: map, today: opts.today || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, IMAGES: IMAGES };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.XCGENGINE = api;
})();
