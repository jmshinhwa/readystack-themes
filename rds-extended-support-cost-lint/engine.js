// RDS Extended Support Cost Lint engine: parses Terraform resource blocks and prices the
// per-vCPU-hour Extended Support surcharge for engine versions past AWS standard support.
(function () {
  var RULES = (typeof module !== 'undefined' && typeof require !== 'undefined') ? require('./rules.json') : window.RDSX_RULES;
  var HOURS_YEAR = 8760, WARN_DAYS = 180;
  var DISABLED = 'open-source-rds-extended-support-disabled';
  var TYPES = /^\s*resource\s+"(aws_db_instance|aws_rds_cluster|aws_rds_cluster_instance)"\s+"([^"]+)"\s*\{/;

  function day(s) {
    var m = String(s || '').match(/(\d{4})-(\d{2})-(\d{2})/);
    return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null;
  }
  function daysBetween(a, b) { return Math.round((b - a) / 86400000); }
  function money(x) { return '$' + String(Math.round(x)).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function vcpu(cls) {
    var m = String(cls || '').match(/^db\.[a-z0-9-]+\.(micro|small|medium|large|xlarge|(\d+)xlarge)$/);
    if (!m) return 0;
    if (m[2]) return 4 * +m[2];
    return m[1] === 'xlarge' ? 4 : 2;
  }
  function value(raw) {
    var s = raw.replace(/\s+$/, '');
    var q = s.match(/^"([^"]*)"/);
    if (q) return q[1];
    if (/^(true|false)\b/.test(s)) return s.indexOf('true') === 0;
    if (/^\d+\s*$/.test(s)) return +s;
    return { expr: s };
  }
  function blocks(text) {
    var lines = String(text || '').split(/\r?\n/), out = [], cur = null, depth = 0;
    for (var i = 0; i < lines.length; i++) {
      var L = lines[i].replace(/(^|\s)(#|\/\/).*$/, '');
      if (!cur) {
        var m = L.match(TYPES);
        if (m) {
          cur = { type: m[1], name: m[2], line: i + 1, attrs: {}, at: {} };
          depth = (L.match(/\{/g) || []).length - (L.match(/\}/g) || []).length;
          if (depth <= 0) { out.push(cur); cur = null; }
        }
        continue;
      }
      if (depth === 1) {
        var a = L.match(/^\s*([a-z_]+)\s*=\s*(.+)$/);
        if (a) { cur.attrs[a[1]] = value(a[2]); cur.at[a[1]] = i + 1; }
      }
      depth += (L.match(/\{/g) || []).length - (L.match(/\}/g) || []).length;
      if (depth <= 0) { out.push(cur); cur = null; }
    }
    return out;
  }
  function str(v) { return typeof v === 'string' ? v : ''; }
  function findRule(engine, version) {
    var e = str(engine), v = str(version);
    if (!e || !v) return null;
    var major = /postgres/.test(e) ? (v.match(/^(\d+)/) || [])[1] : (v.match(/^(\d+\.\d+)/) || [])[1];
    for (var i = 0; i < RULES.length; i++) if (RULES[i].engine === e && RULES[i].major === major) return RULES[i];
    return null;
  }

  // One database target: {label, line, rule, vcpus, copies, multiAz, disabled, cls}
  function price(t, now) {
    var r = t.rule, y1 = day(r.y1), y3 = r.y3 ? day(r.y3) : null, end = day(r.es_end);
    var who = t.label + ' (' + r.label + ')';
    if (now < y1) {
      var until = daysBetween(now, y1);
      if (until > WARN_DAYS) return null;
      var soon = t.vcpus ? t.vcpus * r.rate_y12 * HOURS_YEAR : 0;
      return { check: r.id, sev: 'warning', line: t.line, cost: 0,
        msg: who + ' leaves standard support on ' + r.std_end + '; Extended Support billing starts ' + r.y1 + ' (in ' + until + ' days)' +
          (t.disabled ? '. engine_lifecycle_support is disabled, so RDS upgrades it to the next major version instead of billing.'
            : (soon ? ': ' + t.vcpus + ' vCPU x $' + r.rate_y12.toFixed(3) + ' x 8,760 h = ' + money(soon) + '/yr.' : '.')) +
          ' Upgrade to ' + r.next + ' before ' + r.y1 + '.' };
    }
    if (end && now > end) {
      return { check: r.id, sev: 'error', line: t.line, cost: 0,
        msg: who + ' is past the end of RDS Extended Support (' + r.es_end + '); AWS upgrades the major version automatically. Upgrade to ' + r.next + ' on your own schedule.' };
    }
    if (t.disabled) {
      return { check: r.id, sev: 'warning', line: t.line, cost: 0,
        msg: who + ' is past standard support (' + r.std_end + ') with engine_lifecycle_support disabled: RDS upgrades it to the next major version automatically. Upgrade to ' + r.next + ' yourself first.' };
    }
    var inY3 = y3 && now >= y3, rate = inY3 ? r.rate_y3 : r.rate_y12;
    var since = daysBetween(y1, now);
    var cost = t.vcpus * rate * HOURS_YEAR;
    var parts = [who + ' is billed for RDS Extended Support since ' + r.y1 + ' (' + since + ' days)'];
    if (t.vcpus) parts.push(t.vcpus + ' vCPU' + (t.note ? ' (' + t.note + ')' : '') + ' x $' + rate.toFixed(3) + ' x 8,760 h = ' + money(cost) + '/yr');
    else parts.push('instance class unknown, add instance_class to price it at $' + rate.toFixed(3) + ' per vCPU-hour');
    if (y3 && !inY3) parts.push('rate doubles to $' + r.rate_y3.toFixed(3) + ' on ' + r.y3 + ' (in ' + daysBetween(now, y3) + ' days)');
    parts.push('support ends ' + r.es_end + '. Upgrade to ' + r.next + ' to stop the charge');
    return { check: r.id, sev: 'error', line: t.line, cost: cost, msg: parts.join('; ') + '.' };
  }

  function check(text, opts) {
    opts = opts || {};
    var now = day(opts.today);
    if (now === null) { var d = new Date(); now = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()); }
    var bs = blocks(text), clusters = {}, used = {}, targets = [], i;
    for (i = 0; i < bs.length; i++) if (bs[i].type === 'aws_rds_cluster') clusters[bs[i].name] = bs[i];
    for (i = 0; i < bs.length; i++) {
      var b = bs[i], A = b.attrs, n = typeof A.count === 'number' ? A.count : 1;
      if (b.type === 'aws_db_instance') {
        var r = findRule(A.engine, A.engine_version);
        if (!r) continue;
        var per = vcpu(A.instance_class), maz = A.multi_az === true, k = n * (maz ? 2 : 1);
        var note = [str(A.instance_class)];
        if (n > 1) note.push('count = ' + n);
        if (maz) note.push('Multi-AZ standby billed too');
        targets.push({ label: 'aws_db_instance.' + b.name, line: b.at.engine_version || b.line, rule: r,
          vcpus: per * k, note: note.filter(Boolean).join(', '), disabled: A.engine_lifecycle_support === DISABLED });
      } else if (b.type === 'aws_rds_cluster_instance') {
        var ref = A.cluster_identifier && A.cluster_identifier.expr ? (A.cluster_identifier.expr.match(/aws_rds_cluster\.([A-Za-z0-9_-]+)/) || [])[1] : null;
        var c = ref && clusters[ref] ? clusters[ref].attrs : {};
        var r2 = findRule(str(A.engine) || c.engine, str(A.engine_version) || c.engine_version);
        if (!r2) continue;
        if (ref) used[ref] = true;
        var n2 = vcpu(A.instance_class);
        targets.push({ label: 'aws_rds_cluster_instance.' + b.name + (ref ? ' in cluster ' + ref : ''), line: b.line, rule: r2,
          vcpus: n2 * n, note: str(A.instance_class) + (n > 1 ? ', count = ' + n : ''),
          disabled: (A.engine_lifecycle_support || c.engine_lifecycle_support) === DISABLED });
      }
    }
    for (i = 0; i < bs.length; i++) {
      var cb = bs[i];
      if (cb.type !== 'aws_rds_cluster' || used[cb.name]) continue;
      var r3 = findRule(cb.attrs.engine, cb.attrs.engine_version);
      if (!r3) continue;
      targets.push({ label: 'aws_rds_cluster.' + cb.name, line: cb.at.engine_version || cb.line, rule: r3,
        vcpus: 0, note: '', disabled: cb.attrs.engine_lifecycle_support === DISABLED });
    }
    var findings = [], total = 0;
    for (i = 0; i < targets.length; i++) {
      var f = price(targets[i], now);
      if (f) { total += f.cost; findings.push(f); }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    for (i = 0; i < findings.length; i++) {
      if (findings[i].cost) { findings[i].msg += ' File total billed now: ' + money(total) + '/yr.'; break; }
    }
    for (i = 0; i < findings.length; i++) delete findings[i].cost;
    return { findings: findings, total_per_year: Math.round(total) };
  }

  var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  if (typeof window !== 'undefined') window.RDSXENGINE = API;
})();
