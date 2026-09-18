/* EPUB Accessibility Metadata Lint — one brain, used by the VS Code extension and by the web page. */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.EPUBA11Y_RULES;

  var MODES = ['auditory', 'tactile', 'textual', 'visual', 'colorDependent',
    'chartOnVisual', 'chemOnVisual', 'diagramOnVisual', 'mathOnVisual', 'musicOnVisual', 'textOnVisual'];
  var SUFFICIENT = ['auditory', 'tactile', 'textual', 'visual'];
  var HAZARDS = ['none', 'unknown', 'flashing', 'noFlashingHazard', 'motionSimulation',
    'noMotionSimulationHazard', 'sound', 'noSoundHazard'];
  var FEATURES = ['alternativeText', 'annotations', 'ARIA', 'audioDescription', 'bookmarks', 'braille',
    'captions', 'ChemML', 'closedCaptions', 'describedMath', 'displayTransformability', 'fullRubyAnnotations',
    'highContrastAudio', 'highContrastDisplay', 'index', 'largePrint', 'latex', 'longDescription', 'MathML',
    'none', 'openCaptions', 'pageBreakMarkers', 'pageNavigation', 'printPageNumbers', 'readingOrder',
    'rubyAnnotations', 'signLanguage', 'structuralNavigation', 'synchronizedAudioText', 'tableOfContents',
    'tactileGraphic', 'tactileObject', 'timingControl', 'transcript', 'ttsMarkup', 'unlocked', 'unknown'];
  var ALT_FEATURES = ['alternativeText', 'longDescription', 'describedMath', 'transcript', 'audioDescription'];
  var CONFORMS_OK = /^EPUB Accessibility 1\.1 - WCAG 2\.[0-2] Level (A|AA|AAA)$/;
  var CONFORMS_LEGACY = /(EPUB Accessibility 1\.0|accessibility-20170105)/i;

  function lineOf(text, idx) { return text.slice(0, idx).split('\n').length; }

  function attr(tag, name) {
    var m = new RegExp(name + '\\s*=\\s*["\']([^"\']*)["\']', 'i').exec(tag);
    return m ? m[1].trim() : '';
  }

  function collect(text) {
    var out = [], re = /<(meta|link)\b([^>]*)>/gi, m;
    while ((m = re.exec(text))) {
      var tag = m[0], attrs = m[2], val = '';
      if (m[1].toLowerCase() === 'meta' && !/\/\s*$/.test(attrs)) {
        var close = text.indexOf('</meta>', re.lastIndex);
        var nextTag = text.indexOf('<', re.lastIndex);
        if (close !== -1 && (nextTag === -1 || close <= nextTag)) val = text.slice(re.lastIndex, close).trim();
      }
      var prop = attr(tag, 'property') || attr(tag, 'rel');
      var legacyName = attr(tag, 'name');
      if (!val) val = attr(tag, 'content') || attr(tag, 'href');
      out.push({
        tag: m[1].toLowerCase(),
        prop: prop,
        name: legacyName,
        val: val,
        legacy: !prop && !!legacyName,
        line: lineOf(text, m.index)
      });
    }
    return out;
  }

  function check(text, opts) {
    opts = opts || {};
    text = String(text == null ? '' : text);
    var findings = [];
    var byId = {};
    for (var i = 0; i < RULES.length; i++) byId[RULES[i].id] = RULES[i];
    var head = /<metadata\b/i.exec(text);
    var base = head ? lineOf(text, head.index) : 1;

    function add(id, line, extra) {
      var r = byId[id] || { sev: 'error', msg: id, fix: '' };
      findings.push({
        check: id,
        sev: r.sev,
        msg: r.msg + (extra ? ' ' + extra : '') + (r.fix ? ' Fix: ' + r.fix : ''),
        line: line || base
      });
    }

    var items = collect(text);
    function of(prop) {
      var p = prop.toLowerCase();
      return items.filter(function (x) { return (x.prop || '').toLowerCase() === p; });
    }
    function values(prop) {
      return of(prop).map(function (x) { return x.val; }).filter(function (v) { return v !== ''; });
    }

    // 1. legacy EPUB 2 metadata syntax
    items.filter(function (x) { return x.legacy && /^(schema:|a11y:|dcterms:conformsTo)/i.test(x.name); })
      .forEach(function (x) { add('legacy_meta_syntax', x.line, '(' + x.name + ')'); });

    // 2. accessMode
    var modes = values('schema:accessMode');
    if (!modes.length) add('access_mode_missing');
    of('schema:accessMode').forEach(function (x) {
      if (x.val && MODES.indexOf(x.val) === -1) add('access_mode_unknown', x.line, 'Found "' + x.val + '".');
    });

    // 3. accessModeSufficient
    var suff = values('schema:accessModeSufficient');
    if (!suff.length) add('access_mode_sufficient_missing');
    of('schema:accessModeSufficient').forEach(function (x) {
      x.val.split(',').map(function (t) { return t.trim(); }).filter(Boolean).forEach(function (t) {
        if (SUFFICIENT.indexOf(t) === -1) add('access_mode_sufficient_unknown', x.line, 'Found "' + t + '".');
      });
    });

    // 4. accessibilityFeature
    var feats = values('schema:accessibilityFeature');
    if (!feats.length) add('feature_missing');
    of('schema:accessibilityFeature').forEach(function (x) {
      if (x.val && FEATURES.indexOf(x.val) === -1) add('feature_unknown', x.line, 'Found "' + x.val + '".');
    });
    if (feats.length > 1 && feats.indexOf('none') !== -1) {
      add('feature_none_conflict', of('schema:accessibilityFeature')[0].line);
    }

    // 5. accessibilityHazard
    var haz = of('schema:accessibilityHazard');
    if (!haz.length) add('hazard_missing');
    haz.forEach(function (x) {
      if (x.val && HAZARDS.indexOf(x.val) === -1) add('hazard_unknown', x.line, 'Found "' + x.val + '".');
    });

    // 6. accessibilitySummary
    var sum = of('schema:accessibilitySummary');
    if (!sum.length) add('summary_missing');
    sum.forEach(function (x) {
      var v = x.val.replace(/\s+/g, ' ').trim();
      if (v.length < 40 || /^(this |the )?(e-?book|publication|title|file)?\s*(is|are)?\s*(fully |wcag )?accessible\.?$/i.test(v)) {
        add('summary_boilerplate', x.line, 'Found ' + v.length + ' characters.');
      }
    });

    // 7. conformsTo + certifier
    var conf = of('dcterms:conformsTo');
    if (!conf.length) {
      add('conformsto_missing');
    } else {
      conf.forEach(function (x) {
        if (CONFORMS_LEGACY.test(x.val)) add('conformsto_legacy', x.line);
        else if (!CONFORMS_OK.test(x.val)) add('conformsto_malformed', x.line, 'Found "' + x.val + '".');
      });
      if (!of('a11y:certifiedBy').length) add('certified_by_missing', conf[0].line);
    }

    // 8. print page numbers without a print source
    if ((feats.indexOf('printPageNumbers') !== -1 || feats.indexOf('pageBreakMarkers') !== -1) &&
        !/<dc:source\b/i.test(text)) {
      add('page_source_missing');
    }

    // 9. a textual-alone claim over visual content with no alternative text
    var visual = modes.some(function (m) { return m === 'visual' || /OnVisual$/.test(m); });
    var textualAlone = suff.some(function (s) { return s.replace(/\s/g, '') === 'textual'; });
    var hasAlt = feats.some(function (f) { return ALT_FEATURES.indexOf(f) !== -1; });
    if (visual && textualAlone && !hasAlt) {
      add('visual_without_alt', (of('schema:accessModeSufficient')[0] || {}).line);
    }

    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, today: opts.today || '' };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.EPUBA11YENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
