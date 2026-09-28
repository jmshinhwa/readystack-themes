(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DH_RULES;
  const BY = {};
  RULES.forEach(r => { BY[r.id] = r; });
  const HUB_HOSTS = ['docker.io', 'index.docker.io', 'registry-1.docker.io', 'registry.hub.docker.com'];
  const VALUE_OPTS = ['-v', '--volume', '-e', '--env', '-w', '--workdir', '--name', '-p', '--publish', '--network', '--net',
    '--entrypoint', '-u', '--user', '--mount', '--env-file', '--platform', '-l', '--label', '-h', '--hostname', '--add-host', '--pull'];

  function clean(v) {
    return String(v || '').replace(/\s+#.*$/, '').trim().replace(/^['"]|['"]$/g, '').trim();
  }
  // returns the image reference when it resolves to Docker Hub, else null
  function hubImage(ref) {
    ref = clean(ref).replace(/^docker:\/\//, '');
    if (!ref || /\$/.test(ref) || ref === 'scratch') return null;
    const parts = ref.split('/');
    const first = parts[0].toLowerCase();
    if (parts.length > 1 && (first.includes('.') || first.includes(':') || first === 'localhost')) {
      return HUB_HOSTS.includes(first) ? ref : null;
    }
    return ref;
  }
  function indent(s) { return s.match(/^\s*/)[0].length; }
  function blank(s) { return !s.trim() || /^\s*#/.test(s); }
  // line index of the parent mapping key of line i (-1 if none)
  function parentOf(lines, i) {
    const n = indent(lines[i].replace(/^(\s*)- /, '$1  '));
    for (let j = i - 1; j >= 0; j--) {
      if (blank(lines[j])) continue;
      if (indent(lines[j]) < n) return j;
    }
    return -1;
  }
  function keyOf(line) { const m = (line || '').match(/^\s*-?\s*([\w.-]+):/); return m ? m[1] : ''; }
  // does the mapping that contains line i have sibling key `key`?
  function siblingHas(lines, i, key) {
    const n = indent(lines[i]);
    const re = new RegExp('^\\s{' + n + '}' + key + ':');
    for (let j = i - 1; j >= 0; j--) {
      if (blank(lines[j])) continue;
      if (indent(lines[j]) < n) break;
      if (re.test(lines[j])) return true;
    }
    for (let j = i + 1; j < lines.length; j++) {
      if (blank(lines[j])) continue;
      if (indent(lines[j]) < n) break;
      if (re.test(lines[j])) return true;
    }
    return false;
  }
  function cliImage(cmd) {
    const m = cmd.match(/\bdocker\s+(?:container\s+|image\s+)?(pull|run|create)\s+(.*)$/);
    if (!m) return null;
    const toks = m[2].split(/\s+/).filter(Boolean);
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (/^[<>|&;]/.test(t)) return null;
      if (t.startsWith('-')) { if (VALUE_OPTS.includes(t)) k++; continue; }
      return t;
    }
    return null;
  }
  function kindOf(text) {
    if (/^jobs:\s*$/m.test(text) && /runs-on:/.test(text)) return 'workflow';
    if (/^\s*apiVersion:/m.test(text) && /^\s*kind:\s*\w+/m.test(text)) return 'k8s';
    if (/^services:\s*$/m.test(text)) return 'compose';
    if (/^\s+script:/m.test(text) || /^stages:/m.test(text)) return 'gitlab';
    if (/^\s*FROM\s+\S+/im.test(text)) return 'dockerfile';
    return 'unknown';
  }
  function hit(out, id, line, image, extra) {
    const r = BY[id];
    out.push({ check: id, sev: r.sev, msg: r.title + ' — ' + image + '. ' + r.msg + (extra || ''), fix: r.fix, line: line + 1, image });
  }

  function check(text, opts) {
    opts = opts || {};
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const kind = opts.kind || kindOf(text);
    const out = [];

    if (kind === 'workflow') {
      let loggedIn = false, jobIndent = -1, nonHubLogin = null, selfHosted = -1;
      lines.forEach((ln, i) => {
        if (blank(ln)) return;
        const n = indent(ln);
        if (/^jobs:\s*$/.test(ln)) { jobIndent = -2; return; }
        if (jobIndent === -2 && n > 0) jobIndent = n;
        if (n === jobIndent && /^\s*[\w-]+:\s*$/.test(ln)) { loggedIn = false; return; }
        if (/runs-on:.*self-hosted/.test(ln) && selfHosted < 0) selfHosted = i;
        let m;
        if ((m = ln.match(/uses:\s*['"]?docker\/login-action/))) {
          let reg = '';
          for (let j = i + 1; j < Math.min(lines.length, i + 10); j++) {
            if (/^\s*- /.test(lines[j])) break;
            const r = lines[j].match(/^\s*registry:\s*(.+)$/);
            if (r) reg = clean(r[1]);
          }
          if (!reg || HUB_HOSTS.includes(reg.toLowerCase())) loggedIn = true; else if (!nonHubLogin) nonHubLogin = { i, reg };
          return;
        }
        if ((m = ln.match(/\bdocker\s+login\b(.*)$/))) {
          const host = (m[1].split(/\s+/).filter(t => t && !t.startsWith('-') && !/^\$|^['"]?\$/.test(t)).pop() || '');
          if (!host || !host.includes('.') || HUB_HOSTS.includes(host.toLowerCase())) loggedIn = true;
          return;
        }
        if ((m = ln.match(/^\s*-?\s*uses:\s*['"]?docker:\/\/(\S+)/))) {
          const img = hubImage(m[1]); if (img) hit(out, 'gha-docker-uri-action', i, img); return;
        }
        if ((m = ln.match(/^\s*container:\s*(\S.*)$/)) && clean(m[1])) {
          const img = hubImage(m[1]); if (img) hit(out, 'gha-container-no-credentials', i, img); return;
        }
        if ((m = ln.match(/^\s*image:\s*(\S.*)$/))) {
          const img = hubImage(m[1]); if (!img) return;
          if (siblingHas(lines, i, 'credentials')) return;
          const p = parentOf(lines, i);
          if (keyOf(lines[p]) === 'container') { hit(out, 'gha-container-no-credentials', i, img); return; }
          if (keyOf(lines[parentOf(lines, p)]) === 'services') { hit(out, 'gha-service-no-credentials', i, img); return; }
          return;
        }
        const ci = cliImage(ln);
        if (ci && !loggedIn) { const img = hubImage(ci); if (img) hit(out, 'cli-pull-before-login', i, img); }
      });
      const hubPulls = out.length;
      if (nonHubLogin && hubPulls) {
        hit(out, 'login-registry-not-hub', nonHubLogin.i, nonHubLogin.reg);
      }
      if (selfHosted >= 0 && hubPulls) hit(out, 'self-hosted-shared-ip', selfHosted, hubPulls + ' anonymous pull line(s) in this file');
    } else if (kind === 'dockerfile') {
      const stages = new Set();
      lines.forEach((ln, i) => {
        const m = ln.match(/^\s*FROM\s+(?:--platform=\S+\s+)?(\S+)(?:\s+AS\s+(\S+))?/i);
        if (!m) return;
        const ref = m[1];
        if (!stages.has(ref.toLowerCase())) { const img = hubImage(ref); if (img) hit(out, 'dockerfile-from-hub', i, img); }
        if (m[2]) stages.add(m[2].toLowerCase());
      });
    } else if (kind === 'compose' || kind === 'k8s' || kind === 'gitlab') {
      const id = kind === 'compose' ? 'compose-image-hub' : kind === 'k8s' ? 'k8s-image-hub-no-pull-secret' : 'gitlab-image-hub-no-auth';
      const covered = kind === 'k8s' ? /imagePullSecrets:/.test(text)
        : kind === 'gitlab' ? /DOCKER_AUTH_CONFIG|CI_DEPENDENCY_PROXY/.test(text) : false;
      let loggedIn = false;
      lines.forEach((ln, i) => {
        if (/\bdocker\s+login\b/.test(ln)) loggedIn = true;
        let m = ln.match(/^\s*-?\s*(?:image|name):\s*(\S.*)$/);
        if (m && (/image:/.test(ln) || keyOf(lines[parentOf(lines, i)]) === 'image')) {
          const img = hubImage(m[1]);
          if (img && !covered && !(kind === 'gitlab' && /^\s*-?\s*name:/.test(ln) && !img.includes(':') && !img.includes('/'))) hit(out, id, i, img);
          return;
        }
        const ci = cliImage(ln);
        if (ci && !loggedIn && !covered) { const img = hubImage(ci); if (img) hit(out, 'cli-pull-before-login', i, img); }
      });
    }
    return { kind, findings: out, pulls: out.filter(f => f.check !== 'self-hosted-shared-ip' && f.check !== 'login-registry-not-hub').length };
  }

  const api = { engine: { check, hubImage, kindOf }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.DHENGINE = api;
})();
