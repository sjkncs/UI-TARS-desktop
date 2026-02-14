/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowUp,
  ImagePlus,
  X,
  Loader2,
  RotateCcw,
  Bot,
  User,
  ArrowRight,
  Sparkles,
  Brain,
  CodeXml,
  Image,
  Languages,
  Pen,
  ScreenShare,
  FileUp,
  Globe,
  MoreHorizontal,
  Upload,
  Check,
  Telescope,
  Terminal,
  Presentation,
  GraduationCap,
} from 'lucide-react';
import { useLocation } from 'react-router';
import { ScrollArea } from '@renderer/components/ui/scroll-area';
import { useI18n } from '@renderer/i18n/useI18n';
import { api } from '@renderer/api';
import { Markdown } from '@renderer/components/markdown';
import { MODES, DEFAULT_SUGGESTIONS } from './mode-config';
import { MessageActionBar } from './message-actions';
import { sessionManager } from '@renderer/db/session';
import { useSessionStore } from '@renderer/store/session';
import { Operator } from '@main/store/types';

import logoFull from '@resources/logo-full.png?url';

const ipc = window.electron?.ipcRenderer;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  imageBase64?: string;
  imageName?: string;
  timestamp: number;
}

const CHAT_STORAGE_PREFIX = 'ui-tars-chat-';
const CHAT_CURRENT_SESSION = 'ui-tars-chat-current-session';

const loadSessionMessages = (sessionId: string): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(CHAT_STORAGE_PREFIX + sessionId);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
};

const saveSessionMessages = (sessionId: string, msgs: ChatMessage[]) => {
  try {
    // Strip imageBase64 to avoid exceeding localStorage quota (~5-10MB)
    const lite = msgs.map(({ imageBase64, ...rest }) => rest);
    localStorage.setItem(CHAT_STORAGE_PREFIX + sessionId, JSON.stringify(lite));
  } catch { /* quota exceeded */ }
};

const removeSessionMessages = (sessionId: string) => {
  localStorage.removeItem(CHAT_STORAGE_PREFIX + sessionId);
};

const ChatPage = () => {
  const { t, lang } = useI18n();
  const location = useLocation();
  const fetchSessions = useSessionStore((s) => s.fetchSessions);

  // Determine session ID: from history navigation or create new
  const initialSessionId = useMemo(() => {
    const navState = location.state as { sessionId?: string; newChat?: boolean } | null;
    if (navState?.newChat) return '';
    if (navState?.sessionId) return navState.sessionId;
    const saved = localStorage.getItem(CHAT_CURRENT_SESSION);
    return saved || '';
  }, []);

  const [chatSessionId, setChatSessionId] = useState(initialSessionId);
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    initialSessionId ? loadSessionMessages(initialSessionId) : [],
  );
  const [inputText, setInputText] = useState('');
  const [pendingImage, setPendingImage] = useState<{
    base64: string;
    name: string;
    preview: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [activeMode, setActiveMode] = useState<string | null>(null);
  const [pendingDoc, setPendingDoc] = useState<{ base64: string; name: string } | null>(null);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<string | null>(null);
  const [webSearchMode, setWebSearchMode] = useState<'auto' | 'on' | 'off'>('auto');
  const [showWebSearchMenu, setShowWebSearchMenu] = useState(false);
  const [showMoreModes, setShowMoreModes] = useState(false);

  // Mode-aware computed values
  const currentMode = activeMode ? MODES[activeMode] : null;
  const subCategories = currentMode?.subCategories || [];
  const activeSubKey = activeSubTab || subCategories[0]?.key || null;
  const activeSubCategory = subCategories.find((s) => s.key === activeSubKey) || subCategories[0] || null;
  const templates = activeSubCategory?.templates || [];
  const heroTitle = currentMode
    ? currentMode.hero[lang].title
    : 'UI-TARS';
  const heroSubtitle = currentMode
    ? currentMode.hero[lang].subtitle
    : t('chat.heroSubtitle');
  const currentPlaceholder = currentMode
    ? currentMode.placeholder[lang]
    : t('chat.inputPlaceholder');

  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const attachRef = useRef<HTMLDivElement>(null);
  const webSearchRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLDivElement>(null);

  const hasMessages = messages.length > 0 || isLoading;

  // Handle newChat navigation (e.g. Ctrl+Shift+N) while already on /chat
  // Current session is already persisted — just detach and start fresh
  useEffect(() => {
    const navState = location.state as { newChat?: boolean; sessionId?: string } | null;
    if (navState?.newChat && chatSessionId) {
      setChatSessionId('');
      setMessages([]);
      setStreamingContent('');
      localStorage.removeItem(CHAT_CURRENT_SESSION);
    }
    if (navState?.sessionId && navState.sessionId !== chatSessionId) {
      setChatSessionId(navState.sessionId);
      setMessages(loadSessionMessages(navState.sessionId));
      localStorage.setItem(CHAT_CURRENT_SESSION, navState.sessionId);
    }
  }, [location.key]); // location.key changes on every navigation

  // Auto-scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 50);
  }, [messages, streamingContent]);

  // Listen for streaming chunks
  useEffect(() => {
    const unsub = ipc?.on('system:chatCompletion:chunk' as never, ((_event: unknown, data: { delta: string; accumulated: string }) => {
      setStreamingContent(data.accumulated);
    }) as never);

    return () => {
      if (unsub) (unsub as () => void)();
    };
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px';
    }
  }, [inputText]);

  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setPendingImage({
        base64,
        name: file.name,
        preview: result,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const handleDocUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setPendingDoc({ base64, name: file.name });
    };
    reader.readAsDataURL(file);
    if (docInputRef.current) docInputRef.current.value = '';
    setShowAttachMenu(false);
  }, []);

  // Close dropdown menus on outside click
  useEffect(() => {
    if (!showAttachMenu && !showWebSearchMenu && !showMoreModes) return;
    const handler = (e: MouseEvent) => {
      if (showAttachMenu && attachRef.current && !attachRef.current.contains(e.target as Node)) {
        setShowAttachMenu(false);
      }
      if (showWebSearchMenu && webSearchRef.current && !webSearchRef.current.contains(e.target as Node)) {
        setShowWebSearchMenu(false);
      }
      if (showMoreModes && moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setShowMoreModes(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showAttachMenu, showWebSearchMenu, showMoreModes]);

  // Create a session on first user message so it appears in sidebar history
  const ensureSession = useCallback(async (firstUserText: string) => {
    if (chatSessionId) return chatSessionId;
    const name = firstUserText.length > 30 ? firstUserText.slice(0, 30) + '...' : firstUserText;
    const session = await sessionManager.createSession(name, { operator: Operator.Chat });
    const newId = session.id;
    setChatSessionId(newId);
    localStorage.setItem(CHAT_CURRENT_SESSION, newId);
    fetchSessions();
    return newId;
  }, [chatSessionId, fetchSessions]);

  const doSend = useCallback(async (
    text: string,
    image?: { base64: string; name: string } | null,
    doc?: { base64: string; name: string } | null,
  ) => {
    if (!text.trim() && !image && !doc) return;
    if (isLoading) return;

    const userContent = text.trim()
      || (doc ? `${t('chat.docUploaded')} ${doc.name}` : '')
      || (image ? t('chat.imageUploaded') : '');

    // Ensure a session exists for this conversation
    await ensureSession(userContent);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userContent,
      imageBase64: image?.base64,
      imageName: image?.name || doc?.name,
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputText('');
    setPendingImage(null);
    setPendingDoc(null);
    setIsLoading(true);
    setStreamingContent('');

    try {
      let result: { success: boolean; result?: string; error?: string };

      if (doc) {
        // Document analysis via dedicated route
        const docResult = await api['system:analyzeDocument']({
          fileBase64: doc.base64,
          fileName: doc.name,
          question: text.trim() || `Please analyze and summarize this document: ${doc.name}`,
          stream: true,
        }) as { success: boolean; result?: string; error?: string; fallbackToVLM?: boolean };

        // If text extraction fails, try VLM fallback with the doc as image
        if (!docResult.success && docResult.fallbackToVLM) {
          result = await api['system:chatCompletion']({
            messages: [{
              role: 'user',
              content: text.trim() || `Please analyze this document: ${doc.name}`,
              imageBase64: doc.base64,
            }],
            stream: true,
          });
        } else {
          result = docResult;
        }
      } else {
        // Normal chat completion (text + optional image)
        const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; imageBase64?: string }> = [];

        // Inject system prompt from active mode
        if (currentMode) {
          apiMessages.push({
            role: 'system',
            content: currentMode.systemPrompt[lang],
          });
        }

        apiMessages.push(...newMessages.map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
          imageBase64: msg.imageBase64,
        })));

        result = await api['system:chatCompletion']({
          messages: apiMessages,
          stream: true,
        });
      }

      if (result.success && result.result) {
        const finalContent = result.result;
        setMessages((prev) => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: finalContent,
          timestamp: Date.now(),
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `${result.error || 'Unknown error'}`,
          timestamp: Date.now(),
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `${err instanceof Error ? err.message : 'Request failed'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [messages, isLoading, t, currentMode, lang, ensureSession]);

  const handleSend = useCallback(() => {
    doSend(inputText, pendingImage, pendingDoc);
  }, [inputText, pendingImage, pendingDoc, doSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    if (chatSessionId && messages.length > 0) {
      saveSessionMessages(chatSessionId, messages);
    }
  }, [messages, chatSessionId]);

  const handleClear = useCallback(() => {
    if (chatSessionId) {
      removeSessionMessages(chatSessionId);
    }
    setMessages([]);
    setStreamingContent('');
    setChatSessionId('');
    localStorage.removeItem(CHAT_CURRENT_SESSION);
  }, [chatSessionId]);

  const handleRegenerate = useCallback(async () => {
    if (isLoading) return;

    // Find the last user message
    const lastUserIdx = [...messages].map((m) => m.role).lastIndexOf('user');
    if (lastUserIdx < 0) return;

    // Keep messages up to and including the last user message, drop any trailing assistant messages
    const keptMessages = messages.slice(0, lastUserIdx + 1);
    setMessages(keptMessages);
    setIsLoading(true);
    setStreamingContent('');

    try {
      const apiMessages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; imageBase64?: string }> = [];

      if (currentMode) {
        apiMessages.push({ role: 'system', content: currentMode.systemPrompt[lang] });
      }

      apiMessages.push(...keptMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        imageBase64: msg.imageBase64,
      })));

      const result = await api['system:chatCompletion']({
        messages: apiMessages,
        stream: true,
      });

      if (result.success && result.result) {
        setMessages((prev) => [...prev, {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          content: result.result!,
          timestamp: Date.now(),
        }]);
      } else {
        setMessages((prev) => [...prev, {
          id: `error-${Date.now()}`,
          role: 'assistant',
          content: `${(result as any).error || 'Unknown error'}`,
          timestamp: Date.now(),
        }]);
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `${err instanceof Error ? err.message : 'Request failed'}`,
        timestamp: Date.now(),
      }]);
    } finally {
      setIsLoading(false);
      setStreamingContent('');
    }
  }, [messages, isLoading, currentMode, lang]);

  const handleDeleteMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const handleTemplateClick = useCallback((prompt: string) => {
    doSend(prompt, null);
  }, [doSend]);

  const handleModeSwitch = useCallback((modeKey: string) => {
    if (activeMode === modeKey) {
      setActiveMode(null);
      setActiveSubTab(null);
    } else {
      setActiveMode(modeKey);
      setActiveSubTab(null);
    }
  }, [activeMode]);

  /* ================================================================ */
  /*  Input box — shared between empty state and conversation mode     */
  /* ================================================================ */
  const renderInputBox = (isHero?: boolean) => (
    <div className={`w-full ${isHero ? 'max-w-2xl' : 'max-w-3xl'} mx-auto`}>
      {/* Pending attachment preview */}
      {(pendingImage || pendingDoc) && (
        <div className="mb-2 ml-1 flex flex-wrap gap-2">
          {pendingImage && (
            <div className="inline-flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-200/60 dark:border-gray-700/60">
              <img src={pendingImage.preview} alt="preview" className="w-12 h-12 rounded-lg object-cover" />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-36">{pendingImage.name}</span>
                <span className="text-[10px] text-gray-400">{t('chat.imageUploaded')}</span>
              </div>
              <button title="Remove image" onClick={() => setPendingImage(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
          {pendingDoc && (
            <div className="inline-flex items-center gap-2.5 bg-gray-50 dark:bg-gray-800/60 rounded-xl px-3 py-2 border border-gray-200/60 dark:border-gray-700/60">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <FileUp className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate max-w-36">{pendingDoc.name}</span>
                <span className="text-[10px] text-gray-400">{t('chat.docUploaded')}</span>
              </div>
              <button title="Remove document" onClick={() => setPendingDoc(null)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/bmp" className="hidden" onChange={handleImageUpload} aria-label="Upload image" />
      <input ref={docInputRef} type="file" accept=".pdf,.txt,.md,.doc,.docx,.csv,.json,.xml,.html,.htm,.log,.rtf" className="hidden" onChange={handleDocUpload} aria-label="Upload document" />

      {/* Unified input container */}
      <div
        className={`
          relative rounded-2xl border border-gray-200 dark:border-gray-700
          bg-white dark:bg-gray-900
          shadow-sm hover:shadow-md focus-within:shadow-md
          transition-shadow duration-200
          ${isHero ? 'shadow-lg hover:shadow-xl focus-within:shadow-xl' : ''}
        `}
      >
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentPlaceholder}
          disabled={isLoading}
          rows={1}
          className="w-full resize-none bg-transparent px-5 pt-4 pb-1 text-sm leading-relaxed placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none disabled:opacity-50"
          style={{ maxHeight: '140px', minHeight: '24px' }}
        />

        {/* Toolbar row */}
        <div className="flex items-center justify-between px-3 pb-3 pt-1">
          {/* Left: primary mode pills + "更多" dropdown */}
          <div className="flex items-center gap-1 flex-wrap">
            {/* Primary mode pills — inline */}
            {([
              { key: 'assistant', icon: Sparkles, label: t('chat.mode.assistant') },
              { key: 'think', icon: Brain, label: t('chat.mode.think') },
              { key: 'research', icon: Telescope, label: t('chat.mode.research') },
              { key: 'code', icon: CodeXml, label: t('chat.mode.code') },
              { key: 'image', icon: Image, label: t('chat.image') },
            ] as const).map((mode) => {
              const Icon = mode.icon;
              const isActive = activeMode === mode.key;
              return (
                <button
                  key={mode.key}
                  onClick={() => handleModeSwitch(mode.key)}
                  disabled={isLoading}
                  className={`
                    flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-150 border
                    ${isActive
                      ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                      : 'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                    }
                    disabled:opacity-40
                  `}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{mode.label}</span>
                  {isActive && (
                    <X className="w-3 h-3 ml-0.5 opacity-60" onClick={(e) => { e.stopPropagation(); handleModeSwitch(mode.key); }} />
                  )}
                </button>
              );
            })}

            {/* 更多 (More) — dropdown for secondary modes */}
            <div ref={moreRef} className="relative">
              <button
                onClick={() => setShowMoreModes(!showMoreModes)}
                disabled={isLoading}
                className={`
                  flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all duration-150 border
                  ${(['translate', 'write', 'command', 'ppt', 'kids'].includes(activeMode || ''))
                    ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                    : 'text-gray-500 dark:text-gray-400 border-transparent hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200'
                  }
                  disabled:opacity-40
                `}
              >
                <MoreHorizontal className="w-3.5 h-3.5" />
                <span>
                  {(['translate', 'write', 'command', 'ppt', 'kids'].includes(activeMode || ''))
                    ? currentMode!.hero[lang].title
                    : t('chat.more')
                  }
                </span>
                {(['translate', 'write', 'command', 'ppt', 'kids'].includes(activeMode || '')) && (
                  <X className="w-3 h-3 ml-0.5 opacity-60" onClick={(e) => { e.stopPropagation(); handleModeSwitch(activeMode!); }} />
                )}
              </button>

              {showMoreModes && (
                <div className="absolute bottom-full left-0 mb-2 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {([
                    { key: 'translate', icon: Languages, label: t('chat.mode.translate') },
                    { key: 'write', icon: Pen, label: t('chat.mode.write') },
                    { key: 'ppt', icon: Presentation, label: t('chat.mode.ppt') },
                    { key: 'kids', icon: GraduationCap, label: t('chat.mode.kids') },
                    { key: 'command', icon: Terminal, label: t('chat.mode.command') },
                  ] as const).map((mode) => {
                    const MIcon = mode.icon;
                    const isActive = activeMode === mode.key;
                    return (
                      <button
                        key={mode.key}
                        onClick={() => { handleModeSwitch(mode.key); setShowMoreModes(false); }}
                        className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                          isActive
                            ? 'text-primary bg-primary/5 font-medium'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <MIcon className="w-4 h-4" />
                        <span className="flex-1 text-left">{mode.label}</span>
                        {isActive && <Check className="w-3.5 h-3.5 text-primary" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: 联网 + 上传 + 发送 */}
          <div className="flex items-center gap-1.5">
            {/* 联网 (Web Search) */}
            <div ref={webSearchRef} className="relative">
              <button
                title="Web search"
                onClick={() => setShowWebSearchMenu(!showWebSearchMenu)}
                disabled={isLoading}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                  webSearchMode !== 'off'
                    ? 'text-primary hover:bg-primary/10'
                    : 'text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <Globe className="w-4 h-4" />
              </button>

              {showWebSearchMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-48 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  {([
                    { key: 'auto' as const, label: t('chat.webSearch.auto') },
                    { key: 'on' as const, label: t('chat.webSearch.on') },
                    { key: 'off' as const, label: t('chat.webSearch.off') },
                  ]).map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setWebSearchMode(opt.key); setShowWebSearchMenu(false); }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-sm transition-colors ${
                        webSearchMode === opt.key
                          ? 'text-primary font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                      }`}
                    >
                      <Globe className="w-4 h-4" />
                      <span className="flex-1 text-left">{opt.label}</span>
                      {webSearchMode === opt.key && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 上传 (Upload) — triggers attach menu */}
            <div ref={attachRef} className="relative">
              <button
                title="Upload"
                onClick={() => setShowAttachMenu(!showAttachMenu)}
                disabled={isLoading}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-40"
              >
                <Upload className="w-4 h-4" />
              </button>

              {showAttachMenu && (
                <div className="absolute bottom-full right-0 mb-2 w-44 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                  <button
                    onClick={() => { docInputRef.current?.click(); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <FileUp className="w-4 h-4 text-blue-500" />
                    {t('chat.attach.doc')}
                  </button>
                  <button
                    onClick={() => { fileInputRef.current?.click(); setShowAttachMenu(false); }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ImagePlus className="w-4 h-4 text-green-500" />
                    {t('chat.attach.image')}
                  </button>
                  <button
                    onClick={() => { setShowAttachMenu(false); /* screenshot: future */ }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    <ScreenShare className="w-4 h-4 text-purple-500" />
                    {t('chat.attach.screenshot')}
                  </button>
                </div>
              )}
            </div>

            {/* Send button */}
            <button
              onClick={handleSend}
              disabled={isLoading || (!inputText.trim() && !pendingImage && !pendingDoc)}
              className={`
                w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200
                ${(inputText.trim() || pendingImage || pendingDoc) && !isLoading
                  ? 'bg-primary text-primary-foreground shadow-sm hover:shadow-md scale-100'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500 scale-95'
                }
                disabled:cursor-not-allowed
              `}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowUp className="w-4 h-4" strokeWidth={2.5} />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  /* ================================================================ */
  /*  Empty / Hero state                                               */
  /* ================================================================ */
  if (!hasMessages) {
    return (
      <div className="flex flex-col h-full w-full bg-background">
        {/* Top bar — only new chat clear button when needed */}
        <div className="h-12 shrink-0" />

        {/* Hero area — vertically centered */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 pb-8">
          {/* Brand / Mode hero */}
          <div className="mb-10 flex flex-col items-center">
            {currentMode ? (
              <>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <currentMode.icon className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">{heroTitle}</h2>
                <p className="text-sm text-gray-400 dark:text-gray-500">{heroSubtitle}</p>
              </>
            ) : (
              <>
                <img src={logoFull} alt="UI-TARS" className="h-10 mb-3 opacity-80" />
                <p className="text-sm text-gray-400 dark:text-gray-500">{heroSubtitle}</p>
              </>
            )}
          </div>

          {/* Sub-tab bar (when mode is active) */}
          {currentMode && subCategories.length > 0 && (
            <div className="flex items-center gap-4 mb-6">
              {subCategories.map((sub) => (
                <button
                  key={sub.key}
                  onClick={() => setActiveSubTab(sub.key)}
                  className={`text-sm pb-1.5 transition-all duration-150 border-b-2 ${
                    activeSubKey === sub.key
                      ? 'text-gray-900 dark:text-gray-100 border-primary font-medium'
                      : 'text-gray-400 dark:text-gray-500 border-transparent hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  {sub.label[lang]}
                </button>
              ))}
            </div>
          )}

          {/* Template cards — 3-col grid when mode active, 2-col for default */}
          {currentMode ? (
            <div className="grid grid-cols-3 gap-3 w-full max-w-3xl mb-8">
              {templates.map((tpl, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateClick(tpl.prompt[lang])}
                  className="group flex flex-col gap-2 p-4 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 hover:border-primary/40 hover:shadow-md transition-all duration-200 text-left min-h-[72px]"
                >
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{tpl.title[lang]}</span>
                  <span className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2">{tpl.prompt[lang]}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 w-full max-w-2xl mb-8">
              {DEFAULT_SUGGESTIONS.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleTemplateClick(s.prompt[lang])}
                  className="group flex items-center gap-3 px-4 py-3.5 rounded-xl border border-gray-200/80 dark:border-gray-700/80 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-sm transition-all duration-200 text-left"
                >
                  <span className="text-sm text-gray-600 dark:text-gray-300 flex-1 line-clamp-1">{s.title[lang]}</span>
                  <ArrowRight className="w-4 h-4 text-gray-300 dark:text-gray-600 group-hover:text-gray-400 shrink-0 transition-colors" />
                </button>
              ))}
            </div>
          )}

          {/* Input box */}
          {renderInputBox(true)}

          {/* Hint */}
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-4">
            {t('chat.supportImage')}
          </p>
        </div>
      </div>
    );
  }

  /* ================================================================ */
  /*  Conversation mode                                                */
  /* ================================================================ */
  return (
    <div className="flex flex-col h-full w-full bg-background">
      {/* Header bar */}
      <div className="flex items-center justify-between px-5 h-12 shrink-0 border-b border-gray-100 dark:border-gray-800">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
          {t('chat.title')}
        </span>
        <button
          onClick={handleClear}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          {t('chat.clear')}
        </button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="max-w-3xl mx-auto px-5 py-6 space-y-6">
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3.5">
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-primary/10 text-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {msg.role === 'user' ? (
                  <User className="w-4 h-4" />
                ) : (
                  <Bot className="w-4 h-4" />
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">
                  {msg.role === 'user' ? 'You' : 'UI-TARS'}
                </div>
                {msg.imageBase64 && (
                  <img
                    src={`data:image/png;base64,${msg.imageBase64}`}
                    alt={msg.imageName || 'uploaded'}
                    className="max-w-xs max-h-52 rounded-xl mb-2 object-contain border border-gray-100 dark:border-gray-800"
                  />
                )}
                {msg.role === 'assistant' ? (
                  <>
                    <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-4 prose-headings:mb-2 prose-pre:my-2 prose-ul:my-1.5 prose-ol:my-1.5">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    <MessageActionBar
                      content={msg.content}
                      messageId={msg.id}
                      onRegenerate={handleRegenerate}
                      onDelete={handleDeleteMessage}
                    />
                  </>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}

          {/* Streaming / Loading */}
          {isLoading && (
            <div className="flex gap-3.5">
              <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                <Bot className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0 pt-1">
                <div className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-1.5">UI-TARS</div>
                {streamingContent ? (
                  <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5">
                    <Markdown>{streamingContent}</Markdown>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-2">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-400">{t('chat.thinking')}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Bottom input */}
      <div className="px-5 py-4 shrink-0">
        {renderInputBox()}
      </div>
    </div>
  );
};

export default ChatPage;
