import { masteryToLevel } from '../src/ai/agents/knowledgeProfileAgent.js';

describe('masteryToLevel', () => {
  test.each([
    [10, 'Beginner'],
    [39, 'Beginner'],
    [40, 'Intermediate'],
    [69, 'Intermediate'],
    [70, 'Advanced'],
    [85, 'Challenge'],
    [95, 'Challenge']
  ])('mastery %i -> %s', (mastery, expected) => {
    expect(masteryToLevel(mastery)).toBe(expected);
  });
});
