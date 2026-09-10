'use strict';
/*
 * mapparse.js - the one brain.
 * Parses a GNU ld map file (arm-none-eabi-ld, riscv64-unknown-elf-ld, avr-ld, ...)
 * produced by `-Wl,-Map=out.map`, and answers, in exact bytes:
 *   - how much of each MEMORY region is used, free, or overflowed
 *   - which object files / archive members / input sections are spending it
 *   - what changed since a saved baseline
 *
 * The same file is loaded by extension.js (CommonJS) and inlined into
 * index.html (browser global MapParse). One brain, two doors.
 */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.MapParse = factory();
}(typeof self !== 'undefined' ? self : this, function () {

  var VERSION = '0.1.0';

  // -- helpers ---------------------------------------------------------
  function hex(s) { return parseInt(s, 16); }

  function commas(n) {
    var neg = n < 0; n = Math.abs(Math.round(n));
    var s = String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return (neg ? '-' : '') + s;
  }

  function humanBytes(n) {
    var a = Math.abs(n);
    if (a >= 1048576) return (n / 1048576).toFixed(2) + ' MiB';
    if (a >= 1024) return (n / 1024).toFixed(2) + ' KiB';
    return commas(n) + ' B';
  }

  // "512K" | "0x8000" | "90%" | 8192  ->  { bytes, text }
  function parseBudget(v, regionLength) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return { bytes: Math.round(v), text: commas(v) + ' B' };
    var s = String(v).trim();
    var m = s.match(/^(\d+(?:\.\d+)?)\s*%$/);
    if (m) {
      if (!regionLength) return null;
      return { bytes: Math.floor(regionLength * parseFloat(m[1]) / 100), text: m[1] + '%' };
    }
    m = s.match(/^0x([0-9a-fA-F]+)$/);
    if (m) return { bytes: hex(m[1]), text: s };
    m = s.match(/^(\d+(?:\.\d+)?)\s*([KMkm])?(?:i?[Bb])?$/);
    if (m) {
      var n = parseFloat(m[1]);
      var unit = (m[2] || '').toUpperCase();
      if (unit === 'K') n *= 1024;
      else if (unit === 'M') n *= 1048576;
      return { bytes: Math.round(n), text: s };
    }
    return null;
  }

  // "Drivers/libhal.a(stm32f4xx_hal.o)" -> archive + member
  function splitObject(spec) {
    var m = spec.match(/^(.*?)([^\/\\]+\.a)\(([^)]+)\)\s*$/);
    if (m) return { path: spec, archive: m[2], member: m[3], label: m[2] + '(' + m[3] + ')' };
    var base = spec.replace(/^.*[\/\\]/, '');
    return { path: spec, archive: null, member: base, label: base };
  }

  // -- the parser ------------------------------------------------------
  var RE_REGION = /^(\S+)\s+0x([0-9a-fA-F]+)\s+0x([0-9a-fA-F]+)(?:\s+(\S+))?\s*$/;
  var RE_OUT_FULL = /^([.$\w][^\s]*)\s+0x([0-9a-fA-F]+)\s+0x([0-9a-fA-F]+)(?:\s+load address\s+0x([0-9a-fA-F]+))?\s*$/;
  var RE_OUT_NAME = /^([.$\w][^\s]*)\s*$/;
  var RE_OUT_TAIL = /^\s+0x([0-9a-fA-F]+)\s+0x([0-9a-fA-F]+)(?:\s+load address\s+0x([0-9a-fA-F]+))?\s*$/;
  var RE_IN_FULL = /^\s+(\S+)\s+0x([0-9a-fA-F]+)\s+0x([0-9a-fA-F]+)\s+(\S.*?)\s*$/;
  var RE_IN_FILL = /^\s+(\*fill\*)\s+0x([0-9a-fA-F]+)\s+0x([0-9a-fA-F]+)\s*$/;
  var RE_IN_NAME = /^\s+(\.[^\s]+|COMMON|\*fill\*)\s*$/;
  var RE_IN_TAIL = /^\s+0x([0-9a-fA-F]+)\s+0x([0-9a-fA-F]+)\s+(\S.*?)\s*$/;

  var FILL_LABEL = '(alignment fill)';
  var NOATTR_LABEL = '(not attributed to an input section)';

  function parseMap(text, name) {
    var lines = String(text == null ? '' : text).replace(/\r\n?/g, '\n').split('\n');
    var regions = [], sections = [], inputs = [], warnings = [];

    // 1) Memory Configuration
    var i = 0, inMem = false;
    for (; i < lines.length; i++) {
      var ln = lines[i];
      if (/^Memory Configuration\s*$/.test(ln)) { inMem = true; continue; }
      if (!inMem) continue;
      if (/^Linker script and memory map\s*$/.test(ln)) break;
      if (/^Name\s+Origin\s+Length/.test(ln)) continue;
      var mr = ln.match(RE_REGION);
      if (!mr || mr[1] === '*default*') continue;
      var origin = hex(mr[2]), length = hex(mr[3]);
      if (!isFinite(origin) || !isFinite(length) || length <= 0) continue;
      regions.push({
        name: mr[1], origin: origin, length: length,
        attrs: mr[4] || '', used: 0, unattributed: 0
      });
    }
    if (!regions.length) {
      warnings.push('No "Memory Configuration" block found - is this a GNU ld map file? ' +
        'Region totals cannot be computed without it.');
    }

    function regionOf(addr) {
      for (var k = 0; k < regions.length; k++) {
        var r = regions[k];
        if (addr >= r.origin && addr < r.origin + r.length) return r.name;
      }
      return null;
    }

    // 2) the map body
    var cur = null, pendingOut = null, pendingIn = null;

    function openSection(nm, addr, size, load) {
      var regs = [], rv = regionOf(addr);
      if (rv) regs.push(rv);
      if (load !== null && load !== undefined) {
        var rl = regionOf(load);
        if (rl && regs.indexOf(rl) === -1) regs.push(rl);
      }
      cur = { name: nm, addr: addr, size: size, load: (load === undefined ? null : load),
              regions: regs, attributed: 0 };
      sections.push(cur);
      // A section's own size is what the region actually spends (it includes
      // padding no input section claims), so region totals come from here.
      for (var k = 0; k < regs.length; k++) {
        for (var j = 0; j < regions.length; j++) {
          if (regions[j].name === regs[k]) regions[j].used += size;
        }
      }
    }

    function addInput(nm, addr, size, spec) {
      if (!cur || !size) return;
      var obj = spec === null
        ? { path: FILL_LABEL, archive: null, member: FILL_LABEL, label: FILL_LABEL }
        : splitObject(spec);
      cur.attributed += size;
      inputs.push({ section: nm, addr: addr, size: size, object: obj.label, path: obj.path,
                    archive: obj.archive, regions: cur.regions.slice(), parent: cur.name });
    }

    for (; i < lines.length; i++) {
      var line = lines[i];
      if (!line) { pendingOut = null; pendingIn = null; continue; }

      if (/^\s/.test(line)) {
        // indented: input section, or the tail of a wrapped name
        var mf = line.match(RE_IN_FILL);
        if (mf) { addInput('*fill*', hex(mf[2]), hex(mf[3]), null); pendingIn = null; pendingOut = null; continue; }

        if (pendingOut !== null) {
          var mot = line.match(RE_OUT_TAIL);
          if (mot) {
            openSection(pendingOut, hex(mot[1]), hex(mot[2]), mot[3] ? hex(mot[3]) : null);
            pendingOut = null; pendingIn = null; continue;
          }
          pendingOut = null;
        }
        if (pendingIn !== null) {
          var mit = line.match(RE_IN_TAIL);
          if (mit) { addInput(pendingIn, hex(mit[1]), hex(mit[2]), mit[3]); pendingIn = null; continue; }
          pendingIn = null;
        }
        var mi = line.match(RE_IN_FULL);
        if (mi && !/^0x/.test(mi[1])) { addInput(mi[1], hex(mi[2]), hex(mi[3]), mi[4]); continue; }
        var mn = line.match(RE_IN_NAME);
        if (mn) { pendingIn = mn[1]; continue; }
        continue;
      }

      // column 0: an output section (or linker noise we ignore)
      pendingIn = null;
      var mo = line.match(RE_OUT_FULL);
      if (mo) {
        openSection(mo[1], hex(mo[2]), hex(mo[3]), mo[4] ? hex(mo[4]) : null);
        pendingOut = null;
        continue;
      }
      var mnm = line.match(RE_OUT_NAME);
      if (mnm && /^[.$]/.test(mnm[1])) { pendingOut = mnm[1]; continue; }
      pendingOut = null;
    }

    // 3) roll up
    var byObject = {}, byArchive = {}, bySection = {};
    function bump(store, key, region, size, extra) {
      var e = store[key];
      if (!e) {
        e = store[key] = { name: key, total: 0, byRegion: {}, sections: {}, sectionsByRegion: {} };
        if (extra) for (var k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) e[k] = extra[k];
      }
      e.total += size;
      e.byRegion[region] = (e.byRegion[region] || 0) + size;
      return e;
    }
    for (var n = 0; n < inputs.length; n++) {
      var it = inputs[n];
      var regs = it.regions.length ? it.regions : ['(outside any region)'];
      for (var q = 0; q < regs.length; q++) {
        var rg = regs[q];
        var eo = bump(byObject, it.object, rg, it.size, { archive: it.archive, path: it.path });
        eo.sections[it.section] = (eo.sections[it.section] || 0) + it.size;
        // Per region as well: listing an object's FLASH sections inside the RAM
        // table told the customer to go shrink a section that costs no RAM.
        if (!eo.sectionsByRegion[rg]) eo.sectionsByRegion[rg] = {};
        eo.sectionsByRegion[rg][it.section] = (eo.sectionsByRegion[rg][it.section] || 0) + it.size;
        if (it.archive) bump(byArchive, it.archive, rg, it.size);
        bump(bySection, it.section + '  ' + it.object, rg, it.size,
             { section: it.section, object: it.object });
      }
    }

    // what no input section claimed, per region (padding, heap/stack reservations)
    for (var s = 0; s < sections.length; s++) {
      var sec = sections[s];
      var gap = sec.size - sec.attributed;
      if (gap <= 0) continue;
      for (var g = 0; g < sec.regions.length; g++) {
        for (var h = 0; h < regions.length; h++) {
          if (regions[h].name === sec.regions[g]) regions[h].unattributed += gap;
        }
      }
    }

    for (var r2 = 0; r2 < regions.length; r2++) {
      var R = regions[r2];
      R.free = R.length - R.used;
      R.pct = R.length ? (R.used * 100 / R.length) : 0;
      R.over = R.used > R.length ? (R.used - R.length) : 0;
    }

    function sortDesc(store) {
      var arr = [];
      for (var k in store) if (Object.prototype.hasOwnProperty.call(store, k)) arr.push(store[k]);
      arr.sort(function (a, b) { return b.total - a.total; });
      return arr;
    }

    return {
      version: VERSION,
      name: name || '',
      regions: regions,
      sections: sections,
      inputs: inputs,
      objects: sortDesc(byObject),
      archives: sortDesc(byArchive),
      inputSections: sortDesc(bySection),
      warnings: warnings,
      stats: {
        lines: lines.length, sections: sections.length, inputs: inputs.length,
        objects: Object.keys(byObject).length, archives: Object.keys(byArchive).length
      }
    };
  }

  // top spenders inside one region
  function topIn(parsed, regionName, limit) {
    var out = [];
    for (var i = 0; i < parsed.objects.length; i++) {
      var o = parsed.objects[i], v = o.byRegion[regionName];
      if (v) {
        var secs = (o.sectionsByRegion && o.sectionsByRegion[regionName]) || o.sections;
        out.push({ name: o.name, size: v, sections: secs, archive: o.archive });
      }
    }
    out.sort(function (a, b) { return b.size - a.size; });
    return limit ? out.slice(0, limit) : out;
  }

  function regionByName(parsed, nm) {
    for (var i = 0; i < parsed.regions.length; i++) if (parsed.regions[i].name === nm) return parsed.regions[i];
    return null;
  }

  // -- paid: budgets ---------------------------------------------------
  function checkBudgets(parsed, budgets) {
    var rows = [], failed = 0;
    for (var i = 0; i < parsed.regions.length; i++) {
      var R = parsed.regions[i];
      var has = budgets && Object.prototype.hasOwnProperty.call(budgets, R.name);
      var b = has ? parseBudget(budgets[R.name], R.length) : null;
      var limit = b ? b.bytes : R.length;
      var ok = R.used <= limit;
      if (!ok) failed++;
      rows.push({ region: R.name, used: R.used, limit: limit, capacity: R.length,
                  budget: b ? b.text : '(region size)', over: ok ? 0 : R.used - limit,
                  headroom: limit - R.used, pct: limit ? R.used * 100 / limit : 0, ok: ok });
    }
    return { ok: failed === 0, failed: failed, rows: rows };
  }

  // -- paid: baseline diff ---------------------------------------------
  function diffMaps(base, head) {
    var regions = [], seen = {};
    function pushRegion(nm) {
      if (seen[nm]) return; seen[nm] = 1;
      var a = regionByName(base, nm), b = regionByName(head, nm);
      regions.push({
        name: nm, before: a ? a.used : 0, after: b ? b.used : 0,
        delta: (b ? b.used : 0) - (a ? a.used : 0),
        capacity: (b || a).length,
        wasOver: a ? a.over > 0 : false, isOver: b ? b.over > 0 : false,
        over: b ? b.over : 0
      });
    }
    for (var i = 0; i < base.regions.length; i++) pushRegion(base.regions[i].name);
    for (var j = 0; j < head.regions.length; j++) pushRegion(head.regions[j].name);

    // Only real MEMORY regions are compared. Debug sections (.debug_info,
    // .comment, .ARM.attributes) sit at address 0, belong to no region and
    // never reach the device. Counting them would report a 40 KB 'growth'
    // that costs the customer nothing - worse than saying nothing at all.
    var realRegions = {};
    for (var rr = 0; rr < regions.length; rr++) realRegions[regions[rr].name] = 1;

    // region -> object -> bytes. Nested, so no separator can collide with a
    // region or object name that contains spaces.
    function index(parsed) {
      var m = {};
      for (var k = 0; k < parsed.objects.length; k++) {
        var o = parsed.objects[k];
        for (var rg in o.byRegion) {
          if (!Object.prototype.hasOwnProperty.call(o.byRegion, rg)) continue;
          if (!realRegions[rg]) continue;
          if (!m[rg]) m[rg] = {};
          m[rg][o.name] = o.byRegion[rg];
        }
      }
      return m;
    }
    var A = index(base), B = index(head), objects = [];
    for (var rn = 0; rn < regions.length; rn++) {
      var rgn = regions[rn].name;
      var a = A[rgn] || {}, b = B[rgn] || {}, names = {};
      for (var na in a) if (Object.prototype.hasOwnProperty.call(a, na)) names[na] = 1;
      for (var nb in b) if (Object.prototype.hasOwnProperty.call(b, nb)) names[nb] = 1;
      for (var nm2 in names) {
        if (!Object.prototype.hasOwnProperty.call(names, nm2)) continue;
        var before = a[nm2] || 0, after = b[nm2] || 0;
        if (before === after) continue;
        objects.push({ region: rgn, name: nm2, before: before, after: after,
                       delta: after - before,
                       state: before === 0 ? 'added' : (after === 0 ? 'removed' : 'changed') });
      }
    }
    objects.sort(function (a, b) { return Math.abs(b.delta) - Math.abs(a.delta); });
    return { regions: regions, objects: objects };
  }

  // -- text report (the free answer) -----------------------------------
  function pad(s, w, right) {
    s = String(s);
    if (s.length >= w) return s;
    var sp = new Array(w - s.length + 1).join(' ');
    return right ? sp + s : s + sp;
  }

  function formatReport(parsed, opts) {
    opts = opts || {};
    var top = opts.top || 12;
    var L = [];
    L.push('Linker Map Auditor' + (parsed.name ? ' - ' + parsed.name : ''));
    L.push(parsed.stats.sections + ' output sections, ' + parsed.stats.inputs +
      ' input sections, ' + parsed.stats.objects + ' objects, ' +
      parsed.stats.archives + ' archives');
    L.push('');
    if (!parsed.regions.length) {
      L.push('No MEMORY regions found in this file.');
      for (var w = 0; w < parsed.warnings.length; w++) L.push('! ' + parsed.warnings[w]);
      return L.join('\n');
    }
    L.push(pad('REGION', 12) + pad('USED', 12, true) + pad('SIZE', 12, true) +
      pad('FREE', 12, true) + pad('USED%', 9, true) + '  STATUS');
    for (var i = 0; i < parsed.regions.length; i++) {
      var R = parsed.regions[i];
      L.push(pad(R.name, 12) + pad(commas(R.used), 12, true) + pad(commas(R.length), 12, true) +
        pad(commas(R.free), 12, true) + pad(R.pct.toFixed(1) + '%', 9, true) + '  ' +
        (R.over ? ('OVER by ' + commas(R.over) + ' B') : 'ok'));
    }
    for (var k = 0; k < parsed.regions.length; k++) {
      var Rg = parsed.regions[k];
      if (!Rg.used) continue;
      L.push('');
      L.push(Rg.name + ' - top spenders (' + humanBytes(Rg.used) + ' used)');
      var rows = topIn(parsed, Rg.name, top);
      for (var m = 0; m < rows.length; m++) {
        var sec = rows[m].sections;
        var secNames = Object.keys(sec).sort(function (a, b) { return sec[b] - sec[a]; })
          .slice(0, 3).join(', ');
        L.push('  ' + pad(commas(rows[m].size), 10, true) + '  ' + pad(rows[m].name, 34) + '  ' + secNames);
      }
      if (Rg.unattributed) {
        L.push('  ' + pad(commas(Rg.unattributed), 10, true) + '  ' + NOATTR_LABEL +
          ' (padding, heap/stack reservations)');
      }
    }
    for (var w2 = 0; w2 < parsed.warnings.length; w2++) L.push('! ' + parsed.warnings[w2]);
    return L.join('\n');
  }

  return {
    VERSION: VERSION,
    parseMap: parseMap,
    formatReport: formatReport,
    diffMaps: diffMaps,
    checkBudgets: checkBudgets,
    topIn: topIn,
    regionByName: regionByName,
    humanBytes: humanBytes,
    parseBudget: parseBudget,
    commas: commas
  };
}));
