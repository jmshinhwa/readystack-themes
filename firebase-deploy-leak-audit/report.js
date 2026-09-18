// ⛔뼈대 — kit/scaffold.py 가 찍는다 (s143). findings [{check,sev,msg,line?}] → 글/HTML. 같은 파일이 Node 와 브라우저에서 산다.
'use strict';
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function summaryLine(res) {
  const f = (res && res.findings) || []; const e = f.filter(function (x) { return String(x.sev || 'error').toLowerCase().startsWith('err'); }).length;
  return f.length ? (f.length + ' finding' + (f.length === 1 ? '' : 's') + ' (' + e + ' error' + (e === 1 ? '' : 's') + ')') : 'Clean — no findings.';
}
function toText(res, label) {
  const f = (res && res.findings) || [];
  const lines = ['== ' + (label || '') + ' — ' + summaryLine(res)];
  f.forEach(function (x) { lines.push('  ' + String(x.sev || 'error').toUpperCase().slice(0, 4) + '  ' + (x.line ? 'L' + x.line + '  ' : '') + (x.check || x.id || '') + '  ' + (x.msg || x.message || '')); });
  return lines.join('\n');
}
function toHtml(res) {
  const f = (res && res.findings) || [];
  if (!f.length) return '<p class="ok">' + escapeHtml(summaryLine(res)) + '</p>';
  const rows = f.map(function (x) { return '<tr><td class="sev ' + escapeHtml(String(x.sev || 'error')) + '">' + escapeHtml(String(x.sev || 'error')) + '</td><td>' + (x.line ? 'L' + escapeHtml(x.line) : '') + '</td><td><code>' + escapeHtml(x.check || x.id || '') + '</code></td><td>' + escapeHtml(x.msg || x.message || '') + '</td></tr>'; }).join('');
  return '<p class="sum">' + escapeHtml(summaryLine(res)) + '</p><table><thead><tr><th>Level</th><th>Line</th><th>Check</th><th>What</th></tr></thead><tbody>' + rows + '</tbody></table>';
}
var FDLREPORT = { escapeHtml: escapeHtml, summaryLine: summaryLine, toText: toText, toHtml: toHtml };
if (typeof module !== 'undefined' && module.exports) module.exports = FDLREPORT;
else window.FDLREPORT = FDLREPORT;
