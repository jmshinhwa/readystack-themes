// KSeF FA(3) invoice lint - one brain for the VS Code extension and the free web page.
(function (root) {
  var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : root.KSEF_RULES;

  var FA3_NS = 'http://crd.gov.pl/wzor/2025/06/25/13775/';
  var PENALTY_DAY = '2027-01-01';
  var RODZAJ = ['VAT', 'KOR', 'ZAL', 'ROZ', 'UPR', 'KOR_ZAL', 'KOR_ROZ'];
  var AMOUNT_EL = /<(P_8B|P_9A|P_9B|P_11|P_11A|P_13_\d|P_14_\d|P_15|KursWaluty)>([^<]*)<\/\1>/g;
  var PLACEHOLDER = /(1234567890|0000000000|9999999999|XXXXXXXXXX|PLACEHOLDER|TODO|example\.com|Nazwa Firmy)/g;

  function byId(id) {
    for (var i = 0; i < RULES.length; i++) { if (RULES[i].id === id) return RULES[i]; }
    return { id: id, sev: 'err', msg: id };
  }
  function lineAt(text, idx) { return text.slice(0, idx < 0 ? 0 : idx).split('\n').length; }
  function one(text, re) { re.lastIndex = 0; return re.exec(text); }
  function days(a, b) { return Math.round((Date.parse(b) - Date.parse(a)) / 86400000); }

  function check(text, opts) {
    text = String(text || '');
    opts = opts || {};
    var today = opts.today || '2026-09-14';
    var F = [];
    function add(id, line, extra) {
      var r = byId(id);
      F.push({ check: r.id, sev: r.sev, msg: extra ? r.msg + ' ' + extra : r.msg, line: line || 1 });
    }
    var m, i;

    var faIdx = text.indexOf('<Faktura');
    var ns = one(text, /<Faktura[^>]*xmlns\s*=\s*"([^"]*)"/);
    if (!ns) add('fa3_namespace', faIdx >= 0 ? lineAt(text, faIdx) : 1, 'Found: no xmlns on <Faktura>.');
    else if (ns[1] !== FA3_NS) add('fa3_namespace', lineAt(text, ns.index), 'Found: ' + ns[1]);

    var ks = one(text, /kodSystemowy\s*=\s*"([^"]*)"/);
    if (!ks) add('kod_systemowy', 1, 'Found: no kodSystemowy attribute.');
    else if (ks[1] !== 'FA (3)') add('kod_systemowy', lineAt(text, ks.index), 'Found: "' + ks[1] + '".');

    var ws = one(text, /wersjaSchemy\s*=\s*"([^"]*)"/);
    if (!ws) add('wersja_schemy', 1, 'Found: no wersjaSchemy attribute.');
    else if (ws[1] !== '1-0E') add('wersja_schemy', lineAt(text, ws.index), 'Found: "' + ws[1] + '".');

    var wf = one(text, /<WariantFormularza>\s*([^<]*)<\/WariantFormularza>/);
    if (!wf) add('wariant_formularza', 1, 'Found: element missing.');
    else if (wf[1].trim() !== '3') add('wariant_formularza', lineAt(text, wf.index), 'Found: ' + wf[1].trim() + '.');

    var dw = one(text, /<DataWytworzeniaFa>\s*([^<]*)<\/DataWytworzeniaFa>/);
    if (!dw) add('data_wytworzenia', 1, 'Found: element missing.');
    else if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(dw[1].trim())) add('data_wytworzenia', lineAt(text, dw.index), 'Found: "' + dw[1].trim() + '".');

    var reNip = /<NIP>\s*([^<]*)<\/NIP>/g;
    while ((m = reNip.exec(text))) {
      var nip = m[1].trim();
      if (!/^\d{10}$/.test(nip)) add('nip_format', lineAt(text, m.index), 'Found: "' + nip + '".');
    }

    var kw = one(text, /<KodWaluty>\s*([^<]*)<\/KodWaluty>/);
    if (!kw) add('kod_waluty', 1, 'Found: element missing.');
    else if (!/^[A-Z]{3}$/.test(kw[1].trim())) add('kod_waluty', lineAt(text, kw.index), 'Found: "' + kw[1].trim() + '".');

    var p1 = one(text, /<P_1>\s*([^<]*)<\/P_1>/);
    if (!p1) add('p_1_data', 1, 'Found: element missing.');
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(p1[1].trim())) add('p_1_data', lineAt(text, p1.index), 'Found: "' + p1[1].trim() + '".');

    var p2 = one(text, /<P_2>\s*([^<]*)<\/P_2>/);
    if (!p2) add('p_2_numer', 1, 'Found: element missing.');
    else if (!p2[1].trim()) add('p_2_numer', lineAt(text, p2.index), 'Found: empty.');

    var rf = one(text, /<RodzajFaktury>\s*([^<]*)<\/RodzajFaktury>/);
    if (!rf) add('rodzaj_faktury', 1, 'Found: element missing.');
    else if (RODZAJ.indexOf(rf[1].trim()) < 0) add('rodzaj_faktury', lineAt(text, rf.index), 'Found: "' + rf[1].trim() + '".');

    AMOUNT_EL.lastIndex = 0;
    while ((m = AMOUNT_EL.exec(text))) {
      var val = m[2].trim();
      var where = '<' + m[1] + '> = "' + val + '".';
      if (val.indexOf(',') >= 0) add('decimal_comma', lineAt(text, m.index), where);
      if (/\s/.test(val)) add('amount_space', lineAt(text, m.index), where);
      else if (val && val.indexOf(',') < 0 && !/^-?\d+(\.\d+)?$/.test(val)) add('amount_space', lineAt(text, m.index), where);
    }

    var xd = one(text, /<\?xml[^>]*\?>/);
    if (!xd) add('encoding_utf8', 1, 'Found: no XML declaration.');
    else if (!/encoding\s*=\s*"utf-8"/i.test(xd[0])) add('encoding_utf8', 1, 'Found: ' + xd[0].trim());

    var ad = one(text, /<Adnotacje>([\s\S]*?)<\/Adnotacje>/);
    var adLine = ad ? lineAt(text, ad.index) : 1;
    var flags = ['P_16', 'P_17', 'P_18', 'P_18A'];
    for (i = 0; i < flags.length; i++) {
      var fm = ad ? new RegExp('<' + flags[i] + '>\\s*([^<]*)</' + flags[i] + '>').exec(ad[1]) : null;
      if (!fm) add('adnotacje_flags', adLine, 'Missing <' + flags[i] + '>.');
      else if (['1', '2'].indexOf(fm[1].trim()) < 0) add('adnotacje_flags', adLine, '<' + flags[i] + '> = "' + fm[1].trim() + '".');
    }

    if (rf && /^KOR/.test(rf[1].trim()) && !/<DaneFaKorygowanej>/.test(text)) {
      add('korekta_ref', lineAt(text, rf.index), 'RodzajFaktury = ' + rf[1].trim() + '.');
    }

    PLACEHOLDER.lastIndex = 0;
    while ((m = PLACEHOLDER.exec(text))) add('placeholder_data', lineAt(text, m.index), 'Found: "' + m[0] + '".');

    var parties = ['Podmiot1', 'Podmiot2'];
    for (i = 0; i < parties.length; i++) {
      var b = new RegExp('<' + parties[i] + '>([\\s\\S]*?)</' + parties[i] + '>').exec(text);
      if (!b) { add('podmiot_nazwa', 1, 'Missing <' + parties[i] + '> block.'); continue; }
      var nz = /<Nazwa>\s*([^<]*)<\/Nazwa>/.exec(b[1]);
      var person = /<Nazwisko>\s*[^<\s][^<]*<\/Nazwisko>/.test(b[1]);
      if ((!nz || !nz[1].trim()) && !person) add('podmiot_nazwa', lineAt(text, b.index), '<' + parties[i] + '> has no non-empty <Nazwa>.');
    }

    var errs = 0;
    for (i = 0; i < F.length; i++) { if (F[i].sev === 'err') errs++; }
    if (errs && today < PENALTY_DAY) {
      add('penalty_clock', 1, errs + ' blocking errors, ' + days(today, PENALTY_DAY) + ' days before KSeF penalties resume on ' + PENALTY_DAY + '.');
    } else if (errs) {
      add('penalty_clock', 1, errs + ' blocking errors, and the KSeF penalty grace period ended on ' + PENALTY_DAY + '.');
    }

    F.sort(function (a, b) { return a.line - b.line; });
    return { findings: F };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) { module.exports = API; }
  if (typeof root !== 'undefined' && root) { root.KSEFENGINE = API; }
})(typeof window !== 'undefined' ? window : this);
