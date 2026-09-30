import React, { forwardRef, useImperativeHandle, useRef, useState, useEffect } from 'react';
import type { VideoItem } from '../../types';
import { parseTimestampToSeconds, formatSecondsToTimestamp } from '../../utils/timestampUtils';
import { Play, Clock, Sparkles, Tag, Youtube, Repeat, HelpCircle } from 'lucide-react';

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
}

interface VideoPlayerProps {
  video: VideoItem;
  baseUrl?: string;
}

interface ActiveClip {
  clipStartTime: number;
  clipEndTime: number;
  topic: string;
  conceptPrinciple?: string;
}

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  return match && match[1] ? match[1] : null;
}

const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(({ video, baseUrl = '' }, ref) => {
  const internalVideoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [ytStartSec, setYtStartSec] = useState(0);
  const [ytEndSec, setYtEndSec] = useState<number | null>(null);
  const [isLoopingClip, setIsLoopingClip] = useState(false);
  const [activeClip, setActiveClip] = useState<ActiveClip | null>(null);

  const isYoutube = Boolean(
    video.youtubeUrl ||
    video.mimeType === 'video/youtube' ||
    video.originalName?.includes('youtu.be') ||
    video.originalName?.includes('youtube.com')
  );
  const ytId = isYoutube ? getYoutubeId(video.youtubeUrl || video.originalName || '') : null;

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      setIsLoopingClip(false);
      setActiveClip(null);
      if (isYoutube) {
        setYtStartSec(seconds);
        setYtEndSec(null);
        if (containerRef.current) {
          containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (internalVideoRef.current) {
        internalVideoRef.current.currentTime = seconds;
        internalVideoRef.current.play().catch(() => {});
        internalVideoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    },
    play: () => {
      if (!isYoutube && internalVideoRef.current) {
        internalVideoRef.current.play().catch(() => {});
      }
    }
  }));

  // HTML5 Video micro-clip loop handler
  useEffect(() => {
    const vidEl = internalVideoRef.current;
    if (!vidEl || !isLoopingClip || !activeClip) return;

    const onTimeUpdate = () => {
      if (vidEl.currentTime >= activeClip.clipEndTime) {
        vidEl.currentTime = activeClip.clipStartTime;
        vidEl.play().catch(() => {});
      }
    };

    vidEl.addEventListener('timeupdate', onTimeUpdate);
    return () => vidEl.removeEventListener('timeupdate', onTimeUpdate);
  }, [isLoopingClip, activeClip]);

  let videoSrc = '';
  if (!isYoutube && video.storedPath) {
    const filename = video.storedPath.split(/[\/\\]/).pop();
    videoSrc = `${baseUrl}/uploads/videos/${filename}`;
  }

  const handleSeek = (ts: string | number) => {
    setIsLoopingClip(false);
    setActiveClip(null);
    const seconds = parseTimestampToSeconds(ts);
    if (isYoutube) {
      setYtStartSec(seconds);
      setYtEndSec(null);
    } else if (internalVideoRef.current) {
      internalVideoRef.current.currentTime = seconds;
      internalVideoRef.current.play().catch(() => {});
    }
  };

  const handlePlayMicroClip = (clip: any) => {
    const start = clip.clipStartTime ?? clip.startTime ?? parseTimestampToSeconds(clip.timestamp);
    const end = clip.clipEndTime ?? start + 45;

    setActiveClip({
      clipStartTime: start,
      clipEndTime: end,
      topic: clip.topic,
      conceptPrinciple: clip.conceptPrinciple || clip.description
    });
    setIsLoopingClip(true);

    if (isYoutube) {
      setYtStartSec(start);
      setYtEndSec(end);
      if (containerRef.current) {
        containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else if (internalVideoRef.current) {
      internalVideoRef.current.currentTime = start;
      internalVideoRef.current.play().catch(() => {});
      internalVideoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div ref={containerRef} className="card space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-base-700">
        <h3 className="font-semibold text-base truncate max-w-md flex items-center gap-2">
          {isYoutube ? <Youtube size={20} className="text-red-500" /> : <Play size={18} className="text-brand-indigo" />}
          {video.originalName}
        </h3>
        <div className="flex items-center gap-2">
          {isLoopingClip && (
            <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-brand-indigo/20 text-indigo-300 border border-brand-indigo/40 animate-pulse">
              <Repeat size={12} /> Loop Active
            </span>
          )}
          <span
            className={`text-xs px-2.5 py-1 rounded font-medium ${
              video.status === 'ready'
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                : video.status === 'failed'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-amber-500/20 text-amber-400 animate-pulse'
            }`}
          >
            {video.status}
          </span>
        </div>
      </div>

      {/* Video Player Display: YouTube iFrame or HTML5 Video */}
      {isYoutube && ytId ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-md border border-base-700">
          <iframe
            key={`${ytId}-${ytStartSec}-${ytEndSec}-${isLoopingClip}`}
            title={video.originalName}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(ytStartSec)}${
              ytEndSec && isLoopingClip ? `&end=${Math.floor(ytEndSec)}&loop=1&playlist=${ytId}` : ''
            }`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>
      ) : videoSrc ? (
        <video
          ref={internalVideoRef}
          src={videoSrc}
          controls
          preload="metadata"
          className="w-full rounded-lg bg-black aspect-video shadow-md border border-base-700"
        />
      ) : (
        <div className="w-full aspect-video rounded-lg bg-base-800 flex items-center justify-center text-slate-500 text-sm">
          Video source URL unavailable.
        </div>
      )}

      {/* Active Micro-Clip Banner */}
      {activeClip && isLoopingClip && (
        <div className="bg-brand-indigo/15 border border-brand-indigo/30 p-3 rounded-lg flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <Repeat size={14} /> Looping Micro-Clip: {activeClip.topic} ({formatSecondsToTimestamp(activeClip.clipStartTime)} - {formatSecondsToTimestamp(activeClip.clipEndTime)})
            </p>
            {activeClip.conceptPrinciple && (
              <p className="text-xs text-slate-300 leading-relaxed italic">
                "{activeClip.conceptPrinciple}"
              </p>
            )}
          </div>
          <button
            onClick={() => {
              setIsLoopingClip(false);
              setActiveClip(null);
            }}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded bg-base-800 border border-base-700"
          >
            Exit Loop
          </button>
        </div>
      )}

      {/* AI Processed Video Summary & Targeted Micro-Clips */}
      {video.status === 'ready' && (
        <div className="space-y-3 pt-2 text-sm">
          {video.summary && (
            <div className="bg-base-800/80 p-3 rounded-lg border border-base-700">
              <p className="text-xs uppercase font-semibold text-slate-400 mb-1 flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-violet" /> Video AI Summary
              </p>
              <p className="text-slate-300 leading-relaxed text-xs">{video.summary}</p>
            </div>
          )}

          {video.importantTimestamps && video.importantTimestamps.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center gap-1.5">
                <Clock size={14} className="text-brand-indigo" /> Targeted Micro-Clips & Concepts
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {video.importantTimestamps.map((t: any, idx: number) => {
                  const clipStart = t.clipStartTime ?? t.startTime ?? parseTimestampToSeconds(t.timestamp);
                  const clipEnd = t.clipEndTime ?? clipStart + 45;
                  const duration = clipEnd - clipStart;

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-base-800 border border-base-700 hover:border-brand-indigo/40 transition-colors flex flex-col justify-between gap-2"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-xs font-bold text-slate-200 truncate">{t.topic}</span>
                          <span className="text-[10px] font-mono bg-base-700 text-slate-300 px-1.5 py-0.5 rounded">
                            {duration}s clip
                          </span>
                        </div>
                        {t.conceptPrinciple ? (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {t.conceptPrinciple}
                          </p>
                        ) : t.description ? (
                          <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                            {t.description}
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2 pt-1 border-t border-base-700/50">
                        <button
                          onClick={() => handlePlayMicroClip(t)}
                          className="btn-primary text-[11px] py-1 px-2.5 flex items-center gap-1.5"
                        >
                          <Repeat size={12} /> Play & Loop Clip
                        </button>
                        <button
                          onClick={() => handleSeek(clipStart)}
                          className="btn-secondary text-[11px] py-1 px-2 text-slate-400 hover:text-white"
                        >
                          Jump ({formatSecondsToTimestamp(clipStart)})
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {video.topics && video.topics.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap pt-1">
              <Tag size={12} className="text-slate-500" />
              {video.topics.map((topic, i) => (
                <span key={i} className="text-[11px] bg-base-700/60 text-slate-300 px-2 py-0.5 rounded">
                  {topic}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

export default VideoPlayer;