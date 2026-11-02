import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';

import { analyze } from '../engine/analyze';
import { demoState, EMPTY_STATE } from '../data/demo';

const Ctx = createContext(null);
const KEY = 'kaagazsaathi.state.v1';

export const uid = (prefix = 'x') =>
  `${prefix}${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 6)}`;

// Load saved household data from localStorage
function load() {
  try {
    const saved = localStorage.getItem(KEY);
    return saved ? JSON.parse(saved) : null;
  } catch (error) {
    console.error('Failed to load household data:', error);
    return null;
  }
}

export function HouseholdProvider({ children }) {
  const [state, setState] = useState(() => load() || EMPTY_STATE);

  const [lang, setLangState] = useState(() => {
    try {
      return localStorage.getItem('ks.lang') || 'en';
    } catch {
      return 'en';
    }
  });

  // Save household data whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save household data:', error);
    }
  }, [state]);

  const setLang = useCallback((language) => {
    setLangState(language);

    try {
      localStorage.setItem('ks.lang', language);
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Analyze household documents and detect issues
  const analysis = useMemo(() => analyze(state), [state]);

  const patch = useCallback((updateFn) => {
    setState((previousState) => updateFn(previousState));
  }, []);

  // Add or update a document without creating duplicates
  const addDocument = useCallback(
    (document) => {
      patch((previousState) => {
        const existingDocument = previousState.documents.find(
          (existing) =>
            existing.memberId === document.memberId &&
            existing.type === document.type
        );

        // If the same member already has this document,
        // update it instead of creating another block.
        if (existingDocument) {
          return {
            ...previousState,

            documents: previousState.documents.map((existing) =>
              existing.id === existingDocument.id
                ? {
                    ...existing,
                    ...document,
                    fields: {
                      ...(existing.fields || {}),
                      ...(document.fields || {}),
                    },
                    confidence: {
                      ...(existing.confidence || {}),
                      ...(document.confidence || {}),
                    },
                  }
                : existing
            ),
          };
        }

        // Otherwise, create a new document
        return {
          ...previousState,

          documents: [
            ...previousState.documents,
            {
              id: uid('d'),
              confidence: {},
              source: 'manual',
              ...document,
            },
          ],
        };
      });
    },
    [patch]
  );

  const updateDocument = useCallback(
    (documentId, updates) => {
      patch((previousState) => ({
        ...previousState,

        documents: previousState.documents.map((document) =>
          document.id === documentId
            ? {
                ...document,
                ...updates,
                fields: {
                  ...(document.fields || {}),
                  ...(updates.fields || {}),
                },
                confidence: {
                  ...(document.confidence || {}),
                  ...(updates.confidence || {}),
                },
              }
            : document
        ),
      }));
    },
    [patch]
  );

  const removeDocument = useCallback(
    (documentId) => {
      patch((previousState) => ({
        ...previousState,

        documents: previousState.documents.filter(
          (document) => document.id !== documentId
        ),
      }));
    },
    [patch]
  );

  const upsertMember = useCallback(
    (member) => {
      patch((previousState) => {
        const exists = previousState.members.some(
          (existing) => existing.id === member.id
        );

        return {
          ...previousState,

          members: exists
            ? previousState.members.map((existing) =>
                existing.id === member.id
                  ? { ...existing, ...member }
                  : existing
              )
            : [...previousState.members, member],
        };
      });
    },
    [patch]
  );

  const removeMember = useCallback(
    (memberId) => {
      patch((previousState) => ({
        ...previousState,

        members: previousState.members.filter(
          (member) => member.id !== memberId
        ),

        documents: previousState.documents.filter(
          (document) => document.memberId !== memberId
        ),
      }));
    },
    [patch]
  );

  const setClaim = useCallback(
    (key, value) => {
      patch((previousState) => {
        const claims = { ...previousState.claims };

        if (value) {
          claims[key] = value;
        } else {
          delete claims[key];
        }

        return {
          ...previousState,
          claims,
        };
      });
    },
    [patch]
  );

  const setOverride = useCallback(
    (schemeId, override) => {
      patch((previousState) => ({
        ...previousState,

        overrides: {
          ...previousState.overrides,
          [schemeId]: override,
        },
      }));
    },
    [patch]
  );

  const clearOverrides = useCallback(() => {
    patch((previousState) => ({
      ...previousState,
      overrides: {},
    }));
  }, [patch]);

  const replaceProfile = useCallback(
    (household, members) => {
      patch((previousState) => ({
        ...previousState,
        household,
        members,
      }));
    },
    [patch]
  );

  // Load fictional demo data
  const loadDemo = useCallback(() => {
    setState(demoState(new Date()));
  }, []);

  // Reset household data
  const reset = useCallback(() => {
    setState(EMPTY_STATE);
  }, []);

  const setHousehold = useCallback(
    (updates) => {
      patch((previousState) => ({
        ...previousState,

        household: {
          ...previousState.household,
          ...updates,
        },
      }));
    },
    [patch]
  );

  const api = {
    state,
    analysis,
    lang,
    setLang,

    household: state.household,
    members: state.members,
    documents: state.documents,
    claims: state.claims,
    overrides: state.overrides,

    hasData:
      state.documents.length > 0 ||
      state.members.some((member) => member.name),

    setHousehold,
    upsertMember,
    removeMember,

    addDocument,
    updateDocument,
    removeDocument,

    setClaim,
    setOverride,
    clearOverrides,

    replaceProfile,
    loadDemo,
    reset,
  };

  return <Ctx.Provider value={api}>{children}</Ctx.Provider>;
}

export function useHousehold() {
  const context = useContext(Ctx);

  if (!context) {
    throw new Error(
      'useHousehold must be used within HouseholdProvider'
    );
  }

  return context;
}