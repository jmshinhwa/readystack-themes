// ★두뇌 — 같은 파일이 Node(확장)와 브라우저(무료 웹판)에서 산다. 규칙 문구는 ./rules.json.
'use strict';
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json')
          : (typeof window !== 'undefined' ? (window.SVG_RULES || []) : []);

var BY_ID = {};
for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

var EVENT_ATTRS = 'load|click|error|mouseover|mouseout|mouseenter|mousedown|mouseup|begin|end|repeat|focus|focusin|focusout|activate|keydown|keyup|copy|cut|paste|toggle|abort|unload|resize|scroll|pointerdown|pointerover|touchstart|animationend|transitionend';
var PLACEHOLDER = /^(?:layer[\s_-]*\d*|artboard[\s_-]*\d*|group[\s_-]*\d*|vector|shape[\s_-]*\d*|path[\s_-]*\d*|untitled[\s_-]*\d*|frame[\s_-]*\d*|rectangle[\s_-]*\d*|ellipse[\s_-]*\d*|combined[\s_-]shape|icon|image[\s_-]*\d*|svg|asset[\s_-]*\d*|[\w .-]+\.(?:svg|ai|sketch|fig|eps|pdf))$/i;
var FONT_EXT = /\.(?:woff2?|ttf|otf|eot)(?:[?#]|$)/i;
var FONT_HOST = /fonts\.(?:googleapis|gstatic)\.com|use\.typekit\.net|fonts\.bunny\.net|cdn\.jsdelivr\.net\/npm\/@fontsource/i;

function lineIndex(text) {
  var idx = [0];
  for (var i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) idx.push(i + 1);
  return idx;
}
function lineAt(idx, pos) {
  var lo = 0, hi = idx.length - 1;
  while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (idx[mid] <= pos) lo = mid; else hi = mid - 1; }
  return lo + 1;
}
function attr(tag, name) {
  var m = new RegExp('(?:^|\\s)' + name.replace(':', '\\:') + '\\s*=\\s*"([^"]*)"', 'i').exec(tag);
  if (!m) m = new RegExp("(?:^|\\s)" + name.replace(':', '\\:') + "\\s*=\\s*'([^']*)'", 'i').exec(tag);
  return m ? m[1] : null;
}
function clip(s, n) { s = String(s).replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; }

// ★어떤 텍스트에서든 <svg> 덩어리를 뽑는다 (.svg 한 덩어리 · .html/.jsx 여러 덩어리 · 중첩 허용)
function svgBlocks(text) {
  var out = [], open = /<svg\b/gi, m;
  while ((m = open.exec(text))) {
    var start = m.index, depth = 0, pos = start, tag = /<\/?svg\b/gi;
    tag.lastIndex = start;
    var t, endAt = -1;
    while ((t = tag.exec(text))) {
      if (t[0].charAt(1) === '/') { depth--; if (depth === 0) { endAt = text.indexOf('>', t.index); endAt = endAt < 0 ? text.length : endAt + 1; break; } }
      else depth++;
    }
    if (endAt < 0) endAt = text.length;
    out.push({ start: start, text: text.slice(start, endAt) });
    open.lastIndex = endAt;
    pos = endAt;
  }
  return out;
}

function check(text, opts) {
  text = String(text == null ? '' : text);
  opts = opts || {};
  var idx = lineIndex(text), findings = [], blocks = svgBlocks(text);

  function add(id, absPos, detail) {
    var r = BY_ID[id] || { id: id, sev: 'error', title: id, fix: '' };
    findings.push({
      check: id, sev: r.sev, line: lineAt(idx, absPos),
      msg: r.title + (detail ? ' — ' + detail : '') + ' Fix: ' + r.fix,
      basis: r.basis || ''
    });
  }

  for (var b = 0; b < blocks.length; b++) {
    var base = blocks[b].start, s = blocks[b].text, re, m;
    var rootTag = (/^<svg\b[^>]*>/i.exec(s) || [s.slice(0, 120)])[0];

    // 1 script
    re = /<script\b/gi; while ((m = re.exec(s))) add('svg_inline_script', base + m.index, 'the asset carries executable code.');
    // 2 inline event handlers
    re = new RegExp('\\s(on(?:' + EVENT_ATTRS + '))\\s*=', 'gi');
    while ((m = re.exec(s))) add('svg_event_handler', base + m.index, m[1] + ' fires without a click.');
    // 3 javascript: uri
    re = /(?:xlink:href|href|src)\s*=\s*["']?\s*javascript:/gi; while ((m = re.exec(s))) add('svg_javascript_uri', base + m.index, 'a link executes code.');
    re = /url\(\s*["']?javascript:/gi; while ((m = re.exec(s))) add('svg_javascript_uri', base + m.index, 'a style value executes code.');
    // 4/5 outbound references — fonts split off from everything else
    re = /(?:xlink:href|href|src)\s*=\s*["']((?:https?:)?\/\/[^"']+)["']/gi;
    while ((m = re.exec(s))) {
      if (FONT_HOST.test(m[1]) || FONT_EXT.test(m[1])) add('svg_remote_font', base + m.index, clip(m[1], 70) + ' loads on render.');
      else add('svg_external_href', base + m.index, clip(m[1], 70) + ' is fetched by the visitor, not by you.');
    }
    re = /url\(\s*["']?((?:https?:)?\/\/[^)"']+)["']?\s*\)/gi;
    while ((m = re.exec(s))) {
      var near = s.slice(Math.max(0, m.index - 220), m.index);
      if (FONT_HOST.test(m[1]) || FONT_EXT.test(m[1]) || /@font-face/i.test(near)) add('svg_remote_font', base + m.index, clip(m[1], 70) + ' loads on render.');
      else add('svg_external_href', base + m.index, clip(m[1], 70) + ' is fetched by the visitor, not by you.');
    }
    // 6 foreignObject
    re = /<foreignObject\b/gi; while ((m = re.exec(s))) add('svg_foreign_object', base + m.index, 'HTML rides inside the vector.');

    // 7-10 the accessible name
    var titleM = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(s);
    var bareTitle = !titleM && /<title\b[^>]*\/>/i.test(s);
    var label = attr(rootTag, 'aria-label'), labelledby = attr(rootTag, 'aria-labelledby');
    var role = (attr(rootTag, 'role') || '').toLowerCase();
    var hidden = String(attr(rootTag, 'aria-hidden') || '').toLowerCase() === 'true' || role === 'presentation' || role === 'none';
    var named = !!titleM || !!(label && label.trim()) || !!(labelledby && labelledby.trim());

    if (!hidden && !named && !bareTitle) add('svg_no_accessible_name', base, 'a screen reader reaches this asset and has nothing to say.');
    if (!hidden && (bareTitle || (titleM && !titleM[1].trim()))) add('svg_empty_title', base + (titleM ? titleM.index : 0), 'the title element is blank.');
    if (!hidden && titleM && titleM[1].trim() && PLACEHOLDER.test(titleM[1].trim())) add('svg_placeholder_title', base + titleM.index, '"' + clip(titleM[1], 40) + '" is what the design tool called it.');
    if (!hidden && (named || bareTitle) && role !== 'img') add('svg_missing_role_img', base, 'the name is there but may never be announced.');

    // 11 viewBox
    if (!/\sviewbox\s*=/i.test(rootTag)) add('svg_missing_viewbox', base, 'fixed width and height only.');
    // 12 embedded raster
    re = /data:image\/(png|jpe?g|gif|webp|bmp);base64,/gi;
    while ((m = re.exec(s))) add('svg_embedded_raster', base + m.index, 'a ' + m[1].toLowerCase() + ' bitmap is pasted into the vector.');
    // 14 duplicate ids
    var ids = {};
    re = /\sid\s*=\s*["']([^"']+)["']/gi;
    while ((m = re.exec(s))) {
      if (ids[m[1]]) { if (ids[m[1]] === 1) { ids[m[1]] = 2; add('svg_duplicate_id', base + m.index, 'id="' + clip(m[1], 30) + '" appears twice.'); } }
      else ids[m[1]] = 1;
    }
  }

  // 13 editor metadata — ★파일 전체를 본다 (Illustrator 의 Generator 주석은 루트 태그 ★위에 앉는다)
  if (blocks.length) {
    var seen = {}, mm, rm = /(<!--\s*Generator\s*:[^\n]*|dc:creator|inkscape:version|sodipodi:docname|inkscape:label|xmp\.did:|Adobe Illustrator|<dc:rights)/gi;
    while ((mm = rm.exec(text))) {
      var k = mm[1].toLowerCase(); if (seen[k]) continue; seen[k] = 1;
      add('svg_author_metadata', mm.index, clip(mm[1], 34) + ' is still in the file.');
    }
  }

  findings.sort(function (x, y) { return x.line - y.line; });
  return {
    findings: findings,
    blocks: blocks.length,
    rules: RULES.length,
    errors: findings.filter(function (f) { return f.sev === 'error'; }).length,
    today: opts.today || null
  };
}

var SVGENGINE = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined' && module.exports) module.exports = SVGENGINE;
if (typeof window !== 'undefined') window.SVGENGINE = SVGENGINE;
