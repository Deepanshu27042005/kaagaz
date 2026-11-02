// A realistic demo household with deliberately messy paperwork. Dates are relative to today so the
// demo never goes stale. Fictional data.

const monthsAgo = (n, today) => { const d = new Date(today); d.setMonth(d.getMonth() - n); return d.toISOString().slice(0, 10); };

export function demoState(today = new Date()) {
  const fields = (name, dob, extra = {}) => ({ name, ...(dob ? { dob } : {}), ...extra });
  const doc = (id, memberId, type, f, conf = {}) => ({ id, memberId, type, fields: f, confidence: conf, source: 'demo' });
  return {
    household: { state: 'Uttar Pradesh', district: 'Lucknow', area: 'rural', category: 'OBC', income: 110000, landAcres: 1.2, bpl: true, hasPuccaHouse: false, hasLPG: false },
    members: [
      { id: 'm1', name: 'Mohammad Rafique', relation: 'Self (head)', age: 42, gender: 'M', maritalStatus: 'married', occupation: 'farmer', isStudent: false, level: 'none', isPregnant: false, isHead: true },
      { id: 'm2', name: 'Shabana Begum', relation: 'Wife', age: 38, gender: 'F', maritalStatus: 'married', occupation: 'homemaker', isStudent: false, level: 'none', isPregnant: false },
      { id: 'm3', name: 'Zoya Rafique', relation: 'Daughter', age: 19, gender: 'F', maritalStatus: 'single', occupation: 'student', isStudent: true, level: 'post_matric', isPregnant: false },
      { id: 'm4', name: 'Rukhsana Bibi', relation: 'Mother', age: 67, gender: 'F', maritalStatus: 'widowed', occupation: 'homemaker', isStudent: false, level: 'none', isPregnant: false },
    ],
    documents: [
      doc('d1', 'm1', 'aadhaar', fields('Mohd Rafiq', '05/03/1982', { idLast4: '4821' }), { name: 0.92, dob: 0.9 }),
      doc('d2', 'm1', 'bank_passbook', fields('Mohammad Rafique', '05/03/1982'), { name: 0.88 }),
      doc('d3', 'm1', 'ration_card', fields('Mohd Rafiq')),
      doc('d4', 'm1', 'land_record', fields('Mohd Rafiq')),
      doc('d5', 'm1', 'income_certificate', fields('Mohd Rafiq', '', { issueDate: monthsAgo(14, today), income: 110000 })),
      doc('d6', 'm2', 'aadhaar', fields('Shabana Begum', '12/07/1986', { idLast4: '7390' }), { name: 0.9, dob: 0.9 }),
      doc('d7', 'm2', 'bank_passbook', fields('Shabana Begam')),
      doc('d8', 'm3', 'aadhaar', fields('Zoya Rafique', '04/12/2005', { idLast4: '1156' }), { name: 0.95, dob: 0.9 }),
      doc('d9', 'm3', 'marksheet', fields('Zoya Rafique', '12/04/2005'), { name: 0.8, dob: 0.62 }),
      doc('d10', 'm4', 'aadhaar', fields('Rukhsana Bi', '1959', { idLast4: '6608' }), { name: 0.9, dob: 0.85 }),
      doc('d11', 'm4', 'bank_passbook', fields('Rukhsana Bibi', '14/02/1959')),
    ],
    claims: {},
    overrides: {},
  };
}

export const EMPTY_STATE = {
  household: { state: '', district: '', area: 'rural', category: 'General', income: 0, landAcres: 0, bpl: false, hasPuccaHouse: false, hasLPG: false },
  members: [{ id: 'm1', name: '', relation: 'Self (head)', age: 30, gender: 'M', maritalStatus: 'married', occupation: '', isStudent: false, level: 'none', isPregnant: false, isHead: true }],
  documents: [], claims: {}, overrides: {},
};
