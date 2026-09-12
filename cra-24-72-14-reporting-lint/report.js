'use strict';
// Turns findings into something a human reads. Shared by the editor panel and the free web page.
function escapeHtml(s) {
  return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function summaryLine(res) {
  if (!res.findings.length) return 'Clean against all ' + res.counted + ' checks (as of ' + res.today + ').';
  return res.errors + ' blocking, ' + res.warnings + ' to review, out of ' + res.counted + ' checks (as of ' + res.today + ').';
}

function toText(res, label) {
  var out = [];
  if (label) out.push(label);
  out.push(summaryLine(res));
  for (var i = 0; i < res.findings.length; i++) {
    var f = res.findings[i];
    out.push('  ' + (f.line ? 'line ' + f.line : 'document') + '  [' + f.sev + '] ' + f.check);
    out.push('      ' + f.msg);
    out.push('      fix: ' + f.fix + '  (' + f.cite + ')');
  }
  return out.join('\n');
}

function toHtml(res) {
  var h = ['<p class="sum">' + escapeHtml(summaryLine(res)) + '</p>'];
  if (!res.findings.length) return h.join('');
  h.push('<table><thead><tr><th>Where</th><th>What breaks</th><th>How to fix it</th></tr></thead><tbody>');
  for (var i = 0; i < res.findings.length; i++) {
    var f = res.findings[i];
    h.push('<tr class="' + escapeHtml(f.sev) + '">' +
      '<td><code>' + escapeHtml(f.line ? 'line ' + f.line : 'document') + '</code><br><small>' + escapeHtml(f.cite) + '</small></td>' +
      '<td>' + escapeHtml(f.msg) + '</td>' +
      '<td>' + escapeHtml(f.fix) + '</td></tr>');
  }
  h.push('</tbody></table>');
  return h.join('');
}

var CRAREPORT = { toText: toText, toHtml: toHtml, summaryLine: summaryLine };
if (typeof module !== 'undefined' && module.exports) module.exports = CRAREPORT;
else window.CRAREPORT = CRAREPORT;
