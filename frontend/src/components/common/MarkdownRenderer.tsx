import React from 'react';

interface Props {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: Props) {
  if (!content) return null;

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];
  let listType: 'ul' | 'ol' = 'ul';

  const flushList = () => {
    if (listItems.length > 0) {
      if (listType === 'ul') {
        elements.push(
          <ul key={`ul-${elements.length}`} className="list-disc list-inside my-2 space-y-1 text-slate-300">
            {listItems}
          </ul>
        );
      } else {
        elements.push(
          <ol key={`ol-${elements.length}`} className="list-decimal list-inside my-2 space-y-1 text-slate-300">
            {listItems}
          </ol>
        );
      }
      listItems = [];
      inList = false;
    }
  };

  const renderFormattedText = (text: string): React.ReactNode => {
    // Remove stray * or # symbols and convert **bold** / *italic*
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`)/g);

    return parts.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
        return <em key={idx} className="italic text-slate-200">{part.slice(1, -1)}</em>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="bg-base-800 text-indigo-300 px-1.5 py-0.5 rounded font-mono text-[11px]">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Horizontal Rule
    if (trimmed === '---' || trimmed === '***') {
      flushList();
      elements.push(<hr key={index} className="border-base-700 my-4" />);
      return;
    }

    // Headings
    if (trimmed.startsWith('# ')) {
      flushList();
      elements.push(
        <h1 key={index} className="text-lg font-bold text-white mt-4 mb-2 pb-1 border-b border-base-700 flex items-center gap-2">
          {renderFormattedText(trimmed.slice(2))}
        </h1>
      );
      return;
    }

    if (trimmed.startsWith('## ')) {
      flushList();
      elements.push(
        <h2 key={index} className="text-base font-semibold text-indigo-300 mt-4 mb-2 flex items-center gap-2">
          {renderFormattedText(trimmed.slice(3))}
        </h2>
      );
      return;
    }

    if (trimmed.startsWith('### ')) {
      flushList();
      elements.push(
        <h3 key={index} className="text-sm font-semibold text-indigo-400 mt-3 mb-1">
          {renderFormattedText(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    // Bullet List (- or * or •)
    const unorderedMatch = trimmed.match(/^[-*•]\s+(.*)/);
    if (unorderedMatch) {
      if (!inList || listType !== 'ul') {
        flushList();
        inList = true;
        listType = 'ul';
      }
      listItems.push(
        <li key={index} className="leading-relaxed">
          {renderFormattedText(unorderedMatch[1])}
        </li>
      );
      return;
    }

    // Numbered List (1. 2. 3.)
    const orderedMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (orderedMatch) {
      if (!inList || listType !== 'ol') {
        flushList();
        inList = true;
        listType = 'ol';
      }
      listItems.push(
        <li key={index} className="leading-relaxed">
          {renderFormattedText(orderedMatch[2])}
        </li>
      );
      return;
    }

    // Regular Paragraph
    flushList();
    elements.push(
      <p key={index} className="my-1.5 leading-relaxed text-slate-300">
        {renderFormattedText(trimmed)}
      </p>
    );
  });

  flushList();

  return <div className={`space-y-1 ${className}`}>{elements}</div>;
}
