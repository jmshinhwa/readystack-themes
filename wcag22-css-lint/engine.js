/* WCAG 2.2 CSS Lint - engine. Same file runs in Node (extension) and in the browser (free web page). */
(function (root) {
  'use strict';
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : (root.WCAG22_RULES || []);

  var BY_ID = {};
  RULES.forEach(function (r) { BY_ID[r.id] = r; });

  var INTERACTIVE = /(^|[\s,>+~])(a|button|input|select|summary|label)\b|\[role=["']?(button|link|tab|checkbox|switch|menuitem)|\.(btn|button|chip|tag|tab|pill|icon|close|toggle|link|nav-link|page|dot|star|swatch|thumb)/i;
  var BAR = /(header|nav|navbar|topbar|toolbar|appbar|banner|masthead|sticky|footer|cookie|consent)/i;
  var BODYTEXT = /(^|[\s,>+~])(body|p|li|dd|blockquote|td)\b|\.(prose|content|article|body-text|copy|text)\b/i;
  var SRONLY = /\.(sr-only|visually-hidden|visuallyhidden|screen-reader-text|a11y-hidden|hidden-visually)\b/i;
  var PAGEBOX = /(^|[\s,>+~])(html|body|main)\b|\.(page|wrapper|container|shell|layout|site|app)\b/i;

  function stripComments(t) {
    return t.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); });
  }

  function parse(text) {
    var out = [], stack = [], i = 0, selStart = 0;
    while (i < text.length) {
      var c = text.charAt(i);
      if (c === '{') { stack.push({ selIdx: selStart, sel: text.slice(selStart, i).trim(), start: i + 1 }); i++; selStart = i; continue; }
      if (c === '}') {
        var b = stack.pop();
        if (b) { b.body = text.slice(b.start, i); out.push(b); }
        i++; selStart = i; continue;
      }
      i++;
    }
    while (stack.length) { var r = stack.pop(); r.body = text.slice(r.start); out.push(r); }
    return out;
  }

  function lineOf(text, idx) { return text.slice(0, Math.max(0, idx)).split('\n').length; }

  function decls(block) {
    var out = [], re = /([-a-zA-Z]+)\s*:\s*([^;{}]*)/g, m;
    while ((m = re.exec(block.body)) !== null) {
      var raw = m[2];
      out.push({
        prop: m[1].toLowerCase(),
        value: raw.replace(/!important/i, '').trim(),
        important: /!important/i.test(raw),
        idx: block.start + m.index
      });
    }
    return out;
  }

  function px(v) { var m = /(-?\d*\.?\d+)\s*px/.exec(v); return m ? parseFloat(m[1]) : null; }

  function check(text, opts) {
    opts = opts || {};
    var src = stripComments(String(text == null ? '' : text));
    var all = parse(src);
    var rules = all.filter(function (b) { return b.sel && b.sel.charAt(0) !== '@'; });
    var atRules = all.filter(function (b) { return b.sel && b.sel.charAt(0) === '@'; });
    var findings = [];

    function add(id, line, detail) {
      var r = BY_ID[id]; if (!r) { return; }
      findings.push({
        check: id,
        sev: r.level === 'AAA' ? 'warn' : 'error',
        msg: '[' + r.sc + ' ' + r.level + ' ' + r.title + '] ' + detail + ' -> ' + r.fix,
        line: line
      });
    }

    var hasReducedMotion = atRules.some(function (b) { return /prefers-reduced-motion/i.test(b.sel); });
    var hasScrollPad = /scroll-(padding|margin)-top\s*:/i.test(src);
    var focusIndicator = rules.some(function (b) {
      return /:focus-visible\b/.test(b.sel) &&
        decls(b).some(function (d) {
          return (d.prop === 'outline' && !/^(none|0(px)?)$/i.test(d.value)) ||
            d.prop === 'outline-width' || d.prop === 'box-shadow';
        });
    });
    function bareSel(s) { return s.replace(/:hover/g, '').replace(/:focus(-visible|-within)?/g, '').replace(/\s+/g, ' ').trim(); }
    var focusTwins = rules.filter(function (b) { return /:focus(-visible|-within)?\b/.test(b.sel); })
      .map(function (b) { return bareSel(b.sel); });
    var motionDecl = null;

    rules.forEach(function (b) {
      var sel = b.sel.replace(/\s+/g, ' ');
      var ds = decls(b);
      var isFocus = /:focus(-visible)?\b/.test(sel);
      var smallest = null, smallestProp = '';

      ds.forEach(function (d) {
        var line = lineOf(src, d.idx);
        var p = px(d.value);

        if (/^(width|height|min-width|min-height)$/.test(d.prop) && p !== null && p > 0 && p < 24 &&
            INTERACTIVE.test(sel) && !SRONLY.test(sel)) {
          if (smallest === null || p < smallest) { smallest = p; smallestProp = d.prop + ': ' + d.value; }
          if (smallest === p) { b._tsLine = line; }
        }

        if (d.prop === 'outline' && /^(none|0(px)?)$/i.test(d.value) && !focusIndicator &&
            !ds.some(function (o) { return o.prop === 'box-shadow' || o.prop === 'border' || o.prop === 'border-bottom'; })) {
          add('focus_outline_removed', line, 'outline is removed on "' + sel + '" and nothing in this file draws a focus ring');
        }

        if (isFocus && (d.prop === 'outline-width' || d.prop === 'outline') && p !== null && p > 0 && p < 2) {
          add('focus_appearance_thin', line, 'focus ring on "' + sel + '" is ' + p + 'px thick');
        }

        if (/^(line-height|letter-spacing|word-spacing)$/.test(d.prop) && d.important) {
          add('text_spacing_important', line, d.prop + ' is locked with !important on "' + sel + '"');
        }

        if (d.prop === 'line-height' && BODYTEXT.test(sel)) {
          var n = parseFloat(d.value);
          var unitless = /^\d*\.?\d+$/.test(d.value.trim());
          if (unitless && n > 0 && n < 1.5) {
            add('line_height_tight', line, 'line-height is ' + n + ' on body text "' + sel + '"');
          }
        }

        if (/text-size-adjust$/.test(d.prop) && /none/i.test(d.value)) {
          add('zoom_blocked', line, 'text-size-adjust: none on "' + sel + '"');
        }

        if (d.prop === 'font-size' && p !== null && /(^|[\s,>+~])(html|body)\b|:root/.test(sel)) {
          add('root_font_px', line, 'root font-size is pinned to ' + p + 'px on "' + sel + '"');
        }

        if (d.prop === 'min-width' && p !== null && p > 320 && PAGEBOX.test(sel)) {
          add('reflow_min_width', line, 'min-width: ' + p + 'px on "' + sel + '" forces sideways scrolling below ' + p + 'px');
        }

        if (SRONLY.test(sel) && ((d.prop === 'display' && /none/i.test(d.value)) || (d.prop === 'visibility' && /hidden/i.test(d.value)))) {
          add('sr_only_hidden', line, '"' + sel + '" uses ' + d.prop + ': ' + d.value + ', so screen readers lose it too');
        }

        if ((d.prop === 'animation' || d.prop === 'animation-iteration-count') && /\binfinite\b/i.test(d.value)) {
          add('infinite_animation', line, 'animation on "' + sel + '" never stops');
        }

        if ((/^(animation|transition)(-duration)?$/.test(d.prop)) && !/^(none|0s?|initial)$/i.test(d.value) && motionDecl === null) {
          motionDecl = line;
        }

        if (d.prop === 'position' && /^(fixed|sticky)$/i.test(d.value) && BAR.test(sel) && !hasScrollPad) {
          add('focus_obscured_sticky', line, '"' + sel + '" is ' + d.value + ' and can cover the element the keyboard just moved to');
        }

        if (d.prop === 'content' && /::?(before|after)/.test(sel)) {
          var lit = /["']([^"']*)["']/.exec(d.value);
          if (lit && /[A-Za-z]{3,}/.test(lit[1]) && !/^attr\(/i.test(d.value)) {
            add('content_text_meaning', line, 'the words "' + lit[1].trim() + '" only exist in CSS on "' + sel + '"');
          }
        }
      });

      if (smallest !== null) {
        add('target_size_small', b._tsLine || lineOf(src, b.selIdx), 'control "' + sel + '" is ' + smallestProp + ', under the 24px minimum');
      }

      if (/:hover\b/.test(sel)) {
        var reveals = ds.some(function (d) {
          return (d.prop === 'display' && !/none/i.test(d.value)) ||
            (d.prop === 'visibility' && /visible/i.test(d.value)) ||
            (d.prop === 'opacity' && parseFloat(d.value) > 0.5);
        });
        var base = bareSel(sel);
        if (reveals && focusTwins.indexOf(base) === -1) {
          add('hover_only_reveal', lineOf(src, b.selIdx), '"' + sel + '" reveals content that no :focus-within rule reveals');
        }
      }
    });

    if (motionDecl !== null && !hasReducedMotion) {
      add('motion_no_guard', motionDecl, 'this file animates but never answers @media (prefers-reduced-motion: reduce)');
    }

    findings.sort(function (a, b) { return a.line - b.line || a.check.localeCompare(b.check); });
    return { findings: findings, today: opts.today || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) { module.exports = api; }
  root.WCAG22ENGINE = api;
})(typeof window !== 'undefined' ? window : globalThis);
