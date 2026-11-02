// Rules-as-code. Every scheme is plain JSON: conditions are evaluated deterministically and every
// result can be traced back to a condition, a value and an official source. AI never decides eligibility.
//
// IMPORTANT: thresholds and benefit amounts below are DEMO VALUES for the hackathon. `status` is
// 'demo-unverified' until a human reviewer approves the rule in the Rules Studio against the current
// official guideline. Benefit `amount` is indicative annual value, used for the "money left on the table" view.
//
// Context fields available to conditions:
//   member.age, member.gender ('F'|'M'), member.maritalStatus ('married'|'single'|'widowed'),
//   member.isStudent, member.level ('post_matric'|'school'|'none'), member.isPregnant
//   household.category ('SC'|'ST'|'OBC'|'General'), household.income (effective, ₹/yr), household.landAcres,
//   household.bpl, household.hasPuccaHouse, household.hasLPG, household.area ('rural'|'urban')

const c = (id, field, op, value, label) => ({ id, field, op, value, label });

export const SCHEMES = [
  {
    id: 'pm_kisan', name: 'PM-KISAN Samman Nidhi', short: 'PM-KISAN', category: 'Agriculture', appliesTo: 'household',
    benefit: { amount: 6000, period: 'year', kind: 'cash', text: '₹6,000 per year in 3 instalments' },
    conditions: [c('land', 'household.landAcres', 'gt', 0, 'Family owns cultivable land')],
    docs: ['aadhaar', 'bank_passbook', 'land_record'], strict: true,
    office: 'Common Service Centre or the PM-KISAN portal (farmers corner)', source: 'https://pmkisan.gov.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'pm_jay', name: 'Ayushman Bharat PM-JAY', short: 'Ayushman Bharat', category: 'Health', appliesTo: 'household',
    benefit: { amount: 500000, period: 'year', kind: 'cover', text: '₹5 lakh health cover per family per year' },
    conditions: [c('bpl', 'household.bpl', 'truthy', true, 'Household is in the deprived / BPL category (proxy for SECC listing)')],
    docs: ['aadhaar', 'ration_card'], strict: false,
    office: 'Empanelled hospital Ayushman Mitra or CSC', source: 'https://pmjay.gov.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'widow_pension', name: 'Indira Gandhi National Widow Pension (NSAP)', short: 'Widow pension', category: 'Social security', appliesTo: 'member', exclusiveGroup: 'nsap',
    benefit: { amount: 3600, period: 'year', kind: 'cash', text: '₹300 per month central share; most states add more' },
    conditions: [
      c('gender', 'member.gender', 'eq', 'F', 'Applicant is a woman'),
      c('widow', 'member.maritalStatus', 'eq', 'widowed', 'Applicant is widowed'),
      c('age_min', 'member.age', 'gte', 40, 'Age is 40 or above'),
      c('age_max', 'member.age', 'lte', 79, 'Age is 79 or below'),
      c('bpl', 'household.bpl', 'truthy', true, 'Household is below the poverty line'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'death_certificate', 'ration_card'], strict: true,
    office: 'Block / tehsil social welfare office', source: 'https://nsap.nic.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'old_age_pension', name: 'Indira Gandhi National Old Age Pension (NSAP)', short: 'Old-age pension', category: 'Social security', appliesTo: 'member', exclusiveGroup: 'nsap',
    benefit: { amount: 2400, period: 'year', kind: 'cash', text: '₹200 per month central share (60–79 years); states add more' },
    conditions: [
      c('age_min', 'member.age', 'gte', 60, 'Age is 60 or above'),
      c('bpl', 'household.bpl', 'truthy', true, 'Household is below the poverty line'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'ration_card'], strict: true,
    office: 'Block / tehsil social welfare office', source: 'https://nsap.nic.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'pms_obc', name: 'Post-Matric Scholarship for OBC students', short: 'OBC scholarship', category: 'Education', appliesTo: 'member',
    benefit: { amount: 15000, period: 'year', kind: 'cash', text: 'Maintenance allowance and fee reimbursement (indicative)' },
    conditions: [
      c('student', 'member.isStudent', 'truthy', true, 'Applicant is a student'),
      c('level', 'member.level', 'eq', 'post_matric', 'Studying after Class 10'),
      c('cat', 'household.category', 'eq', 'OBC', 'Belongs to OBC category'),
      c('income', 'household.income', 'lte', 150000, 'Family income is ₹1.5 lakh a year or less'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'caste_certificate', 'income_certificate', 'marksheet'], strict: true,
    deadline: '2026-12-31', office: 'National Scholarship Portal (scholarships.gov.in), verified by the institute', source: 'https://scholarships.gov.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'pms_sc_st', name: 'Post-Matric Scholarship for SC/ST students', short: 'SC/ST scholarship', category: 'Education', appliesTo: 'member',
    benefit: { amount: 18000, period: 'year', kind: 'cash', text: 'Maintenance allowance and fee reimbursement (indicative)' },
    conditions: [
      c('student', 'member.isStudent', 'truthy', true, 'Applicant is a student'),
      c('level', 'member.level', 'eq', 'post_matric', 'Studying after Class 10'),
      c('cat', 'household.category', 'in', ['SC', 'ST'], 'Belongs to SC or ST category'),
      c('income', 'household.income', 'lte', 250000, 'Family income is ₹2.5 lakh a year or less'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'caste_certificate', 'income_certificate', 'marksheet'], strict: true,
    deadline: '2026-12-31', office: 'National Scholarship Portal (scholarships.gov.in)', source: 'https://scholarships.gov.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'pmay_g', name: 'PM Awas Yojana – Gramin', short: 'PMAY-Gramin', category: 'Housing', appliesTo: 'household',
    benefit: { amount: 120000, period: 'once', kind: 'one_time', text: 'Up to ₹1.2 lakh assistance for a pucca house (plains)' },
    conditions: [
      c('rural', 'household.area', 'eq', 'rural', 'Household lives in a rural area'),
      c('nohouse', 'household.hasPuccaHouse', 'falsy', false, 'Household has no pucca house'),
      c('bpl', 'household.bpl', 'truthy', true, 'Household is in the deprived / BPL category'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'ration_card', 'residence_proof'], strict: true,
    office: 'Gram Panchayat / Block Development Office', source: 'https://pmayg.nic.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'pmay_u', name: 'PM Awas Yojana – Urban', short: 'PMAY-Urban', category: 'Housing', appliesTo: 'household',
    benefit: { amount: 250000, period: 'once', kind: 'one_time', text: 'Up to ₹2.5 lakh central assistance (indicative)' },
    conditions: [
      c('urban', 'household.area', 'eq', 'urban', 'Household lives in an urban area'),
      c('nohouse', 'household.hasPuccaHouse', 'falsy', false, 'Household has no pucca house'),
      c('income', 'household.income', 'lte', 600000, 'Family income is ₹6 lakh a year or less'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'income_certificate', 'residence_proof'], strict: true,
    office: 'Urban local body / bank branch', source: 'https://pmaymis.gov.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'ujjwala', name: 'PM Ujjwala Yojana', short: 'Ujjwala (LPG)', category: 'Energy', appliesTo: 'member', oncePerHousehold: true,
    benefit: { amount: 3600, period: 'year', kind: 'cash', text: 'Free LPG connection and ₹300 subsidy per refill (indicative)' },
    conditions: [
      c('gender', 'member.gender', 'eq', 'F', 'Applicant is a woman'),
      c('age', 'member.age', 'gte', 18, 'Applicant is an adult'),
      c('bpl', 'household.bpl', 'truthy', true, 'Household is below the poverty line'),
      c('nolpg', 'household.hasLPG', 'falsy', false, 'Household has no LPG connection yet'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'ration_card'], strict: false,
    office: 'Nearest LPG distributor', source: 'https://www.pmuy.gov.in/', version: 1, status: 'demo-unverified',
  },
  {
    id: 'pmmvy', name: 'PM Matru Vandana Yojana', short: 'Maternity benefit', category: 'Women & child', appliesTo: 'member',
    benefit: { amount: 5000, period: 'once', kind: 'one_time', text: '₹5,000 in instalments for the first living child' },
    conditions: [
      c('gender', 'member.gender', 'eq', 'F', 'Applicant is a woman'),
      c('preg', 'member.isPregnant', 'truthy', true, 'Pregnant or lactating'),
      c('age', 'member.age', 'gte', 19, 'Age is 19 or above'),
    ],
    docs: ['aadhaar', 'bank_passbook', 'mcp_card'], strict: true,
    office: 'Anganwadi centre / health centre', source: 'https://wcd.nic.in/schemes/pradhan-mantri-matru-vandana-yojana', version: 1, status: 'demo-unverified',
  },
];

export const schemeById = (id) => SCHEMES.find((s) => s.id === id);
