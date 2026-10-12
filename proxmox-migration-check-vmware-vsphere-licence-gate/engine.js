// Proxmox Migration Check — one brain, used by the editor extension and by the free web page.
var RULES = (typeof module !== 'undefined' && module.exports) ? require('./rules.json') : window.PVE_RULES;

// Broadcom KB 313548: VMware Cloud Foundation / vSphere Foundation are licensed per physical core,
// at least 16 cores for each CPU in every ESXi host.
var LICENCE = { kb: 'Broadcom KB 313548', min_cores_per_cpu: 16 };

var AREA_LABEL = { terraform: 'Terraform', packer: 'Packer', ansible: 'Ansible' };

// Cores Broadcom bills for a host list: [{cpus, cores_per_cpu}] — each CPU counts as max(cores, 16).
function billedCores(hosts) {
  var total = 0, physical = 0;
  (hosts || []).forEach(function (h) {
    var cpus = Math.max(0, Math.floor(Number(h.cpus) || 0));
    var cores = Math.max(0, Math.floor(Number(h.cores_per_cpu) || 0));
    physical += cpus * cores;
    total += cpus * Math.max(cores, LICENCE.min_cores_per_cpu);
  });
  return { physical: physical, billed: total, padding: total - physical };
}

function check(text, opts) {
  opts = opts || {};
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var findings = [], byArea = { terraform: 0, packer: 0, ansible: 0 }, plan = [];
  var compiled = RULES.map(function (r) { return new RegExp(r.re); });

  for (var i = 0; i < lines.length; i++) {
    var line = lines[i];
    if (/^\s*(#|\/\/)/.test(line)) continue;
    for (var r = 0; r < RULES.length; r++) {
      var rule = RULES[r];
      if (!compiled[r].test(line)) continue;
      var evidence = line.replace(/^\s+/, '').slice(0, 120);
      findings.push({
        check: rule.id, sev: rule.sev, line: i + 1, area: rule.area,
        msg: AREA_LABEL[rule.area] + ': ' + rule.msg + ' Proxmox VE line: ' + rule.fix,
        fix: rule.fix, evidence: evidence
      });
      byArea[rule.area]++;
      plan.push({ line: i + 1, area: AREA_LABEL[rule.area], from: evidence, to: rule.fix });
      break;
    }
  }

  var out = {
    findings: findings,
    by_area: byArea,
    plan: plan,
    rule_count: RULES.length,
    licence_rule: LICENCE.kb + ': minimum ' + LICENCE.min_cores_per_cpu + ' cores per CPU',
    verdict: findings.length === 0 ? 'clean' : (findings.some(function (f) { return f.sev === 'high'; }) ? 'locked-in' : 'partial')
  };
  if (opts.hosts) out.cores = billedCores(opts.hosts);
  return out;
}

var API = { engine: { check: check, billedCores: billedCores }, RULES: RULES, RULE_COUNT: RULES.length, LICENCE: LICENCE };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
if (typeof window !== 'undefined') window.PVEENGINE = API;
