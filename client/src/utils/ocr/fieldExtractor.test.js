import { extractFields } from './fieldExtractor';

describe('extractFields', () => {
  test('reads common candidate-name and date labels', () => {
    const result = extractFields(
      'Name of the Candidate: DEEPANSHU MOUDGIL\nDate of Birth: 02/04/2005',
      'marksheet',
    );

    expect(result.fields).toEqual({ name: 'DEEPANSHU MOUDGIL', dob: '02/04/2005' });
    expect(result.confidence).toEqual({ name: 0.85, dob: 0.85 });
  });

  test('reads a name printed below a Hindi name label', () => {
    const result = extractFields('विद्यार्थी का नाम\nदीपांशु', 'marksheet');

    expect(result.fields.name).toBe('दीपांशु');
    expect(result.confidence.name).toBe(0.85);
  });

  test('returns no fields for unrelated text', () => {
    expect(extractFields('विद्यालय प्रमाण पत्र', 'marksheet').fields).toEqual({});
  });
});
