// Turns eligibility results into "applications": readiness score, blockers, the document-unlock
// optimizer, money-left-on-the-table totals and reminders.
import { DOC_TYPES, docLabel } from '../data/docTypes.js';
import { LEVEL_WEIGHT } from './mismatch.js';
import { monthsBetween, daysBetween } from './dates.js';

export const valueOf = (scheme) => (scheme.benefit.kind === 'cover' || scheme.benefit.kind === 'wages' ? 0 : scheme.benefit.amount);

export function docExpiry(doc, today) {
  const v = DOC_TYPES[doc.type]?.validityMonths;
  const issued = doc.fields?.issueDate ? new Date(doc.fields.issueDate) : null;
  if (!v || !issued || isNaN(issued)) return null;
  const expires = new Date(issued); expires.setMonth(expires.getMonth() + v);
  const days = daysBetween(today, expires);
  return { expires, daysLeft: days, expired: days < 0, soon: days >= 0 && days <= 60 };
}

export function buildApplications({ schemes, eligibility, members, documents, issues, claims = {}, today = new Date() }) {
  const head = members.find((m) => m.isHead) || members[0];
  const apps = [];
  for (const e of eligibility) {
    if (!e.eligible) continue;
    const scheme = schemes.find((s) => s.id === e.schemeId);
    const subject = members.find((m) => m.id === e.memberId) || head;
    const requirements = scheme.docs.map((t) => {
      const scope = DOC_TYPES[t]?.scope || 'person';
      const doc = scope === 'person' ? documents.find((d) => d.memberId === subject.id && d.type === t) : documents.find((d) => d.type === t);
      const exp = doc ? docExpiry(doc, today) : null;
      return { type: t, scope, doc: doc || null, present: !!doc, expiry: exp };
    });
    const relevantIds = new Set(requirements.filter((r) => r.doc).map((r) => r.doc.id));

    const blockers = [], advisories = [];
    for (const r of requirements) {
      if (!r.present) blockers.push({ key: `get:${r.scope === 'person' ? subject.id : 'hh'}:${r.type}`, kind: 'get', docType: r.type, memberId: r.scope === 'person' ? subject.id : head?.id, label: `Get ${docLabel(r.type)}`, who: r.scope === 'person' ? subject.name : 'Household' });
      else if (r.expiry?.expired) blockers.push({ key: `renew:${r.doc.id}`, kind: 'renew', docType: r.type, docId: r.doc.id, label: `Renew ${docLabel(r.type)}`, who: 'Household' });
    }
    const involved = issues.filter((i) => relevantIds.has(i.targetDocId) || (relevantIds.has(i.docs[0].id) && relevantIds.has(i.docs[1].id)));
    for (const i of involved) {
      const blocks = !i.advisory && (i.level !== 'minor' || scheme.strict);
      (blocks ? blockers : advisories).push({ key: `fix:${i.id}`, kind: 'fix', issueId: i.id, docType: i.targetType, docId: i.targetDocId, label: `Fix ${i.field === 'dob' ? 'date of birth' : 'name'} on ${docLabel(i.targetType)}`, who: i.memberName, level: i.level });
    }
    const uniq = (arr) => [...new Map(arr.map((b) => [b.key, b])).values()];
    const ub = uniq(blockers);

    // Readiness: missing documents 60 pts, issues and expiry the rest
    const missing = requirements.filter((r) => !r.present).length;
    const missPenalty = (missing / requirements.length) * 60;
    const issuePenalty = involved.reduce((s, i) => s + (i.advisory ? 2 : LEVEL_WEIGHT[i.level]), 0);
    const expPenalty = requirements.reduce((s, r) => s + (r.expiry?.expired ? 20 : r.expiry?.soon ? 5 : 0), 0);
    const readiness = Math.max(0, Math.min(100, Math.round(100 - missPenalty - issuePenalty - expPenalty)));

    const claimed = claims[e.key];
    apps.push({
      ...e, scheme, subject, requirements, issues: involved, blockers: ub, advisories: uniq(advisories),
      readiness, riskPct: 100 - readiness, issueCount: involved.length + requirements.filter((r) => r.expiry?.expired).length,
      breakdown: { missing: Math.round(missPenalty), issues: Math.round(issuePenalty), expiry: Math.round(expPenalty) },
      claimed, state: claimed === 'receiving' ? 'receiving' : ub.length ? 'blocked' : 'ready', value: valueOf(scheme),
    });
  }

  // One pension per person: keep the highest-value one in an exclusive group, mark the rest as alternatives
  const byGroup = {};
  for (const a of apps) if (a.scheme.exclusiveGroup) (byGroup[`${a.scheme.exclusiveGroup}|${a.memberId}`] ||= []).push(a);
  for (const list of Object.values(byGroup)) {
    list.sort((x, y) => y.value - x.value);
    list.slice(1).forEach((a) => { a.alternativeTo = list[0].scheme.short; });
  }
  // Some schemes are once per household: keep the best-prepared applicant
  const once = {};
  for (const a of apps) if (a.scheme.oncePerHousehold) (once[a.schemeId] ||= []).push(a);
  for (const list of Object.values(once)) {
    list.sort((x, y) => y.readiness - x.readiness);
    list.slice(1).forEach((a) => { a.droppedForHousehold = true; });
  }
  return apps.filter((a) => !a.droppedForHousehold);
}

// ---- Document-unlock optimizer (a small set-cover) -------------------------------------------
// Which minimum set of actions unlocks the most benefit value? Exact search for up to 18 distinct actions,
// greedy beyond that. Explainable: every plan lists the actions and the applications they unlock.
export function planUnlocks(apps, maxK = 4) {
  const cand = apps.filter((a) => a.state === 'blocked' && !a.alternativeTo);
  const actions = [...new Map(cand.flatMap((a) => a.blockers).map((b) => [b.key, b])).values()];
  if (!actions.length) return { plans: [], actions: [], candidates: cand };
  const idx = new Map(actions.map((a, i) => [a.key, i]));
  const masks = cand.map((a) => a.blockers.reduce((m, b) => m | (1 << idx.get(b.key)), 0));
  const unlockedBy = (sel) => cand.filter((_, i) => (masks[i] & ~sel) === 0);
  const score = (sel) => { const u = unlockedBy(sel); return { value: u.reduce((s, a) => s + a.value, 0), count: u.length }; };
  const bits = (n) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };

  const plans = [];
  const n = actions.length;
  for (let k = 1; k <= Math.min(maxK, n); k++) {
    let bestSel = 0, best = { value: -1, count: -1 };
    if (n <= 18) {
      for (let sel = 1; sel < (1 << n); sel++) {
        if (bits(sel) !== k) continue;
        const s = score(sel);
        if (s.value > best.value || (s.value === best.value && s.count > best.count)) { best = s; bestSel = sel; }
      }
    } else {
      for (let step = 0; step < k; step++) {
        let pick = -1, pb = { value: -1, count: -1 };
        for (let i = 0; i < n; i++) {
          if (bestSel & (1 << i)) continue;
          const s = score(bestSel | (1 << i));
          if (s.value > pb.value || (s.value === pb.value && s.count > pb.count)) { pb = s; pick = i; }
        }
        bestSel |= 1 << pick; best = pb;
      }
    }
    const prev = plans[plans.length - 1];
    if (best.count <= 0 || (prev && best.count <= prev.count && best.value <= prev.value)) continue;
    plans.push({ k, actions: actions.filter((_, i) => bestSel & (1 << i)), unlocks: unlockedBy(bestSel), value: best.value, count: best.count });
  }
  return { plans, actions, candidates: cand };
}

export function moneySummary(apps) {
  const live = apps.filter((a) => !a.alternativeTo);
  const sum = (arr) => arr.reduce((s, a) => s + a.value, 0);
  const cash = live.filter((a) => a.scheme.benefit.kind === 'cash');
  const oneTime = live.filter((a) => a.scheme.benefit.kind === 'one_time');
  const unclaimed = (arr) => arr.filter((a) => a.state !== 'receiving');
  return {
    perYearLeft: sum(unclaimed(cash)), oneTimeLeft: sum(unclaimed(oneTime)),
    perYearReceiving: sum(cash.filter((a) => a.state === 'receiving')),
    perYearBlocked: sum(unclaimed(cash).filter((a) => a.state === 'blocked')),
    perYearReady: sum(unclaimed(cash).filter((a) => a.state === 'ready')),
    oneTimeBlocked: sum(unclaimed(oneTime).filter((a) => a.state === 'blocked')),
    covers: live.filter((a) => a.scheme.benefit.kind === 'cover' && a.state !== 'receiving'),
    wages: live.filter((a) => a.scheme.benefit.kind === 'wages' && a.state !== 'receiving'),
    readyCount: live.filter((a) => a.state === 'ready').length, blockedCount: live.filter((a) => a.state === 'blocked').length,
  };
}

export function buildReminders({ documents, apps, today = new Date() }) {
  const out = [];
  for (const d of documents) {
    const e = docExpiry(d, today);
    if (!e) continue;
    if (e.expired) out.push({ id: `exp:${d.id}`, kind: 'expired', days: e.daysLeft, text: `${docLabel(d.type)} expired ${-e.daysLeft} days ago. Get a fresh one before applying.`, docId: d.id });
    else if (e.soon) out.push({ id: `exp:${d.id}`, kind: 'expiring', days: e.daysLeft, text: `${docLabel(d.type)} expires in ${e.daysLeft} days.`, docId: d.id });
  }
  for (const a of apps) {
    if (a.state === 'receiving' || !a.scheme.deadline) continue;
    const days = daysBetween(today, new Date(a.scheme.deadline));
    if (days >= 0 && days <= 120) out.push({ id: `dl:${a.key}`, kind: 'deadline', days, text: `${a.scheme.short} window closes in ${days} days (demo date).`, appKey: a.key });
  }
  return out.sort((x, y) => x.days - y.days);
}

export { monthsBetween };
