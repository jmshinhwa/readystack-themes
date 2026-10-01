// pubspec Publish Gate engine: reads a pubspec.yaml as text (no YAML library) and
// reports the lines pub.dev refuses at upload or silently ignores for your users.
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.PUB_RULES;
  const BY_ID = {};
  RULES.forEach(r => { BY_ID[r.id] = r; });
  const DEP_SECTIONS = ['dependencies', 'dev_dependencies', 'dependency_overrides'];

  function unquote(s) {
    s = s.replace(/\s+#.*$/, '').trim();
    if ((s[0] === '"' && s.endsWith('"')) || (s[0] === "'" && s.endsWith("'"))) s = s.slice(1, -1);
    return s;
  }
  function indentOf(l) { return l.match(/^ */)[0].length; }

  function parse(text) {
    const lines = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    const top = {};          // key -> {line, value, block:[lines]}
    const deps = [];         // {section, name, line, kind, raw}
    let cur = null, curDep = null;
    lines.forEach((raw, i) => {
      const ln = i + 1;
      if (/^\s*(#|$)/.test(raw)) { if (cur) cur.block.push(''); return; }
      const ind = indentOf(raw);
      const body = raw.trim();
      if (ind === 0) {
        const m = body.match(/^([A-Za-z_][\w-]*)\s*:\s*(.*)$/);
        cur = m ? { key: m[1], line: ln, value: m[2], block: [] } : null;
        if (cur) top[cur.key] = cur;
        curDep = null;
        return;
      }
      if (!cur) return;
      cur.block.push(body);
      if (DEP_SECTIONS.indexOf(cur.key) >= 0) {
        const m = body.match(/^([A-Za-z0-9_]+)\s*:\s*(.*)$/);
        if (m && (curDep === null || ind <= curDep.ind)) {
          curDep = { section: cur.key, name: m[1], line: ln, ind: ind, kind: 'hosted', raw: body };
          const inline = m[2];
          if (/\bpath\s*:/.test(inline)) curDep.kind = 'path';
          else if (/\bgit\s*:/.test(inline)) curDep.kind = 'git';
          else if (/^\s*sdk\s*:/.test(inline) || /\bsdk\s*:/.test(inline)) curDep.kind = 'sdk';
          deps.push(curDep);
        } else if (curDep && ind > curDep.ind) {
          if (/^path\s*:/.test(body)) { curDep.kind = 'path'; curDep.line = ln; curDep.raw = body; }
          else if (/^git\s*:/.test(body)) { curDep.kind = 'git'; curDep.line = ln; curDep.raw = body; }
          else if (/^sdk\s*:/.test(body) && curDep.kind === 'hosted') curDep.kind = 'sdk';
        }
      }
    });
    return { top, deps };
  }

  // Scalar value that may be folded over several lines (">-", "|", or plain continuation).
  function scalar(entry) {
    if (!entry) return null;
    let v = entry.value.trim();
    if (/^[>|][-+]?\s*(#.*)?$/.test(v)) v = entry.block.join(' ');
    else v = [v].concat(entry.block).join(' ');
    return unquote(v.replace(/\s+/g, ' ').trim());
  }

  function check(text, opts) {
    const { top, deps } = parse(text);
    const findings = [];
    const add = (id, line, msg) => {
      const r = BY_ID[id];
      findings.push({ check: id, sev: r.sev, msg: msg + ' Fix: ' + r.fix, line: line });
    };
    if (!top.name && !top.version && !top.dependencies && !top.environment) return { findings };

    const pubTo = top.publish_to ? unquote(top.publish_to.value) : '';
    if (pubTo === 'none') add('publish-to-none', top.publish_to.line, 'publish_to: none - dart pub publish will not upload this package.');

    if (top.name) {
      const n = unquote(top.name.value);
      if (!/^[a-z_][a-z0-9_]*$/.test(n)) add('name-invalid', top.name.line, 'name "' + n + '" is not lowercase [a-z0-9_] starting with a letter or underscore.');
    }
    if (top.version) {
      const v = unquote(top.version.value);
      if (!/^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$/.test(v)) add('version-format', top.version.line, 'version "' + v + '" is not three dot-separated numbers.');
    }
    if (pubTo !== 'none') {
      const d = scalar(top.description);
      if (d === null || d === '') add('description-length', 1, 'No description - pub.dev asks for 60 to 180 characters.');
      else if (d.length < 60 || d.length > 180) add('description-length', top.description.line, 'description is ' + d.length + ' characters; dart.dev asks for 60 to 180.');
      if (!top.homepage && !top.repository) add('repository-missing', 1, 'Neither homepage nor repository is set.');
    }
    const env = top.environment;
    if (!env || !env.block.some(b => /^sdk\s*:/.test(b))) add('sdk-constraint-missing', env ? env.line : 1, 'No environment: sdk constraint.');

    if (pubTo !== 'none') deps.forEach(dep => {
      if (dep.section === 'dependency_overrides') return;
      if (dep.kind === 'path') add('path-dependency', dep.line, dep.section + ' ' + dep.name + ' uses path: - pub.dev refuses any path dependency.');
      if (dep.kind === 'git' && dep.section === 'dependencies') add('git-dependency', dep.line, 'dependencies ' + dep.name + ' uses git: - pub.dev refuses git dependencies.');
    });
    if (top.dependency_overrides && pubTo !== 'none') {
      const ov = deps.filter(d => d.section === 'dependency_overrides').map(d => d.name);
      add('dependency-overrides', top.dependency_overrides.line, 'dependency_overrides (' + (ov.join(', ') || 'empty') + ') apply only to you; every user of the published package resolves without them.');
    }
    if (top.topics) {
      let t = top.topics.value.trim();
      let list = /^\[/.test(t) ? t.replace(/[\[\]]/g, '').split(',') : top.topics.block.filter(b => /^-/.test(b)).map(b => b.slice(1));
      list = list.map(unquote).filter(Boolean);
      const bad = list.filter(x => !/^[a-z](?:[a-z0-9]|-(?!-))*[a-z0-9]$/.test(x) || x.length < 2 || x.length > 32);
      if (list.length > 5 || bad.length) add('topics-invalid', top.topics.line, list.length + ' topics' + (bad.length ? ', invalid: ' + bad.join(', ') : '') + ' (limit 5).');
    }
    findings.sort((a, b) => a.line - b.line);
    return { findings };
  }

  const API = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PUBGATE = API;
})();
