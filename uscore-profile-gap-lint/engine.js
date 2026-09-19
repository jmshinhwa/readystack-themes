// US Core Profile Gap Check - one brain, used by the extension and by the web page.
const RULES = (typeof module !== 'undefined' && module.exports)
  ? require('./rules.json')
  : window.USCORE_RULES;

const RULE_COUNT = RULES.length;

// Resource types US Core 6.1.0 profiles and USCDI v3 expects to be labelled.
const US_CORE_TYPES = [
  'Patient', 'Encounter', 'Condition', 'Observation', 'AllergyIntolerance',
  'MedicationRequest', 'Immunization', 'Procedure', 'DiagnosticReport',
  'DocumentReference', 'CarePlan', 'CareTeam', 'Goal', 'Location',
  'Organization', 'Practitioner', 'Device', 'Coverage', 'ServiceRequest',
  'QuestionnaireResponse', 'RelatedPerson', 'Specimen', 'Provenance'
];

const USCDI_V3_FLOOR = '6.1.0';
const DEADLINE = '2026-01-01';

function msgOf(id) {
  const r = RULES.find(function (x) { return x.id === id; });
  return r ? r.msg : id;
}
function sevOf(id) {
  const r = RULES.find(function (x) { return x.id === id; });
  return r ? r.sev : 'warn';
}

function daysSince(from, today) {
  if (!today) return null;
  const a = Date.parse(from + 'T00:00:00Z');
  const b = Date.parse(today + 'T00:00:00Z');
  if (isNaN(a) || isNaN(b)) return null;
  return Math.round((b - a) / 86400000);
}

function check(text, opts) {
  opts = opts || {};
  const src = String(text == null ? '' : text);
  const lines = src.split(/\r?\n/);
  // Flattened copy: JSON is hard-wrapped by every formatter, so every
  // whole-document test runs against one space-normalised string.
  const flat = src.replace(/\s+/g, ' ');
  const findings = [];

  function lineOf(re) {
    for (let i = 0; i < lines.length; i++) {
      if (re.test(lines[i])) return i + 1;
    }
    return 1;
  }
  function push(id, line, extra) {
    findings.push({
      check: id,
      sev: sevOf(id),
      msg: extra ? msgOf(id) + ' ' + extra : msgOf(id),
      line: line || 1
    });
  }

  // 1 + 2 + 3: what version does each us-core profile claim actually pin?
  // Only meta.profile is a conformance claim - the same StructureDefinition URL
  // under an extension "url" is a definition reference and carries no version.
  const claimRe = /"profile"\s*:\s*(\[[\s\S]*?\]|"[^"]*")/g;
  const profileRe = /https?:\/\/hl7\.org\/fhir\/us\/core\/StructureDefinition\/([A-Za-z0-9-]+)(\|([0-9][0-9A-Za-z.\-]*))?/g;
  let m, sawProfile = false;
  while ((m = claimRe.exec(src)) !== null) {
    const block = m[1];
    const base = m.index + m[0].indexOf(block);
    let p;
    profileRe.lastIndex = 0;
    while ((p = profileRe.exec(block)) !== null) {
      sawProfile = true;
      const name = p[1];
      const ver = p[3];
      const at = src.slice(0, base + p.index).split(/\r?\n/).length;
      if (!ver) {
        push('unpinned_profile', at, '(' + name + ')');
      } else if (/^3\./.test(ver)) {
        push('uscore_v1_pin', at, '(' + name + '|' + ver + ' -> needs ' + USCDI_V3_FLOOR + ')');
      } else if (/^[45]\./.test(ver)) {
        push('uscore_v2_pin', at, '(' + name + '|' + ver + ' -> needs ' + USCDI_V3_FLOOR + ')');
      }
    }
  }

  // 4: a US Core resource type that never claims a us-core profile at all.
  const typeRe = /"resourceType"\s*:\s*"([A-Za-z]+)"/g;
  const seenTypes = [];
  while ((m = typeRe.exec(src)) !== null) {
    if (US_CORE_TYPES.indexOf(m[1]) !== -1 && seenTypes.indexOf(m[1]) === -1) {
      seenTypes.push(m[1]);
    }
  }
  if (seenTypes.length && !sawProfile) {
    push('no_meta_profile', lineOf(/"resourceType"/), '(' + seenTypes.join(', ') + ')');
  }

  // 5: pre-R4 artefacts.
  if (/hl7\.org\/fhir\/(STU3|DSTU2)\//.test(flat) || /"fhirVersion"\s*:\s*"[123]\./.test(flat)) {
    push('pre_r4_url', lineOf(/(STU3|DSTU2)|"fhirVersion"\s*:\s*"[123]\./));
  }

  // 6: terminology URLs R4 retired.
  if (/hl7\.org\/fhir\/v[23]\//.test(flat)) {
    push('legacy_terminology_url', lineOf(/hl7\.org\/fhir\/v[23]\//));
  }

  // 7 + 8: USCDI Patient Demographics, including the elements v3 added over v2.
  const hasPatient = /"resourceType"\s*:\s*"Patient"/.test(flat);
  if (hasPatient) {
    if (!/us-core-race/.test(flat) || !/us-core-ethnicity/.test(flat)) {
      push('missing_race_ethnicity', lineOf(/"resourceType"\s*:\s*"Patient"/));
    }
    if (!/us-core-genderIdentity/.test(flat)) {
      push('missing_sogi', lineOf(/"resourceType"\s*:\s*"Patient"/));
    }
  }

  // 9: the version the server advertises.
  if (/"resourceType"\s*:\s*"CapabilityStatement"/.test(flat)) {
    const fv = flat.match(/"fhirVersion"\s*:\s*"([^"]+)"/);
    if (!fv || fv[1] !== '4.0.1') {
      push('capability_fhir_version', lineOf(/"fhirVersion"/), '(found ' + (fv ? fv[1] : 'nothing') + ')');
    }
  }

  // 10: can a surveyor date this resource against the line?
  if (/"meta"\s*:/.test(flat) && !/"lastUpdated"\s*:/.test(flat)) {
    push('no_last_updated', lineOf(/"meta"\s*:/));
  }

  const since = daysSince(DEADLINE, opts.today);
  if (since !== null && findings.length) {
    findings.forEach(function (f) {
      if (f.sev === 'error' && !/day/.test(f.msg)) {
        f.msg = f.msg + ' USCDI v3 line passed ' + since + ' days ago.';
      }
    });
  }

  return { findings: findings };
}

const engine = { check: check };

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
}
if (typeof window !== 'undefined') {
  window.USCOREENGINE = { engine: engine, RULES: RULES, RULE_COUNT: RULE_COUNT };
}
