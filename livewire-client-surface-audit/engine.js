/* Livewire Client Surface Audit — engine.
   One file, two homes: Node (VS Code extension) and the browser (free web page). */
(function (root) {
  'use strict';

  var RULES = (typeof module !== 'undefined' && module.exports)
    ? require('./rules.json')
    : root.LWSURF_RULES;

  var BY_ID = {};
  for (var i = 0; i < RULES.length; i++) BY_ID[RULES[i].id] = RULES[i];

  // Livewire lifecycle + framework hooks: these are called by the framework, not by a user action.
  var LIFECYCLE = /^(mount|boot|booted|render|hydrate|dehydrate|updating|updated|updatingQueryString|rules|messages|validationAttributes|placeholder|exception|__invoke|__construct)$/;
  // Verbs that change or hand out data. A public method with one of these names is an action.
  var ACTION_VERB = /^(delete|destroy|remove|purge|approve|reject|publish|unpublish|save|store|submit|update|edit|impersonate|promote|demote|grant|revoke|refund|cancel|reset|export|download|send|invite|activate|deactivate|archive|restore|pay|charge|assign|merge|import)/i;
  var STATE_NAME  = /(^|_)(id|ids)$|id$|role|price|amount|total|status|qty|quantity|discount|balance|credit|owner|tenant|admin|approved|verified|published|paid|rate|tax|plan|tier|limit|quota|permission/i;
  var SECRET_NAME = /(token|secret|password|passwd|apikey|api_key|privatekey|private_key|webhook|signature|otp|pin|salt|cipher|credential)/i;

  var RE_PROP    = /^\s*(?:#\[[^\]]*\]\s*)?public\s+(?:readonly\s+)?(?:\??[A-Za-z_\\][A-Za-z0-9_\\|]*\s+)?\$([A-Za-z_][A-Za-z0-9_]*)/;
  var RE_METHOD  = /^\s*public\s+(?:static\s+)?function\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(/;
  var RE_AUTH    = /->authorize\s*\(|Gate::|->can\s*\(|@can\b|abort_unless\s*\(|abort_if\s*\(|->cannot\s*\(|Auth::user\(\)->can|policy\s*\(/;
  var RE_VALID   = /->validate\s*\(|->validateOnly\s*\(|\$rules\s*=|#\[Validate|Validator::make/;
  var RE_LOOKUP  = /::(find|findOrFail|firstWhere|where)\s*\(|::query\s*\(/;
  var RE_LOCKED  = /#\[\s*(?:Livewire\\Attributes\\)?Locked/;
  var RE_URLATTR = /#\[\s*(?:Livewire\\Attributes\\)?Url\b/;
  var RE_ECHO    = /\{!!([\s\S]*?)!!\}/;
  var RE_SAFE    = /Purifier::|Str::markdown|->toHtml\s*\(|clean\s*\(/;
  var RE_INCLUDE = /@(?:include|includeIf|includeWhen|component|extends)\s*\(\s*\$/;
  var RE_STORE   = /->(?:store|storeAs|storePublicly|storePubliclyAs)\s*\(/;
  var RE_MASS    = /->(?:update|fill|forceFill)\s*\(\s*\$this->|::(?:create|forceCreate|updateOrCreate)\s*\(\s*\$this->/;
  var RE_DEBUG   = /(^|[^A-Za-z0-9_$>])(dd|dump|var_dump|ray|print_r)\s*\(/;
  var RE_UPLOADS = /WithFileUploads/;
  var RE_COMMENT = /^\s*(?:\/\/|#[^\[]|\*|\/\*)/;

  function finding(id, line, name) {
    var r = BY_ID[id];
    return {
      check: id,
      sev: r.sev,
      line: line,
      msg: (name ? r.msg.replace(/NAME/g, name) : r.msg.replace(/\$NAME/g, 'the property').replace(/NAME\(\)/g, 'the method')),
      title: r.title,
      fix: r.fix
    };
  }

  function check(text, opts) {
    text = String(text == null ? '' : text);
    opts = opts || {};
    var lines = text.split(/\r?\n/);
    var out = [];
    var claimed = {};                       // line numbers already reported as a property

    var hasAuth    = RE_AUTH.test(text);
    var hasValid   = RE_VALID.test(text);
    var hasUploads = RE_UPLOADS.test(text);
    var hasLookup  = RE_LOOKUP.test(text);

    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i], no = i + 1;
      if (RE_COMMENT.test(ln)) continue;

      // --- properties -------------------------------------------------
      var mp = ln.match(RE_PROP);
      if (mp) {
        var pname = mp[1];
        var ctx = (lines[i - 1] || '') + '\n' + (lines[i - 2] || '') + '\n' + ln;
        if (SECRET_NAME.test(pname)) {
          out.push(finding('secret_in_public_property', no, pname));
          claimed[no] = 1;
        } else if (RE_URLATTR.test(ctx) && STATE_NAME.test(pname)) {
          out.push(finding('url_bound_property', no, pname));
          claimed[no] = 1;
        } else if (STATE_NAME.test(pname) && !RE_LOCKED.test(ctx)) {
          out.push(finding('unlocked_state_property', no, pname));
          claimed[no] = 1;
        }
      }

      // --- methods ----------------------------------------------------
      var mm = ln.match(RE_METHOD);
      if (mm) {
        var fname = mm[1];
        if (fname === 'mount' && hasLookup && !hasAuth) {
          out.push(finding('mount_without_authorization', no, 'mount'));
        } else if (!LIFECYCLE.test(fname) && ACTION_VERB.test(fname) && !hasAuth) {
          out.push(finding('client_callable_method', no, fname));
        }
      }

      // --- lines inside bodies and inline Blade ------------------------
      var me = ln.match(RE_ECHO);
      if (me && !RE_SAFE.test(ln)) out.push(finding('unescaped_blade_echo', no));
      if (RE_INCLUDE.test(ln)) out.push(finding('dynamic_template_include', no));
      if (hasUploads && !hasValid && RE_STORE.test(ln)) out.push(finding('unvalidated_upload', no));
      if (RE_MASS.test(ln)) out.push(finding('mass_assign_from_state', no));
      if (RE_DEBUG.test(ln)) out.push(finding('debug_output_in_component', no));
    }

    out.sort(function (a, b) { return a.line - b.line; });
    return { findings: out };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  root.LWSURF_ENGINE = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
