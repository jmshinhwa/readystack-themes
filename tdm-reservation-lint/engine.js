/* TDM Reservation Lint — engine. Same file runs in Node (extension) and in the browser (free web page). */
(function () {
  'use strict';

  var DATA = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.TDM_RULES;

  var RULES = DATA.rules;
  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var TRAINERS = DATA.trainers;
  var TRAINER_KEYS = Object.keys(TRAINERS);
  var AGENTS = DATA.agents;
  var LEGACY = DATA.legacy;
  var KNOWN = TRAINER_KEYS
    .concat(DATA.trainers_extra)
    .concat(Object.keys(AGENTS))
    .concat(DATA.crawlers)
    .concat(Object.keys(LEGACY));
  var KNOWN_LC = {};
  KNOWN.forEach(function (t) { KNOWN_LC[t.toLowerCase()] = t; });
  var LEGACY_LC = {};
  Object.keys(LEGACY).forEach(function (t) { LEGACY_LC[t.toLowerCase()] = t; });
  var DIRECTIVES = DATA.directives;

  function distance(a, b) {
    var m = a.length, n = b.length, prev = [], cur = [], i, j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      prev = cur.slice();
    }
    return prev[n];
  }

  function nearest(token) {
    var t = token.toLowerCase(), best = null, bestD = 99;
    KNOWN.forEach(function (k) {
      var d = distance(t, k.toLowerCase());
      if (d < bestD) { bestD = d; best = k; }
    });
    return bestD <= Math.max(3, Math.ceil(t.length / 2)) ? best : null;
  }

  function parse(text) {
    var lines = String(text == null ? '' : text).split(/\r\n|\r|\n/);
    var out = [];
    lines.forEach(function (raw, idx) {
      var line = idx + 1;
      var body = raw.replace(/#.*$/, '');
      var trimmed = body.trim();
      if (!trimmed) { out.push({ line: line, raw: raw, kind: 'blank' }); return; }
      var m = trimmed.match(/^([^:]+):(.*)$/);
      if (!m) { out.push({ line: line, raw: raw, kind: 'bad', text: trimmed }); return; }
      out.push({
        line: line, raw: raw, kind: 'pair',
        key: m[1].trim().toLowerCase(),
        val: m[2].trim()
      });
    });
    return out;
  }

  function group(entries) {
    var groups = [], cur = null, orphans = [], expectAgent = false;
    entries.forEach(function (e) {
      if (e.kind !== 'pair') return;
      if (e.key === 'user-agent') {
        if (!cur || !expectAgent) { cur = { agents: [], rules: [], line: e.line }; groups.push(cur); }
        cur.agents.push({ token: e.val, line: e.line });
        expectAgent = true;
        return;
      }
      if (e.key === 'sitemap' || e.key === 'host') return;
      if (!cur) { orphans.push(e); return; }
      expectAgent = false;
      cur.rules.push(e);
    });
    return { groups: groups, orphans: orphans };
  }

  function pathsOf(g, key) {
    return g.rules.filter(function (r) { return r.key === key && r.val; }).map(function (r) { return r.val; });
  }

  function isBlocked(g) {
    // reserved = at least one non-empty Disallow, and no Allow: / that re-opens everything
    var dis = pathsOf(g, 'disallow');
    var allowAll = g.rules.some(function (r) { return r.key === 'allow' && r.val === '/'; });
    return dis.length > 0 && !allowAll;
  }

  function isOpen(g) {
    var dis = pathsOf(g, 'disallow');
    var emptyDis = g.rules.some(function (r) { return r.key === 'disallow' && !r.val; });
    var allowAll = g.rules.some(function (r) { return r.key === 'allow' && r.val === '/'; });
    return allowAll || (dis.length === 0 && emptyDis);
  }

  function check(text, opts) {
    opts = opts || {};
    var today = opts.today || '2026-09-13';
    var src = String(text == null ? '' : text);
    var entries = parse(src);
    var gr = group(entries);
    var groups = gr.groups;
    var findings = [];

    function add(id, msg, line) {
      var r = BY_ID[id];
      findings.push({ check: id, sev: r ? r.sev : 'warn', msg: msg, line: line || 1 });
    }

    // 1. rules outside a group
    gr.orphans.forEach(function (e) {
      add('rule_before_group', '"' + e.key + ': ' + e.val + '" sits above the first User-agent line, so every RFC 9309 parser drops it. Nothing on this line is in force.', e.line);
    });

    // 13. unknown directives / unparseable lines
    entries.forEach(function (e) {
      if (e.kind === 'bad') {
        add('unknown_directive', '"' + e.text + '" has no "field: value" form, so parsers skip it without warning.', e.line);
      } else if (e.kind === 'pair' && DIRECTIVES.indexOf(e.key) === -1) {
        add('unknown_directive', '"' + e.key + '" is not a robots.txt field. The line is dropped silently — comment it out with # or delete it.', e.line);
      } else if (e.kind === 'pair' && e.key === 'noindex') {
        add('noindex_line', 'Google stopped honouring Noindex in robots.txt on 2019-09-01. This line does nothing; use a meta robots tag or an X-Robots-Tag header.', e.line);
      }
    });

    // token-level checks
    var seen = {}, reserved = {}, tokensInFile = [];
    groups.forEach(function (g) {
      g.agents.forEach(function (a) {
        var tok = a.token, lc = tok.toLowerCase();
        tokensInFile.push(lc);
        if (lc === '*') { return; }
        if (LEGACY_LC[lc]) {
          var real = LEGACY_LC[lc];
          add('legacy_token', '"' + tok + '" is a retired token — the vendor no longer sends it, so this group matches nothing. The token in use today is "' + LEGACY[real] + '".', a.line);
        } else if (!KNOWN_LC[lc]) {
          var near = nearest(tok);
          add('unknown_token', 'No published crawler sends "' + tok + '". robots.txt matches the token literally, so this group reserves nothing' + (near ? ' — did you mean "' + near + '"?' : '.'), a.line);
        }
        if (seen[lc]) {
          add('duplicate_group', '"' + tok + '" already has a group on line ' + seen[lc] + '. Which group wins is parser-dependent — merge them.', a.line);
        } else {
          seen[lc] = a.line;
        }
        var canon = KNOWN_LC[lc];
        if (canon && TRAINERS[canon] && isBlocked(g)) reserved[canon] = true;
        if (canon && TRAINERS[canon] && isOpen(g)) {
          add('trainer_allowed', '"' + canon + '" (' + TRAINERS[canon] + ') has its own group, but the group grants full access. An empty "Disallow:" or "Allow: /" is permission, not a reservation.', a.line);
        }
        if (canon && AGENTS[canon] && isBlocked(g)) {
          add('agent_bot_blocked', '"' + canon + '" ' + AGENTS[canon] + '. Blocking it removes the citation and the click-through; it does not stop training — that is a separate token.', a.line);
        }
      });
    });

    // 4/5. coverage
    var missing = TRAINER_KEYS.filter(function (t) { return !reserved[t]; });
    if (missing.length === TRAINER_KEYS.length) {
      add('no_reservation', 'Not one training crawler is reserved against. Under Article 4(3) of Directive (EU) 2019/790 (in Germany § 44b UrhG) a text-and-data-mining reservation only counts when it is machine-readable — an absent rule reads as consent. Missing: ' + TRAINER_KEYS.join(', ') + '.', 1);
    } else if (missing.length) {
      add('trainer_gap', missing.length + ' of ' + TRAINER_KEYS.length + ' training crawlers are still unreserved: ' + missing.join(', ') + '. Each token is matched on its own — reserving against GPTBot says nothing to the others.', 1);
    }

    // 7. specific group cancels the * group
    var star = groups.filter(function (g) { return g.agents.some(function (a) { return a.token === '*'; }); })[0];
    if (star) {
      var starPaths = pathsOf(star, 'disallow');
      groups.forEach(function (g) {
        if (g === star) return;
        var own = pathsOf(g, 'disallow');
        if (own.indexOf('/') !== -1) return;
        var lost = starPaths.filter(function (p) { return own.indexOf(p) === -1; });
        if (lost.length) {
          g.agents.forEach(function (a) {
            if (a.token === '*') return;
            add('star_group_shadowed', '"' + a.token + '" obeys only this group, so the "User-agent: *" rules stop applying to it. Paths it can now reach: ' + lost.join(', ') + '.', a.line);
          });
        }
      });
    }

    // 9/10/11. line-level hygiene
    entries.forEach(function (e) {
      if (e.kind !== 'pair') return;
      if (e.key === 'crawl-delay') {
        add('crawl_delay', 'Crawl-delay is not part of RFC 9309; Googlebot and GPTBot ignore it. Rate-limit at the server or CDN if you need it.', e.line);
      }
      if ((e.key === 'allow' || e.key === 'disallow') && e.val && e.val.charAt(0) !== '/' && e.val.charAt(0) !== '*') {
        add('path_no_slash', '"' + e.val + '" does not start with "/". Paths are matched from the site root, so this rule never fires — write "/' + e.val.replace(/^\/+/, '') + '".', e.line);
      }
      if (e.key === 'sitemap' && !/^https?:\/\//i.test(e.val)) {
        add('sitemap_relative', 'Sitemap: takes an absolute URL. "' + e.val + '" is relative and is discarded.', e.line);
      }
    });

    // 14. TDMRep pointer
    if (!/tdmrep|tdm-reservation/i.test(src)) {
      add('no_tdm_signal', 'Nothing here points at a TDMRep signal. robots.txt is an instruction to crawlers; the TDM Reservation Protocol expects /.well-known/tdmrep.json (or a tdm-reservation meta tag) as the machine-readable reservation. As of ' + today + ' add the file and name it in a comment.', 1);
    }

    findings.sort(function (a, b) { return a.line - b.line || a.check.localeCompare(b.check); });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.TDMENGINE = API;
})();
