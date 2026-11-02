// Offline dossier: a compact, masked summary encoded in a QR code. A CSC / e-Mitra operator scans it
// and gets a pre-filled, organised case file. No server is involved. The checksum catches accidental
// corruption only; it is NOT a security signature.

const mask = (v) => (v ? `XXXX XXXX ${String(v).slice(-4)}` : '');

function checksum(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(36);
}
const b64 = (s) => {
  const bytes = new TextEncoder().encode(s);
  let bin = ''; bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const unb64 = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
};

export function buildDossier({ household, members, documents, analysis }) {
  return {
    v: 1, t: Date.now(),
    h: { s: household.state, d: household.district, a: household.area, c: household.category, i: household.income, l: household.landAcres, b: household.bpl ? 1 : 0 },
    m: members.map((m) => ({
      i: m.id, n: m.name, r: m.relation, a: m.age, g: m.gender, ms: m.maritalStatus,
      d: documents.filter((d) => d.memberId === m.id).map((d) => [d.type, d.fields?.name || '', d.fields?.dob || '', d.fields?.idLast4 ? mask(d.fields.idLast4) : '']),
    })),
    p: analysis.apps.filter((a) => !a.alternativeTo).map((a) => [a.schemeId, a.memberId, a.readiness, a.state === 'blocked' ? a.blockers.map((b) => b.label).join('; ') : '']),
    x: analysis.issues.length,
  };
}

export function encodeDossier(obj) {
  const body = b64(JSON.stringify(obj));
  return `KS1.${body}.${checksum(body)}`;
}

export function decodeDossier(text) {
  try {
    const [tag, body, sum] = String(text).trim().split('.');
    if (tag !== 'KS1' || !body) return { ok: false, error: 'This is not a KaagazSaathi dossier code.' };
    if (checksum(body) !== sum) return { ok: false, error: 'The dossier code is damaged (checksum mismatch). Please rescan.' };
    return { ok: true, data: JSON.parse(unb64(body)) };
  } catch (e) {
    return { ok: false, error: 'Could not read the dossier code.' };
  }
}
