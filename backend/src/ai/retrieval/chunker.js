/**
 * Splits text into semantically-reasonable chunks for embedding.
 * Simple sliding-window splitter on paragraphs/sentences — good enough for
 * a RAG pipeline without pulling in a heavier NLP dependency.
 */
export function chunkText(text, { targetChars = 900, overlapChars = 150 } = {}) {
  const clean = text.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  const paragraphs = clean.split(/\n\n+/).filter(Boolean);
  const chunks = [];
  let current = '';

  for (const para of paragraphs) {
    if ((current + '\n\n' + para).length > targetChars && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(Math.max(0, current.length - overlapChars));
    }
    current = current ? `${current}\n\n${para}` : para;
    while (current.length > targetChars * 1.5) {
      chunks.push(current.slice(0, targetChars).trim());
      current = current.slice(targetChars - overlapChars);
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((c) => c.length > 20);
}

/**
 * Groups video transcript segments (from Gemini's timestamped output) into
 * chunks of roughly `targetSeconds` while preserving start/end times.
 */
export function chunkTranscriptSegments(segments, { targetSeconds = 60 } = {}) {
  const chunks = [];
  let bucket = [];
  let bucketStart = null;

  for (const seg of segments) {
    if (bucketStart === null) bucketStart = seg.startTime;
    bucket.push(seg);
    if (seg.endTime - bucketStart >= targetSeconds) {
      chunks.push({
        text: bucket.map((s) => s.text).join(' '),
        startTime: bucketStart,
        endTime: bucket[bucket.length - 1].endTime
      });
      bucket = [];
      bucketStart = null;
    }
  }
  if (bucket.length) {
    chunks.push({
      text: bucket.map((s) => s.text).join(' '),
      startTime: bucketStart,
      endTime: bucket[bucket.length - 1].endTime
    });
  }
  return chunks;
}
