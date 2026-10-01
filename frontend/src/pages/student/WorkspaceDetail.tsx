import React, { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { api } from '../../api/client';
import type { Workspace, DocumentItem, VideoItem, TutorSource } from '../../types';
import VideoPlayer, { VideoPlayerRef } from '../../components/common/VideoPlayer';
import FlashcardViewer, { Flashcard } from '../../components/common/FlashcardViewer';
import InteractiveQuizViewer from '../../components/common/InteractiveQuizViewer';
import { parseTimestampToSeconds, formatSecondsToTimestamp } from '../../utils/timestampUtils';
import { UploadCloud, FileText, Video as VideoIcon, Send, Sparkles, Clock, Play, Youtube, Link as LinkIcon, Maximize2, Copy, Check } from 'lucide-react';
import MarkdownRenderer from '../../components/common/MarkdownRenderer';

type ChatMsg = { role: 'user' | 'assistant'; content: string; sources?: TutorSource[]; grounded?: boolean };

export default function WorkspaceDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [question, setQuestion] = useState('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const [contentMode, setContentMode] = useState('quiz');
  const [selectedSourceId, setSelectedSourceId] = useState<string>('active');
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [parsedFlashcards, setParsedFlashcards] = useState<Flashcard[]>([]);
  const [generating, setGenerating] = useState(false);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  // Content Modal & Copy state
  const [showFullModal, setShowFullModal] = useState(false);
  const [copied, setCopied] = useState(false);

  // YouTube modal state
  const [showYtModal, setShowYtModal] = useState(false);
  const [ytUrl, setYtUrl] = useState('');
  const [ytTitle, setYtTitle] = useState('');
  const [submittingYt, setSubmittingYt] = useState(false);

  const videoPlayerRef = useRef<VideoPlayerRef>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const pollRef = useRef<number | null>(null);

  const load = () => {
    return api.get(`/workspaces/${id}`).then((r) => {
      const ws = r.data.workspace as Workspace;
      setWorkspace(ws);
      const vList = (ws.videos || []) as VideoItem[];
      if (vList.length > 0 && !activeVideoId) {
        const urlVideoId = searchParams.get('videoId');
        if (urlVideoId && vList.some((v) => v._id === urlVideoId)) {
          setActiveVideoId(urlVideoId);
        } else {
          const readyVid = vList.find((v) => v.status === 'ready');
          if (readyVid) setActiveVideoId(readyVid._id);
          else setActiveVideoId(vList[0]._id);
        }
      }
    }).catch((err) => {
      // Graceful poll retry on transient server restart/network glitch
    });
  };

  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 4000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // If URL has seek parameter, jump video player once loaded
  useEffect(() => {
    const seekSec = searchParams.get('seek');
    if (seekSec && videoPlayerRef.current) {
      setTimeout(() => {
        videoPlayerRef.current?.seekTo(Number(seekSec));
      }, 500);
    }
  }, [searchParams, activeVideoId]);

  const uploadDocument = async (file: File) => {
    const form = new FormData();
    form.append('workspaceId', id!);
    form.append('file', file);
    await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    load();
  };

  const uploadVideo = async (file: File) => {
    const form = new FormData();
    form.append('workspaceId', id!);
    form.append('file', file);
    const { data } = await api.post('/videos/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    if (data.video?._id) setActiveVideoId(data.video._id);
    load();
  };

  const addYoutubeVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ytUrl.trim()) return;
    setSubmittingYt(true);
    try {
      const { data } = await api.post('/videos/youtube', {
        workspaceId: id,
        youtubeUrl: ytUrl.trim(),
        title: ytTitle.trim() || undefined
      });
      if (data.video?._id) setActiveVideoId(data.video._id);
      setShowYtModal(false);
      setYtUrl('');
      setYtTitle('');
      load();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add YouTube video');
    } finally {
      setSubmittingYt(false);
    }
  };

  const ask = async () => {
    if (!question.trim()) return;
    const q = question;
    setMessages((prev) => [...prev, { role: 'user', content: q }]);
    setQuestion('');
    setAsking(true);
    try {
      const { data } = await api.post('/study/query', { workspaceId: id, question: q, conversationId });
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: 'assistant', content: data.answer, sources: data.sources, grounded: data.grounded }]);
    } catch (err: any) {
      setMessages((prev) => [...prev, { role: 'assistant', content: err.response?.data?.error || 'Something went wrong.' }]);
    } finally {
      setAsking(false);
    }
  };

  const handleCopyContent = () => {
    if (!generatedContent) return;
    navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generate = async () => {
    setGenerating(true);
    setGeneratedContent(null);
    setParsedFlashcards([]);
    try {
      const targetSourceId = selectedSourceId === 'active' ? (activeVideoId || undefined) : selectedSourceId === 'all' ? undefined : selectedSourceId;
      const { data } = await api.post('/study/summarize', {
        workspaceId: id,
        mode: contentMode,
        sourceId: targetSourceId,
        videoId: targetSourceId || activeVideoId || undefined
      });
      setGeneratedContent(data.content);

      // Auto-open full screen modal so the user gets un-clamped view immediately
      setShowFullModal(true);

      if (contentMode === 'flashcards') {
        try {
          let cards: Flashcard[] = [];
          const cleanText = data.content.replace(/```json|```/g, '').trim();
          if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
            cards = JSON.parse(cleanText);
          } else {
            const lines = data.content.split('\n').filter((l: string) => l.trim());
            for (let i = 0; i < lines.length; i += 2) {
              if (lines[i]) {
                cards.push({
                  front: lines[i].replace(/^Q:?\s*|^-\s*/i, ''),
                  back: lines[i + 1] ? lines[i + 1].replace(/^A:?\s*|^-\s*/i, '') : 'Review source notes for details.'
                });
              }
            }
          }
          if (cards.length > 0) setParsedFlashcards(cards);
        } catch (e) {
          // JSON parse fallback
        }
      }
    } catch (err: any) {
      setGeneratedContent(err.response?.data?.error || 'Could not generate content.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSourceClick = (source: TutorSource) => {
    if (source.sourceType === 'video') {
      if (source.sourceId && videos.some((v) => v._id === source.sourceId)) {
        setActiveVideoId(source.sourceId);
      }
      if (source.startTime != null && videoPlayerRef.current) {
        videoPlayerRef.current.seekTo(source.startTime);
      }
    }
  };

  if (!workspace) return <p className="text-slate-500">Loading study workspace...</p>;
  const documents = (workspace.documents || []) as DocumentItem[];
  const videos = (workspace.videos || []) as VideoItem[];
  const activeVideo = videos.find((v) => v._id === activeVideoId) || videos[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{workspace.title}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{workspace.description || 'AI Multimodal Learning Workspace'}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={docInputRef} type="file" accept=".pdf,.txt,.docx" className="hidden" onChange={(e) => e.target.files?.[0] && uploadDocument(e.target.files[0])} />
          <input ref={videoInputRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={(e) => e.target.files?.[0] && uploadVideo(e.target.files[0])} />
          <button className="btn-secondary flex items-center gap-2 text-xs" onClick={() => docInputRef.current?.click()}>
            <UploadCloud size={14} /> Upload Doc (PDF/TXT/DOCX)
          </button>
          <button className="btn-secondary flex items-center gap-2 text-xs" onClick={() => videoInputRef.current?.click()}>
            <UploadCloud size={14} /> Upload Video File
          </button>
          <button className="btn-secondary flex items-center gap-2 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => setShowYtModal(true)}>
            <Youtube size={16} /> Add YouTube Link
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Player / Materials (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Active Video Player */}
          {activeVideo ? (
            <VideoPlayer ref={videoPlayerRef} video={activeVideo} baseUrl={window.location.origin.includes('localhost') ? 'http://localhost:5000' : ''} />
          ) : (
            <div className="card text-center py-12">
              <VideoIcon size={32} className="mx-auto text-slate-500 mb-2" />
              <p className="font-semibold text-slate-300">No video added yet</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
                Add a YouTube video link or upload a video file to unlock Gemini video understanding, automated timestamping, and grounded Q&A.
              </p>
              <div className="flex justify-center gap-3">
                <button className="btn-primary text-xs inline-flex items-center gap-2" onClick={() => setShowYtModal(true)}>
                  <Youtube size={16} /> Add YouTube Link
                </button>
                <button className="btn-secondary text-xs inline-flex items-center gap-2" onClick={() => videoInputRef.current?.click()}>
                  <UploadCloud size={14} /> Upload Video File
                </button>
              </div>
            </div>
          )}

          {/* Uploaded Resources List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Document list */}
            <div className="card">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><FileText size={16} className="text-brand-indigo" /> Documents</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {documents.map((d) => (
                  <div key={d._id} className="text-xs flex justify-between items-center border-b border-base-700 pb-2">
                    <span className="truncate max-w-[150px] text-slate-300">{d.originalName}</span>
                    <StatusPill status={d.status} />
                  </div>
                ))}
                {documents.length === 0 && <p className="text-xs text-slate-500">No documents uploaded.</p>}
              </div>
            </div>

            {/* Video list */}
            <div className="card">
              <h2 className="font-semibold text-sm mb-3 flex items-center gap-2"><VideoIcon size={16} className="text-brand-violet" /> Videos</h2>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {videos.map((v) => (
                  <button
                    key={v._id}
                    onClick={() => setActiveVideoId(v._id)}
                    className={`w-full text-left text-xs p-2 rounded transition-colors border ${
                      v._id === activeVideo?._id
                        ? 'bg-brand-indigo/20 border-brand-indigo/50 text-indigo-200'
                        : 'bg-base-800 border-base-700 hover:border-slate-600 text-slate-300'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="truncate max-w-[130px] font-medium flex items-center gap-1">
                        {v.youtubeUrl ? <Youtube size={12} className="text-red-400 shrink-0" /> : <Play size={10} className="shrink-0" />}
                        <span className="truncate">{v.originalName}</span>
                      </span>
                      <StatusPill status={v.status} />
                    </div>
                  </button>
                ))}
                {videos.length === 0 && <p className="text-xs text-slate-500">No videos added.</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Grounded AI Tutor & Content Generator (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* AI Study Assistant Chat */}
          <div className="card flex flex-col h-[560px]">
            <div className="flex items-center justify-between pb-3 border-b border-base-700 mb-3">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-brand-indigo" /> Grounded AI Tutor
              </h2>
              <span className="text-[11px] bg-brand-indigo/20 text-brand-indigo px-2 py-0.5 rounded font-mono">Gemini RAG</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-sm">
              {messages.map((m, i) => (
                <div key={i} className={`p-3 rounded-xl max-w-[90%] ${m.role === 'user' ? 'bg-brand-indigo/25 ml-auto border border-brand-indigo/30' : 'bg-base-700 border border-base-600'}`}>
                  <p className="text-slate-100 text-xs leading-relaxed">{m.content}</p>

                  {/* Sources pilled list */}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-base-600 space-y-1">
                      <p className="text-[10px] uppercase font-semibold text-slate-400">Retrieved Sources:</p>
                      {m.sources.map((s, si) => (
                        <div key={si} className="text-xs flex items-center justify-between bg-base-800/70 px-2 py-1 rounded border border-base-700">
                          <span className="truncate max-w-[150px] text-slate-300">
                            {s.sourceType === 'video' ? '📹' : '📄'} {s.sourceName}
                            {s.page != null ? ` (p. ${s.page})` : ''}
                          </span>
                          {s.sourceType === 'video' && s.startTime != null && (
                            <button
                              onClick={() => handleSourceClick(s)}
                              className="text-[11px] bg-brand-indigo/30 hover:bg-brand-indigo text-indigo-200 hover:text-white px-2 py-0.5 rounded font-mono flex items-center gap-1 transition-colors"
                            >
                              <Clock size={10} /> {formatSecondsToTimestamp(s.startTime)}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {m.grounded === false && (
                    <p className="text-[11px] text-amber-400 mt-1 italic">
                      ⚠️ Grounding notice: Information not explicitly found in your uploaded materials.
                    </p>
                  )}
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <Sparkles size={24} className="mx-auto text-slate-600" />
                  <p className="text-xs">Ask questions about your YouTube videos, lecture files or notes.</p>
                  <p className="text-[11px] text-slate-600">Answers are grounded in vector embeddings with timestamp source references.</p>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3 pt-2 border-t border-base-700">
              <input
                className="input-field text-xs flex-1"
                placeholder="Ask about polymorphism, key concepts..."
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && ask()}
              />
              <button className="btn-primary text-xs flex items-center gap-1 px-3" onClick={ask} disabled={asking}>
                <Send size={14} /> {asking ? '...' : 'Ask'}
              </button>
            </div>
          </div>

          {/* Generator Controls */}
          <div className="card space-y-3">
            <div className="flex justify-between items-center">
              <h2 className="font-semibold text-sm flex items-center gap-2">
                <Sparkles size={16} className="text-brand-violet" /> AI Content Generator
              </h2>
              <span className="text-[10px] text-slate-400">Target Material Source</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Select Source File / Video</label>
                <select
                  className="input-field text-xs w-full"
                  value={selectedSourceId}
                  onChange={(e) => setSelectedSourceId(e.target.value)}
                >
                  <option value="active">
                    ▶️ Active Video ({activeVideo ? activeVideo.originalName : 'Currently Selected'})
                  </option>
                  <option value="all">🌐 All Uploaded Videos & Documents (Combined)</option>
                  {videos.length > 0 && (
                    <optgroup label="Videos">
                      {videos.map((v) => (
                        <option key={v._id} value={v._id}>
                          📹 {v.originalName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {documents.length > 0 && (
                    <optgroup label="Documents">
                      {documents.map((d) => (
                        <option key={d._id} value={d._id}>
                          📄 {d.originalName}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </div>

              <div className="flex gap-2">
                <select className="input-field text-xs flex-1" value={contentMode} onChange={(e) => setContentMode(e.target.value)}>
                  <option value="quiz">Practice Questions & Quiz</option>
                  <option value="practice_questions">Conceptual Practice Questions</option>
                  <option value="summary">Summary</option>
                  <option value="short_summary">5-Point Key Summary</option>
                  <option value="notes">Structured Study Notes</option>
                  <option value="flashcards">Interactive Flashcards</option>
                  <option value="revision_plan">Revision Plan</option>
                  <option value="key_concepts">Key Concepts & Definitions</option>
                </select>
                <button className="btn-primary text-xs px-4 flex items-center gap-1" onClick={generate} disabled={generating}>
                  <Sparkles size={13} /> {generating ? '...' : 'Generate'}
                </button>
              </div>
            </div>

            {/* Generated Flashcards View */}
            {contentMode === 'flashcards' && parsedFlashcards.length > 0 ? (
              <FlashcardViewer cards={parsedFlashcards} onRegenerate={generate} isGenerating={generating} />
            ) : (contentMode === 'quiz' || contentMode === 'practice_questions') && generatedContent ? (
              <div className="bg-base-800 p-4 rounded-lg border border-base-700 space-y-3">
                <InteractiveQuizViewer
                  rawContent={generatedContent}
                  title={`Interactive ${contentMode === 'quiz' ? 'Practice Quiz' : 'Practice Questions'}`}
                  onRetake={generate}
                />
              </div>
            ) : generatedContent ? (
              <div className="bg-base-800 p-4 rounded-lg border border-base-700 space-y-3">
                <div className="flex items-center justify-between border-b border-base-700 pb-2">
                  <span className="text-xs font-semibold text-brand-violet flex items-center gap-1.5">
                    <Sparkles size={14} /> {contentMode.replace(/_/g, ' ').toUpperCase()}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyContent}
                      className="text-[11px] bg-base-700 hover:bg-base-600 px-2.5 py-1 rounded flex items-center gap-1 text-slate-300 transition-colors"
                      title="Copy content"
                    >
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                      {copied ? 'Copied' : 'Copy'}
                    </button>
                    <button
                      onClick={() => setShowFullModal(true)}
                      className="text-[11px] bg-brand-violet/20 hover:bg-brand-violet/30 border border-brand-violet/40 text-brand-violet px-2.5 py-1 rounded font-medium flex items-center gap-1 transition-colors"
                    >
                      <Maximize2 size={12} /> Full Screen View
                    </button>
                  </div>
                </div>
                <div className="text-xs text-slate-200 font-sans leading-relaxed max-h-[500px] overflow-y-auto pr-1">
                  <MarkdownRenderer content={generatedContent} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* YouTube Link Modal */}
      {showYtModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="card max-w-md w-full space-y-4">
            <div className="flex justify-between items-center border-b border-base-700 pb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <Youtube size={22} className="text-red-500" /> Add YouTube Video Link
              </h2>
              <button onClick={() => setShowYtModal(false)} className="text-slate-400 hover:text-white text-xs">✕</button>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste a YouTube video URL (e.g. <span className="font-mono text-indigo-300">https://www.youtube.com/watch?v=...</span> or <span className="font-mono text-indigo-300">https://youtu.be/...</span>). AI will analyze the video and index timestamped concepts for grounded Q&A.
            </p>
            <form onSubmit={addYoutubeVideo} className="space-y-3 text-xs">
              <div>
                <label className="label">YouTube Link / URL</label>
                <div className="relative">
                  <LinkIcon size={14} className="absolute left-3 top-3 text-slate-500" />
                  <input
                    required
                    type="url"
                    className="input-field pl-8"
                    placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                    value={ytUrl}
                    onChange={(e) => setYtUrl(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="label">Video Title / Subject (Optional)</label>
                <input
                  className="input-field"
                  placeholder="e.g. Java OOP Polymorphism Tutorial"
                  value={ytTitle}
                  onChange={(e) => setYtTitle(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn-secondary" onClick={() => setShowYtModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary flex items-center gap-1.5" disabled={submittingYt}>
                  <Youtube size={14} /> {submittingYt ? 'Adding...' : 'Add Video Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full Content View Modal */}
      {showFullModal && generatedContent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 md:p-8">
          <div className="bg-base-900 border border-base-700 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-base-700 bg-base-800">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-brand-violet" />
                <h2 className="text-base font-semibold text-white">
                  {contentMode === 'revision_plan' ? '📅 Full Revision & Study Plan' : `📚 ${contentMode.replace(/_/g, ' ').toUpperCase()}`}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyContent}
                  className="text-xs bg-base-700 hover:bg-base-600 px-3 py-1.5 rounded flex items-center gap-1.5 text-slate-200 transition-colors"
                >
                  {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  {copied ? 'Copied to Clipboard' : 'Copy Content'}
                </button>
                <button
                  onClick={() => setShowFullModal(false)}
                  className="text-slate-400 hover:text-white px-3 py-1 text-sm font-semibold rounded bg-base-700/50 hover:bg-base-700"
                >
                  ✕ Close
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto flex-1 text-sm text-slate-100 leading-relaxed font-sans select-text">
              {contentMode === 'quiz' || contentMode === 'practice_questions' ? (
                <InteractiveQuizViewer
                  rawContent={generatedContent}
                  title={`Interactive ${contentMode === 'quiz' ? 'Practice Quiz' : 'Practice Questions'}`}
                  onRetake={generate}
                />
              ) : (
                <MarkdownRenderer content={generatedContent} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const color = status === 'ready' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
    : status === 'failed' ? 'bg-red-500/20 text-red-400'
    : 'bg-amber-500/20 text-amber-400 animate-pulse';
  return <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${color}`}>{status}</span>;
}
