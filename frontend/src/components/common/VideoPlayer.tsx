import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import type { VideoItem } from '../../types';
import { parseTimestampToSeconds, formatSecondsToTimestamp } from '../../utils/timestampUtils';
import { Play, Clock, Sparkles, Tag, Youtube } from 'lucide-react';

export interface VideoPlayerRef {
  seekTo: (seconds: number) => void;
  play: () => void;
}

interface VideoPlayerProps {
  video: VideoItem;
  baseUrl?: string;
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

  const isYoutube = Boolean(
    video.youtubeUrl ||
    video.mimeType === 'video/youtube' ||
    video.originalName?.includes('youtu.be') ||
    video.originalName?.includes('youtube.com')
  );
  const ytId = isYoutube ? getYoutubeId(video.youtubeUrl || video.originalName || '') : null;

  useImperativeHandle(ref, () => ({
    seekTo: (seconds: number) => {
      if (isYoutube) {
        setYtStartSec(seconds);
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

  // Build static video URL from stored path
  let videoSrc = '';
  if (!isYoutube && video.storedPath) {
    const filename = video.storedPath.split(/[\/\\]/).pop();
    videoSrc = `${baseUrl}/uploads/videos/${filename}`;
  }

  const handleSeek = (ts: string | number) => {
    const seconds = parseTimestampToSeconds(ts);
    if (isYoutube) {
      setYtStartSec(seconds);
    } else if (internalVideoRef.current) {
      internalVideoRef.current.currentTime = seconds;
      internalVideoRef.current.play().catch(() => {});
    }
  };

  return (
    <div ref={containerRef} className="card space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-base-700">
        <h3 className="font-semibold text-base truncate max-w-md flex items-center gap-2">
          {isYoutube ? <Youtube size={20} className="text-red-500" /> : <Play size={18} className="text-brand-indigo" />}
          {video.originalName}
        </h3>
        <span className={`text-xs px-2.5 py-1 rounded font-medium ${
          video.status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
          : video.status === 'failed' ? 'bg-red-500/20 text-red-400'
          : 'bg-amber-500/20 text-amber-400 animate-pulse'
        }`}>
          {video.status}
        </span>
      </div>

      {/* Video Player Display: YouTube iFrame or HTML5 Video */}
      {isYoutube && ytId ? (
        <div className="w-full aspect-video rounded-lg overflow-hidden bg-black shadow-md border border-base-700">
          <iframe
            key={`${ytId}-${ytStartSec}`}
            title={video.originalName}
            src={`https://www.youtube.com/embed/${ytId}?autoplay=1&start=${Math.floor(ytStartSec)}`}
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

      {/* AI Processed Video Summary & Important Timestamps */}
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
                <Clock size={14} className="text-brand-indigo" /> Key Timestamps (Click to Jump)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {video.importantTimestamps.map((t, idx) => {
                  const sec = t.startTime ?? parseTimestampToSeconds(t.timestamp);
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSeek(sec)}
                      className="flex items-start gap-2.5 p-2 rounded-lg bg-base-800 hover:bg-brand-indigo/20 border border-base-700 hover:border-brand-indigo/40 text-left transition-colors group"
                    >
                      <span className="text-xs font-mono font-bold bg-brand-indigo/30 text-indigo-300 px-2 py-0.5 rounded group-hover:bg-brand-indigo group-hover:text-white transition-colors">
                        {formatSecondsToTimestamp(sec)}
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-slate-200 truncate">{t.topic}</p>
                        {t.description && <p className="text-[11px] text-slate-400 line-clamp-1">{t.description}</p>}
                      </div>
                    </button>
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
