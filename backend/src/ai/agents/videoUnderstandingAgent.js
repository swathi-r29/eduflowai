import fs from 'fs';
import { fetchTranscript } from 'youtube-transcript';
import { getVideoProvider } from '../providers/providerFactory.js';
import { parseAndValidate } from '../evaluators/outputValidator.js';
import { videoUnderstandingSchema } from '../schemas/index.js';
import { logAICall } from '../evaluators/aiLogger.js';

const SYSTEM = `You are an educational video analysis engine.

You will receive a REAL timestamped transcript from an educational video.

Your job is to analyze ONLY the information present in the transcript and produce:
- a concise educational summary
- topics
- concepts
- key points
- important timestamped moments with 30-to-60-second micro-clip windows
- a 2-sentence concept principle for each micro-clip
- semantically coherent transcript chunks

Do NOT invent facts.
Do NOT invent timestamps.
Use the timestamps provided by the transcript.

Return ONLY valid JSON.`;

function secondsToTimestamp(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function chunkTranscript(transcript, maxSeconds = 60) {
  const chunks = [];
  let current = null;

  for (const item of transcript) {
    const text = String(item.text || '').trim();
    if (!text) continue;

    const start = Number(item.start ?? item.offset ?? 0);
    const duration = Number(item.duration ?? 0);
    const end = start + duration;

    if (!current) {
      current = { text, startTime: start, endTime: end };
      continue;
    }

    const proposedEnd = Math.max(current.endTime, end);
    if (proposedEnd - current.startTime <= maxSeconds) {
      current.text += ` ${text}`;
      current.endTime = proposedEnd;
    } else {
      chunks.push(current);
      current = { text, startTime: start, endTime: end };
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

/**
 * Guarantees every important moment has clean 30-60 second boundaries and a 2-sentence principle
 */
function normalizeMicroClips(importantTimestamps = [], maxVideoDuration = 3600) {
  return importantTimestamps.map((item) => {
    const rawStart = Number(item.startTime ?? 0);
    const rawEnd = Number(item.endTime ?? rawStart + 45);

    // Compute bounded 30 to 60 second micro-clip window
    let clipStart = Math.max(0, Math.floor(rawStart - 5));
    let clipEnd = Math.max(clipStart + 30, Math.floor(rawEnd));
    if (clipEnd - clipStart > 60) {
      clipEnd = clipStart + 60;
    }

    const principle =
      item.conceptPrinciple ||
      item.description ||
      `This section demonstrates ${item.topic}. Focus on how this principle applies to solving the problem.`;

    return {
      timestamp: item.timestamp || secondsToTimestamp(clipStart),
      startTime: rawStart,
      endTime: rawEnd,
      clipStartTime: clipStart,
      clipEndTime: clipEnd,
      clipDuration: clipEnd - clipStart,
      topic: item.topic || 'Core Concept',
      description: item.description || '',
      conceptPrinciple: principle
    };
  });
}

async function processYouTubeTranscript({ youtubeUrl, videoTitle, provider, start }) {
  const transcript = await fetchTranscript(youtubeUrl);

  if (!Array.isArray(transcript) || transcript.length === 0) {
    throw new Error('No YouTube transcript/captions were found for this video.');
  }

  const transcriptChunks = chunkTranscript(transcript);
  if (transcriptChunks.length === 0) {
    throw new Error('YouTube transcript was retrieved, but it contained no usable text.');
  }

  const transcriptText = transcriptChunks
    .map(
      (chunk) =>
        `[${secondsToTimestamp(chunk.startTime)} - ${secondsToTimestamp(chunk.endTime)}] ${chunk.text}`
    )
    .join('\n');

  const prompt = `Analyze the following REAL timestamped transcript from an educational YouTube video.

Video title:
${videoTitle || 'Educational Video'}

Produce ONLY JSON in this exact shape:

{
  "summary": string,
  "topics": string[],
  "concepts": string[],
  "keyPoints": string[],
  "importantTimestamps": [
    {
      "timestamp": "MM:SS",
      "startTime": number,
      "endTime": number,
      "clipStartTime": number,
      "clipEndTime": number,
      "topic": string,
      "description": string,
      "conceptPrinciple": string
    }
  ],
  "transcriptChunks": [
    {
      "text": string,
      "startTime": number,
      "endTime": number
    }
  ]
}

CRITICAL RULES FOR IMPORTANT MOMENTS (MICRO-CLIPS):
- For each moment, define "clipStartTime" and "clipEndTime" spanning 30 to 60 seconds around the core demonstration.
- Provide "conceptPrinciple": exactly 2 sentences explaining the educational principle taught in that 30-60 second clip.

REAL TIMESTAMPED TRANSCRIPT:
${transcriptText}`;

  const res = await provider.generateJSON({ system: SYSTEM, prompt });
  const validated = parseAndValidate(res.text, videoUnderstandingSchema);

  if (!validated.success) {
    throw new Error(`Gemini returned invalid video analysis: ${validated.error}`);
  }

  validated.data.transcriptChunks = transcriptChunks;
  validated.data.importantTimestamps = normalizeMicroClips(validated.data.importantTimestamps || []);

  await logAICall({
    provider: provider.name,
    agent: 'videoUnderstandingAgent',
    processingTimeMs: Date.now() - start,
    status: 'success',
    tokenUsage: res.usage
  });

  return validated.data;
}

export async function runVideoUnderstandingAgent({ filePath, mimeType, youtubeUrl, videoTitle }) {
  const provider = getVideoProvider();
  const start = Date.now();

  try {
    if (youtubeUrl) {
      return await processYouTubeTranscript({ youtubeUrl, videoTitle, provider, start });
    }

    const prompt = `Analyze this educational video.

Return ONLY JSON of this exact shape:

{
  "summary": string,
  "topics": string[],
  "concepts": string[],
  "keyPoints": string[],
  "importantTimestamps": [
    {
      "timestamp": "MM:SS",
      "startTime": number,
      "endTime": number,
      "clipStartTime": number,
      "clipEndTime": number,
      "topic": string,
      "description": string,
      "conceptPrinciple": string
    }
  ],
  "transcriptChunks": [
    {
      "text": string,
      "startTime": number,
      "endTime": number
    }
  ]
}

CRITICAL RULES FOR IMPORTANT MOMENTS:
- For each moment, define "clipStartTime" and "clipEndTime" spanning 30 to 60 seconds.
- Provide "conceptPrinciple": exactly 2 sentences summarizing the concept demonstrated in this clip.`;

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error('Uploaded video file was not found.');
    }

    const res = await provider.understandVideo({ filePath, mimeType, system: SYSTEM, prompt });
    const validated = parseAndValidate(res.text, videoUnderstandingSchema);

    if (!validated.success) {
      throw new Error(`Gemini returned invalid video analysis: ${validated.error}`);
    }

    validated.data.importantTimestamps = normalizeMicroClips(validated.data.importantTimestamps || []);

    await logAICall({
      provider: provider.name,
      agent: 'videoUnderstandingAgent',
      processingTimeMs: Date.now() - start,
      status: 'success',
      tokenUsage: res.usage
    });

    return validated.data;
  } catch (err) {
    await logAICall({
      provider: provider.name,
      agent: 'videoUnderstandingAgent',
      processingTimeMs: Date.now() - start,
      status: 'failure',
      error: err.message
    });
    throw err;
  }
}