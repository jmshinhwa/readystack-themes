// SQL Server Express Downgrade Check — lists every T-SQL, ConfigurationFile.ini and compose line that
// SQL Server Express cannot run, with the Express replacement. Same file runs in Node (extension) and the browser.
(function () {
  var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.SQLEXP_RULES;
  var CAP_MB = { '2022': 10240, '2025': 51200 };
  var BUFFER_MB = 1410;
  var SOURCE = 'learn.microsoft.com/sql/sql-server/editions-and-components-of-sql-server-2022 and -2025';

  function byId(id) { for (var i = 0; i < RULES.length; i++) if (RULES[i].id === id) return RULES[i]; return null; }
  function isComment(l) { return /^\s*(--|#|;|\/\/)/.test(l); }
  function fmt(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
  function toMB(n, unit) {
    unit = (unit || 'MB').toUpperCase();
    return unit === 'TB' ? n * 1048576 : unit === 'GB' ? n * 1024 : unit === 'KB' ? n / 1024 : n;
  }
  function target(text, opts) {
    if (opts && (opts.target === '2025' || opts.target === '2022')) return opts.target;
    return /(-- *target: *2025|sql server 2025|mssql\/server:2025|\b17\.0\.\d)/i.test(text) ? '2025' : '2022';
  }

  function check(text, opts) {
    opts = opts || {};
    text = String(text || '');
    var lines = text.split(/\r?\n/), findings = [], ver = target(text, opts), cap = CAP_MB[ver];
    var hasBackup = /\bBACKUP\s+(DATABASE|LOG)\b/i.test(text);
    var isExpress = /\bMSSQL_PID\s*[=:]\s*["']?Express\b/i.test(text);
    var hasPid = /\bMSSQL_PID\b/i.test(text);
    var inLog = false;

    function add(r, i, what, extra) {
      findings.push({ check: r.id, sev: r.sev, line: i + 1, text: lines[i].trim(),
        msg: r.title + ': ' + what + ' — ' + (extra || r.why) + ' Express fix: ' + r.fix, fix: r.fix });
    }

    for (var i = 0; i < lines.length; i++) {
      var L = lines[i], m;
      if (isComment(L)) continue;
      RULES.forEach(function (r) {
        if (!r.pattern) return;
        var mm = new RegExp(r.pattern, 'i').exec(L);
        if (mm) add(r, i, mm[0]);
      });
      // backup compression: COMPRESSION in a backup script, not NO_COMPRESSION / DATA_COMPRESSION
      if (hasBackup && /(^|[\s,(])COMPRESSION\b/i.test(L) && !/(NO_|DATA_)COMPRESSION/i.test(L)) add(byId('backup-compression'), i, 'COMPRESSION');
      if (/'backup compression default'\s*,\s*1\b/i.test(L)) add(byId('backup-compression'), i, "'backup compression default', 1");
      // database size cap: SIZE / MAXSIZE on data files only (skip after LOG ON until the statement ends)
      if (/\bLOG\s+ON\b/i.test(L)) inLog = true;
      if (/;|^\s*GO\s*$/i.test(L) && !/\bLOG\s+ON\b/i.test(L)) { var wasLog = inLog; inLog = false; if (wasLog) continue; }
      if (!inLog) {
        var re = /\b(MAX)?SIZE\s*=\s*(\d+(?:\.\d+)?)\s*(KB|MB|GB|TB)?\b/ig;
        while ((m = re.exec(L))) {
          var mb = toMB(parseFloat(m[2]), m[3]);
          if (mb > cap) add(byId('db-size-cap'), i, m[0], 'SQL Server ' + ver + ' Express caps a database at ' + fmt(cap / 1024) + ' GB; this file is set to ' + fmt(Math.round(mb / 1024 * 10) / 10) + ' GB, so inserts fail once data passes ' + fmt(cap / 1024) + ' GB (2022: 10 GB, 2025: 50 GB; the log does not count).');
        }
      }
      // max server memory above the 1,410 MB buffer pool
      if ((m = /'max server memory[^']*'\s*,\s*(\d+)/i.exec(L)) && +m[1] > BUFFER_MB) {
        add(byId('max-memory'), i, fmt(+m[1]) + ' MB', 'Express uses at most ' + fmt(BUFFER_MB) + ' MB of buffer pool; ' + fmt(+m[1] - BUFFER_MB) + ' MB of this setting is never used for data cache.');
      }
      // paid / non-production edition
      if ((m = /\bMSSQL_PID\s*[=:]\s*["']?(Developer|StandardDeveloper|EnterpriseDeveloper|Standard|EnterpriseCore|Enterprise|Evaluation|Web|[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5}-[0-9A-Z]{5})\b/i.exec(L))) add(byId('paid-edition'), i, 'MSSQL_PID=' + m[1]);
      else if ((m = /^\s*PID\s*=\s*"?([0-9A-Z]{5}(-[0-9A-Z]{5}){4})/i.exec(L))) add(byId('paid-edition'), i, 'PID product key');
      // image with no MSSQL_PID anywhere in the file
      if (!hasPid && /mcr\.microsoft\.com\/mssql\/(server|rhel\/server)/i.test(L)) add(byId('default-developer'), i, (/mcr\.microsoft\.com\/\S+/.exec(L) || [''])[0]);
      // cores above the Express cap in an Express container
      if (isExpress && (m = /^\s*(cpus|cpu)\s*:\s*["']?(\d+(?:\.\d+)?)["']?\s*$/i.exec(L)) && parseFloat(m[2]) > 4) {
        add(byId('cores-over-cap'), i, m[1] + ': ' + m[2], 'Express uses the lesser of 1 socket or 4 cores; ' + (parseFloat(m[2]) - 4) + ' of the ' + m[2] + ' cores given here stay idle.');
      }
    }
    findings.sort(function (a, b) { return a.line - b.line; });
    return { findings: findings, target: ver, cap_gb: cap / 1024, today: opts.today || '', source: SOURCE };
  }

  var api = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULES.length };
  if (typeof module !== 'undefined') module.exports = api;
  if (typeof window !== 'undefined') window.SQLEXP_ENGINE = api;
})();
