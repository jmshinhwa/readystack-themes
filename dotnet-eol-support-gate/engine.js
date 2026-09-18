// .NET EOL & CRA Support Window Gate — one brain, used by the extension and by the free web page.
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.DOTNET_EOL_RULES;

// Microsoft .NET release lifecycle — published end-of-support dates.
var TFM_EOL = {
  'netcoreapp3.1': '2022-12-13', 'net5.0': '2022-05-10', 'net6.0': '2024-11-12',
  'net7.0': '2024-05-14', 'net8.0': '2026-11-10', 'net9.0': '2026-05-12', 'net10.0': '2028-11-14'
};
var MAJOR_EOL = { '3': '2022-12-13', '5': '2022-05-10', '6': '2024-11-12', '7': '2024-05-14', '8': '2026-11-10', '9': '2026-05-12', '10': '2028-11-14' };
var FX_RETIRED = { 'net45': '2016-01-12', 'net451': '2016-01-12', 'net452': '2022-04-26', 'net46': '2022-04-26', 'net461': '2022-04-26' };
var XAMARIN_END = '2024-05-01';
var RUNTIME_PKG = /^(Microsoft\.AspNetCore\.|Microsoft\.EntityFrameworkCore|Microsoft\.Extensions\.)/;
var SOON_DAYS = 180;

function day(s) { var p = String(s || '').slice(0, 10).split('-'); return Date.UTC(+p[0], (+p[1] || 1) - 1, +p[2] || 1); }
function daysBetween(a, b) { return Math.round((day(b) - day(a)) / 86400000); }
function iso(ms) { return new Date(ms).toISOString().slice(0, 10); }
function addYears(s, n) { var d = new Date(day(s)); d.setUTCFullYear(d.getUTCFullYear() + Math.round(n)); return iso(d.getTime()); }
function months(a, b) { return Math.round(daysBetween(a, b) / 30.44); }

function check(text, opts) {
  opts = opts || {};
  var today = String(opts.today || new Date().toISOString().slice(0, 10)).slice(0, 10);
  var years = Number(opts.support_years || 5) || 5;
  var placed = String(opts.placed_on_market || today).slice(0, 10);
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var out = [];
  var declared = null, declaredLine = 0, sawProject = false, sawTfm = false;
  var auditOff = false, auditMode = false, sawAudit = false;

  function add(id, line, msg) { out.push({ check: id, sev: (RULES.filter(function (r) { return r.id === id; })[0] || {}).sev || 'error', msg: msg, line: line }); }

  // pass 1 — declared support period and audit settings
  lines.forEach(function (raw, i) {
    var n = i + 1;
    var d = raw.match(/(?:SupportedUntil|SupportPeriodEnd|SupportEndDate|CRA-support-until)\s*[>:=]\s*"?(\d{4}-\d{2}-\d{2})/i);
    if (d && !declared) { declared = d[1]; declaredLine = n; }
    if (/<Project\b|"sdk"\s*:/i.test(raw)) sawProject = true;
    if (/<NuGetAudit>\s*false\s*</i.test(raw)) { auditOff = true; add('nuget_audit_off', n, 'NuGetAudit is switched off, so no package in this project is checked against the advisory database at build time. CRA Annex I Part II expects shipped components to be screened.'); }
    if (/<NuGetAudit>\s*true\s*</i.test(raw)) sawAudit = true;
    if (/<NuGetAuditMode>\s*all\s*</i.test(raw)) { auditMode = true; sawAudit = true; }
  });
  if (sawProject && !auditOff && sawAudit && !auditMode) add('nuget_audit_off', 1, 'NuGetAuditMode is not set to "all", so only your direct PackageReferences are screened and transitive dependencies — where most shipped CVEs live — are skipped.');

  var windowEnd = declared || addYears(placed, years);
  if (sawProject && !declared) {
    add('support_period_undeclared', 1, 'No support period is declared in this file, so the gate uses the CRA Article 13(8) floor: ' + years + ' years from ' + placed + ', ending ' + windowEnd + '. Add <SupportedUntil>' + windowEnd + '</SupportedUntil> to make the promise explicit.');
  }

  function dateTfm(tfm, n) {
    var t = tfm.toLowerCase().trim();
    if (/-(preview|rc)/.test(t) || /^net(1[1-9])\.0/.test(t)) {
      add('preview_runtime', n, tfm + ' is a preview or unreleased runtime. Preview builds carry no support period at all, so nothing you promise a buyer is backed by a patch stream.');
      return;
    }
    if (/^(monoandroid|xamarin|xamarinios|xamarinmac)/.test(t)) {
      add('xamarin_retired', n, tfm + ' is a Xamarin target framework. Xamarin support ended on ' + XAMARIN_END + ', ' + daysBetween(XAMARIN_END, today) + ' days ago; move the head project to a net10.0-android / net10.0-ios .NET MAUI target.');
      return;
    }
    if (FX_RETIRED[t]) {
      add('framework_retired', n, tfm + ' (.NET Framework) left support on ' + FX_RETIRED[t] + ', ' + daysBetween(FX_RETIRED[t], today) + ' days ago. Retarget to net472 or later, or to net10.0.');
      return;
    }
    var base = t.split('-')[0];
    var eol = TFM_EOL[base];
    if (!eol) return;
    var left = daysBetween(today, eol);
    if (left < 0) {
      add('tfm_out_of_support', n, tfm + ' lost security servicing on ' + eol + ' — ' + (-left) + ' days ago. Every runtime CVE published since that day is still open in this build.');
    } else if (left <= SOON_DAYS) {
      add('tfm_ends_soon', n, tfm + ' stops receiving security fixes on ' + eol + ', in ' + left + ' days. A runtime bump is a release, not a patch — schedule it now.');
    }
    if (left >= 0 && day(eol) < day(windowEnd)) {
      var tail = (day(TFM_EOL['net10.0']) >= day(windowEnd)) ? ' net10.0 covers that promise to ' + TFM_EOL['net10.0'] + '.' : ' Even net10.0 only reaches ' + TFM_EOL['net10.0'] + ', so this promise needs a planned retarget on the roadmap, not a one-off bump.';
      add('support_window_gap', n, tfm + ' dies on ' + eol + ', but the support period running to ' + windowEnd + ' leaves ' + months(eol, windowEnd) + ' months you have promised to patch on a runtime nobody patches.' + tail);
    }
  }

  // pass 2 — target frameworks, SDK pins, packages
  lines.forEach(function (raw, i) {
    var n = i + 1, m;
    if ((m = raw.match(/<TargetFramework>\s*([^<\s]+)\s*</i))) { sawTfm = true; dateTfm(m[1], n); }
    if ((m = raw.match(/<TargetFrameworks>\s*([^<]+)</i))) {
      sawTfm = true;
      m[1].split(';').forEach(function (t) { if (t.trim()) dateTfm(t, n); });
    }
    if ((m = raw.match(/"version"\s*:\s*"(\d+)\.(\d+)\.(\d+)/))) {
      var eol = MAJOR_EOL[m[1]];
      if (eol && daysBetween(today, eol) < 0) {
        add('sdk_pin_out_of_support', n, 'global.json pins SDK ' + m[1] + '.' + m[2] + '.' + m[3] + '. That band went out of support on ' + eol + ', ' + daysBetween(eol, today) + ' days ago, and the pin overrides every up-to-date SDK on the build machine.');
      } else if (eol && daysBetween(today, eol) <= SOON_DAYS) {
        add('sdk_pin_out_of_support', n, 'global.json pins SDK ' + m[1] + '.' + m[2] + '.' + m[3] + ', whose band goes out of support on ' + eol + ', in ' + daysBetween(today, eol) + ' days. Every CI run will keep building on it until the pin moves.');
      }
    }
    if ((m = raw.match(/<PackageReference\s+Include="([^"]+)"[^>]*Version="([^"]+)"/i))) {
      var id = m[1], ver = m[2];
      if (/^Xamarin\./i.test(id)) {
        add('xamarin_retired', n, id + ' ' + ver + ' is a Xamarin package. Xamarin support ended on ' + XAMARIN_END + ', ' + daysBetween(XAMARIN_END, today) + ' days ago, and no fix is coming for anything found in it.');
      } else if (RUNTIME_PKG.test(id)) {
        var maj = (ver.match(/^(\d+)/) || [])[1];
        var pe = MAJOR_EOL[maj];
        if (pe && daysBetween(today, pe) < 0) {
          add('runtime_bound_package', n, id + ' ' + ver + ' follows the .NET ' + maj + ' lifecycle, which ended on ' + pe + ' — ' + daysBetween(pe, today) + ' days ago. This package line is unpatched.');
        }
      }
    }
  });

  return { findings: out, today: today, window_end: windowEnd, support_years: years, declared: !!declared, declared_line: declaredLine, rules: RULES.length, targets_seen: sawTfm };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length, TFM_EOL: TFM_EOL };
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.DOTNET_EOL_ENGINE = API;
