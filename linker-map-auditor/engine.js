/*
 * Linker Map Auditor - engine
 *
 * The findings the "Analyze this linker map" command has always raised, as data:
 *   - no_memory_config : the map has no "Memory Configuration" block, so region totals cannot be computed
 *   - region_overflow  : a MEMORY region is used past its length ("FLASH overflowed by 1,234 bytes.")
 * Parsing and every number come from mapparse.js, the same brain the commands use.
 * Output : {findings: [{check, sev, msg, line}]}
 *
 * *.map is also the name of every JavaScript source map, so a file that carries none of GNU ld's own
 * section headers is not a linker map and gets no findings (the auto check runs on every open .map).
 */
(function () {
  'use strict';

  var M = (typeof module !== 'undefined') ? require('./mapparse.js') : window.MapParse;

  var RULES = [
    { id: 'no_memory_config', sev: 'warn', title: 'No Memory Configuration block in the map file' },
    { id: 'region_overflow', sev: 'warn', title: 'A MEMORY region is used past its length' }
  ];

  var LD_MAP_RE = /^(Memory Configuration|Linker script and memory map|Archive member included|Discarded input sections|Allocating common symbols)\s*/m;

  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  // 1-based line of a region's row inside the Memory Configuration block
  function regionLine(lines, name) {
    var re = new RegExp('^' + esc(name) + '\\s+0x'), inMem = false;
    for (var i = 0; i < lines.length; i++) {
      if (/^Memory Configuration\s*$/.test(lines[i])) { inMem = true; continue; }
      if (!inMem) continue;
      if (/^Linker script and memory map\s*$/.test(lines[i])) break;
      if (re.test(lines[i])) return i + 1;
    }
    return 1;
  }

  function check(text, opts) {
    opts = opts || {};
    var src = String(text == null ? '' : text);
    var findings = [];
    if (!LD_MAP_RE.test(src)) return { findings: findings };
    var name = String(opts.path || '').replace(/^.*[\/\\]/, '');
    var parsed = M.parseMap(src, name);
    if (!parsed.regions.length) {
      findings.push({ check: 'no_memory_config', sev: 'warn', line: 1, msg: parsed.warnings[0] });
      return { findings: findings };
    }
    // One finding per file: the command raised one warning, and each region is named in it.
    var lines = src.replace(/\r\n?/g, '\n').split('\n'), over = [], line = 0;
    for (var i = 0; i < parsed.regions.length; i++) {
      var R = parsed.regions[i];
      if (!R.over) continue;
      over.push(R.name + ' overflowed by ' + M.commas(R.over) + ' bytes.');
      if (!line) line = regionLine(lines, R.name);
    }
    if (over.length) findings.push({ check: 'region_overflow', sev: 'warn', line: line, msg: over.join(' ') });
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };

  if (typeof module !== 'undefined') { module.exports = API; }
  if (typeof window !== 'undefined') { window.LMAENGINE = API; }
})();
