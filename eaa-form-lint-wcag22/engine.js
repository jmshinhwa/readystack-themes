'use strict';
/* EAA Form Lint - WCAG 2.2 AA checks for HTML / lit-html / Vue / Svelte templates.
   Same file runs in Node (VS Code extension) and in the browser (free web page). */

var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.EAA_RULES;

var BY_ID = {};
for (var ri = 0; ri < RULES.length; ri++) { BY_ID[RULES[ri].id] = RULES[ri]; }

var EAA_APPLICABLE = '2025-06-28';
var MIN_TARGET_PX = 24;

var IDENTITY = /(^|[\s\-_\[])(email|e-mail|mail|tel|phone|mobile|fname|lname|firstname|lastname|given|family|fullname|name|street|address|addr|city|town|state|province|zip|postcode|postal|country|company|organisation|organization|bday|birth|cc-?number|cardnumber|username|user)(s?)([\s\-_\]]|$)/i;
var SKIP_TYPES = /^(hidden|submit|reset|button|image)$/i;

function attrOf(tag, name) {
  var m = new RegExp('(^|[\\s])' + name + '\\s*=\\s*("([^"]*)"|\'([^\']*)\'|([^\\s>]+))', 'i').exec(tag);
  if (!m) { return null; }
  var v = m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5]);
  return v === undefined ? '' : v;
}
function hasAttr(tag, name) {
  return new RegExp('(^|[\\s])' + name + '(\\s*=|[\\s>/]|$)', 'i').test(tag + ' ');
}
function pxIn(style, prop) {
  var m = new RegExp(prop + '\\s*:\\s*([0-9.]+)\\s*px', 'i').exec(style || '');
  return m ? parseFloat(m[1]) : null;
}
function textOf(html) {
  return String(html || '').replace(/<[^>]*>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ');
}
function daysBetween(a, b) {
  var A = Date.parse(a + 'T00:00:00Z'), B = Date.parse(b + 'T00:00:00Z');
  if (isNaN(A) || isNaN(B)) { return null; }
  return Math.round((B - A) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  var doc = String(text === undefined || text === null ? '' : text);
  var findings = [];
  var starts = [0], i;
  for (i = 0; i < doc.length; i++) { if (doc.charCodeAt(i) === 10) { starts.push(i + 1); } }
  function lineAt(idx) {
    var lo = 0, hi = starts.length - 1;
    while (lo < hi) { var mid = (lo + hi + 1) >> 1; if (starts[mid] <= idx) { lo = mid; } else { hi = mid - 1; } }
    return lo + 1;
  }
  function add(id, line, extra) {
    var r = BY_ID[id];
    if (!r) { return; }
    findings.push({
      check: id,
      sev: r.sev,
      line: line,
      msg: 'WCAG 2.2 ' + r.sc + ' (' + r.level + ') ' + r.title + (extra ? ': ' + extra : '') + ' - fix: ' + r.fix
    });
  }

  /* document-level context */
  var labelFor = {}, m, re;
  re = /<label\b[^>]*(^|\s)for\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/gi;
  while ((m = re.exec(doc))) { labelFor[(m[3] !== undefined ? m[3] : (m[4] !== undefined ? m[4] : m[5]))] = true; }
  var labelSpans = [];
  re = /<label\b[\s\S]*?<\/label\s*>/gi;
  while ((m = re.exec(doc))) {
    if (/[A-Za-z0-9]/.test(textOf(m[0]))) { labelSpans.push([m.index, m.index + m[0].length]); }
  }
  function insideNamedLabel(idx) {
    for (var k = 0; k < labelSpans.length; k++) { if (idx > labelSpans[k][0] && idx < labelSpans[k][1]) { return true; } }
    return false;
  }
  var hasFocusVisible = /:focus-visible/.test(doc);

  /* focus outline removed */
  re = /outline\s*:\s*(none|0)\b/gi;
  while ((m = re.exec(doc))) { if (!hasFocusVisible) { add('focus_removed', lineAt(m.index)); } }

  /* tag walk */
  re = /<([a-zA-Z][a-zA-Z0-9-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  var mt;
  while ((mt = re.exec(doc))) {
    var name = mt[1].toLowerCase();
    var tag = mt[0];
    var line = lineAt(mt.index);
    var style = attrOf(tag, 'style') || '';
    var role = (attrOf(tag, 'role') || '').toLowerCase();
    var type = (attrOf(tag, 'type') || '').toLowerCase();

    if (name === 'html' && !hasAttr(tag, 'lang')) { add('lang_missing', line); }

    if (name === 'meta') {
      var content = attrOf(tag, 'content') || '';
      if (/viewport/i.test(attrOf(tag, 'name') || '') &&
          (/user-scalable\s*=\s*(no|0)/i.test(content) || /maximum-scale\s*=\s*(1(\.0+)?|0?\.\d+)\b/i.test(content))) {
        add('zoom_blocked', line, content);
      }
      if (/refresh/i.test(attrOf(tag, 'http-equiv') || '')) { add('meta_refresh', line, content); }
    }

    if (name === 'img' && !hasAttr(tag, 'alt')) { add('img_alt', line, attrOf(tag, 'src') || ''); }

    if (/onpaste|oncopy|ondrop/i.test(tag) && /false|preventDefault/i.test(tag)) { add('auth_paste_blocked', line); }

    if (hasAttr(tag, 'draggable') && (attrOf(tag, 'draggable') || '') === 'true' && !hasAttr(tag, 'data-dnd-alternative')) {
      add('dragging_only', line);
    }

    var tabindex = attrOf(tag, 'tabindex');
    if (tabindex !== null && parseInt(tabindex, 10) > 0) { add('positive_tabindex', line, 'tabindex="' + tabindex + '"'); }

    var focusable = (name === 'a' && hasAttr(tag, 'href')) || name === 'button' ||
                    (name === 'input' && !SKIP_TYPES.test(type)) || name === 'select' || name === 'textarea' ||
                    (tabindex !== null && parseInt(tabindex, 10) >= 0);
    if ((attrOf(tag, 'aria-hidden') || '') === 'true' && focusable) { add('aria_hidden_focusable', line); }

    var interactive = name === 'a' || name === 'button' || name === 'input' || name === 'select' || role === 'button' || role === 'link' || role === 'checkbox';
    if (interactive) {
      var w = pxIn(style, 'width'), h = pxIn(style, 'height');
      var mw = pxIn(style, 'min-width'), mh = pxIn(style, 'min-height');
      var small = [];
      if (w !== null && w < MIN_TARGET_PX && mw === null) { small.push('width ' + w + 'px'); }
      if (h !== null && h < MIN_TARGET_PX && mh === null) { small.push('height ' + h + 'px'); }
      if (mw !== null && mw < MIN_TARGET_PX) { small.push('min-width ' + mw + 'px'); }
      if (mh !== null && mh < MIN_TARGET_PX) { small.push('min-height ' + mh + 'px'); }
      if (small.length) { add('target_size', line, small.join(', ')); }
    }

    if ((name === 'div' || name === 'span' || name === 'li' || name === 'td' || name === 'img') &&
        /(^|\s)(onclick|@click|v-on:click|\(click\))\s*=/i.test(tag)) {
      var keyable = (role === 'button' || role === 'link') && tabindex !== null && parseInt(tabindex, 10) >= 0;
      if (!keyable) { add('click_no_key', line); }
    } else if (role === 'button' && name !== 'button' && name !== 'input' && tabindex === null) {
      add('click_no_key', line);
    }

    if (name === 'input' || name === 'select' || name === 'textarea') {
      var id = attrOf(tag, 'id') || '';
      var fname = attrOf(tag, 'name') || '';
      var key = (id + ' ' + fname + ' ' + type);
      var ac = attrOf(tag, 'autocomplete');
      if (!SKIP_TYPES.test(type)) {
        var named = hasAttr(tag, 'aria-label') || hasAttr(tag, 'aria-labelledby') ||
                    (id && labelFor[id]) || insideNamedLabel(mt.index) || hasAttr(tag, 'title');
        if (!named) {
          if (hasAttr(tag, 'placeholder')) { add('placeholder_as_label', line, attrOf(tag, 'placeholder') || ''); }
          else { add('no_label', line, '<' + name + (id ? ' id="' + id + '"' : '') + '>'); }
        }
        if (type === 'password') {
          if (ac === null || /^(off|false)$/i.test(ac)) { add('auth_no_autocomplete', line, ac === null ? 'no autocomplete' : 'autocomplete="' + ac + '"'); }
        } else if ((name === 'input' || name === 'select') && IDENTITY.test(key) && !ac) {
          add('input_purpose', line, (fname || id || type));
        }
        if (/(confirm|verify|repeat|re-?enter|retype)[-_ ]?(e-?mail|address|phone|tel)/i.test(key) ||
            /(e-?mail|address)[-_ ]?(confirm|verify|repeat|2)\b/i.test(key)) {
          add('redundant_entry', line, (fname || id));
        }
        if ((attrOf(tag, 'aria-invalid') || '') === 'true' && !hasAttr(tag, 'aria-describedby')) {
          add('error_no_desc', line, (fname || id));
        }
      }
    }

    if (name === 'button' || (name === 'a' && hasAttr(tag, 'href'))) {
      var close = doc.toLowerCase().indexOf('</' + name, re.lastIndex);
      var inner = close === -1 ? '' : doc.slice(re.lastIndex, close);
      var altText = '';
      var im = /<img\b[^>]*>/i.exec(inner);
      if (im) { altText = attrOf(im[0], 'alt') || ''; }
      var named2 = hasAttr(tag, 'aria-label') || hasAttr(tag, 'aria-labelledby') || hasAttr(tag, 'title') ||
                   /[A-Za-z0-9]/.test(textOf(inner)) || /[A-Za-z0-9]/.test(altText) ||
                   /<(svg|use)\b[^>]*>[\s\S]*?<title\b/i.test(inner);
      if (!named2) { add('icon_no_name', line); }
    }
  }

  findings.sort(function (a, b) { return a.line - b.line; });
  var errors = 0, warns = 0;
  for (i = 0; i < findings.length; i++) { if (findings[i].sev === 'error') { errors++; } else { warns++; } }
  return {
    findings: findings,
    summary: {
      errors: errors,
      warnings: warns,
      rules: RULES.length,
      standard: 'WCAG 2.2 AA',
      applicable_since: EAA_APPLICABLE,
      days_applicable: opts.today ? daysBetween(EAA_APPLICABLE, opts.today) : null
    }
  };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof window !== 'undefined') { window.EAAENGINE = API; }
if (typeof module !== 'undefined') { module.exports = API; }
