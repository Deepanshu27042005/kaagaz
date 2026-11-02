// Document catalogue + "how to fix it" knowledge base.
// Fee / time values are INDICATIVE and vary by state; each entry carries `verify` so the UI says so.

export const DOC_TYPES = {
  aadhaar:            { label: 'Aadhaar', labelHi: 'आधार', scope: 'person', validityMonths: null, icon: '🪪' },
  bank_passbook:      { label: 'Bank passbook', labelHi: 'बैंक पासबुक', scope: 'person', validityMonths: null, icon: '🏦' },
  caste_certificate:  { label: 'Caste certificate', labelHi: 'जाति प्रमाण पत्र', scope: 'person', validityMonths: null, icon: '📜' },
  marksheet:          { label: 'Marksheet / admission proof', labelHi: 'मार्कशीट / प्रवेश प्रमाण', scope: 'person', validityMonths: null, icon: '🎓' },
  death_certificate:  { label: 'Spouse death certificate', labelHi: 'पति/पत्नी का मृत्यु प्रमाण पत्र', scope: 'person', validityMonths: null, icon: '🕊️' },
  mcp_card:           { label: 'Mother-child protection card', labelHi: 'मातृ-शिशु सुरक्षा कार्ड', scope: 'person', validityMonths: null, icon: '🤱' },
  ration_card:        { label: 'Ration card', labelHi: 'राशन कार्ड', scope: 'household', validityMonths: null, icon: '🌾' },
  income_certificate: { label: 'Income certificate', labelHi: 'आय प्रमाण पत्र', scope: 'household', validityMonths: 12, icon: '💰' },
  land_record:        { label: 'Land record (khatauni)', labelHi: 'भूमि रिकॉर्ड (खतौनी)', scope: 'household', validityMonths: null, icon: '🗺️' },
  residence_proof:    { label: 'Residence proof', labelHi: 'निवास प्रमाण', scope: 'household', validityMonths: null, icon: '🏠' },
};

export const docLabel = (t) => DOC_TYPES[t]?.label || String(t).replace(/_/g, ' ');

const f = (o) => ({ verify: true, ...o });

// Correct document X -> field -> how
export const FIXES = {
  aadhaar: {
    name: f({ action: 'Update the name on Aadhaar', form: 'Aadhaar Update/Correction Form (online via myAadhaar, or at an Aadhaar Seva Kendra)', office: 'Aadhaar Seva Kendra / enrolment centre', proof: ['Passport, PAN, ration card or another UIDAI-listed proof of name'], fee: '₹50', scamAbove: 100, days: '7–30', note: 'UIDAI limits how many times a name can be changed, so fix it once and fix it right.' }),
    dob: f({ action: 'Correct date of birth on Aadhaar', form: 'Aadhaar Update/Correction Form with supporting proof', office: 'Aadhaar Seva Kendra', proof: ['Birth certificate, school leaving certificate or 10th marksheet'], fee: '₹50', scamAbove: 100, days: '7–30', note: 'Date of birth can be corrected only a very limited number of times; confirm the exact rule at the centre.' }),
  },
  bank_passbook: {
    name: f({ action: 'Correct the account holder name', form: 'Account detail correction / KYC update request', office: 'Your home bank branch', proof: ['Aadhaar (self-attested copy)', 'Passbook'], fee: 'Free', scamAbove: 100, days: '3–7', note: 'Ask the branch to update the name in CBS so it matches Aadhaar; DBT payments are matched on this.' }),
    dob: f({ action: 'Correct date of birth in bank KYC', form: 'KYC update form', office: 'Your home bank branch', proof: ['Aadhaar'], fee: 'Free', scamAbove: 100, days: '3–7' }),
  },
  ration_card: {
    name: f({ action: 'Correct a name on the ration card', form: 'Ration card correction application', office: 'District Food & Civil Supplies office / state food portal', proof: ['Aadhaar of the family head', 'Old ration card'], fee: 'Free or nominal', scamAbove: 100, days: '15–30' }),
    dob: f({ action: 'Correct date of birth on ration card', form: 'Ration card correction application', office: 'District Food & Civil Supplies office', proof: ['Aadhaar'], fee: 'Free or nominal', scamAbove: 100, days: '15–30' }),
  },
  income_certificate: {
    name: f({ action: 'Re-issue the income certificate with the correct name', form: 'Income certificate application (e-District)', office: 'Tehsil / e-District portal via CSC', proof: ['Aadhaar', 'Ration card', 'Self-declaration of income'], fee: '₹20–60 (CSC service charge)', scamAbove: 150, days: '7–15' }),
  },
  land_record: {
    name: f({ action: 'Correct the name in the land record', form: 'Name correction application (mutation / correction)', office: 'Tehsil / Revenue office (Lekhpal)', proof: ['Aadhaar', 'Old land record', 'Affidavit of name variance'], fee: 'Varies by state', scamAbove: 300, days: '15–60', note: 'This one is slow. Start early and keep the receipt.' }),
  },
  marksheet: {
    name: f({ action: 'Get a name correction certificate from the board', form: 'Board correction application', office: 'School / Board regional office', proof: ['Aadhaar', 'School record', 'Affidavit'], fee: 'Varies by board', scamAbove: 300, days: '15–45' }),
    dob: f({ action: 'Get date of birth corrected by the board', form: 'Board correction application', office: 'School / Board regional office', proof: ['Birth certificate', 'School admission register extract'], fee: 'Varies by board', scamAbove: 300, days: '15–45' }),
  },
  caste_certificate: { name: f({ action: 'Re-issue the caste certificate with the correct name', form: 'Caste certificate application (e-District)', office: 'Tehsil / e-District portal via CSC', proof: ['Aadhaar', 'Old certificate', "Father's caste certificate"], fee: '₹20–60 (CSC service charge)', scamAbove: 150, days: '7–21' }) },
  residence_proof: { name: f({ action: 'Re-issue the residence certificate', form: 'Residence certificate application', office: 'Tehsil / e-District portal via CSC', proof: ['Aadhaar', 'Utility bill'], fee: '₹20–60', scamAbove: 150, days: '7–15' }) },
};

export const DEFAULT_FIX = f({ action: 'Correct the document', form: 'Correction application', office: 'Issuing office', proof: ['Aadhaar'], fee: 'Varies', scamAbove: 300, days: '7–30' });
export const fixFor = (docType, field) => FIXES[docType]?.[field] || FIXES[docType]?.name || DEFAULT_FIX;

// How to obtain a missing document
export const ACQUIRE = {
  aadhaar: { office: 'Aadhaar Seva Kendra', fee: 'Free (first enrolment)', days: '15–30' },
  bank_passbook: { office: 'Any bank branch / post office', fee: 'Free (zero-balance Jan Dhan account)', days: '1–3' },
  caste_certificate: { office: 'Tehsil / e-District via CSC', fee: '₹20–60', days: '7–21' },
  marksheet: { office: 'School / college office', fee: 'Free or nominal', days: '1–7' },
  death_certificate: { office: 'Municipal body / Gram Panchayat (civil registration)', fee: 'Free within the prescribed period', days: '7–21' },
  mcp_card: { office: 'Anganwadi / ANM / health centre', fee: 'Free', days: '1–3' },
  ration_card: { office: 'District Food & Civil Supplies office', fee: 'Free or nominal', days: '15–45' },
  income_certificate: { office: 'Tehsil / e-District via CSC', fee: '₹20–60', days: '7–15' },
  land_record: { office: 'Tehsil / state land-records portal', fee: 'Nominal', days: '1–7' },
  residence_proof: { office: 'Tehsil / Gram Panchayat', fee: '₹20–60', days: '3–10' },
};
