import React, { useState, useMemo } from 'react';
import { Lock, Check, Sparkles, Brain, Lightbulb } from 'lucide-react';

export interface JourneyNodeItem {
  id: string;
  type?: string;
  title?: string;
  concept?: string;
  description?: string;
  remediationFocus?: string;
  difficulty?: string;
  completed?: boolean;
}

export interface RevisionPlan {
  summary?: string;
  currentLevel?: string;
  learningGap?: string;
  actionItems?: JourneyNodeItem[];
  steps?: { step: number; concept: string; reason: string; activity: string }[];
}

interface JourneyTreeProps {
  revisionPlan?: RevisionPlan | null;
  onSelectNode?: (node: JourneyNodeItem) => void;
  activeNodeId?: string | null;
  completedNodeIds?: string[];
}

export default function JourneyTree({
  revisionPlan,
  onSelectNode,
  activeNodeId,
  completedNodeIds = []
}: JourneyTreeProps) {
  // Normalize items from actionItems or steps
  const items: JourneyNodeItem[] = useMemo(() => {
    if (!revisionPlan) return [];
    const doneSet = new Set(completedNodeIds || []);
    if (Array.isArray(revisionPlan.actionItems) && revisionPlan.actionItems.length > 0) {
      return revisionPlan.actionItems.map((item) => ({
        ...item,
        completed: item.completed || doneSet.has(item.id)
      }));
    }
    if (Array.isArray(revisionPlan.steps) && revisionPlan.steps.length > 0) {
      return revisionPlan.steps.map((s, idx) => {
        const nodeId = `node-step-${s.step || idx + 1}`;
        return {
          id: nodeId,
          type: 'Skill Node',
          title: s.concept,
          concept: s.concept,
          description: `${s.reason} - ${s.activity}`,
          remediationFocus: s.activity,
          completed: doneSet.has(nodeId)
        };
      });
    }
    return [];
  }, [revisionPlan, completedNodeIds]);

  const [inspectedNodeId, setInspectedNodeId] = useState<string | null>(null);

  // Compute unlock states for all nodes
  const processedNodes = useMemo(() => {
    return items.map((item, index) => {
      const isDone = item.completed || false;
      // First node is unlocked by default; subsequent nodes unlock ONLY if previous node is completed
      const isUnlocked = index === 0 || Boolean(items[index - 1] && items[index - 1].completed);
      const isLocked = !isUnlocked;
      const isCurrent = activeNodeId === item.id || (!activeNodeId && isUnlocked && !isDone);

      // Horizontal offset pattern for winding S-curve (matching reference image)
      const xOffsets = [0, 50, 15, -45, -15, 50, 10];
      const xOffset = xOffsets[index % xOffsets.length];

      return {
        ...item,
        index,
        isDone,
        isUnlocked,
        isLocked,
        isCurrent,
        xOffset
      };
    });
  }, [items, activeNodeId]);

  const activeInspectedNode = useMemo(() => {
    if (inspectedNodeId) {
      const found = processedNodes.find((n) => n.id === inspectedNodeId);
      if (found) return found;
    }
    return processedNodes.find((n) => n.isCurrent) || processedNodes[0] || null;
  }, [processedNodes, inspectedNodeId]);

  if (!revisionPlan || processedNodes.length === 0) {
    return (
      <div className="p-6 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-400">
        <p className="font-medium text-sm">No active journey nodes yet.</p>
        <p className="text-xs mt-1 text-slate-500">
          Submit an assignment or study topic to generate your personalized learning path.
        </p>
      </div>
    );
  }

  const containerWidth = 320;
  const nodeGapY = 110;
  const startY = 55;

  // Node center coordinates
  const nodeCoords = processedNodes.map((n, i) => ({
    x: containerWidth / 2 + n.xOffset,
    y: startY + i * nodeGapY
  }));

  // Generate smooth cubic bezier SVG curve string connecting hexagon centers
  const svgPathD = nodeCoords.reduce((acc, curr, i, arr) => {
    if (i === 0) return `M ${curr.x} ${curr.y}`;
    const prev = arr[i - 1];
    const midY = (prev.y + curr.y) / 2;
    return `${acc} C ${prev.x} ${midY}, ${curr.x} ${midY}, ${curr.x} ${curr.y}`;
  }, '');

  return (
    <div className="flex flex-col items-center py-4 w-full select-none">
      {/* Header */}
      <div className="text-center mb-6">
        <span className="text-[11px] uppercase tracking-widest text-cyan-400 font-bold bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/30 inline-flex items-center gap-1.5">
          <Sparkles size={13} /> Interactive Skill Tree
        </span>
      </div>

      {/* Winding 3D Hexagonal Path Canvas */}
      <div
        className="relative w-full max-w-[340px] flex flex-col items-center"
        style={{ minHeight: `${processedNodes.length * nodeGapY + 40}px` }}
      >
        {/* SVG Connecting Path Line */}
        <svg
          className="absolute top-0 left-0 w-full h-full pointer-events-none z-0 overflow-visible"
          viewBox={`0 0 ${containerWidth} ${processedNodes.length * nodeGapY + 40}`}
        >
          {/* Dark Solid Curved Path matching Reference Image */}
          <path
            d={svgPathD}
            fill="none"
            stroke="#334155"
            strokeWidth="6"
            strokeLinecap="round"
          />
          {/* Completed Path Accent Line */}
          <path
            d={svgPathD}
            fill="none"
            stroke="#0284c7"
            strokeWidth="3"
            strokeDasharray="8 6"
            strokeLinecap="round"
            className="opacity-60 animate-pulse"
          />
        </svg>

        {/* 3D Hexagonal Nodes */}
        {processedNodes.map((node, idx) => {
          const coord = nodeCoords[idx];
          const isInspected = activeInspectedNode?.id === node.id;
          const isDone = node.isDone;
          const isCurrent = node.isCurrent;
          const isLocked = node.isLocked;

          // Color themes for exact 3D Isometric Hexagon styling matching reference image
          let topFill = 'url(#hexGradLocked)';
          let topStroke = '#475569';
          let leftWallFill = '#1e293b';
          let rightWallFill = '#0f172a';

          if (isDone) {
            topFill = 'url(#hexGradDone)';
            topStroke = '#34d399';
            leftWallFill = '#065f46';
            rightWallFill = '#044e37';
          } else if (isCurrent || (idx === 0 && !isDone)) {
            topFill = 'url(#hexGradActive)';
            topStroke = '#38bdf8';
            leftWallFill = '#0369a1';
            rightWallFill = '#075985';
          } else if (node.isUnlocked) {
            topFill = 'url(#hexGradUnlocked)';
            topStroke = '#818cf8';
            leftWallFill = '#3730a3';
            rightWallFill = '#312e81';
          }

          return (
            <div
              key={node.id || idx}
              style={{
                position: 'absolute',
                left: `${coord.x}px`,
                top: `${coord.y}px`,
                transform: 'translate(-50%, -50%)'
              }}
              className="z-10 flex flex-col items-center group cursor-pointer"
              onClick={() => {
                setInspectedNodeId(node.id);
                if (node.isUnlocked && onSelectNode) {
                  onSelectNode(node);
                }
              }}
            >
              {/* START Speech Bubble Tag (Matching Reference Image) */}
              {(idx === 0 || isCurrent) && !isDone && (
                <div className="absolute -top-10 z-20 animate-bounce pointer-events-none">
                  <div className="bg-slate-950 border border-cyan-400 text-cyan-400 font-extrabold text-[11px] uppercase tracking-widest px-3 py-1 rounded-lg shadow-lg shadow-cyan-500/30 flex items-center gap-1">
                    <span>START</span>
                    <div className="absolute left-1/2 -bottom-1.5 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-6 border-l-transparent border-r-transparent border-t-cyan-400" />
                  </div>
                </div>
              )}

              {/* 3D Isometric SVG Hexagon Button */}
              <div className={`transition-transform duration-200 group-hover:scale-110 ${isInspected ? 'scale-110 drop-shadow-[0_0_15px_rgba(56,189,248,0.4)]' : ''}`}>
                <svg width="84" height="96" viewBox="0 0 84 96" className="drop-shadow-2xl overflow-visible">
                  <defs>
                    <linearGradient id="hexGradLocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#334155" />
                      <stop offset="100%" stopColor="#1e293b" />
                    </linearGradient>
                    <linearGradient id="hexGradActive" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#0284c7" />
                    </linearGradient>
                    <linearGradient id="hexGradDone" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" />
                      <stop offset="100%" stopColor="#059669" />
                    </linearGradient>
                    <linearGradient id="hexGradUnlocked" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#6366f1" />
                      <stop offset="100%" stopColor="#4338ca" />
                    </linearGradient>
                  </defs>

                  {/* 3D Left Extruded Wall Shadow */}
                  <polygon points="8,54 8,68 42,88 42,74" fill={leftWallFill} />

                  {/* 3D Right Extruded Wall Shadow */}
                  <polygon points="42,74 42,88 76,68 76,54" fill={rightWallFill} />

                  {/* Top Hexagon Face */}
                  <polygon
                    points="42,4 76,23 76,54 42,74 8,54 8,23"
                    fill={topFill}
                    stroke={topStroke}
                    strokeWidth={isInspected ? '3.5' : '2'}
                  />

                  {/* Inner Highlight Outline when inspected */}
                  {isInspected && (
                    <polygon
                      points="42,9 71,25 71,51 42,67 13,51 13,25"
                      fill="none"
                      stroke="#ffffff"
                      strokeWidth="1.5"
                      strokeDasharray="4 2"
                      opacity="0.8"
                    />
                  )}

                  {/* Icon in Center of Top Face */}
                  <g transform="translate(42, 39)">
                    {isDone ? (
                      <path
                        d="M-7,-1 L-2,4 L7,-5"
                        fill="none"
                        stroke="#ffffff"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    ) : isLocked ? (
                      <g transform="translate(-7, -9)" fill="none" stroke="#94a3b8" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="6" width="12" height="9" rx="2" />
                        <path d="M4 6V4a3 3 0 0 1 6 0v2" />
                      </g>
                    ) : idx === 0 ? (
                      <g transform="translate(-9, -9)" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M9 15h0;M9 12a5 5 0 1 0-5-5c0 1.5.8 2.8 2 3.5v1.5h6z" />
                        <circle cx="9" cy="7" r="4" />
                      </g>
                    ) : (
                      <g transform="translate(-9, -9)" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 4.5a2.5 2.5 0 0 0-4.96-.46 2.5 2.5 0 0 0-1.98 3 2.5 2.5 0 0 0-1.32 4.24 3 3 0 0 0 .34 3.58 2.5 2.5 0 0 0 2.96 1.08 2.5 2.5 0 0 0 3.96 1.06 2.5 2.5 0 0 0 3.96-1.06 2.5 2.5 0 0 0 2.96-1.08 3 3 0 0 0 .34-3.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 12 4.5z" />
                      </g>
                    )}
                  </g>
                </svg>
              </div>
            </div>
          );
        })}
      </div>

      {/* Floating Popover Inspector Card */}
      {activeInspectedNode && (
        <div className="w-full max-w-sm mt-6 mx-auto bg-[#181d24] border border-[#2d3748] rounded-2xl p-5 shadow-2xl backdrop-blur-md text-white animate-fadeIn space-y-3 text-center">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-[11px] uppercase tracking-wider font-extrabold text-cyan-400">
              {activeInspectedNode.type || `Skill Node ${activeInspectedNode.index + 1}`}
            </span>
            <span className="text-xs bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2.5 py-0.5 rounded-full font-mono font-bold">
              +50 XP
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-slate-100">
              {activeInspectedNode.title || activeInspectedNode.concept || `Node ${activeInspectedNode.index + 1}`}
            </h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {activeInspectedNode.isLocked
                ? 'Complete the lesson above to unlock this!'
                : activeInspectedNode.isDone
                ? '🎉 You have mastered this concept node! Review or retake the practice quiz anytime.'
                : activeInspectedNode.description || 'Complete the practice quiz to reinforce concept mastery.'}
            </p>
          </div>

          {/* Dynamic Action Button */}
          <div className="pt-2">
            {activeInspectedNode.isLocked ? (
              <button
                disabled
                className="w-full bg-[#2a323d] text-slate-500 font-extrabold uppercase tracking-wider py-3 rounded-xl text-xs border border-[#3b4554] cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Lock size={14} /> LOCKED
              </button>
            ) : activeInspectedNode.isDone ? (
              <button
                type="button"
                onClick={() => onSelectNode && onSelectNode(activeInspectedNode)}
                className="w-full bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-extrabold uppercase tracking-wider py-3 rounded-xl text-xs border border-emerald-500/40 transition-colors flex items-center justify-center gap-2"
              >
                <Check size={16} /> REVIEW COMPLETED NODE (+50 XP)
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onSelectNode && onSelectNode(activeInspectedNode)}
                className="w-full bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-extrabold uppercase tracking-wider py-3 rounded-xl text-xs shadow-lg shadow-cyan-500/20 border border-cyan-400/30 transition-all transform hover:scale-[1.02] flex items-center justify-center gap-2"
              >
                <Sparkles size={14} /> START PRACTICE (+50 XP)
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
