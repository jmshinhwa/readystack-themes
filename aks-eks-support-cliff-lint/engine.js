/* aks-eks-support-cliff-lint engine: Terraform aws_eks_cluster / azurerm_kubernetes_cluster vs the EKS and AKS version calendars. Runs in Node and the browser. */
(function () {
  const RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SCL_RULES;
  const R = {}; RULES.forEach(r => { R[r.id] = r; });
  const EKS = R['eks-extended-billing'], AKS = R['aks-lts-needs-premium'];
  const DAY = 86400000;

  function d(s) { return new Date(s + 'T00:00:00Z'); }
  function days(a, b) { return Math.round((d(b) - d(a)) / DAY); }
  function usd(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
  function minor(v) { const m = /^(\d+)\.(\d+)/.exec(v || ''); return m ? m[1] + '.' + m[2] : null; }
  function older(a, b) { const x = a.split('.').map(Number), y = b.split('.').map(Number); return x[0] < y[0] || (x[0] === y[0] && x[1] < y[1]); }
  function oldestKey(cal) { return Object.keys(cal).sort((a, b) => older(a, b) ? -1 : 1)[0]; }

  // Find resource blocks by brace matching; return {type, name, line, body, bodyLine}
  function blocks(text) {
    const out = [], re = /resource\s+"(aws_eks_cluster|azurerm_kubernetes_cluster)"\s+"([^"]+)"\s*\{/g;
    let m;
    while ((m = re.exec(text))) {
      let depth = 1, i = re.lastIndex;
      while (i < text.length && depth > 0) { const c = text[i]; if (c === '{') depth++; else if (c === '}') depth--; i++; }
      const start = re.lastIndex;
      out.push({ type: m[1], name: m[2], line: text.slice(0, m.index).split('\n').length, body: text.slice(start, i - 1), bodyLine: text.slice(0, start).split('\n').length });
    }
    return out;
  }
  function attr(b, key) {
    const m = new RegExp('^[ \\t]*' + key + '[ \\t]*=[ \\t]*"([^"]*)"', 'm').exec(b.body);
    if (!m) return null;
    return { value: m[1], line: b.bodyLine + b.body.slice(0, m.index).split('\n').length - 1 };
  }

  function eks(b, today, F) {
    const v = attr(b, 'version'); if (!v) return;
    const k = minor(v.value); if (!k) return;
    const st = attr(b, 'support_type');
    const policy = st ? st.value.toUpperCase() : 'EXTENDED';
    const how = st ? 'support_type = "' + policy + '"' : 'no upgrade_policy block, so AWS defaults to EXTENDED';
    const cal = EKS.eks_calendar;
    let row = cal[k];
    if (!row) {
      if (older(k, oldestKey(cal))) F.push({ check: 'eks-past-extended', sev: R['eks-past-extended'].sev, line: v.line,
        msg: 'aws_eks_cluster.' + b.name + ' pins Kubernetes ' + k + ', older than every version EKS still supports (oldest: ' + oldestKey(cal) + '). The control plane is auto-upgraded; managed node groups stay behind.' });
      return;
    }
    const diff = EKS.price_extended_hour - EKS.price_standard_hour;
    if (today >= row.ext_end) {
      F.push({ check: 'eks-past-extended', sev: R['eks-past-extended'].sev, line: v.line,
        msg: 'aws_eks_cluster.' + b.name + ' pins ' + k + '; extended support ended ' + row.ext_end + '. The control plane is auto-upgraded; node groups stay on ' + k + '.' });
      return;
    }
    if (today >= row.std_end && policy !== 'STANDARD') {
      const billed = days(row.std_end, today) * 24 * diff;
      F.push({ check: 'eks-extended-billing', sev: EKS.sev, line: v.line, extra_usd: Math.round(billed),
        msg: 'aws_eks_cluster.' + b.name + ' pins ' + k + ' (' + how + '). Standard support ended ' + row.std_end + '; billed $0.60 instead of $0.10 per cluster-hour since then: ' + usd(billed) + ' extra by ' + today + ', ' + usd(diff * EKS.hours_per_month) + ' more each month.' });
      const left = days(today, row.ext_end);
      if (left <= R['eks-forced-upgrade-soon'].window_days)
        F.push({ check: 'eks-forced-upgrade-soon', sev: R['eks-forced-upgrade-soon'].sev, line: v.line,
          msg: 'aws_eks_cluster.' + b.name + ': extended support for ' + k + ' ends ' + row.ext_end + ' (' + left + ' days). After that AWS upgrades the control plane at any time with no notice.' });
      return;
    }
    if (today >= row.std_end && policy === 'STANDARD') {
      F.push({ check: 'eks-past-extended', sev: R['eks-past-extended'].sev, line: v.line,
        msg: 'aws_eks_cluster.' + b.name + ' pins ' + k + ' with support_type = "STANDARD"; standard support ended ' + row.std_end + ', so AWS auto-upgrades this control plane and the pinned version drifts from state.' });
      return;
    }
    const left = days(today, row.std_end);
    if (left <= R['eks-cliff-soon'].window_days)
      F.push({ check: 'eks-cliff-soon', sev: R['eks-cliff-soon'].sev, line: v.line,
        msg: 'aws_eks_cluster.' + b.name + ': standard support for ' + k + ' ends ' + row.std_end + ' (' + left + ' days). ' +
          (policy === 'STANDARD' ? 'support_type = "STANDARD": AWS auto-upgrades the control plane on that date.' : how + ': billing jumps from $0.10 to $0.60 per cluster-hour (' + usd(diff * EKS.hours_per_month) + ' a month).') });
  }

  function aks(b, today, F) {
    const v = attr(b, 'kubernetes_version'); if (!v) return;
    const k = minor(v.value); if (!k) return;
    const tierA = attr(b, 'sku_tier'), planA = attr(b, 'support_plan');
    const tier = tierA ? tierA.value : 'Free', lts = planA && planA.value === 'AKSLongTermSupport';
    const cal = AKS.aks_calendar, row = cal[k];
    const diff = AKS.price_premium_hour - AKS.price_standard_hour;
    if (lts && tier !== 'Premium') {
      F.push({ check: 'aks-lts-needs-premium', sev: AKS.sev, line: planA.line,
        msg: 'azurerm_kubernetes_cluster.' + b.name + ': support_plan = "AKSLongTermSupport" with sku_tier = "' + tier + '". LTS is only available on the Premium tier ($0.60 vs $0.10 per cluster-hour).' });
      return;
    }
    if (!row) {
      if (older(k, oldestKey(cal))) F.push({ check: 'aks-lts-ended', sev: R['aks-lts-ended'].sev, line: v.line,
        msg: 'azurerm_kubernetes_cluster.' + b.name + ' pins ' + k + ', older than every AKS version still supported, LTS included (oldest: ' + oldestKey(cal) + ').' });
      return;
    }
    if (lts) {
      if (today > row.lts_eol) F.push({ check: 'aks-lts-ended', sev: R['aks-lts-ended'].sev, line: v.line,
        msg: 'azurerm_kubernetes_cluster.' + b.name + ' pins ' + k + '; its LTS end of life was ' + row.lts_eol + '. Premium tier no longer covers this version.' });
      else if (today <= row.eol) F.push({ check: 'aks-premium-unused', sev: R['aks-premium-unused'].sev, line: tierA.line,
        msg: 'azurerm_kubernetes_cluster.' + b.name + ': Premium tier for LTS, but ' + k + ' is in community support until ' + row.eol + '. Standard tier until then saves ' + usd(diff * AKS.hours_per_month) + ' a month.' });
      return;
    }
    if (today > row.eol) {
      F.push({ check: 'aks-out-of-support', sev: R['aks-out-of-support'].sev, line: v.line,
        msg: 'azurerm_kubernetes_cluster.' + b.name + ' pins ' + k + '; community end of life was ' + row.eol + ' and LTS is off. No security patches, no new clusters at this version. Upgrade, or LTS (Premium) runs to ' + row.lts_eol + '.' });
      return;
    }
    const left = days(today, row.eol);
    if (left <= R['aks-eol-soon'].window_days)
      F.push({ check: 'aks-eol-soon', sev: R['aks-eol-soon'].sev, line: v.line,
        msg: 'azurerm_kubernetes_cluster.' + b.name + ': ' + k + ' leaves community support ' + row.eol + ' (' + left + ' days) and LTS is off.' });
  }

  function check(text, opts) {
    const today = (opts && opts.today) || new Date().toISOString().slice(0, 10);
    const findings = [];
    blocks(String(text || '')).forEach(b => (b.type === 'aws_eks_cluster' ? eks : aks)(b, today, findings));
    findings.sort((a, b) => a.line - b.line);
    return { findings };
  }

  const api = { engine: { check }, RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SCLENGINE = api;
})();
