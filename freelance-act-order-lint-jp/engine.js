// フリーランス新法（特定受託事業者に係る取引の適正化等に関する法律・2024-11-01 施行）
// 発注書／業務委託契約の Markdown を、明示事項・支払期日・予告期間で検査する。
// 同じファイルが Node（拡張機能）でもブラウザ（無料ウェブ版）でも動く。
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.FLJP_RULES;

var RE_RECV = /(納品日|納入日|納期|受領する期日|役務の提供を受ける期日)/;
var RE_PAY = /(支払期日|支払期限|支払日)/;
var RE_END = /(契約(の)?(終了日|満了日)|契約終了日|満了日)/;

function splitLines(t) { return String(t == null ? '' : t).split(/\r?\n/); }
function anyRe(list) { return new RegExp('(?:' + (list || []).join(')|(?:') + ')'); }
function lineOf(ls, re) { for (var i = 0; i < ls.length; i++) { if (re.test(ls[i])) return i + 1; } return 1; }
function parseDate(s) {
  var m = String(s || '').match(/(\d{4})\s*[-\/年.]\s*(\d{1,2})\s*[-\/月.]\s*(\d{1,2})/);
  if (!m) return null;
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return isNaN(d.getTime()) ? null : d;
}
function datedLine(ls, re) {
  for (var i = 0; i < ls.length; i++) {
    if (re.test(ls[i])) { var d = parseDate(ls[i]); if (d) return { d: d, line: i + 1, raw: ls[i].trim() }; }
  }
  return null;
}
function days(a, b) { return Math.round((b.getTime() - a.getTime()) / 86400000); }
function ymd(d) { return d.toISOString().slice(0, 10); }
function months(text) {
  var m = text.match(/契約期間[^\n]{0,40}?(\d+)\s*(?:か月|ヶ月|カ月|箇月|ケ月)/);
  if (m) return +m[1];
  m = text.match(/契約期間[^\n]{0,40}?(\d+)\s*年/);
  if (m) return +m[1] * 12;
  if (/6\s*(?:か月|ヶ月|カ月)以上/.test(text)) return 6;
  var s = datedLine(splitLines(text), /契約期間/), e = datedLine(splitLines(text), RE_END);
  if (s && e) return Math.round(days(s.d, e.d) / 30);
  return null;
}
function noticeDays(text) {
  var m = text.match(/(\d+)\s*日前まで[^\n]{0,20}?(?:予告|通知|申し入れ|申入れ)/);
  if (!m) m = text.match(/(?:解除|解約|更新しない|不更新)[^\n]{0,30}?(\d+)\s*日前/);
  return m ? +m[1] : null;
}

function check(text, opts) {
  opts = opts || {};
  var t = String(text == null ? '' : text), ls = splitLines(t), out = [];
  var today = parseDate(opts.today) || new Date();
  var recv = datedLine(ls, RE_RECV), pay = datedLine(ls, RE_PAY), end = datedLine(ls, RE_END);
  var mon = months(t), notice = noticeDays(t);

  function push(r, msg, line) { out.push({ check: r.id, sev: r.sev, msg: r.art + ' ' + r.label + '：' + msg + ' → ' + r.fix, line: line || 1 }); }

  for (var i = 0; i < RULES.length; i++) {
    var r = RULES[i], cond = r.only_if ? anyRe(r.only_if) : null;
    if (cond && !cond.test(t)) continue;
    if (r.kind === 'require') {
      if (!anyRe(r.any).test(t)) push(r, '記載が見つからない', cond ? lineOf(ls, cond) : 1);
    } else if (r.kind === 'forbid') {
      var re = anyRe(r.any);
      for (var j = 0; j < ls.length; j++) {
        if (re.test(ls[j])) { push(r, '「' + ls[j].trim().slice(0, 40) + '」', j + 1); break; }
      }
    } else if (r.kind === 'pay_window') {
      if (recv && pay) {
        var d = days(recv.d, pay.d);
        if (d > r.limit) push(r, '受領日 ' + ymd(recv.d) + ' から支払期日 ' + ymd(pay.d) + ' まで ' + d + '日（' + (d - r.limit) + '日 超過）', pay.line);
      }
    } else if (r.kind === 'notice_days') {
      if (mon !== null && mon >= r.months) {
        if (notice === null) push(r, '契約期間 ' + mon + 'か月なのに予告期間の条項がない', 1);
        else if (notice < r.min) push(r, '契約期間 ' + mon + 'か月で予告が ' + notice + '日前（' + (r.min - notice) + '日 不足）', lineOf(ls, /(解除|解約|更新)/));
      }
    } else if (r.kind === 'notice_window') {
      if (mon !== null && mon >= r.months && end) {
        var left = days(today, end.d);
        if (left >= 0 && left < r.min && !/(更新しない|不更新)[^\n]{0,20}(予告|通知)/.test(t)) {
          push(r, '契約終了日 ' + ymd(end.d) + ' まで残り ' + left + '日。30日前予告の期限は過ぎている', end.line);
        }
      }
    }
  }
  out.sort(function (a, b) { return a.line - b.line; });
  return { findings: out };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.FLJPENGINE = API; }
