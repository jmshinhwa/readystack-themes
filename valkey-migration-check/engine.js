// Valkey Migration Check engine: finds Redis ties in Terraform, CloudFormation, compose and Dockerfiles.
// Same file runs in Node (VS Code extension, verify) and in the browser (free web page).
(function (root) {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : root.VK_RULES;
  const byKind = k => RULES.filter(r => r.kind === k);

  const BLOCK_START = [
    /^\s*resource\s+"(\w+)"\s+"[\w-]+"/,        // Terraform
    /^ {2}([A-Za-z0-9]+):\s*(?:#.*)?$/           // CloudFormation / compose top-level entry
  ];
  const EC_NODE = /aws_elasticache_(?:cluster|replication_group)\b|AWS::ElastiCache::(?:CacheCluster|ReplicationGroup)\b/;
  const EC_SERVERLESS = /aws_elasticache_serverless_cache\b|AWS::ElastiCache::ServerlessCache\b/;
  const ENGINE = /^\s*(?:engine\s*=|"?Engine"?\s*:)\s*["']?([\w-]+)/;
  const VERSION = /^\s*(?:engine_version\s*=|"?EngineVersion"?\s*:)\s*["']?(\d+)(?:\.[\dx]+)*/;
  const FAMILY = /(?:\bfamily\s*=|\bCacheParameterGroupFamily\s*:|\bparameter_group_name\s*=|\bCacheParameterGroupName\s*:)\s*["']?(?:default\.)?redis(\d)(\.\d|\.x)?/;
  const IMAGE = /(?:^\s*(?:-\s*)?image\s*[:=]\s*|^\s*FROM\s+(?:--platform=\S+\s+)?|"image"\s*:\s*)["']?((?:docker\.io\/)?(?:library\/)?redis)(?::([\w.-]+))?["']?(?:\s|$|#|,)/i;

  function fill(s, vars) { return s.replace(/\{(\w+)\}/g, (_, k) => vars[k] != null ? vars[k] : ''); }
  function push(out, r, line, lines, vars, sev) {
    out.push({ check: r.check, id: r.id, sev: sev || r.sev, msg: fill(r.msg, vars), fix: r.fix, source: r.source, line: line + 1, text: lines[line].trim() });
  }

  // Licence of the tag: Redis 7.4+ and 8+ are source-available; latest/unpinned/7 resolve to those.
  function licensedTag(tag) {
    if (!tag || /^(latest|alpine|bookworm|trixie)/i.test(tag)) return true;
    const m = tag.match(/^(\d+)(?:\.(\d+))?/);
    if (!m) return false;
    const maj = +m[1], min = m[2] == null ? null : +m[2];
    return maj >= 8 || (maj === 7 && (min == null || min >= 4));
  }

  function blocks(lines) {
    const out = [];
    let cur = null;
    lines.forEach((l, i) => {
      if (/^\s*(#|\/\/)/.test(l)) return;
      const m = BLOCK_START.map(rx => l.match(rx)).find(Boolean);
      if (m) { cur = { start: i, head: l, body: [] }; out.push(cur); }
      if (cur) cur.body.push(i);
    });
    return out;
  }

  function check(text, opts) {
    const today = (opts && opts.today) || new Date().toISOString().slice(0, 10);
    const lines = String(text || '').split(/\r?\n/);
    const findings = [];

    for (const b of blocks(lines)) {
      const txt = b.body.map(i => lines[i]).join('\n');
      const node = EC_NODE.test(txt), serverless = EC_SERVERLESS.test(txt);
      if (!node && !serverless) continue;
      let engine = 'redis', engineLine = b.start, verLine = -1, major = null, verText = '';
      for (const i of b.body) {
        const e = lines[i].match(ENGINE); if (e) { engine = e[1].toLowerCase(); engineLine = i; }
        const v = lines[i].match(VERSION); if (v) { verLine = i; major = +v[1]; verText = (lines[i].match(/(\d+(?:\.[\dx]+)*)/) || [])[1]; }
      }
      if (engine !== 'redis') continue;
      if (serverless) { byKind('ec-serverless').forEach(r => push(findings, r, engineLine, lines, {})); continue; }
      const verRule = byKind('ec-version').find(r => r.majors.includes(major));
      if (verRule) {
        const vars = { v: verText };
        let sev = verRule.sev;
        if (today >= verRule.y1) sev = 'error';
        const f = push(findings, verRule, verLine, lines, vars, sev);
        const last = findings[findings.length - 1];
        if (today > verRule.ext_end) last.msg += ' Extended Support has ended for this version.';
        else if (today >= verRule.y3) last.msg += ' As of ' + today + ' the premium is 160%.';
        else if (today >= verRule.y1) last.msg += ' As of ' + today + ' this node is billed the 80% premium.';
      } else {
        byKind('ec-node-current').forEach(r => push(findings, r, engineLine, lines, { v: verText ? 'Redis OSS ' + verText : 'version not pinned' }));
      }
    }

    lines.forEach((line, i) => {
      if (/^\s*(#|\/\/)/.test(line)) return;
      const fam = line.match(FAMILY);
      if (fam) {
        const maj = +fam[1];
        const r = byKind('family').find(x => x.majors.includes(maj));
        if (r) push(findings, r, i, lines, { v: maj + (fam[2] || ''), m: maj });
      }
      const img = line.match(IMAGE);
      if (img && licensedTag(img[2])) byKind('image').forEach(r => push(findings, r, i, lines, { img: img[1] + (img[2] ? ':' + img[2] : '') }));
      byKind('regex').forEach(r => { if (new RegExp(r.re, r.flags || '').test(line)) push(findings, r, i, lines, {}); });
    });

    findings.sort((a, b) => a.line - b.line);
    return { findings, errors: findings.filter(f => f.sev === 'error').length, warnings: findings.filter(f => f.sev === 'warn').length, as_of: today };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  root.VKENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
