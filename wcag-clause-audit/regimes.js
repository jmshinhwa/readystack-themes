// regimes.js — which accessibility standard version legally binds you, and by when.
// This is the layer generic scanners do not have: they report against WCAG 2.2 by
// default and never tell you which criteria you are actually required to meet.
// Every date and version below is sourced; see README.md "Sources".

const REGIMES = [
  {
    id: 'us_ada_t2_large',
    label: 'US - ADA Title II, public entity serving 50,000+',
    standard: 'WCAG 2.1 Level AA',
    wcag: '2.1',
    deadline: '2027-04-26',
    note: 'DOJ issued an interim final rule on 2026-04-17 that moved this from 2026-04-24 by one year. '
        + 'Checklists and chatbots written before that date still quote 2026-04-24, which is no longer the deadline. '
        + 'The technical standard and the content scope did not change.'
  },
  {
    id: 'us_ada_t2_small',
    label: 'US - ADA Title II, public entity under 50,000 or special district',
    standard: 'WCAG 2.1 Level AA',
    wcag: '2.1',
    deadline: '2028-04-26',
    note: 'Also moved by one year by the DOJ interim final rule of 2026-04-17 (from 2027-04-26). '
        + 'There is no small-entity exemption - the standard is identical, only the date differs.'
  },
  {
    id: 'us_508',
    label: 'US - Section 508 (federal ICT and its vendors)',
    standard: 'WCAG 2.0 Level AA',
    wcag: '2.0',
    deadline: null,
    inForce: '2018-01-18',
    note: 'The Revised 508 Standards still reference WCAG 2.0 Level AA (38 criteria). '
        + 'The 17 success criteria added by WCAG 2.1 are NOT required by Section 508. '
        + 'A scanner set to WCAG 2.1 or 2.2 will flag work you are not legally obliged to do here.'
  },
  {
    id: 'eu_eaa_new',
    label: 'EU - European Accessibility Act, product or service placed on the market since 2025-06-28',
    standard: 'EN 301 549 v3.2.1 -> WCAG 2.1 Level AA',
    wcag: '2.1',
    deadline: null,
    inForce: '2025-06-28',
    note: 'v3.2.1 is the harmonised version and it incorporates WCAG 2.1 AA. EN 301 549 v4.1.0 entered final '
        + 'deliverable voting in June 2026 and v4.1.1 is expected to move to WCAG 2.2 - until it is cited, '
        + 'WCAG 2.1 AA is what binds. Microenterprises (under 10 staff and turnover at most EUR 2M) are exempt '
        + 'for SERVICES only, never for products they place on the market.'
  },
  {
    id: 'eu_eaa_legacy',
    label: 'EU - EAA, service under a contract concluded before 2025-06-28',
    standard: 'EN 301 549 v3.2.1 -> WCAG 2.1 Level AA',
    wcag: '2.1',
    deadline: '2027-06-28',
    note: 'Service contracts already in force on 2025-06-28 may continue unchanged until 2027-06-28. '
        + 'From 2030-06-28 every in-scope product and service must comply regardless of when it was released.'
  }
];

// WCAG versions are cumulative: 2.1 contains all of 2.0. A rule is in scope for a
// regime when the criterion existed in the version that regime cites.
const ORDER = { '2.0': 0, '2.1': 1, '2.2': 2 };

function inScope(ruleWcag, regime) {
  return ORDER[String(ruleWcag || '2.0')] <= ORDER[String(regime.wcag)];
}

function daysUntil(iso, today) {
  if (!iso) return null;
  const now = today ? new Date(today + 'T00:00:00Z') : new Date();
  const then = new Date(iso + 'T00:00:00Z');
  return Math.round((then - now) / 86400000);
}

function byId(id) {
  for (const r of REGIMES) if (r.id === id) return r;
  return null;
}

// One line per regime: what binds you, and how long you have.
function status(regime, today) {
  const d = daysUntil(regime.deadline, today);
  let when;
  if (regime.deadline === null) when = 'in force since ' + regime.inForce;
  else if (d === null) when = '';
  else if (d < 0) when = 'deadline ' + regime.deadline + ' has PASSED (' + (-d) + ' days ago)';
  else when = 'deadline ' + regime.deadline + ' - ' + d + ' days left';
  return { label: regime.label, standard: regime.standard, when: when, days: d, note: regime.note };
}

// Split findings into what this regime requires and what it does not.
function split(hits, regime) {
  const required = [], notRequired = [];
  for (const h of hits) (inScope(h.wcag, regime) ? required : notRequired).push(h);
  return { required: required, notRequired: notRequired };
}

module.exports = { REGIMES, inScope, daysUntil, byId, status, split, ORDER };
