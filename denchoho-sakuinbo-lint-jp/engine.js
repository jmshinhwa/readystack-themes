// 電帳法 索引簿リンター — 電子取引データの索引簿を検索要件で検査する両用エンジン
// 同じファイルが Node (VS Code 拡張) でもブラウザ (無料ウェブ版) でも動く
(function () {
  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : window.DCH_RULES;

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  var COLS = {
    seq:    ['連番', 'no', 'no.', '番号', '通番'],
    date:   ['取引年月日', '年月日', '取引日', '日付'],
    amount: ['取引金額', '金額', '税込金額', '合計金額'],
    party:  ['取引先', '取引先名', '相手先', '得意先', '支払先'],
    file:   ['ファイル名', '保存ファイル名', '書類名', 'ファイル']
  };

  var BAD_CHARS = ['\\', '/', ':', '*', '?', '"', '<', '>', '|', ' ', '\u3000'];
  var EMPTY_PARTY = ['同上', '〃', '同　上', '-', '‐', 'ー', '不明', '未定', 'na', 'n/a'];

  function norm(s) {
    return String(s == null ? '' : s).replace(/^[\s"']+|[\s"']+$/g, '');
  }
  function toHalf(s) {
    return s.replace(/[０-９]/g, function (c) {
      return String.fromCharCode(c.charCodeAt(0) - 0xFEE0);
    });
  }
  function splitRow(line) {
    var t = line.replace(/^\s*\|/, '').replace(/\|\s*$/, '');
    if (line.indexOf('|') >= 0) return t.split('|');
    if (line.indexOf('\t') >= 0) return line.split('\t');
    return line.split(',');
  }
  function isSepRow(cells) {
    for (var i = 0; i < cells.length; i++) {
      if (!/^[\s:\-=]*$/.test(cells[i])) return false;
    }
    return cells.length > 1;
  }
  function headerIndex(cells) {
    var map = { seq: -1, date: -1, amount: -1, party: -1, file: -1 };
    for (var c = 0; c < cells.length; c++) {
      var v = norm(cells[c]).toLowerCase().replace(/\s/g, '');
      for (var k in COLS) {
        if (map[k] >= 0) continue;
        for (var j = 0; j < COLS[k].length; j++) {
          if (v === COLS[k][j].toLowerCase() || v.indexOf(COLS[k][j].toLowerCase()) >= 0) {
            map[k] = c; break;
          }
        }
      }
    }
    return map;
  }
  function looksLikeHeader(cells) {
    var m = headerIndex(cells);
    return (m.date >= 0 || m.amount >= 0 || m.party >= 0 || m.file >= 0);
  }
  function parseDate(raw) {
    var s = toHalf(norm(raw)).replace(/\s/g, '');
    if (!s) return { ok: false, why: 'empty' };
    if (/[年月日令平昭]/.test(s)) return { ok: false, why: 'format' };
    var m = s.match(/^(\d{4})[-\/.](\d{1,2})[-\/.](\d{1,2})$/);
    if (!m) {
      m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
      if (!m) return { ok: false, why: 'format' };
    }
    var y = +m[1], mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return { ok: false, why: 'invalid', y: y, mo: mo, d: d };
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return { ok: false, why: 'invalid' };
    var key = m[1] + (mo < 10 ? '0' : '') + mo + (d < 10 ? '0' : '') + d;
    return { ok: true, iso: key.slice(0, 4) + '-' + key.slice(4, 6) + '-' + key.slice(6), key: key, t: dt.getTime() };
  }

  function check(text, opts) {
    opts = opts || {};
    var today = parseDate(opts.today || '2026-09-19');
    var todayT = today.ok ? today.t : Date.UTC(2026, 8, 19);
    var findings = [];
    function add(id, line, extra) {
      var r = BY_ID[id];
      findings.push({
        check: id,
        sev: r.sev,
        msg: r.label + (extra ? ' — ' + extra : '') + ' [' + r.cite + ']',
        line: line
      });
    }

    var lines = String(text || '').split(/\r?\n/);
    var head = -1, map = null;
    for (var i = 0; i < lines.length; i++) {
      var raw = lines[i];
      if (!norm(raw)) continue;
      var cells = splitRow(raw);
      if (isSepRow(cells)) continue;
      if (looksLikeHeader(cells)) { head = i; map = headerIndex(cells); break; }
    }
    if (head < 0) {
      add('header_missing', 1, '取引年月日・取引金額・取引先の見出し行が見つかりません');
      return { findings: findings };
    }
    var lack = [];
    if (map.date < 0) lack.push('取引年月日');
    if (map.amount < 0) lack.push('取引金額');
    if (map.party < 0) lack.push('取引先');
    if (lack.length) add('header_missing', head + 1, lack.join('・') + ' の列がない');

    var seen = {}, prevSeq = null;
    for (var r2 = head + 1; r2 < lines.length; r2++) {
      var lineNo = r2 + 1;
      var line = lines[r2];
      if (!norm(line)) continue;
      var c = splitRow(line);
      if (isSepRow(c)) continue;
      var get = function (k) { return map[k] >= 0 && map[k] < c.length ? norm(c[map[k]]) : ''; };

      var dRaw = get('date'), d = parseDate(dRaw);
      if (map.date >= 0) {
        if (!d.ok && d.why === 'format') add('date_format', lineNo, '"' + dRaw + '" → YYYY-MM-DD');
        else if (!d.ok) add('date_invalid', lineNo, '"' + dRaw + '" は存在しない日付');
        else if (d.t > todayT) add('date_invalid', lineNo, d.iso + ' は未来日');
        else if (d.t < todayT - 7 * 365.25 * 86400000) add('retention_expired', lineNo, d.iso);
      }

      if (map.amount >= 0) {
        var aRaw = get('amount');
        if (!aRaw) add('amount_missing', lineNo, '');
        else {
          if (/税抜|税別|ex\.?tax/i.test(aRaw)) add('amount_taxnote', lineNo, '"' + aRaw + '"');
          var a = toHalf(aRaw).replace(/[,，\s円¥￥]/g, '').replace(/\(税抜\)|\(税別\)|（税抜）|（税別）|\(税込\)|（税込）/g, '');
          if (!/^-?\d+(\.\d+)?$/.test(a)) add('amount_format', lineNo, '"' + aRaw + '" → 半角数字の税込総額');
        }
      }

      if (map.party >= 0) {
        var p = get('party');
        if (!p || EMPTY_PARTY.indexOf(p.toLowerCase()) >= 0) add('party_missing', lineNo, p ? '"' + p + '"' : '空欄');
      }

      if (map.file >= 0) {
        var f = get('file');
        if (!f) add('file_missing', lineNo, '');
        else {
          var bad = [];
          for (var b = 0; b < BAD_CHARS.length; b++) if (f.indexOf(BAD_CHARS[b]) >= 0) bad.push(BAD_CHARS[b] === '\u3000' ? '全角空白' : BAD_CHARS[b]);
          if (bad.length) add('file_charset', lineNo, '"' + f + '" に ' + bad.join(' ') + ' が入っています');
          if (seen[f]) add('file_dup', lineNo, '"' + f + '" は ' + seen[f] + ' 行目と同じ');
          else seen[f] = lineNo;
          if (d.ok && toHalf(f).replace(/\D/g, '').indexOf(d.key) < 0) {
            add('file_convention', lineNo, '"' + f + '" に ' + d.key + ' がない');
          }
        }
      }

      if (map.seq >= 0) {
        var sRaw = toHalf(get('seq')).replace(/\s/g, '');
        if (/^\d+$/.test(sRaw)) {
          var n = +sRaw;
          if (prevSeq !== null && n !== prevSeq + 1) add('seq_gap', lineNo, prevSeq + ' → ' + n);
          prevSeq = n;
        }
      }
    }
    return { findings: findings };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.DCHENGINE = API;
})();
