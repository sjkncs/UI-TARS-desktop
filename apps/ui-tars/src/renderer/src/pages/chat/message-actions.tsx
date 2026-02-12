/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useRef, useEffect } from 'react';
import {
  Copy,
  ThumbsUp,
  ThumbsDown,
  Share2,
  RefreshCw,
  FileEdit,
  MoreHorizontal,
  Trash2,
  Flag,
  Check,
  ChevronUp,
  FileText,
} from 'lucide-react';

interface MessageActionBarProps {
  content: string;
  messageId: string;
  onRegenerate?: () => void;
  onDelete?: (id: string) => void;
}

const REACTIONS_KEY = 'ui-tars-msg-reactions';

function loadReactions(): Record<string, 'up' | 'down'> {
  try {
    const raw = localStorage.getItem(REACTIONS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveReaction(id: string, vote: 'up' | 'down' | null) {
  const all = loadReactions();
  if (vote) {
    all[id] = vote;
  } else {
    delete all[id];
  }
  try { localStorage.setItem(REACTIONS_KEY, JSON.stringify(all)); } catch { /* ignore */ }
}

export function MessageActionBar({ content, messageId, onRegenerate, onDelete }: MessageActionBarProps) {
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reaction, setReaction] = useState<'up' | 'down' | null>(() => loadReactions()[messageId] || null);
  const [reported, setReported] = useState(false);

  const copyRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    if (!showCopyMenu && !showMoreMenu) return;
    const handler = (e: MouseEvent) => {
      if (showCopyMenu && copyRef.current && !copyRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
      if (showMoreMenu && moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showCopyMenu, showMoreMenu]);

  const doCopy = async (asMarkdown: boolean) => {
    try {
      if (asMarkdown) {
        await navigator.clipboard.writeText(content);
      } else {
        // Strip markdown for plain text
        const plain = content
          .replace(/#{1,6}\s/g, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/`{1,3}[^`]*`{1,3}/g, (m) => m.replace(/`/g, ''))
          .replace(/\[(.+?)\]\(.+?\)/g, '$1')
          .replace(/^[-*+]\s/gm, '• ')
          .replace(/^\d+\.\s/gm, '')
          .trim();
        await navigator.clipboard.writeText(plain);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard failed */ }
    setShowCopyMenu(false);
  };

  const handleReaction = (vote: 'up' | 'down') => {
    const newVal = reaction === vote ? null : vote;
    setReaction(newVal);
    saveReaction(messageId, newVal);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ text: content });
      } else {
        await navigator.clipboard.writeText(content);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }
    } catch { /* user cancelled or not supported */ }
  };

  const handleEditDoc = () => {
    // Open content in a new window for editing
    const win = window.open('', '_blank', 'width=800,height=600');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
        <html><head><title>Document Editor</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 24px; }
          #editor { width: 100%; min-height: calc(100vh - 100px); border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; font-size: 14px; line-height: 1.7; outline: none; white-space: pre-wrap; }
          .toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
          .toolbar button { padding: 6px 14px; border: 1px solid #d1d5db; border-radius: 6px; background: #fff; cursor: pointer; font-size: 13px; }
          .toolbar button:hover { background: #f3f4f6; }
        </style></head><body>
        <div class="toolbar">
          <button onclick="document.execCommand('bold')"><b>B</b></button>
          <button onclick="document.execCommand('italic')"><i>I</i></button>
          <button onclick="document.execCommand('underline')"><u>U</u></button>
          <button onclick="navigator.clipboard.writeText(document.getElementById('editor').innerText)">Copy All</button>
        </div>
        <div id="editor" contenteditable="true">${content.replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>')}</div>
        </body></html>
      `);
      win.document.close();
    }
  };

  const handleReport = () => {
    setReported(true);
    setShowMoreMenu(false);
    setTimeout(() => setReported(false), 3000);
  };

  const btnClass =
    'w-7 h-7 rounded-md flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors';
  const activeBtnClass =
    'w-7 h-7 rounded-md flex items-center justify-center text-primary bg-primary/10 transition-colors';

  return (
    <div className="flex items-center gap-0.5 mt-2 -ml-1">
      {/* Copy — with dropdown */}
      <div ref={copyRef} className="relative">
        <button
          onClick={() => setShowCopyMenu(!showCopyMenu)}
          className={copied ? activeBtnClass : btnClass}
          title="Copy"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {showCopyMenu && (
          <div className="absolute bottom-full left-0 mb-1 w-40 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-1 duration-100">
            <button
              onClick={() => doCopy(true)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <FileText className="w-3.5 h-3.5" />
              Copy as Markdown
            </button>
            <button
              onClick={() => doCopy(false)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copy
            </button>
          </div>
        )}
      </div>

      {/* Collapse / Expand — placeholder for future */}
      <button className={btnClass} title="Collapse" onClick={() => { /* future: collapse message */ }}>
        <ChevronUp className="w-3.5 h-3.5" />
      </button>

      {/* Thumbs Up */}
      <button
        className={reaction === 'up' ? activeBtnClass : btnClass}
        onClick={() => handleReaction('up')}
        title="Like"
      >
        <ThumbsUp className="w-3.5 h-3.5" />
      </button>

      {/* Thumbs Down */}
      <button
        className={reaction === 'down' ? activeBtnClass : btnClass}
        onClick={() => handleReaction('down')}
        title="Dislike"
      >
        <ThumbsDown className="w-3.5 h-3.5" />
      </button>

      {/* Regenerate */}
      {onRegenerate && (
        <button className={btnClass} onClick={onRegenerate} title="Regenerate">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Edit as Document */}
      <button className={btnClass} onClick={handleEditDoc} title="Edit as Document">
        <FileEdit className="w-3.5 h-3.5" />
      </button>

      {/* Share */}
      <button className={btnClass} onClick={handleShare} title="Share">
        <Share2 className="w-3.5 h-3.5" />
      </button>

      {/* More — dropdown */}
      <div ref={moreRef} className="relative">
        <button
          onClick={() => setShowMoreMenu(!showMoreMenu)}
          className={btnClass}
          title="More"
        >
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
        {showMoreMenu && (
          <div className="absolute bottom-full left-0 mb-1 w-32 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1 z-50 animate-in fade-in slide-in-from-bottom-1 duration-100">
            {onDelete && (
              <button
                onClick={() => { onDelete(messageId); setShowMoreMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            )}
            <button
              onClick={handleReport}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <Flag className="w-3.5 h-3.5" />
              {reported ? 'Reported' : 'Report'}
            </button>
          </div>
        )}
      </div>

      {/* Reported toast */}
      {reported && (
        <span className="ml-2 text-[11px] text-green-600 dark:text-green-400 animate-in fade-in duration-200">
          Reported, thank you!
        </span>
      )}
    </div>
  );
}
