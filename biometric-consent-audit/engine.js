// Biometric Consent Audit - the whole brain lives here.
// The same file runs in Node (the VS Code extension) and in the browser (the free web tool).
var RULES = (typeof module !== 'undefined') ? require('./rules.json') : window.BIO_RULES;
var RULE_COUNT = RULES.length;

var BY = {};
for (var i = 0; i < RULES.length; i++) { BY[RULES[i].check] = RULES[i]; }

var CAP = BY.retention_over_bipa_cap.bipa_max_days;   // 1095 - BIPA 15(a) outer limit
var CUBI = BY.retention_over_bipa_cap.cubi_max_days;   // 365 - Texas CUBI 503.001(c-2)

// snake_case and camelCase are both spelled out on purpose: the same code ships in .py and .ts
var RX = {
  capture: /\b(face_recognition|face_encodings|faceEncodings|detect_faces|detectFaces|compare_faces|compareFaces|search_faces_by_image|searchFacesByImage|face_mesh|faceMesh|FaceDetection|face_landmarks|faceLandmarks|fingerprint_template|fingerprintTemplate|minutiae|voiceprint|voicePrint|speaker_id|speakerId|speaker_verify|speakerVerify|enroll_voice|enrollVoice|iris_scan|irisScan|retina_scan|retinaScan|palm_scan|palmScan)\b/,
  consent: /\b(biometric_consent|biometricConsent|has_consent|hasConsent|consent_granted|consentGranted|written_release|writtenRelease|release_signed|releaseSigned|require_consent|requireConsent)\b/,
  template: /(templates?|encodings?|embeddings?|faceprints?|voiceprints?|biometrics?|descriptors?|\btpl\b)/i,
  store: /\b(open|write_bytes|writeFileSync|writeFile|save|dump|insert_one|insertOne|execute|setItem|put_object|putObject|to_csv|upload_file)\s*\(|\bINSERT\s+INTO\b/i,
  encrypt: /\b(encrypt|encrypted|encrypt_bytes|Fernet|AES|GCM|KMS|kms_key|libsodium|nacl|sealed_box|argon2|bcrypt|hmac|sha256)\b/i,
  send: /\b(requests\.(?:post|put)|httpx\.(?:post|put)|axios\.(?:post|put)|session\.post|urlopen|fetch)\s*\(/,
  profit: /\b(sell|resell|monetize|monetise|ad_targeting|adTargeting|license_dataset|licenseDataset|data_broker|dataBroker|marketplace_upload)[A-Za-z0-9_]*/i,
  emotion: /\b(emotion|emotions|detect_emotion|detectEmotion|affect_recognition|affectRecognition|mood_detect|moodDetect|stress_level|stressLevel|engagement_score|engagementScore)[A-Za-z0-9_]*/i,
  sensitive: /\b(ethnicity|predict_ethnicity|race_prediction|racePrediction|predict_race|predictRace|religion|sexual_orientation|sexualOrientation|political_affiliation|politicalAffiliation)[A-Za-z0-9_]*/i,
  scrape: /\b(scrape|scraper|scrape_faces|crawl|crawler|spider|bulk_download|bulkDownload)[A-Za-z0-9_]*/i,
  images: /(faces?|photos?|images?|avatars?|selfies?|headshots?)/i,
  employee: /\b(employee|employees|timeclock|time_clock|timeClock|attendance|shift_start|shiftStart|worker|workers|payroll)[A-Za-z0-9_]*/i,
  notice: /\b(bipa_notice|bipaNotice|consent_record|consentRecord|notice_version|noticeVersion|release_signed_at|releaseSignedAt|hb1130_notice)\b/,
  policy: /\b(BIPA_POLICY_URL|POLICY_URL|retention_policy_url|retentionPolicyUrl|biometric_policy|biometricPolicy|privacy_policy|privacyPolicy)\b/i,
  retention: /\b([A-Za-z0-9_]*(?:retention|retain|destroy|destruction|purge|ttl|keep_)[A-Za-z0-9_]*)\s*[:=]\s*(\d[\d_]*)\b/i,
  encAssign: /\b([A-Za-z0-9_]+)\s*=\s*[^=;]*\b(?:encrypt|encrypted|encrypt_bytes|Fernet|AES|GCM|KMS|kms_key|libsodium|nacl|sealed_box|argon2|bcrypt|hmac|sha256)/i,
  noise: /^\s*(?:#|\/\/|\*|\/\*|from\s+[\w.]+\s+import|import\s+[\w.]+|require\s*\()/,
  enrolled: /\b([A-Za-z0-9_]*(?:enrolled|enrol_|last_interaction|lastInteraction|captured_at|capturedAt|collected_at|collectedAt)[A-Za-z0-9_]*)\s*[:=]\s*['"](\d{4}-\d{2}-\d{2})['"]/i
};

function toDays(name, n) {
  if (/year/i.test(name)) { return n * 365; }
  if (/month/i.test(name)) { return n * 30; }
  if (/hour/i.test(name)) { return Math.round(n / 24); }
  if (/week/i.test(name)) { return n * 7; }
  return n;                                  // bare numbers are read as days
}

function daysBetween(fromIso, toIso) {
  var a = Date.parse(fromIso + 'T00:00:00Z');
  var b = Date.parse(toIso + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) { return null; }
  return Math.round((b - a) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  var today = String(opts.today || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today) || isNaN(Date.parse(today + 'T00:00:00Z'))) {
    today = '';
  }
  var lines = String(text == null ? '' : text).split(/\r?\n/);
  var out = [];
  function add(id, line, extra) {
    var r = BY[id];
    out.push({ check: id, sev: r.sev, line: line, msg: r.msg + (extra ? ' ' + extra : '') + ' [' + r.law + ']' });
  }

  var firstCapture = 0, firstConsent = 0, hasNotice = false, hasPolicy = false, employeeLine = 0;
  var declared = null, declaredLine = 0, declaredName = '';
  var encVars = [];
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i], n = i + 1;
    if (RX.noise.test(L)) { continue; }
    if (!firstCapture && RX.capture.test(L)) { firstCapture = n; }
    if (!firstConsent && RX.consent.test(L)) { firstConsent = n; }
    if (RX.notice.test(L)) { hasNotice = true; }
    if (RX.policy.test(L)) { hasPolicy = true; }
    if (!employeeLine && RX.employee.test(L)) { employeeLine = n; }
    var ev = RX.encAssign.exec(L);
    if (ev) { encVars.push(ev[1]); }
    var m = RX.retention.exec(L);
    if (m && declared === null) {
      declared = toDays(m[1], parseInt(String(m[2]).replace(/_/g, ''), 10));
      declaredLine = n; declaredName = m[1];
    }
  }
  if (!firstCapture) { return { findings: [], rule_count: RULE_COUNT }; }

  if (!firstConsent) { add('capture_without_consent', firstCapture); }
  else if (firstConsent > firstCapture) {
    add('consent_after_capture', firstCapture, 'Capture is on line ' + firstCapture + ', the release check on line ' + firstConsent + '.');
  }

  if (declared === null) { add('missing_destruction_schedule', firstCapture); }
  else if (declared > CAP) {
    add('retention_over_bipa_cap', declaredLine, declaredName + ' = ' + declared + ' days, which is ' + (declared - CAP) + ' days over the 1095-day limit.');
  } else if (declared > CUBI) {
    add('retention_over_cubi_year', declaredLine, declaredName + ' = ' + declared + ' days, which is ' + (declared - CUBI) + ' days over the 365-day Texas limit.');
  }

  for (var j = 0; j < lines.length; j++) {
    var ln = lines[j], num = j + 1;
    var guarded = RX.encrypt.test(ln);
    for (var k = 0; k < encVars.length && !guarded; k++) {
      if (new RegExp('\\b' + encVars[k] + '\\b').test(ln)) { guarded = true; }
    }

    if (RX.store.test(ln) && RX.template.test(ln) && !guarded) {
      add('template_stored_unencrypted', num);
    }
    if (RX.send.test(ln) && RX.template.test(ln)) {
      add('template_sent_third_party', num);
    }
    if (RX.profit.test(ln) && RX.template.test(ln)) {
      add('profit_from_biometrics', num);
    }
    if (RX.emotion.test(ln)) { add('emotion_inference', num); }
    if (RX.sensitive.test(ln)) { add('sensitive_categorisation', num); }
    if (RX.scrape.test(ln) && RX.images.test(ln)) { add('untargeted_face_scraping', num); }

    var e = RX.enrolled.exec(ln);
    if (e && today) {
      var age = daysBetween(e[2], today);
      if (age !== null && age > CAP) {
        add('destruction_window_elapsed', num, e[1] + ' = ' + e[2] + ' is ' + age + ' days before ' + today + ', i.e. ' + (age - CAP) + ' days past destruction.');
      }
    }
  }

  if (employeeLine && !hasNotice) { add('employee_biometric_no_notice', employeeLine); }
  if (!hasPolicy) { add('missing_public_policy_link', firstCapture); }

  out.sort(function (a, b) { return a.line - b.line; });
  return { findings: out, rule_count: RULE_COUNT };
}

var API = { engine: { check: check }, RULES: RULES, RULE_COUNT: RULE_COUNT };
if (typeof module !== 'undefined') { module.exports = API; }
if (typeof window !== 'undefined') { window.BIOENGINE = API; }
