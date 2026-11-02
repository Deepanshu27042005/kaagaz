// Life-event triggers: instead of searching schemes, the household tells us what changed.
// Each event is a pure patch on the profile so we can preview the effect before recording it.

export const LIFE_EVENTS = [
  { id: 'pregnancy', icon: '🤱', label: 'A woman in the family is pregnant', hint: 'Maternity benefit and health schemes' },
  { id: 'earner_death', icon: '🕊️', label: 'The main earner has passed away', hint: 'Widow pension and income support (assumes household income drops by 60%)' },
  { id: 'job_loss', icon: '📉', label: 'Household income fell by half', hint: 'Income-tested schemes and scholarships' },
  { id: 'turns_60', icon: '🎂', label: 'A parent turns 60', hint: 'Old-age pension' },
  { id: 'college', icon: '🎓', label: 'A child joins college', hint: 'Post-matric scholarships' },
];

const clone = (x) => JSON.parse(JSON.stringify(x));

export function applyLifeEvent(id, household, members) {
  const h = clone(household), m = clone(members);
  const note = [];
  if (id === 'pregnancy') {
    const w = m.find((x) => x.gender === 'F' && x.maritalStatus === 'married' && x.age >= 19 && x.age <= 45);
    if (w) { w.isPregnant = true; note.push(`${w.name} marked pregnant`); }
  } else if (id === 'earner_death') {
    const head = m.find((x) => x.isHead);
    const spouse = m.find((x) => x.gender === 'F' && x.maritalStatus === 'married' && !x.isHead);
    if (head) { head.deceased = true; note.push(`${head.name} marked deceased`); }
    if (spouse) { spouse.maritalStatus = 'widowed'; spouse.isHead = true; note.push(`${spouse.name} is now widowed and head of household`); }
    h.income = Math.round(h.income * 0.4);
    note.push('Household income reduced to 40%');
  } else if (id === 'job_loss') {
    h.income = Math.round(h.income * 0.5); note.push('Household income halved');
  } else if (id === 'turns_60') {
    const p = m.filter((x) => x.age >= 50 && x.age < 60).sort((a, b) => b.age - a.age)[0] || m.filter((x) => x.age >= 40 && x.age < 60).sort((a, b) => b.age - a.age)[0];
    if (p) { p.age = 60; note.push(`${p.name} is now 60`); }
  } else if (id === 'college') {
    const k = m.find((x) => x.age >= 16 && x.age <= 24 && !x.isStudent) || m.find((x) => x.age >= 16 && x.age <= 24);
    if (k) { k.isStudent = true; k.level = 'post_matric'; note.push(`${k.name} is now a college student`); }
  }
  return { household: h, members: m.filter((x) => !x.deceased), note };
}
