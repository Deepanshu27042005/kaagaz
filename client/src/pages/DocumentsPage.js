
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

import { useHousehold } from '../context/HouseholdContext';
import { useOCR } from '../hooks/useOCR';
import { extractFields } from '../utils/ocr/fieldExtractor';
import { DOC_TYPES, docLabel } from '../data/docTypes';
import { docExpiry } from '../engine/applications';
import { EmptyState } from '../components/common/bits';

const LOW = 0.75;

// Reject OCR output that is clearly not a person's name.
function isValidName(value) {
  if (typeof value !== 'string') return false;

  const name = value.trim();

  if (name.length < 3 || name.length > 60) return false;

  if (!/^[A-Za-z\u0900-\u097F.\s]+$/.test(name)) {
    return false;
  }

  const words = name.split(/\s+/);

  if (words.length < 2) return false;

  const invalidWords =
    /\b(government|india|authority|unique|identification|address|male|female|dob|aadhaar)\b/i;

  const invalidHindi =
    /विशिष्ट|पहचान|सुरक्षित|सरकार|आधार|प्राधिकरण|जन्म|पता|पुरुष|महिला/;

  return !invalidWords.test(name) && !invalidHindi.test(name);
}

function getManualFieldShape(docType) {
  const base = { name: '' };

  if (
    docType !== 'ration_card' &&
    docType !== 'land_record' &&
    docType !== 'residence_proof'
  ) {
    base.dob = '';
  }

  if (docType === 'aadhaar') base.idLast4 = '';
  if (docType === 'income_certificate') base.income = '';

  if (DOC_TYPES[docType]?.validityMonths) {
    base.issueDate = '';
  }

  return base;
}

function DocRow({ doc, api }) {
  const meta = DOC_TYPES[doc.type] || {};
  const exp = docExpiry(doc, new Date());

  const fields = doc.fields || {};
  const confidence = doc.confidence || {};

  const set = (key) => (event) => {
    api.updateDocument(doc.id, {
      fields: { [key]: event.target.value },
      confidence: { ...confidence, [key]: 1 },
    });
  };

  const field = (key, label, props = {}) => (
    <label className="doc-field">
      {label}

      <input
        value={fields[key] ?? ''}
        onChange={set(key)}
        {...props}
      />

      {confidence[key] !== undefined &&
        confidence[key] < LOW && (
          <span
            className="badge badge-review"
            title={`Read with ${Math.round(
              confidence[key] * 100
            )}% confidence`}
          >
            Human verify
          </span>
        )}
    </label>
  );

  return (
    <div className="doc-row">
      <div className="doc-head">
        <b>
          {meta.icon} {docLabel(doc.type)}
        </b>

        {exp &&
          (exp.expired ? (
            <span className="badge badge-mismatch">
              Expired {-exp.daysLeft}d ago
            </span>
          ) : exp.soon ? (
            <span className="badge badge-missing">
              Expires in {exp.daysLeft}d
            </span>
          ) : (
            <span className="badge badge-matched">
              Valid
            </span>
          ))}

        <button
          className="icon-btn"
          onClick={() => api.removeDocument(doc.id)}
          aria-label={`Remove ${docLabel(doc.type)}`}
        >
          ✕
        </button>
      </div>

      <div className="doc-fields">
        {field('name', 'Name on document')}

        {doc.type !== 'ration_card' &&
          doc.type !== 'land_record' &&
          doc.type !== 'residence_proof' &&
          field('dob', 'Date of birth', {
            placeholder: 'DD/MM/YYYY or year',
          })}

        {doc.type === 'aadhaar' &&
          field('idLast4', 'Aadhaar last 4 digits', {
            maxLength: 4,
            inputMode: 'numeric',
          })}

        {doc.type === 'income_certificate' &&
          field('income', 'Income stated (₹)', {
            type: 'number',
          })}

        {meta.validityMonths &&
          field('issueDate', 'Issue date', {
            type: 'date',
          })}
      </div>
    </div>
  );
}

export default function DocumentsPage() {
  const api = useHousehold();

  const { members, documents, analysis, hasData } = api;

  const { runOCR, loading, progress, error } = useOCR();

  const head = members.find((member) => member.isHead) || members[0];

  const [memberId, setMemberId] = useState(head?.id);
  const [type, setType] = useState('aadhaar');
  const [file, setFile] = useState(null);
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');

  const [manualFields, setManualFields] = useState(
    () => getManualFieldShape('aadhaar')
  );

  const [showManualForm, setShowManualForm] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    setManualFields(getManualFieldShape(type));
    setShowManualForm(false);
    setNote('');
    setFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [type]);

  if (!hasData) {
    return (
      <div className="container">
        <EmptyState
          title="No household yet"
          cta="Set up your household"
          to="/household"
        >
          Tell us about your family first, or load the demo family
          from the home page.
        </EmptyState>
      </div>
    );
  }

  const scope = DOC_TYPES[type]?.scope;

  const add = async () => {
    const owner =
      scope === 'household'
        ? head.id
        : memberId || head.id;

    // Collect manually entered fields.
    const typed = Object.fromEntries(
      Object.entries(manualFields).filter(
        ([, value]) =>
          value !== '' &&
          value !== null &&
          value !== undefined
      )
    );

    let fields = {};
    let confidence = {};
    let source = 'manual';

    if (file) {
      if (!consent) {
        setNote(
          'Please tick the consent box to scan on this device.'
        );
        return;
      }

      const text = await runOCR(file);

      const result = extractFields(text, type);

      console.log('OCR RAW TEXT:', text);
      console.log('EXTRACTED FIELDS:', result);

      const extracted = { ...result.fields };
      const extractedConfidence = { ...result.confidence };

      // Do not accept an OCR name unless it looks like a name.
      if (
        extracted.name &&
        !isValidName(extracted.name)
      ) {
        delete extracted.name;
        delete extractedConfidence.name;
      }

      // Validate Aadhaar last four digits.
      if (
        extracted.idLast4 &&
        !/^\d{4}$/.test(String(extracted.idLast4))
      ) {
        delete extracted.idLast4;
        delete extractedConfidence.idLast4;
      }

      // Manually entered values take priority over OCR.
      fields = {
        ...extracted,
        ...typed,
      };

      confidence = {
        ...extractedConfidence,
      };

      // Manual fields are verified by the user.
      Object.keys(typed).forEach((key) => {
        confidence[key] = 1;
      });

      source = 'ocr';

      if (!Object.keys(fields).length) {
        setShowManualForm(true);

        setNote(
          text.trim()
            ? 'Text was detected, but we could not identify valid fields. Please enter the details manually.'
            : 'No readable text was detected. Try a clearer scan or enter the details manually.'
        );

        return;
      }

      setNote(
        'Document scanned. Please verify the extracted details before using them.'
      );
    } else {
      if (!Object.keys(typed).length) {
        setNote(
          'Please fill at least one field or upload a scan.'
        );

        return;
      }

      fields = typed;

      setNote(
        `Added ${docLabel(type)}. Please review the details below.`
      );
    }

    // Context handles updating an existing document of the same
    // type for the same household member.
    api.addDocument({
      memberId: owner,
      type,
      fields,
      confidence,
      source,
    });

    setFile(null);
    setShowManualForm(false);
    setManualFields(getManualFieldShape(type));

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const missing = analysis.apps.flatMap((application) =>
    application.requirements
      .filter((requirement) => !requirement.present)
      .map((requirement) => ({
        type: requirement.type,
        who:
          requirement.scope === 'person'
            ? application.subject.name
            : 'Household',
        scheme: application.scheme.short,
      }))
  );

  const missingUniq = [
    ...new Map(
      missing.map((item) => [
        `${item.type}|${item.who}`,
        item,
      ])
    ).values(),
  ];

  return (
    <div className="container">
      <h1 className="page-title">Documents</h1>

      <p className="page-subtitle">
        Photograph, upload a PDF, or type each document.
        Reading happens on this device; only the extracted
        fields are kept, never the original document.
      </p>

      <section className="card">
        <h2 className="card-title">Add a document</h2>

        <div className="form-grid">
          <label>
            For

            <select
              value={
                scope === 'household'
                  ? head.id
                  : memberId
              }
              disabled={scope === 'household'}
              onChange={(event) =>
                setMemberId(event.target.value)
              }
            >
              {members.map((member) => (
                <option
                  key={member.id}
                  value={member.id}
                >
                  {member.name || member.relation}
                </option>
              ))}
            </select>
          </label>

          <label>
            Type

            <select
              value={type}
              onChange={(event) =>
                setType(event.target.value)
              }
            >
              {Object.entries(DOC_TYPES).map(
                ([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                    {value.scope === 'household'
                      ? ' (household)'
                      : ''}
                  </option>
                )
              )}
            </select>
          </label>

          <label>
            Photo or scan (optional)

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,application/pdf"
              onChange={(event) => {
                setFile(event.target.files[0] || null);
                setShowManualForm(false);
                setNote('');
              }}
            />
          </label>
        </div>

        <label className="consent-label">
          <input
            type="checkbox"
            checked={consent}
            onChange={(event) =>
              setConsent(event.target.checked)
            }
          />

          <span>
            I consent to reading this document on this
            device. It is not uploaded; only the extracted
            fields are stored here, and Aadhaar is reduced
            to its last 4 digits.
          </span>
        </label>

        <div className="upload-actions">
          <button
            className="btn btn-primary"
            onClick={add}
            disabled={loading}
          >
            {loading
              ? `Reading… ${progress}%`
              : file
                ? 'Scan and add'
                : 'Add manually'}
          </button>
        </div>

        {(!file || showManualForm) && (
          <div
            className="doc-fields"
            style={{ marginTop: 16 }}
          >
            {scope !== 'household' && (
              <label className="doc-field">
                Name on document

                <input
                  value={manualFields.name ?? ''}
                  onChange={(event) =>
                    setManualFields((previous) => ({
                      ...previous,
                      name: event.target.value,
                    }))
                  }
                  placeholder="e.g. Krishna Agarwal"
                />
              </label>
            )}

            {type !== 'ration_card' &&
              type !== 'land_record' &&
              type !== 'residence_proof' && (
                <label className="doc-field">
                  Date of birth

                  <input
                    value={manualFields.dob ?? ''}
                    onChange={(event) =>
                      setManualFields((previous) => ({
                        ...previous,
                        dob: event.target.value,
                      }))
                    }
                    placeholder="DD/MM/YYYY or year"
                  />
                </label>
              )}

            {type === 'aadhaar' && (
              <label className="doc-field">
                Aadhaar last 4 digits

                <input
                  value={manualFields.idLast4 ?? ''}
                  onChange={(event) =>
                    setManualFields((previous) => ({
                      ...previous,
                      idLast4: event.target.value,
                    }))
                  }
                  maxLength={4}
                  inputMode="numeric"
                  placeholder="1234"
                />
              </label>
            )}

            {type === 'income_certificate' && (
              <label className="doc-field">
                Income stated (₹)

                <input
                  type="number"
                  value={manualFields.income ?? ''}
                  onChange={(event) =>
                    setManualFields((previous) => ({
                      ...previous,
                      income: event.target.value,
                    }))
                  }
                  placeholder="25000"
                />
              </label>
            )}

            {DOC_TYPES[type]?.validityMonths && (
              <label className="doc-field">
                Issue date

                <input
                  type="date"
                  value={manualFields.issueDate ?? ''}
                  onChange={(event) =>
                    setManualFields((previous) => ({
                      ...previous,
                      issueDate: event.target.value,
                    }))
                  }
                />
              </label>
            )}
          </div>
        )}

        {error && (
          <p className="error-msg">
            OCR problem: {error}. You can still type
            the details manually.
          </p>
        )}

        {note && <p className="muted">{note}</p>}
      </section>

      {missingUniq.length > 0 && (
        <section
          className="card"
          style={{ marginTop: 16 }}
        >
          <h2 className="card-title">
            Still needed for schemes you match
          </h2>

          <div className="chips">
            {missingUniq.map((item) => (
              <span
                key={`${item.type}|${item.who}`}
                className="doc-chip"
              >
                {docLabel(item.type)} · {item.who}
                <small> ({item.scheme})</small>
              </span>
            ))}
          </div>
        </section>
      )}

      {members.map((member) => {
        const memberDocuments = documents.filter(
          (document) =>
            document.memberId === member.id
        );

        return (
          <section
            key={member.id}
            className="card"
            style={{ marginTop: 16 }}
          >
            <h2 className="card-title">
              {member.name || member.relation}

              <span className="muted">
                {' '}
                · {member.relation}, {member.age}
              </span>
            </h2>

            {memberDocuments.length === 0 ? (
              <p className="muted">
                No documents yet.
              </p>
            ) : (
              memberDocuments.map((document) => (
                <DocRow
                  key={document.id}
                  doc={document}
                  api={api}
                />
              ))
            )}
          </section>
        );
      })}

      <div className="upload-actions">
        <Link to="/issues" className="btn btn-primary">
          Check for mismatches →
        </Link>
      </div>
    </div>
  );
}
