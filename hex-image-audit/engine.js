'use strict';
// Intel HEX / Motorola S-record image audit. Same file runs in Node (extension) and in the browser (free web tool).
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.HEX_RULES;

var BY_ID = {};
for (var _i = 0; _i < RULES.length; _i++) { BY_ID[RULES[_i].id] = RULES[_i]; }

var SREC_ADDR_LEN = { '0': 2, '1': 2, '2': 3, '3': 4, '5': 2, '6': 3, '7': 4, '8': 3, '9': 2 };

function hh(n) { var s = n.toString(16).toUpperCase(); return '0x' + (s.length < 2 ? '0' + s : s); }
function ha(n) { var s = n.toString(16).toUpperCase(); while (s.length < 8) { s = '0' + s; } return '0x' + s; }

function check(text, opts) {
  opts = opts || {};
  var page = Number(opts.page) > 0 ? Number(opts.page) : 256;
  var findings = [];
  function add(id, line, msg) {
    var r = BY_ID[id];
    findings.push({ check: id, sev: r ? r.sev : 'error', msg: msg, line: line });
  }

  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var blocks = [];          // {start, end, line}
  var written = {};         // absolute address -> line, for overlap
  var overlapBudget = 262144;
  var overlapReported = {};
  var ela = 0, esa = 0;
  var eofLine = 0, seenIntel = false, seenSrec = false, srecTermLine = 0;
  var dataRecords = 0, tally = null, tallyLine = 0;
  var startAddr = null, startLine = 0;
  var fileCase = '', caseFlagged = false;
  var lastLine = 1;

  function noteCase(body, ln) {
    if (caseFlagged) { return; }
    var hasU = /[A-F]/.test(body), hasL = /[a-f]/.test(body);
    if (hasU && hasL) { caseFlagged = true; add('case_consistency', ln, 'this record mixes upper- and lower-case hex digits'); return; }
    var c = hasU ? 'upper' : (hasL ? 'lower' : '');
    if (!c) { return; }
    if (!fileCase) { fileCase = c; return; }
    if (fileCase !== c) {
      caseFlagged = true;
      add('case_consistency', ln, 'the image starts in ' + fileCase + '-case hex and switches to ' + c + '-case here, so two different tools have written this file');
    }
  }

  function claim(start, len, ln) {
    blocks.push({ start: start, end: start + len, line: ln });
    if (len > overlapBudget) { overlapBudget = 0; return; }
    for (var a = start; a < start + len; a++) {
      if (overlapBudget <= 0) { return; }
      overlapBudget--;
      if (written[a] !== undefined) {
        var key = written[a] + '>' + ln;
        if (!overlapReported[key]) {
          overlapReported[key] = 1;
          add('address_overlap', ln, 'address ' + ha(a) + ' is already written by the record on line ' + written[a] + ', so the flashed byte depends on the load order of the tool');
        }
      } else {
        written[a] = ln;
      }
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var ln = i + 1;
    var s = lines[i].trim();
    if (!s) { continue; }
    lastLine = ln;

    if (s.charAt(0) === ':') {
      seenIntel = true;
      var body = s.slice(1);
      if (!/^[0-9A-Fa-f]+$/.test(body)) {
        add('record_hex', ln, 'the record contains characters that are not hex digits');
        continue;
      }
      if (body.length % 2 !== 0) {
        add('record_hex', ln, 'the record holds ' + body.length + ' hex digits, which is not a whole number of bytes');
        continue;
      }
      if (body.length < 10) {
        add('record_hex', ln, 'the record is ' + body.length + ' hex digits long; the shortest legal record is 10 (count, address, type, checksum)');
        continue;
      }
      noteCase(body, ln);
      var b = [];
      for (var j = 0; j < body.length; j += 2) { b.push(parseInt(body.substr(j, 2), 16)); }
      var ll = b[0], addr = (b[1] << 8) | b[2], tt = b[3], dataLen = b.length - 5;

      var sum = 0;
      for (var k = 0; k < b.length - 1; k++) { sum += b[k]; }
      var want = (0x100 - (sum & 0xFF)) & 0xFF, got = b[b.length - 1];
      if (want !== got) {
        add('record_checksum', ln, 'the record ends in ' + hh(got) + ' but the recomputed two\u2019s-complement checksum is ' + hh(want));
      }
      if (ll !== dataLen) {
        add('record_length', ln, 'the byte-count field says ' + ll + ' but the record carries ' + dataLen + ' data byte' + (dataLen === 1 ? '' : 's'));
      }
      if (tt > 5) {
        add('record_type', ln, 'record type ' + hh(tt) + ' is not one of the defined types 00-05');
        continue;
      }
      if (eofLine) {
        add('data_after_eof', ln, 'this record sits after the end-of-file record on line ' + eofLine + ', so conforming loaders never read it');
      }

      if (tt === 0) {
        dataRecords++;
        if (addr + dataLen > 0x10000) {
          add('extended_address', ln, 'the record starts at ' + hh(b[1]) + hh(b[2]).slice(2) + ' and runs ' + dataLen + ' bytes past 0xFFFF; a type 04 record must raise the base address first');
        }
        claim(ela + esa + addr, dataLen, ln);
      } else if (tt === 1) {
        if (dataLen !== 0 || ll !== 0 || addr !== 0) {
          add('eof_record', ln, 'the end-of-file record must be exactly :00000001FF, but this one declares address ' + hh(b[1]) + hh(b[2]).slice(2) + ' and ' + dataLen + ' data byte' + (dataLen === 1 ? '' : 's'));
        }
        if (!eofLine) { eofLine = ln; }
      } else if (tt === 2 || tt === 4) {
        if (dataLen !== 2) {
          add('extended_address', ln, 'a type ' + hh(tt).slice(2) + ' extended-address record must carry exactly 2 data bytes, not ' + dataLen);
        } else if (tt === 4) {
          ela = ((b[4] << 8) | b[5]) * 65536; esa = 0;
        } else {
          esa = ((b[4] << 8) | b[5]) * 16; ela = 0;
        }
      } else if (tt === 3 || tt === 5) {
        if (dataLen !== 4) {
          add('start_address', ln, 'a type ' + hh(tt).slice(2) + ' start-address record must carry exactly 4 data bytes, not ' + dataLen);
        } else {
          startAddr = (tt === 5)
            ? (((b[4] << 24) >>> 0) + (b[5] << 16) + (b[6] << 8) + b[7])
            : ((((b[4] << 8) | b[5]) * 16) + ((b[6] << 8) | b[7]));
          startLine = ln;
        }
      }
      continue;
    }

    if (/^[Ss][0-9]/.test(s)) {
      seenSrec = true;
      var t = s.charAt(1);
      var sbody = s.slice(2);
      if (!/^[0-9A-Fa-f]+$/.test(sbody) || sbody.length % 2 !== 0) {
        add('record_hex', ln, 'the S-record payload is not a whole number of hex bytes');
        continue;
      }
      noteCase(sbody, ln);
      var sb = [];
      for (var m = 0; m < sbody.length; m += 2) { sb.push(parseInt(sbody.substr(m, 2), 16)); }
      if (sb.length < 3) { add('record_hex', ln, 'the S-record is too short to hold a count, an address and a checksum'); continue; }
      var cnt = sb[0];
      if (cnt !== sb.length - 1) {
        add('srec_count', ln, 'the count byte says ' + cnt + ' but ' + (sb.length - 1) + ' byte' + (sb.length - 1 === 1 ? '' : 's') + ' follow it, which shifts the checksum byte');
      }
      var ssum = 0;
      for (var n = 0; n < sb.length - 1; n++) { ssum += sb[n]; }
      var swant = (0xFF - (ssum & 0xFF)) & 0xFF, sgot = sb[sb.length - 1];
      if (swant !== sgot) {
        add('srec_checksum', ln, 'the record ends in ' + hh(sgot) + ' but the recomputed S-record checksum is ' + hh(swant));
      }
      var alen = SREC_ADDR_LEN[t];
      if (alen === undefined) { add('record_type', ln, 'S' + t + ' is not a defined S-record type'); continue; }
      var sa = 0;
      for (var p = 0; p < alen && 1 + p < sb.length; p++) { sa = (sa * 256) + sb[1 + p]; }
      if (t === '1' || t === '2' || t === '3') {
        dataRecords++;
        var sdl = sb.length - 1 - alen - 1;
        if (sdl > 0) { claim(sa, sdl, ln); }
      } else if (t === '5' || t === '6') {
        tally = sa; tallyLine = ln;
      } else if (t === '7' || t === '8' || t === '9') {
        srecTermLine = ln; startAddr = sa; startLine = ln;
      }
      continue;
    }

    add('record_start', ln, 'this line begins with \u201c' + s.slice(0, 12) + '\u201d, which is neither an Intel HEX record (\u201c:\u201d) nor an S-record (\u201cS\u201d)');
  }

  if (seenIntel && !eofLine) {
    add('eof_record', lastLine, 'the image has no :00000001FF end-of-file record, so a programmer cannot tell it apart from a truncated download');
  }
  if (seenSrec && !srecTermLine) {
    add('srec_count', lastLine, 'the S-record image has no S7, S8 or S9 termination record, so the entry point is undefined');
  }
  if (tally !== null && tally !== dataRecords) {
    add('srec_tally', tallyLine, 'the S5/S6 record declares ' + tally + ' data record' + (tally === 1 ? '' : 's') + ' but the file contains ' + dataRecords);
  }

  var merged = [];
  blocks.slice().sort(function (x, y) { return x.start - y.start; }).forEach(function (bl) {
    var last = merged[merged.length - 1];
    if (last && bl.start <= last.end) { last.end = Math.max(last.end, bl.end); } else { merged.push({ start: bl.start, end: bl.end, line: bl.line }); }
  });
  for (var g = 1; g < merged.length; g++) {
    var gap = merged[g].start - merged[g - 1].end;
    if (gap > 0) {
      add('address_gap', merged[g].line, 'nothing is written between ' + ha(merged[g - 1].end) + ' and ' + ha(merged[g].start) + ' \u2014 a ' + gap + '-byte gap that keeps whatever was in flash before');
    }
  }
  for (var q = 0; q < merged.length; q++) {
    var bs = merged[q].start % page, be = merged[q].end % page;
    if (bs !== 0 || be !== 0) {
      add('page_alignment', merged[q].line, 'the block ' + ha(merged[q].start) + '-' + ha(merged[q].end - 1) + ' does not fill whole ' + page + '-byte pages (' + (bs !== 0 ? 'starts ' + bs + ' byte(s) into a page' : 'starts on a boundary') + ', ' + (be !== 0 ? 'ends ' + (page - be) + ' byte(s) short of one' : 'ends on a boundary') + ')');
    }
  }
  if (startAddr !== null) {
    var inside = false;
    for (var r = 0; r < merged.length; r++) { if (startAddr >= merged[r].start && startAddr < merged[r].end) { inside = true; break; } }
    if (!inside) {
      add('start_address', startLine, 'the entry point ' + ha(startAddr) + ' is not inside any address range this image writes, so the device jumps into unprogrammed flash');
    }
  }

  findings.sort(function (x, y) { return (x.line || 0) - (y.line || 0); });
  return { findings: findings };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.HEXENGINE = API; }
