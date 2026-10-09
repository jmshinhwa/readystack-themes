// s184 W1 2026-10-09 — the WORK, not a report. PyMuPDF (fitz, AGPL) -> pypdf (BSD) rewrites.
// [실측 10/9] 226 uses/week from 30 countries; the paid part was a dated report nobody bought.
// ★A line-by-line swap would break code (import fitz gone while fitz.open stays). So a FILE is migrated only when every
//   PyMuPDF use in it is inside the closed set below; otherwise the file is left exactly as it was and each line gets a how-to.
//   Closed set (pypdf 6.x API, checked on this server with pypdf 6.7.0): import fitz|pymupdf [as M] -> from pypdf import PdfReader ·
//   V = M.open(x)|M.Document(x) and `with M.open(x) as V:` -> PdfReader(x) · for p in V / enumerate(V) -> V.pages ·
//   V[i] / V.load_page(i) -> V.pages[i] · len(V) / V.page_count -> len(V.pages) · V.close() stays (PdfReader.close) ·
//   p.get_text() / p.get_text("text") -> p.extract_text().
// Requirements lines (pymupdf / PyMuPDFb / fitz) -> pypdf>=6.19 only when the caller says every importing file was migrated.
// Pure: fixText(text) -> {text, applied[], manual[], status: 'migrated'|'unsupported'|'none'} · fixReq(line) · fixLine(line)
(function () {
  'use strict';
  var IMPORT = /^(\s*)import\s+(fitz|pymupdf)(?:\s+as\s+([A-Za-z_]\w*))?\s*(#.*)?$/;
  var ANY_IMPORT = /^\s*(?:import\s+[^#\n]*\b(?:fitz|pymupdf)\b|from\s+(?:fitz|pymupdf)\b)/;
  var HOW = {
    'get-pixmap': 'Render with pypdfium2: pypdfium2.PdfDocument(path)[i].render(scale=dpi/72).to_pil().',
    'search-for': 'Search with pdfplumber: pdfplumber.open(path).pages[i].search("text").',
    'find-tables': 'Tables with pdfplumber: pdfplumber.open(path).pages[i].extract_tables().',
    'insert-pdf': 'Merge with pypdf: writer = PdfWriter(); writer.append(reader).',
    'get-toc': 'Outline with pypdf: reader.outline.',
    'set-metadata': 'Metadata with pypdf: writer.add_metadata({"/Title": title}).',
    'set-rotation': 'Rotate with pypdf: page.rotate(90).',
    'get-images': 'Images with pypdf: page.images (each has .name and .data).',
    'insert-text': 'Draw on a reportlab canvas, then page.merge_page(overlay_page) in pypdf.',
    'authenticate': 'Decrypt with pypdf: reader.decrypt(password).',
    'fitz-matrix': 'Render with pypdfium2 page.render(scale=dpi/72); crop with pdfplumber page.crop((x0, top, x1, bottom)).',
    'import-pymupdf4llm': 'pymupdf4llm -> pdfplumber: page.extract_text() / page.extract_tables(); swap by hand.',
    'req-pymupdf4llm': 'Swap to pdfplumber>=0.11.10 after the code that imports pymupdf4llm is changed.',
    'req-pymupdfpro': 'Keep it only with a company licence; Office conversion has no drop-in free replacement.',
    'from-fitz': 'Rewrite the names imported from fitz with pypdf (PdfReader, PdfWriter) by hand.',
    'langchain-loader': 'Use from langchain_community.document_loaders import PyPDFLoader.',
    'llamaindex-reader': 'Use from llama_index.readers.file import PDFReader.'
  };
  var FITZ_ONLY = /\.(?:get_pixmap|get_page_pixmap|search_for|search_page_for|find_tables|insert_pdf|insert_file|get_toc|set_toc|set_metadata|set_rotation|get_images|get_page_images|insert_text|insert_textbox|insert_image|authenticate|new_page|delete_page|delete_pages|tobytes|get_links|get_drawings|get_textpage|get_text_words|get_text_blocks|extract_image|convert_to_pdf|embfile_\w+|xref_\w+|page_count|load_page|apply_redactions|add_redact_annot)\b/;
  var GENERIC = 'This file uses PyMuPDF features outside the automatic set; change it by hand (the finding says what to use).';
  function esc(s) { return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
  function oneArg(a) {   // a single positional argument with balanced brackets and no top-level comma / keyword
    var d = 0, i, c, q = null;
    for (i = 0; i < a.length; i++) {
      c = a[i];
      if (q) { if (c === '\\') { i++; continue; } if (c === q) q = null; continue; }
      if (c === '"' || c === "'") { q = c; continue; }
      if ('([{'.indexOf(c) >= 0) d++; else if (')]}'.indexOf(c) >= 0) { d--; if (d < 0) return false; }
      else if (c === ',' && d === 0) return false;
      else if (c === '=' && d === 0 && a[i + 1] !== '=' && '!<>='.indexOf(a[i - 1]) < 0) return false;
    }
    return d === 0 && !q && a.trim().length > 0;
  }
  function code(line) { return String(line).replace(/#.*$/, ''); }   // a crude comment strip, used only to SEARCH (never to write)
  function fixText(text, findings) {
    var src = String(text == null ? '' : text), nl = /\r\n/.test(src) ? '\r\n' : '\n';
    var L = src.split(/\r?\n/), out = L.slice(), applied = [], M = null, mods = [], i, m;
    var manualAll = function (why) {
      return { text: src, applied: [], status: 'unsupported',
        manual: (findings || []).map(function (f) { return { line: f.line, rule: f.check, how: HOW[f.check] || why || GENERIC }; }) };
    };
    for (i = 0; i < L.length; i++) {
      if (!ANY_IMPORT.test(L[i])) continue;
      m = IMPORT.exec(L[i]);
      if (!m) return manualAll(HOW['from-fitz']);
      if (M && M !== (m[3] || m[2])) return manualAll();
      M = m[3] || m[2]; mods.push(i);
    }
    if (!M) return { text: src, applied: [], manual: (findings || []).filter(function (f) { return f.check.indexOf('req-') !== 0; }).map(function (f) { return { line: f.line, rule: f.check, how: HOW[f.check] || GENERIC }; }), status: 'none' };
    var Mq = esc(M), V = {}, P = {};
    var OPEN_ASSIGN = new RegExp('^(\\s*)([A-Za-z_]\\w*)\\s*=\\s*' + Mq + '\\.(?:open|Document)\\((.*)\\)\\s*(#.*)?$');
    var OPEN_WITH = new RegExp('^(\\s*)with\\s+' + Mq + '\\.(?:open|Document)\\((.*)\\)\\s+as\\s+([A-Za-z_]\\w*)\\s*:\\s*(#.*)?$');
    for (i = 0; i < L.length; i++) {
      if ((m = OPEN_ASSIGN.exec(L[i]))) { if (!oneArg(m[3])) return manualAll(); V[m[2]] = 1; out[i] = m[1] + m[2] + ' = PdfReader(' + m[3] + ')' + (m[4] ? '  ' + m[4] : ''); }
      else if ((m = OPEN_WITH.exec(L[i]))) { if (!oneArg(m[2])) return manualAll(); V[m[3]] = 1; out[i] = m[1] + 'with PdfReader(' + m[2] + ') as ' + m[3] + ':' + (m[4] ? '  ' + m[4] : ''); }
    }
    mods.forEach(function (k) { out[k] = L[k].replace(IMPORT, function (_, ind, mod, as, cm) { return ind + 'from pypdf import PdfReader' + (cm ? '  ' + cm : ''); }); });
    var names = Object.keys(V);
    names.forEach(function (v) {
      var q = esc(v);
      var forRe = new RegExp('^(\\s*for\\s+(?:[A-Za-z_]\\w*|[A-Za-z_]\\w*\\s*,\\s*[A-Za-z_]\\w*)\\s+in\\s+)(enumerate\\(\\s*)?' + q + '(\\s*\\))?(\\s*:)');
      for (i = 0; i < out.length; i++) {
        var s = out[i], fm = forRe.exec(s);
        if (fm) {
          var pv = /for\s+(?:\w+\s*,\s*)?([A-Za-z_]\w*)\s+in/.exec(s); if (pv) P[pv[1]] = 1;
          s = s.replace(forRe, function (_, a, en, cl, co) { return a + (en || '') + v + '.pages' + (cl || '') + co; });
        }
        s = s.replace(new RegExp('\\blen\\(\\s*' + q + '\\s*\\)', 'g'), 'len(' + v + '.pages)')
             .replace(new RegExp('\\b' + q + '\\.page_count\\b', 'g'), 'len(' + v + '.pages)')
             .replace(new RegExp('\\b' + q + '\\.load_page\\(\\s*([\\w.+\\- ]+?)\\s*\\)', 'g'), v + '.pages[$1]')
             .replace(new RegExp('\\b' + q + '\\[', 'g'), v + '.pages[');
        var pa = new RegExp('^\\s*([A-Za-z_]\\w*)\\s*=\\s*' + q + '\\.pages\\[').exec(s); if (pa) P[pa[1]] = 1;
        out[i] = s;
      }
    });
    for (i = 0; i < out.length; i++) out[i] = out[i].replace(/\.get_text\(\s*(?:"text"|'text')?\s*\)/g, '.extract_text()');
    // ── safety: anything left that still speaks PyMuPDF means this file is NOT in the closed set → change nothing
    for (i = 0; i < out.length; i++) {
      var c = code(out[i]);
      if (new RegExp('\\b' + Mq + '\\b').test(c) && mods.indexOf(i) < 0) return manualAll();
      if (/\.get_text\(/.test(c)) return manualAll();
      if (FITZ_ONLY.test(c)) return manualAll();                                        // a PyMuPDF-only call anywhere in the file
      if (/\.pages\[[^\]\n]*\]\s*\.(?!extract_text\(\))\w/.test(c)) return manualAll();   // a page used for anything but its text
      for (var v in V) {
        var re = new RegExp('\\b' + esc(v) + '\\b(?!\\.pages\\b|\\.close\\(\\))', 'g'), mm;
        while ((mm = re.exec(c))) {
          var before = c.slice(0, mm.index);
          if (/(?:^|\s)$/.test(before) && new RegExp('^\\s*' + esc(v) + '\\s*=\\s*PdfReader\\(').test(c)) continue;   // the definition
          if (/\bas\s+$/.test(before)) continue;                                                                       // with ... as V
          return manualAll();
        }
      }
      for (var p in P) {
        var rp = new RegExp('\\b' + esc(p) + '\\.(?!extract_text\\(\\))\\w', 'g');
        if (rp.test(c)) return manualAll();
      }
    }
    for (i = 0; i < L.length; i++) if (out[i] !== L[i]) applied.push({ line: i + 1, rule: 'pypdf', before: L[i], after: out[i] });
    return { text: out.join(nl), applied: applied, manual: [], status: applied.length ? 'migrated' : 'none' };
  }
  var REQ = /(["']?)\b(pymupdfb|pymupdf|fitz)\b(\[[^\]]*\])?\s*((?:[<>=!~]=?|=)\s*[\w.*+]+(?:\s*,\s*(?:[<>=!~]=?)\s*[\w.*+]+)*)?\1/i;
  function fixReq(line) {   // one requirements / pyproject / environment.yml line -> pypdf>=6.19 (keeps indent, list dash, quotes, trailing comma)
    var s = String(line == null ? '' : line);
    if (/^\s*#/.test(s) || /pymupdf4llm|pymupdfpro/i.test(s)) return null;
    var m = REQ.exec(s); if (!m) return null;
    var after = s.slice(0, m.index) + m[1] + 'pypdf>=6.19' + m[1] + s.slice(m.index + m[0].length);
    return after === s ? null : { after: after, rule: 'req' };
  }
  function fixLine(line) { return fixReq(line); }
  var API = { fixText: fixText, fixReq: fixReq, fixLine: fixLine, HOW: HOW, kind: 'file' };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.PYPDFMIG_FIX = API;
})();
