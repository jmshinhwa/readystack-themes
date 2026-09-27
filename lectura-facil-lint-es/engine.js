/* Lectura fácil / lenguaje claro — motor compartido por la extensión y la página web. */
(function () {
  'use strict';
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.LF_RULES;
  var BY = {};
  RULES.forEach(function (r) { BY[r.check] = r; });
  var IN_FORCE = '2027-01-02';
  var PARTICIPLE = /(^|[^\p{L}])(es|son|será|serán|fue|fueron|era|eran|sea|sean|ha sido|han sido|había sido|habían sido)\s+(\p{L}{3,}(?:ado|ada|ados|adas|ido|ida|idos|idas))(?![\p{L}])/giu;
  var FUT_SUBJ = /(^|[^\p{L}])((?:hub|fu|tuv|estuv|pud|hic|dij|vin|obtuv|dispus)ieren?|fueren?|(?:result|present|solicit|realiz|acredit|super)aren?|(?:correspond|proced|incumpl|exist|concurr|percib|recib)ieren?)(?![\p{L}])/giu;
  var ROMAN = /(^|[^\p{L}])(siglo|título|capítulo|tomo|fase|anexo|parte|libro|sección)\s+([IVXLC]{1,7})(?![\p{L}])/giu;
  var PCT = /\d+(?:[.,]\d+)?\s?%|por\s+ciento/giu;
  var ABBR = /(^|[^\p{L}])(etc|p\.\s?ej|arts?|núm|pág|págs|aprox|admón|tfno|telf|Sra?|Dña|vid|cfr)\./giu;
  var DATE = /(^|[^\d\/.-])(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})(?![\d\/.-]*\d)/g;
  var CAPS_RUN = /(?:[A-ZÁÉÍÓÚÜÑ]{2,}[\s,:]+){2,}[A-ZÁÉÍÓÚÜÑ]{2,}/gu;
  var ACRONYM = /(^|[^\p{L}])([A-ZÁÉÍÓÚÜÑ]{2,6})(?![\p{L}])/gu;
  var ITALIC_STAR = /(^|[^*\\])\*(?=[^\s*])([^*\n]*[^\s*])\*(?!\*)/g;
  var ITALIC_US = /(^|[^_\p{L}\d\\])_(?=\S)([^_\n]*\S)_(?![_\p{L}\d])/gu;
  var FORM_WORDS = /(^|[^\p{L}])(solicitud|solicitudes|formulario|formularios|trámite|trámites|tramite|impreso|instancia)(?![\p{L}])/iu;
  var LF_MARK = /lectura\s+f[áa]cil/iu;

  function parseDay(s) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(s || '').trim());
    if (!m) return null;
    var t = Date.UTC(+m[1], +m[2] - 1, +m[3]);
    return isNaN(t) ? null : t;
  }
  function daysLeft(today) {
    var t = parseDay(today);
    if (t === null) return '';
    var d = Math.round((parseDay(IN_FORCE) - t) / 86400000);
    return d > 0 ? ' Obligatorio desde ' + IN_FORCE + ': faltan ' + d + ' días.' : ' Obligatorio desde ' + IN_FORCE + ' (en vigor).';
  }
  function words(s) { return (s.match(/[\p{L}\d]+(?:[’'\-][\p{L}\d]+)*/gu) || []).length; }
  function clean(line) {
    return line.replace(/`[^`]*`/g, ' ').replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/https?:\/\/\S+/g, ' ').replace(/<[^>]+>/g, ' ');
  }

  function check(text, opts) {
    opts = opts || {};
    var findings = [];
    function add(rule, line, detail) {
      var r = BY[rule];
      findings.push({ check: r.check, id: r.id, sev: r.sev, line: line, msg: r.id + ' ' + r.title + (detail ? ': ' + detail.replace(/\.$/, '') : '') + '. ' + r.fix });
    }
    var raw = String(text || '').replace(/\r\n?/g, '\n').split('\n');
    var lines = [], inFence = false;
    raw.forEach(function (l) {
      if (/^\s*(```|~~~)/.test(l)) { inFence = !inFence; lines.push(''); return; }
      lines.push(inFence ? '' : clean(l));
    });
    var whole = lines.join(' ').replace(/\s+/g, ' ');

    // Siglas definidas en algún punto del texto: "Nombre (SIGLA)" o "SIGLA (nombre)".
    var defined = {};
    whole.replace(/\(([A-ZÁÉÍÓÚÜÑ]{2,6})\)/gu, function (_, a) { defined[a] = 1; return _; });
    whole.replace(/(?:^|[^\p{L}])([A-ZÁÉÍÓÚÜÑ]{2,6})\s+\([^)]*\p{Ll}[^)]*\)/gu, function (_, a) { defined[a] = 1; return _; });
    var seenAcr = {};

    lines.forEach(function (l, i) {
      var n = i + 1, m;
      if (!l.trim()) return;
      if (l.indexOf(';') >= 0) add('punto-y-coma', n, '«' + l.trim().slice(0, 60) + '»');
      ROMAN.lastIndex = 0;
      while ((m = ROMAN.exec(l))) add('numero-romano', n, '«' + m[2] + ' ' + m[3] + '»');
      PCT.lastIndex = 0;
      while ((m = PCT.exec(l))) add('porcentaje', n, '«' + m[0].trim() + '»');
      ABBR.lastIndex = 0;
      while ((m = ABBR.exec(l))) add('abreviatura', n, '«' + m[2] + '.»');
      PARTICIPLE.lastIndex = 0;
      while ((m = PARTICIPLE.exec(l))) add('voz-pasiva', n, '«' + m[2] + ' ' + m[3] + '»');
      FUT_SUBJ.lastIndex = 0;
      while ((m = FUT_SUBJ.exec(l))) add('futuro-subjuntivo', n, '«' + m[2] + '»');
      DATE.lastIndex = 0;
      while ((m = DATE.exec(l))) add('fecha-numerica', n, '«' + m[2] + '»');
      var body = l.replace(/^\s*#+\s*/, '');
      CAPS_RUN.lastIndex = 0;
      var masked = body;
      while ((m = CAPS_RUN.exec(body))) {
        if (m[0].replace(/[^\p{L}]/gu, '').length >= 12) {
          add('mayusculas-sostenidas', n, '«' + m[0].trim().slice(0, 40) + '»');
          masked = masked.replace(m[0], ' ');
        }
      }
      ACRONYM.lastIndex = 0;
      while ((m = ACRONYM.exec(masked))) {
        var a = m[2];
        if (/^[IVXLCDM]+$/.test(a) || defined[a] || seenAcr[a]) continue;
        seenAcr[a] = 1;
        add('sigla-sin-explicar', n, '«' + a + '»');
      }
      var noBold = l.replace(/\*\*[^*\n]+\*\*/g, ' ').replace(/__[^_\n]+__/g, ' ').replace(/^\s*[*+-]\s+/, '');
      ITALIC_STAR.lastIndex = 0; ITALIC_US.lastIndex = 0;
      while ((m = ITALIC_STAR.exec(noBold)) || (m = ITALIC_US.exec(noBold))) add('cursiva', n, '«' + m[2].slice(0, 40) + '»');
    });

    // Frases largas: se une cada bloque (párrafo, elemento de lista, título) y se aplana el salto de línea.
    var blocks = [], cur = null;
    lines.forEach(function (l, i) {
      var isStart = /^\s*(#{1,6}\s|[*+-]\s|\d+[.)]\s|>)/.test(l);
      if (!l.trim()) { cur = null; return; }
      if (!cur || isStart) { cur = { start: i + 1, parts: [] }; blocks.push(cur); }
      cur.parts.push(l.replace(/^\s*(#{1,6}\s|[*+-]\s|\d+[.)]\s|>\s?)/, ''));
    });
    blocks.forEach(function (b) {
      var joined = b.parts.join('\n');
      var re = /[^.!?…]+(?:[.!?…]+|$)/g, m;
      while ((m = re.exec(joined))) {
        var s = m[0].replace(/\s+/g, ' ').trim();
        if (!s) continue;
        var w = words(s);
        if (w > 20) {
          var lead = joined.slice(0, m.index + (m[0].length - m[0].replace(/^\s+/, '').length));
          add('frase-larga', b.start + (lead.match(/\n/g) || []).length, w + ' palabras, «' + s.slice(0, 50) + '…»');
        }
        if (m[0].length === 0) re.lastIndex++;
      }
    });

    if (FORM_WORDS.test(whole) && !LF_MARK.test(whole)) {
      add('sin-version-lectura-facil', 1, 'el texto habla de solicitud o formulario y no menciona una versión en lectura fácil.' + daysLeft(opts.today));
    }
    findings.sort(function (x, y) { return x.line - y.line; });
    return { findings: findings };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.LFENGINE = api;
})();
