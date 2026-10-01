// Open VSX Publish Gate - checks a VS Code extension package.json or a GitHub publish workflow
// against the vsce packaging checks and the Open VSX (ovsx) publishing steps.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.OVSX_RULES;
  const BY_ID = {};
  RULES.forEach(r => { BY_ID[r.id] = r; });

  // vsce TrustedSVGSources (package.js) - an SVG badge from any other host is refused
  const TRUSTED = ['api.travis-ci.com', 'app.fossa.io', 'badge.buildkite.com', 'badge.fury.io', 'badgen.net',
    'badges.frapsoft.com', 'badges.gitter.im', 'cdn.travis-ci.com', 'ci.appveyor.com', 'circleci.com',
    'cla.opensource.microsoft.com', 'codacy.com', 'codeclimate.com', 'codecov.io', 'coveralls.io', 'david-dm.org',
    'deepscan.io', 'dev.azure.com', 'docs.rs', 'flat.badgen.net', 'gitlab.com', 'godoc.org', 'goreportcard.com',
    'img.shields.io', 'isitmaintained.com', 'marketplace.visualstudio.com', 'nodesecurity.io', 'opencollective.com',
    'snyk.io', 'travis-ci.com', 'visualstudio.com', 'vsmarketplacebadges.dev'];

  // IDs that return 404 on https://open-vsx.org/api/<ns>/<name> (checked 2026-09-30) -> Open VSX replacement
  const MS_ONLY = {
    'ms-python.vscode-pylance': 'detachhead.basedpyright',
    'ms-vscode.cpptools': 'llvm-vs-code-extensions.vscode-clangd',
    'ms-vscode-remote.remote-ssh': 'jeanp413.open-remote-ssh',
    'ms-vscode-remote.remote-containers': '',
    'ms-vsliveshare.vsliveshare': '',
    'ms-dotnettools.csharp': 'muhammad-sammy.csharp',
    'ms-dotnettools.csdevkit': 'muhammad-sammy.csharp',
    'github.copilot': '',
    'github.copilot-chat': ''
  };

  function lineOf(lines, re, from) {
    for (let i = from || 0; i < lines.length; i++) if (re.test(lines[i])) return i + 1;
    return 1;
  }
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function add(out, id, line, extra, fix) {
    const r = BY_ID[id];
    out.push({ check: id, sev: r.sev, target: r.target, line: line,
      msg: r.msg + (extra ? ' ' + extra : ''), fix: fix || r.fix });
  }

  function checkManifest(m, lines, out) {
    const scripts = m.scripts && typeof m.scripts === 'object' ? m.scripts : {};
    const scriptText = Object.keys(scripts).map(k => String(scripts[k])).join('\n');
    const isExt = m.engines && m.engines.vscode || m.contributes || m.activationEvents ||
      m.extensionDependencies || m.extensionPack || /\b(vsce|ovsx)\b/.test(scriptText) || m.publisher;
    if (!isExt) return;
    const L = k => lineOf(lines, new RegExp('"' + esc(k) + '"\\s*:'));

    if (!m.publisher) add(out, 'publisher-missing', lineOf(lines, /"name"\s*:/));
    else if (m.publisher === 'vscode-samples') add(out, 'publisher-vscode-samples', L('publisher'));
    if (!m.engines || !m.engines.vscode) add(out, 'engines-missing', m.engines ? L('engines') : lineOf(lines, /"version"\s*:/));
    if (/\.svg$/i.test(m.icon || '')) add(out, 'icon-svg', L('icon'), 'icon: ' + m.icon);
    (Array.isArray(m.badges) ? m.badges : []).forEach(b => {
      const u = String(b && b.url || '');
      const ln = lineOf(lines, new RegExp(esc(u))) ;
      let d = u;
      try { d = decodeURI(u); } catch (e) { d = u; }
      // plain parser: the browser build may run where the URL global is absent
      const pm = /^([a-z][a-z0-9+.-]*:)\/\/([^\/?#]+)([^?#]*)/i.exec(d);
      if (!pm) return;
      const url = { protocol: pm[1], host: pm[2], pathname: pm[3] || '/', href: d };
      if (!/^https:$/i.test(url.protocol)) { add(out, 'badge-http', ln, u, u.replace(/^http:/i, 'https:')); return; }
      const gh = /^https:\/\/github\.com\/[^/]+\/[^/]+\/(actions\/)?workflows\/.*badge\.svg/.test(url.href);
      if (/\.svg$/i.test(url.pathname) && TRUSTED.indexOf(url.host.toLowerCase()) < 0 && !gh)
        add(out, 'badge-svg-untrusted', ln, 'host: ' + url.host);
    });
    const v = String(m.version || '');
    const pre = /^\d+\.\d+\.\d+-(.+)$/.exec(v);
    if (pre) add(out, 'version-prerelease', L('version'), 'version: ' + v,
      '"version": "' + v.split('-')[0] + '" and publish with vsce publish --pre-release / ovsx publish --pre-release');
    if (Array.isArray(m.enabledApiProposals) && m.enabledApiProposals.length)
      add(out, 'proposed-api', L('enabledApiProposals'), 'proposals: ' + m.enabledApiProposals.join(', '));
    if (m.dependencies && Object.prototype.hasOwnProperty.call(m.dependencies, 'vscode'))
      add(out, 'dep-vscode', lineOf(lines, /"vscode"\s*:/, L('dependencies') - 1));
    if (!m.repository) add(out, 'repository-missing', lineOf(lines, /"name"\s*:/));
    if (!m.license) add(out, 'license-missing', lineOf(lines, /"name"\s*:/));
    ['extensionDependencies', 'extensionPack'].forEach(k => {
      (Array.isArray(m[k]) ? m[k] : []).forEach(id => {
        const key = String(id).toLowerCase();
        if (!Object.prototype.hasOwnProperty.call(MS_ONLY, key)) return;
        const rep = MS_ONLY[key];
        add(out, 'ms-only-dependency', lineOf(lines, new RegExp('"' + esc(id) + '"', 'i'), L(k) - 1),
          k + ': ' + id + '.', rep ? 'replace "' + id + '" with "' + rep + '" (on open-vsx.org)' :
            'no Open VSX drop-in: remove "' + id + '" from ' + k + ' and list it under recommendations in your README');
      });
    });
    const vscePub = Object.keys(scripts).filter(k => /\bvsce\s+publish\b/.test(String(scripts[k])));
    const ovsxPub = Object.keys(scripts).some(k => /\bovsx\s+publish\b/.test(String(scripts[k])));
    if (vscePub.length && !ovsxPub) {
      const ns = m.publisher || '<your-id>';
      add(out, 'no-ovsx-script', L(vscePub[0]), 'Open VSX namespace = publisher "' + ns + '".',
        '"publish:ovsx": "ovsx publish -p $OVSX_PAT" (once: npx ovsx create-namespace ' + ns + ' -p $OVSX_PAT)');
    }
    vscePub.forEach(k => {
      const s = String(scripts[k]);
      if (/(\s-p\s|\s--pat\b|VSCE_PAT)/.test(' ' + s) && !/--azure-credential/.test(s))
        add(out, 'vsce-pat-script', L(k), 'script "' + k + '": ' + s);
    });
  }

  function checkWorkflow(text, lines, out) {
    const vsceLine = lineOf(lines, /\bvsce\s+publish\b/);
    const hasVsce = /\bvsce\s+publish\b/.test(text);
    const mpRegistry = (text.match(/registryUrl:\s*['"]?https:\/\/marketplace\.visualstudio\.com/g) || []).length;
    const haaleo = (text.match(/uses:\s*['"]?HaaLeo\/publish-vscode-extension/gi) || []).length;
    const toMarketplace = hasVsce || mpRegistry > 0;
    if (!toMarketplace) return;
    const firstLine = hasVsce ? vsceLine : lineOf(lines, /registryUrl:\s*['"]?https:\/\/marketplace\.visualstudio\.com/);
    const toOvsx = /\bovsx\s+publish\b/.test(text) || haaleo > mpRegistry;
    const usesPat = !/--azure-credential/.test(text) &&
      (/VSCE_PAT|VS_MARKETPLACE_TOKEN|AZURE_PAT|MARKETPLACE_PAT/.test(text) ||
       lines.some(l => /\bvsce\s+publish\b.*(\s-p\s|--pat\b)/.test(l)) || (mpRegistry > 0 && /\bpat:/.test(text)));
    if (usesPat) {
      const pl = lineOf(lines, /VSCE_PAT|VS_MARKETPLACE_TOKEN|AZURE_PAT|MARKETPLACE_PAT/);
      add(out, 'wf-vsce-pat', pl > 1 ? pl : firstLine);
    }
    if (!toOvsx) add(out, 'wf-no-ovsx', firstLine);
  }

  function check(text, opts) {
    const out = [];
    const src = String(text || '').replace(/^﻿/, '');
    const lines = src.split(/\r?\n/);
    let m = null;
    if (/^\s*\{/.test(src)) { try { m = JSON.parse(src); } catch (e) { m = null; } }
    if (m && typeof m === 'object') checkManifest(m, lines, out);
    else if (/^\s*jobs\s*:/m.test(src)) checkWorkflow(src, lines, out);
    out.sort((a, b) => a.line - b.line);
    return { findings: out, today: (opts && opts.today) || '' };
  }

  const api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, MS_ONLY: MS_ONLY };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.OVSXENGINE = api;
})();
