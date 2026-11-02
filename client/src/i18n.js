// Small UI dictionary. Onboarding questions are fully bilingual; the rest of the UI is English-first
// and will be extended with Bhashini / IndicTrans2 translations.
export const T = {
  en: { household: 'Household', documents: 'Documents', issues: 'Issues', schemes: 'Schemes', plan: 'My plan', dossier: 'Dossier', speak: 'Tap and speak', listening: 'Listening…', skip: 'Skip', next: 'Next' },
  hi: { household: 'परिवार', documents: 'दस्तावेज़', issues: 'समस्याएँ', schemes: 'योजनाएँ', plan: 'मेरी योजना', dossier: 'डोज़ियर', speak: 'बोलने के लिए दबाएँ', listening: 'सुन रहा हूँ…', skip: 'छोड़ें', next: 'आगे' },
};
export const useT = (lang) => (k) => (T[lang] && T[lang][k]) || T.en[k] || k;
