import { chunkText, chunkTranscriptSegments } from '../src/ai/retrieval/chunker.js';

describe('chunkText', () => {
  test('splits long text into multiple bounded chunks', () => {
    const paragraph = 'Polymorphism allows one interface to represent different implementations. '.repeat(30);
    const text = [paragraph, paragraph, paragraph].join('\n\n');
    const chunks = chunkText(text, { targetChars: 500, overlapChars: 50 });
    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((c) => expect(c.length).toBeGreaterThan(0));
  });

  test('drops trivially short fragments', () => {
    const chunks = chunkText('Hi\n\nOk');
    expect(chunks.length).toBe(0);
  });
});

describe('chunkTranscriptSegments', () => {
  test('groups segments into ~targetSeconds buckets preserving timestamps', () => {
    const segments = [
      { text: 'Intro to polymorphism.', startTime: 0, endTime: 20 },
      { text: 'Static vs dynamic binding.', startTime: 20, endTime: 45 },
      { text: 'Example with Animal class.', startTime: 45, endTime: 70 }
    ];
    const chunks = chunkTranscriptSegments(segments, { targetSeconds: 40 });
    expect(chunks[0].startTime).toBe(0);
    expect(chunks.every((c) => c.endTime > c.startTime)).toBe(true);
  });
});
