# KaagazSaathi 📄✅

> **We stop benefit claims from failing before the citizen reaches the counter.**

**Build for Bharat 2026 · Software Track** | KIET Deemed to be University

Most families don't miss benefits because they can't find the scheme. They miss them because one name is spelled two ways, a date is swapped, or a certificate expired. KaagazSaathi finds those problems first and tells the family exactly how to fix them.

## What it does

| Step | Feature | Where |
|------|---------|-------|
| 1 | **Voice-first household onboarding** (Hindi / English, Web Speech API, typed fallback) | `/household` |
| 2 | **On-device OCR** (Tesseract.js, eng+hin) for images and PDF pages. Documents are never uploaded; Aadhaar kept as last 4 digits; low-confidence reads get a *Human verify* label | `/documents` |
| 3 | **Mismatch detector**: transliteration-aware fuzzy name matching (Mohd/Mohammad, Rafiq/Rafique, Devanagari vs Latin, initials, missing middle name, reordering) and DOB checks (DD/MM swap, one-digit typo, year-only) | `/issues` |
| 4 | **Fix paths**: which form, office, proof, indicative fee and time, plus **scam shield** and **auto-generated affidavit / correction letters** (English + Hindi, printable) | `/issues` |
| 5 | **Explainable eligibility**: rules-as-code JSON, every verdict is a condition trace with an official source. AI never decides eligibility. Includes **what-if** and **near-miss** explanations | `/schemes` |
| 6 | **Readiness / rejection-risk score** per application with a transparent breakdown | `/plan` |
| 7 | **Document-unlock optimizer**: exact set-cover search for the fewest fixes that unlock the most benefit ("Fix 2 things → unlock 2 schemes worth ₹1.26 lakh") | `/plan` |
| 8 | **Money left on the table** counter, expiry **reminders**, **life-event** simulator (pregnancy, earner's death, income drop, turning 60, college) | `/plan` |
| 9 | **Offline QR dossier** for the CSC / e-Mitra operator | `/dossier` |
| 10 | **Operator desk**: camera QR scan or paste, pre-filled case file, queue | `/operator` |
| 11 | **District insights** (simulated, clearly labelled) | `/insights` |
| 12 | **Rules Studio**: edit thresholds, approve a new rule version, see the impact on the household; heuristic "draft rules from guideline text" stand-in for the LLM step | `/studio` |
| 13 | **Benchmark**: the matcher measured against naive baselines, live in the browser, with a try-it box | `/benchmark` |
| 14 | **WhatsApp / missed-call mockup** driven by the real engine | `/channels` |
| 15 | **Installable offline PWA** (service worker + manifest) | everywhere |

Start with your own household from **Home → Start a household**. The app does not prefill a family or documents; the inventory appears as you add records.

## Benchmark (held-out set, 440 labelled name pairs)

| Method | Precision | Recall | F1 |
|---|---|---|---|
| Exact string match | 100% | 4.4% | 8.5% |
| Plain Levenshtein ≥ 0.85 | 72.0% | 48.0% | 57.6% |
| **KaagazSaathi matcher** | **97.6%** | **91.6%** | **94.5%** |

Pairs are **synthetic** transformations of realistic Indian names (generator in `client/src/tools/generateBenchmark.mjs`), not real government records. A separate dev set was used for tuning; the shipped set was not. Main weakness: random single-letter typos in short names. Validate on real consented scans before making claims beyond this.

## Honest limits (say these to the judges before they ask)

- **Scheme rules are demo values.** Thresholds and amounts in `client/src/data/schemes.js` are placeholders marked `demo-unverified` until a human approves them against current guidelines (that is what the Rules Studio is for). Verify before any real use.
- Fix **fees and timelines are indicative** and vary by state; the UI says so.
- Browser **speech recognition may send audio to the browser vendor**. Offline Vosk / Whisper-small is the production plan.
- **Aadhaar Secure QR / DigiLocker** are not integrated (DigiLocker needs registration). OCR is the input today.
- **WhatsApp / IVR** and **district insights** are mockups / simulated data.
- Camera QR scanning uses the browser `BarcodeDetector` (Chrome); paste works everywhere.

## Run it

```bash
cd client
npm install
npm start          # http://localhost:3000, no backend needed
```

The client copies Tesseract and PDF.js worker assets locally before starting or building. OCR processes images and every page of a PDF on-device; the original document is never uploaded. For offline OCR, put `eng.traineddata.gz` and `hin.traineddata.gz` in `client/public/tessdata/`. Without them OCR fetches language data from Tesseract's CDN.

The Express/MongoDB server in `server/` is **optional** and no longer used by the client (the engine runs on the device so it works offline and documents stay private). Keep it for a future rules-registry / anonymised-analytics service.

## Architecture

```
client/src
├─ engine/        pure, testable logic (no React)
│  ├─ transliterate.js  Devanagari → Latin
│  ├─ names.js          phonetic reduction + weighted edit distance + token alignment
│  ├─ dates.js          DOB parsing / DD-MM swap detection
│  ├─ mismatch.js       cross-document issues + fix targets
│  ├─ eligibility.js    deterministic rules evaluation + near-miss
│  ├─ applications.js   readiness score, unlock optimizer, money, reminders
│  ├─ lifeEvents.js · letters.js · dossier.js · analyze.js
├─ data/          schemes.js (rules as JSON) · docTypes.js (fix paths) · demo.js · benchmark.json
├─ context/       HouseholdContext (localStorage, no images stored)
├─ pages/ · components/ · hooks/ · utils/
└─ tools/         benchmark generator
client/public     manifest.json · sw.js · icon.svg
```

## Suggested 2-minute demo

1. Home → **Start a household** and enter a household profile. 2. **Documents**: add a scan or enter document fields manually; only records you add appear in the inventory. 3. **Issues**: compare records and inspect suggested fixes. 4. **Schemes**: review rule-based matches and the what-if controls. 5. **Plan**: inspect readiness and document actions. 6. **Dossier → Operator desk** to try the handoff flow.

## Team
| Member | Branch |
|--------|--------|
| Ayush Gupta | CS |
| Jahnvi Gupta | CS |
| Deepanshu Moudgil | CS |
| Krishna Agarwal | CSIT |
