// One entry point that turns the household state into everything the UI shows.
import { SCHEMES } from '../data/schemes.js';
import { detectIssues, lowConfidenceFields } from './mismatch.js';
import { evaluateAll, applyOverrides } from './eligibility.js';
import { buildApplications, planUnlocks, moneySummary, buildReminders } from './applications.js';

export function analyze(state, today = new Date()) {
  const { household, members, documents, claims = {}, overrides = {} } = state;
  const schemes = applyOverrides(SCHEMES, overrides);
  const issues = detectIssues(members, documents);
  const eligibility = evaluateAll(schemes, household, members);
  const apps = buildApplications({ schemes, eligibility, members, documents, issues, claims, today });
  const plan = planUnlocks(apps);
  const certIncome = Number(documents.find((d) => d.type === 'income_certificate')?.fields?.income) || null;
  const incomeNote = certIncome && household.income && Math.abs(certIncome - household.income) / household.income > 0.1
    ? `Your income certificate shows ₹${certIncome.toLocaleString('en-IN')} but you told us ₹${household.income.toLocaleString('en-IN')}. Offices check the certificate.` : null;
  return {
    schemes, issues, eligibility, apps, plan, incomeNote,
    money: moneySummary(apps),
    reminders: buildReminders({ documents, apps, today }),
    verify: lowConfidenceFields(documents),
    nearMisses: eligibility.filter((e) => !e.eligible && e.nearMiss),
  };
}
