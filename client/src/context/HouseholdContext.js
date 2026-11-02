import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { analyze } from '../engine/analyze';
import { demoState, EMPTY_STATE } from '../data/demo';

const Ctx = createContext(null);
const KEY = 'kaagazsaathi.state.v1';
export const uid = (p = 'x') => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

function load() {
  try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch { return null; }
}

/**
 * Household state lives on this device only (localStorage). Document IMAGES are never stored:
 * only the extracted fields, with Aadhaar reduced to its last four digits.
 */
export function HouseholdProvider({ children }) {
  const [state, setState] = useState(() => load() || EMPTY_STATE);
  const [lang, setLangState] = useState(() => { try { return localStorage.getItem('ks.lang') || 'en'; } catch { return 'en'; } });

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* storage full or blocked */ } }, [state]);
  const setLang = (l) => { setLangState(l); try { localStorage.setItem('ks.lang', l); } catch { /* ignore */ } };

  const analysis = useMemo(() => analyze(state), [state]);

  const patch = useCallback((fn) => setState((s) => fn(s)), []);
  const api = {
    state, analysis, lang, setLang,
    household: state.household, members: state.members, documents: state.documents, claims: state.claims, overrides: state.overrides,
    hasData: state.documents.length > 0 || state.members.some((m) => m.name),
    setHousehold: (p) => patch((s) => ({ ...s, household: { ...s.household, ...p } })),
    upsertMember: (m) => patch((s) => ({ ...s, members: s.members.some((x) => x.id === m.id) ? s.members.map((x) => (x.id === m.id ? { ...x, ...m } : x)) : [...s.members, m] })),
    removeMember: (id) => patch((s) => ({ ...s, members: s.members.filter((m) => m.id !== id), documents: s.documents.filter((d) => d.memberId !== id) })),
    addDocument: (d) => patch((s) => ({ ...s, documents: [...s.documents, { id: uid('d'), confidence: {}, source: 'manual', ...d }] })),
    updateDocument: (id, p) => patch((s) => ({ ...s, documents: s.documents.map((d) => (d.id === id ? { ...d, ...p, fields: { ...d.fields, ...(p.fields || {}) } } : d)) })),
    removeDocument: (id) => patch((s) => ({ ...s, documents: s.documents.filter((d) => d.id !== id) })),
    setClaim: (key, v) => patch((s) => { const claims = { ...s.claims }; if (v) claims[key] = v; else delete claims[key]; return { ...s, claims }; }),
    setOverride: (schemeId, o) => patch((s) => ({ ...s, overrides: { ...s.overrides, [schemeId]: o } })),
    clearOverrides: () => patch((s) => ({ ...s, overrides: {} })),
    replaceProfile: (household, members) => patch((s) => ({ ...s, household, members })),
    loadDemo: () => setState(demoState(new Date())),
    reset: () => setState(EMPTY_STATE),
  };
  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useHousehold() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useHousehold must be used within HouseholdProvider');
  return v;
}
