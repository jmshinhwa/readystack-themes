// Kubernetes Removed API Lint - the brain. The same file runs in Node (the extension) and in the browser (the free web page).
'use strict';
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.K8S_RULES;

// Every apiVersion the API server no longer serves, with the minor release that removed it and what replaces it.
// kinds:null means the whole group/version went away.
var TABLE = {
  'extensions/v1beta1': [
    {kinds: ['Ingress'], to: 'networking.k8s.io/v1', removed: '1.22', rule: 'removed_ingress_beta'},
    {kinds: ['PodSecurityPolicy'], to: '', removed: '1.25', rule: 'removed_psp'},
    {kinds: null, to: 'apps/v1', removed: '1.16', rule: 'removed_workloads_beta'}
  ],
  'apps/v1beta1': [{kinds: null, to: 'apps/v1', removed: '1.16', rule: 'removed_workloads_beta'}],
  'apps/v1beta2': [{kinds: null, to: 'apps/v1', removed: '1.16', rule: 'removed_workloads_beta'}],
  'networking.k8s.io/v1beta1': [{kinds: null, to: 'networking.k8s.io/v1', removed: '1.22', rule: 'removed_ingress_beta'}],
  'apiextensions.k8s.io/v1beta1': [{kinds: null, to: 'apiextensions.k8s.io/v1', removed: '1.22', rule: 'removed_crd_beta'}],
  'admissionregistration.k8s.io/v1beta1': [{kinds: null, to: 'admissionregistration.k8s.io/v1', removed: '1.22', rule: 'removed_cluster_beta'}],
  'rbac.authorization.k8s.io/v1beta1': [{kinds: null, to: 'rbac.authorization.k8s.io/v1', removed: '1.22', rule: 'removed_cluster_beta'}],
  'rbac.authorization.k8s.io/v1alpha1': [{kinds: null, to: 'rbac.authorization.k8s.io/v1', removed: '1.22', rule: 'removed_cluster_beta'}],
  'certificates.k8s.io/v1beta1': [{kinds: null, to: 'certificates.k8s.io/v1', removed: '1.22', rule: 'removed_cluster_beta'}],
  'coordination.k8s.io/v1beta1': [{kinds: null, to: 'coordination.k8s.io/v1', removed: '1.22', rule: 'removed_cluster_beta'}],
  'scheduling.k8s.io/v1beta1': [{kinds: null, to: 'scheduling.k8s.io/v1', removed: '1.22', rule: 'removed_cluster_beta'}],
  'storage.k8s.io/v1beta1': [
    {kinds: ['CSIStorageCapacity'], to: 'storage.k8s.io/v1', removed: '1.27', rule: 'removed_storage_beta'},
    {kinds: null, to: 'storage.k8s.io/v1', removed: '1.22', rule: 'removed_storage_beta'}
  ],
  'batch/v1beta1': [{kinds: null, to: 'batch/v1', removed: '1.25', rule: 'removed_cronjob_beta'}],
  'policy/v1beta1': [
    {kinds: ['PodSecurityPolicy'], to: '', removed: '1.25', rule: 'removed_psp'},
    {kinds: null, to: 'policy/v1', removed: '1.25', rule: 'removed_pdb_beta'}
  ],
  'autoscaling/v2beta1': [{kinds: null, to: 'autoscaling/v2', removed: '1.25', rule: 'removed_hpa_beta'}],
  'autoscaling/v2beta2': [{kinds: null, to: 'autoscaling/v2', removed: '1.26', rule: 'removed_hpa_beta'}],
  'discovery.k8s.io/v1beta1': [{kinds: null, to: 'discovery.k8s.io/v1', removed: '1.25', rule: 'removed_events_beta'}],
  'events.k8s.io/v1beta1': [{kinds: null, to: 'events.k8s.io/v1', removed: '1.25', rule: 'removed_events_beta'}],
  'node.k8s.io/v1beta1': [{kinds: null, to: 'node.k8s.io/v1', removed: '1.25', rule: 'removed_events_beta'}],
  'flowcontrol.apiserver.k8s.io/v1beta1': [{kinds: null, to: 'flowcontrol.apiserver.k8s.io/v1', removed: '1.26', rule: 'removed_flowcontrol_beta'}],
  'flowcontrol.apiserver.k8s.io/v1beta2': [{kinds: null, to: 'flowcontrol.apiserver.k8s.io/v1', removed: '1.29', rule: 'removed_flowcontrol_beta'}],
  'flowcontrol.apiserver.k8s.io/v1beta3': [{kinds: null, to: 'flowcontrol.apiserver.k8s.io/v1', removed: '1.32', rule: 'removed_flowcontrol_beta'}]
};

var SELECTOR_KINDS = {Deployment: 1, StatefulSet: 1, DaemonSet: 1, ReplicaSet: 1};

function minorOf(v) { var m = /^(\d+)\.(\d+)$/.exec(String(v || '')); return m ? (Number(m[1]) * 1000 + Number(m[2])) : 0; }

// Split a multi-document YAML stream into documents, keeping the real line number of every line.
function documents(text) {
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var docs = [], cur = {lines: [], from: 1};
  for (var i = 0; i < lines.length; i++) {
    if (/^---\s*$/.test(lines[i])) { docs.push(cur); cur = {lines: [], from: i + 2}; continue; }
    cur.lines.push({n: i + 1, t: lines[i]});
  }
  docs.push(cur);
  var out = [];
  for (var d = 0; d < docs.length; d++) {
    var doc = docs[d], api = '', kind = '', apiLine = doc.from, kindLine = doc.from, body = '';
    for (var j = 0; j < doc.lines.length; j++) {
      var L = doc.lines[j], m;
      body += L.t + '\n';
      if (!api && (m = /^\s{0,2}apiVersion:\s*["']?([A-Za-z0-9./_-]+)/.exec(L.t))) { api = m[1]; apiLine = L.n; }
      if (!kind && (m = /^\s{0,2}kind:\s*["']?([A-Za-z0-9]+)/.exec(L.t))) { kind = m[1]; kindLine = L.n; }
    }
    if (api || kind || /\S/.test(body)) out.push({api: api, kind: kind, apiLine: apiLine, kindLine: kindLine, body: body, lines: doc.lines});
  }
  return out;
}

function check(text, opts) {
  opts = opts || {};
  var today = opts.today || new Date().toISOString().slice(0, 10);
  var F = [];
  function add(id, sev, msg, line) { F.push({check: id, sev: sev, msg: msg, line: line || 1}); }

  var docs = documents(text), dead = {}, worst = 0, worstV = '';

  for (var i = 0; i < docs.length; i++) {
    var doc = docs[i];

    // 1-11 - the apiVersion the API server stopped serving
    var entries = TABLE[doc.api];
    if (entries) {
      for (var e = 0; e < entries.length; e++) {
        var hit = entries[e];
        if (hit.kinds && hit.kinds.indexOf(doc.kind) < 0) continue;
        var what = (doc.kind || 'object') + ' on ' + doc.api;
        var fix = hit.to
          ? 'Use ' + hit.to + '.'
          : 'PodSecurityPolicy has no replacement apiVersion: move the namespace to Pod Security Admission labels (pod-security.kubernetes.io/enforce).';
        add(hit.rule, 'error', what + ' was removed in Kubernetes ' + hit.removed +
          '. A cluster at ' + hit.removed + ' or newer answers kubectl apply with "no matches for kind ' +
          (doc.kind || '?') + ' in version ' + doc.api + '". ' + fix, doc.apiLine);
        dead[doc.api] = hit.removed;
        if (!worst || minorOf(hit.removed) < worst) { worst = minorOf(hit.removed); worstV = hit.removed; }
        break;
      }
    }

    // 12 - apps/v1 made spec.selector required; the beta versions defaulted it from the pod template labels
    if (doc.api === 'apps/v1' && SELECTOR_KINDS[doc.kind] && !/\n?\s{1,4}selector:/.test(doc.body))
      add('selector_required', 'error', doc.kind + ' on apps/v1 has no spec.selector. apps/v1 requires it and never defaults it, so the API server rejects this object even though the same YAML worked on extensions/v1beta1.', doc.kindLine);

    // 13-15 - annotations and labels that moved into real fields
    for (var k = 0; k < doc.lines.length; k++) {
      var t = doc.lines[k].t, n = doc.lines[k].n;
      if (/kubernetes\.io\/ingress\.class\s*:/.test(t))
        add('ingress_class_annotation', 'warn', 'The kubernetes.io/ingress.class annotation went away with the v1beta1 Ingress. networking.k8s.io/v1 reads spec.ingressClassName, and a controller that only watches IngressClass will ignore this Ingress.', n);
      var lb = /(failure-domain\.beta\.kubernetes\.io\/(zone|region)|beta\.kubernetes\.io\/(os|arch|instance-type))/.exec(t);
      if (lb) {
        var repl = {zone: 'topology.kubernetes.io/zone', region: 'topology.kubernetes.io/region', os: 'kubernetes.io/os', arch: 'kubernetes.io/arch', 'instance-type': 'node.kubernetes.io/instance-type'};
        add('beta_node_labels', 'warn', lb[1] + ' is a deprecated node label. Use ' + repl[lb[2] || lb[3]] + '. A node selector on the beta label can match nothing and leave the pod Pending with no scheduling event to explain it.', n);
      }
      if (/seccomp\.security\.alpha\.kubernetes\.io/.test(t))
        add('alpha_pod_annotations', 'error', 'The seccomp alpha annotation stopped being honoured in Kubernetes 1.25. It is still accepted as a plain annotation, so nothing errors - the pod simply runs unconfined. Use securityContext.seccompProfile.', n);
      if (/scheduler\.alpha\.kubernetes\.io\/critical-pod/.test(t))
        add('alpha_pod_annotations', 'error', 'The scheduler.alpha.kubernetes.io/critical-pod annotation was removed in Kubernetes 1.16 and does nothing now. Use priorityClassName: system-cluster-critical.', n);
    }
  }

  F.sort(function (a, b) { return a.line - b.line; });
  var apis = Object.keys(dead);
  return {
    findings: F, rule_count: RULES.length, today: today,
    documents: docs.length, dead_apis: apis.length, blocked_at: worstV,
    summary: F.length
      ? apis.length + ' removed apiVersion(s) across ' + docs.length + ' document(s); this bundle already fails on any cluster at ' + (worstV || '1.16') + ' or newer'
      : 'No removed apiVersion in ' + docs.length + ' document(s)'
  };
}

var API = {engine: {check: check}, RULES: RULES, RULE_COUNT: RULES.length, TABLE: TABLE};
if (typeof module !== 'undefined') module.exports = API;
if (typeof window !== 'undefined') window.K8SENGINE = API;
