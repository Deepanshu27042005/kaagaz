// Deterministic, explainable eligibility engine. No ML. Every verdict is a trace of conditions.

const NUM_OPS = ['gt', 'gte', 'lt', 'lte'];

export function resolve(ctx, path) {
  const [scope, key] = path.split('.');
  return ctx[scope]?.[key];
}

export function evalCondition(cond, ctx) {
  const actual = resolve(ctx, cond.field);
  let pass = false;
  switch (cond.op) {
    case 'eq': pass = actual === cond.value; break;
    case 'neq': pass = actual !== cond.value; break;
    case 'in': pass = Array.isArray(cond.value) && cond.value.includes(actual); break;
    case 'truthy': pass = !!actual; break;
    case 'falsy': pass = !actual; break;
    case 'gt': pass = Number(actual) > cond.value; break;
    case 'gte': pass = Number(actual) >= cond.value; break;
    case 'lt': pass = Number(actual) < cond.value; break;
    case 'lte': pass = Number(actual) <= cond.value; break;
    default: pass = false;
  }
  return { ...cond, actual, pass, numeric: NUM_OPS.includes(cond.op) };
}

// A near miss is only worth showing when it is actionable: income within 30% of the limit
// (a fresh certificate might qualify) or age within 2 years (eligible soon).
function nearMissInfo(failed) {
  if (!failed.length || !failed.every((f) => f.numeric && Number(f.value) > 0)) return null;
  const items = failed.map((f) => {
    const delta = Math.abs(Number(f.actual) - f.value);
    const ok = f.field === 'household.income' ? delta / f.value <= 0.3 : f.field === 'member.age' ? delta <= 2 : false;
    return { condId: f.id, field: f.field, label: f.label, actual: f.actual, limit: f.value, delta, op: f.op, ok };
  });
  return items.every((i) => i.ok) ? items : null;
}

export function evaluateScheme(scheme, household, members) {
  const head = members.find((m) => m.isHead) || members[0];
  const subjects = scheme.appliesTo === 'member' ? members : head ? [head] : [];
  return subjects.map((member) => {
    const ctx = { member, household };
    const conditions = scheme.conditions.map((c) => evalCondition(c, ctx));
    const failed = conditions.filter((c) => !c.pass);
    return {
      key: `${scheme.id}|${scheme.appliesTo === 'member' ? member.id : 'hh'}`,
      schemeId: scheme.id, memberId: member.id, memberName: member.name,
      eligible: failed.length === 0, conditions, failed,
      nearMiss: failed.length ? nearMissInfo(failed) : null,
    };
  });
}

export function evaluateAll(schemes, household, members) {
  return schemes.flatMap((s) => evaluateScheme(s, household, members));
}

// Apply Rules-Studio overrides (edited thresholds) on top of the bundled rule set
export function applyOverrides(schemes, overrides = {}) {
  return schemes.map((s) => {
    const o = overrides[s.id];
    if (!o) return s;
    const conditions = s.conditions.map((c) => (o.thresholds && o.thresholds[c.id] !== undefined ? { ...c, value: o.thresholds[c.id] } : c));
    return { ...s, conditions, version: o.version ?? s.version, status: o.status ?? s.status };
  });
}
