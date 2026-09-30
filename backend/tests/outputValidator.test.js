import { parseAndValidate } from '../src/ai/evaluators/outputValidator.js';
import { rootCauseSchema } from '../src/ai/schemas/index.js';

describe('parseAndValidate', () => {
  const validPayload = {
    errorCategory: 'CONCEPTUAL_MISCONCEPTION',
    detectedMisconception: 'Confuses overriding with overloading',
    problematicSnippet: 'The student wrote...',
    expectedConcept: 'Method overriding',
    studentInterpretation: 'Believes overriding changes the signature',
    rootReason: 'Did not distinguish compile-time vs runtime polymorphism',
    confidence: 0.82
  };

  test('accepts well-formed JSON matching schema', () => {
    const result = parseAndValidate(JSON.stringify(validPayload), rootCauseSchema);
    expect(result.success).toBe(true);
    expect(result.data.errorCategory).toBe('CONCEPTUAL_MISCONCEPTION');
  });

  test('strips markdown fences before parsing', () => {
    const fenced = '```json\n' + JSON.stringify(validPayload) + '\n```';
    const result = parseAndValidate(fenced, rootCauseSchema);
    expect(result.success).toBe(true);
  });

  test('rejects invalid JSON', () => {
    const result = parseAndValidate('{not valid json', rootCauseSchema);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/JSON parse failed/);
  });

  test('rejects JSON that violates the schema (bad enum, bad confidence range)', () => {
    const bad = { ...validPayload, errorCategory: 'NOT_A_REAL_CATEGORY', confidence: 5 };
    const result = parseAndValidate(JSON.stringify(bad), rootCauseSchema);
    expect(result.success).toBe(false);
  });
});
