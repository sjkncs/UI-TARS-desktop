/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router';
import {
  Eye,
  Car,
  Factory,
  FileSearch,
  Compass,
  ArrowLeft,
  Upload,
  FileText,
  Search,
  Send,
  Paintbrush,
  Code2,
  Languages,
  Dumbbell,
  Scale,
  GraduationCap,
  FileSpreadsheet,
  Presentation,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { Markdown } from '@renderer/components/markdown';
import { DragArea } from '../../components/Common/drag';
import { useI18n } from '@renderer/i18n/useI18n';
import type { TranslationKey } from '@renderer/i18n/translations';

/* ------------------------------------------------------------------ */
/*  Shared helpers                                                     */
/* ------------------------------------------------------------------ */

const MAX_IMAGE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_DOC_SIZE = 100 * 1024 * 1024;  // 100MB
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;  // 50MB

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/bmp', 'image/webp', 'image/gif'];
const ALLOWED_DOC_TYPES = [
  ...ALLOWED_IMAGE_TYPES,
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain', 'text/markdown', 'text/csv', 'text/html',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/epub+zip',
];
const ALLOWED_DRIVE_TYPES = [...ALLOWED_IMAGE_TYPES, 'video/mp4', 'video/avi', 'video/webm'];

type FileValidation = { ok: true } | { ok: false; errorKey: 'ws.fileTooLarge' | 'ws.unsupportedType'; params: Record<string, string> };

function validateFile(file: File, allowedTypes: string[], maxSize: number): FileValidation {
  if (allowedTypes.length > 0 && !allowedTypes.some((t) => file.type === t || file.type.startsWith(t.replace('/*', '/')))) {
    // also allow generic matches when type is empty (some OS won't set MIME)
    if (file.type) {
      return { ok: false, errorKey: 'ws.unsupportedType', params: { type: file.type || file.name.split('.').pop() || 'unknown' } };
    }
  }
  if (file.size > maxSize) {
    return { ok: false, errorKey: 'ws.fileTooLarge', params: { max: formatSize(maxSize) } };
  }
  return { ok: true };
}

/** Read a File object as a base64 data-URL string */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/** Call the main-process VLM analysis IPC (supports optional streaming) */
async function analyzeWithVLM(
  imageBase64: string,
  question: string,
  mimeType?: string,
  onChunk?: (accumulated: string) => void,
): Promise<{ success: boolean; result?: string; error?: string }> {
  const useStream = typeof onChunk === 'function';
  let unsubscribe: (() => void) | undefined;

  try {
    if (useStream) {
      unsubscribe = window.electron.ipcRenderer.on(
        'system:analyzeImage:chunk' as never,
        (...args: unknown[]) => {
          const data = args[0] as { accumulated?: string };
          if (data?.accumulated) onChunk(data.accumulated);
        },
      );
    }

    const res = await window.electron.ipcRenderer.invoke('system:analyzeImage', {
      imageBase64,
      question,
      mimeType,
      stream: useStream,
    });
    return res;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown IPC error',
    };
  } finally {
    unsubscribe?.();
  }
}

/** Call main-process document analysis IPC (text extraction → LLM).
 *  If text extraction fails (e.g. scanned PDF), returns fallbackToVLM=true
 *  so the caller can retry with VLM image path. */
async function analyzeDocument(
  fileBase64: string,
  fileName: string,
  question: string,
  onChunk?: (accumulated: string) => void,
): Promise<{ success: boolean; result?: string; error?: string; fallbackToVLM?: boolean }> {
  const useStream = typeof onChunk === 'function';
  let unsubscribe: (() => void) | undefined;

  try {
    if (useStream) {
      unsubscribe = window.electron.ipcRenderer.on(
        'system:analyzeDocument:chunk' as never,
        (...args: unknown[]) => {
          const data = args[0] as { accumulated?: string };
          if (data?.accumulated) onChunk(data.accumulated);
        },
      );
    }

    const res = await window.electron.ipcRenderer.invoke('system:analyzeDocument', {
      fileBase64,
      fileName,
      question,
      stream: useStream,
    });
    return res;
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown IPC error',
    };
  } finally {
    unsubscribe?.();
  }
}

/** Check if a MIME type / file name indicates an image */
function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/** Check if a MIME type indicates a video */
function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/');
}

/**
 * Extract key frames from a video file using HTML5 Canvas.
 * This is the mainstream approach used by Qwen-VL, Kimi, etc.
 * for video analysis — extract frames, send as images to VLM.
 */
function extractVideoFrames(
  file: File,
  numFrames = 4,
): Promise<{ frames: string[]; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(file);
    video.src = url;
    video.muted = true;
    video.preload = 'auto';

    video.addEventListener('error', () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video'));
    });

    video.addEventListener('loadedmetadata', () => {
      const duration = video.duration;
      if (!duration || !isFinite(duration)) {
        URL.revokeObjectURL(url);
        reject(new Error('Invalid video duration'));
        return;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Canvas not supported'));
        return;
      }

      const frames: string[] = [];
      const interval = duration / (numFrames + 1);
      let currentFrame = 0;

      const captureFrame = () => {
        if (currentFrame >= numFrames) {
          URL.revokeObjectURL(url);
          resolve({ frames, duration });
          return;
        }

        const targetTime = interval * (currentFrame + 1);
        video.currentTime = Math.min(targetTime, duration - 0.1);
      };

      video.addEventListener('seeked', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        frames.push(canvas.toDataURL('image/jpeg', 0.85));
        currentFrame++;
        captureFrame();
      });

      captureFrame();
    });
  });
}

/** Format file size */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  Shared drop-zone                                                   */
/* ------------------------------------------------------------------ */

function DropZone({
  dragOver,
  setDragOver,
  onDrop,
  onClick,
  color,
  children,
}: {
  dragOver: boolean;
  setDragOver: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
  onClick: () => void;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
        dragOver
          ? `border-${color}-500 bg-${color}-50/10`
          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={onDrop}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/** Result display block */
function AnalysisResult({
  loading,
  result,
  error,
  loadingText,
}: {
  loading: boolean;
  result: string | null;
  error: string | null;
  loadingText: string;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-muted/50 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>{loadingText}</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 text-sm whitespace-pre-wrap">
        {error}
      </div>
    );
  }
  if (result) {
    return (
      <div className="p-4 rounded-xl bg-muted/50 text-sm leading-relaxed">
        <Markdown>{result}</Markdown>
      </div>
    );
  }
  return null;
}

/** File info bar */
function FileInfo({ file }: { file: File | null }) {
  if (!file) return null;
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
      <FileText className="h-4 w-4" />
      <span className="truncate max-w-xs">{file.name}</span>
      <span className="text-xs">({formatSize(file.size)})</span>
      <span className="text-xs opacity-60">{file.type || 'unknown type'}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Visual Q&A Workspace                                               */
/* ------------------------------------------------------------------ */

function VisualQAWorkspace() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: TranslationKey; placeholder: TranslationKey; defaultQ: string }[] = [
    { key: 'ws.vqa.tab1', placeholder: 'ws.vqa.questionPlaceholder', defaultQ: 'What is in this image? Describe it in detail.' },
    { key: 'ws.vqa.tab2', placeholder: 'ws.vqa.descPlaceholder', defaultQ: 'Provide a comprehensive description of this image including objects, colors, and layout.' },
    { key: 'ws.vqa.tab3', placeholder: 'ws.vqa.detectPlaceholder', defaultQ: 'Detect and list all objects visible in this image with their approximate positions.' },
    { key: 'ws.vqa.tab4', placeholder: 'ws.vqa.ocrPlaceholder', defaultQ: 'Extract all text visible in this image.' },
  ];

  const processFile = useCallback((file: File) => {
    const v = validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    if (!v.ok) {
      setError(t(v.errorKey).replace('{max}', v.params.max ?? '').replace('{type}', v.params.type ?? ''));
      return;
    }
    if (file.type.startsWith('image/')) {
      setSelectedImage(URL.createObjectURL(file));
      setSelectedFile(file);
      setResult(null);
      setError(null);
    }
  }, [t]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const base64 = await readFileAsBase64(selectedFile);
      const q = question.trim() || tabs[activeTab].defaultQ;
      const res = await analyzeWithVLM(base64, q, selectedFile.type, (accumulated) => {
        setResult(accumulated);
      });
      if (res.success) {
        setResult(res.result || '');
      } else {
        setError(res.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, question, activeTab, tabs]);

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Eye className="h-6 w-6 text-blue-500" />
          {t('ws.vqa.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('ws.vqa.subtitle')}</p>
      </div>

      <div className="flex gap-3 justify-center">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === idx
                ? 'bg-blue-500 text-white'
                : 'border hover:bg-accent'
            }`}
            onClick={() => { setActiveTab(idx); setResult(null); setError(null); }}
          >
            {t(tab.key)}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {selectedImage ? (
        <div className="space-y-4">
          <div className="rounded-xl overflow-hidden border">
            <img
              src={selectedImage}
              alt="Selected"
              className="max-h-64 mx-auto object-contain"
            />
          </div>
          <FileInfo file={selectedFile} />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t(tabs[activeTab].placeholder)}
              className="flex-1 border rounded-xl px-4 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button
              className="rounded-xl bg-blue-500 hover:bg-blue-600"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <AnalysisResult loading={loading} result={result} error={error} loadingText={t('ws.analyzing')} />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSelectedImage(null);
              setSelectedFile(null);
              setResult(null);
              setError(null);
              setQuestion('');
            }}
          >
            {t('ws.vqa.uploadHint')}
          </Button>
        </div>
      ) : (
        <DropZone
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          color="blue"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('ws.vqa.uploadHint')}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {t('ws.vqa.supportedFormats')}
          </p>
        </DropZone>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Doc AI Workspace                                                   */
/* ------------------------------------------------------------------ */

function DocAIWorkspace() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isNonImage, setIsNonImage] = useState(false);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: TranslationKey; defaultQ: string }[] = [
    { key: 'ws.doc.tab1', defaultQ: 'Summarize this document. Provide a comprehensive overview of its contents.' },
    { key: 'ws.doc.tab2', defaultQ: 'Extract all key information, tables, and structured data from this document.' },
    { key: 'ws.doc.tab3', defaultQ: 'Translate this document into English, preserving the original structure.' },
  ];

  const processFile = useCallback((file: File) => {
    const v = validateFile(file, ALLOWED_DOC_TYPES, MAX_DOC_SIZE);
    if (!v.ok) {
      setError(t(v.errorKey).replace('{max}', v.params.max ?? '').replace('{type}', v.params.type ?? ''));
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
      setIsNonImage(false);
    } else {
      setPreviewUrl(null);
      setIsNonImage(true);
    }
  }, [t]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const base64 = await readFileAsBase64(selectedFile);
      const q = question.trim() || tabs[activeTab].defaultQ;

      if (isImageFile(selectedFile)) {
        // Image files → VLM path (vision model)
        const res = await analyzeWithVLM(base64, q, selectedFile.type, (accumulated) => {
          setResult(accumulated);
        });
        if (res.success) {
          setResult(res.result || '');
        } else {
          setError(res.error || 'Analysis failed');
        }
      } else {
        // Document files → text extraction + LLM path
        const res = await analyzeDocument(base64, selectedFile.name, q, (accumulated) => {
          setResult(accumulated);
        });

        if (res.success) {
          setResult(res.result || '');
        } else if ((res as { fallbackToVLM?: boolean }).fallbackToVLM) {
          // Text extraction empty (scanned PDF etc.) → fallback to VLM
          setResult(null);
          const vlmRes = await analyzeWithVLM(base64, q, selectedFile.type, (accumulated) => {
            setResult(accumulated);
          });
          if (vlmRes.success) {
            setResult(vlmRes.result || '');
          } else {
            setError(vlmRes.error || 'Analysis failed');
          }
        } else {
          setError(res.error || 'Analysis failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, question, activeTab, tabs]);

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <FileSearch className="h-6 w-6 text-purple-500" />
          {t('ws.doc.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('ws.doc.subtitle')}</p>
      </div>

      <div className="flex gap-3 justify-center">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === idx
                ? 'bg-purple-500 text-white'
                : 'border hover:bg-accent'
            }`}
            onClick={() => { setActiveTab(idx); setResult(null); setError(null); }}
          >
            {t(tab.key)}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,.pdf,.doc,.docx,.txt,.md,.csv,.xls,.xlsx"
        className="hidden"
        onChange={handleFileSelect}
      />

      {selectedFile ? (
        <div className="space-y-4">
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 mx-auto object-contain"
              />
            </div>
          )}
          {!previewUrl && (
            <div className="rounded-xl border p-8 flex flex-col items-center gap-2 bg-muted/30">
              <FileText className="h-12 w-12 text-purple-400" />
              <p className="font-medium">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {selectedFile.type || 'unknown type'} — {formatSize(selectedFile.size)}
              </p>
            </div>
          )}
          {isNonImage && (
            <div className="space-y-1.5 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 text-xs">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 shrink-0" />
                <span>{t('ws.docNonImageHint')}</span>
              </div>
              <div className="flex items-center gap-2 opacity-70">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                <span>{t('ws.docFallbackHint')}</span>
              </div>
            </div>
          )}
          <FileInfo file={selectedFile} />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('ws.doc.questionPlaceholder')}
              className="flex-1 border rounded-xl px-4 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button
              className="rounded-xl bg-purple-500 hover:bg-purple-600"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <AnalysisResult loading={loading} result={result} error={error} loadingText={t('ws.analyzing')} />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
              setResult(null);
              setError(null);
              setQuestion('');
            }}
          >
            {t('ws.doc.uploadHint')}
          </Button>
        </div>
      ) : (
        <DropZone
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          color="purple"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('ws.doc.uploadHint')}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {t('ws.doc.supportedFormats')}
          </p>
        </DropZone>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Auto Drive Workspace                                               */
/* ------------------------------------------------------------------ */

function AutoDriveWorkspace() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: TranslationKey; defaultQ: string }[] = [
    { key: 'ws.drive.tab1', defaultQ: 'Analyze this driving scene. Identify all vehicles, pedestrians, traffic signs, lane markings, and potential hazards.' },
    { key: 'ws.drive.tab2', defaultQ: 'Evaluate the road conditions in this image. Identify road surface quality, weather impact, and visibility.' },
    { key: 'ws.drive.tab3', defaultQ: 'Analyze this traffic scene. Identify traffic flow, congestion levels, and any anomalies.' },
  ];

  const processFile = useCallback((file: File) => {
    const maxSize = file.type.startsWith('video/') ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
    const v = validateFile(file, ALLOWED_DRIVE_TYPES, maxSize);
    if (!v.ok) {
      setError(t(v.errorKey).replace('{max}', v.params.max ?? '').replace('{type}', v.params.type ?? ''));
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }, [t]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const q = question.trim() || tabs[activeTab].defaultQ;

      if (isVideoFile(selectedFile)) {
        // Video → extract key frames → analyze each with VLM
        setResult('Extracting video frames...');
        const { frames, duration } = await extractVideoFrames(selectedFile, 4);
        const framePrompt = `${q}\n\nThis is frame {n} of ${frames.length} from a ${Math.round(duration)}s video.`;
        const allResults: string[] = [];

        for (let i = 0; i < frames.length; i++) {
          setResult(`Analyzing frame ${i + 1}/${frames.length}...`);
          const res = await analyzeWithVLM(
            frames[i],
            framePrompt.replace('{n}', String(i + 1)),
            'image/jpeg',
          );
          if (res.success && res.result) {
            allResults.push(`**[Frame ${i + 1}/${frames.length} @ ${Math.round((duration / (frames.length + 1)) * (i + 1))}s]**\n${res.result}`);
            setResult(allResults.join('\n\n---\n\n'));
          }
        }

        if (allResults.length === 0) {
          setError('Failed to analyze any video frame');
        }
      } else {
        // Image → VLM directly
        const base64 = await readFileAsBase64(selectedFile);
        const res = await analyzeWithVLM(base64, q, selectedFile.type, (accumulated) => {
          setResult(accumulated);
        });
        if (res.success) {
          setResult(res.result || '');
        } else {
          setError(res.error || 'Analysis failed');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, question, activeTab, tabs]);

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Car className="h-6 w-6 text-green-500" />
          {t('ws.drive.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('ws.drive.subtitle')}</p>
      </div>

      <div className="flex gap-3 justify-center">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === idx
                ? 'bg-green-500 text-white'
                : 'border hover:bg-accent'
            }`}
            onClick={() => { setActiveTab(idx); setResult(null); setError(null); }}
          >
            {t(tab.key)}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {selectedFile ? (
        <div className="space-y-4">
          {previewUrl && selectedFile.type.startsWith('image/') && (
            <div className="rounded-xl overflow-hidden border">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 mx-auto object-contain"
              />
            </div>
          )}
          {previewUrl && selectedFile.type.startsWith('video/') && (
            <div className="rounded-xl overflow-hidden border">
              <video
                src={previewUrl}
                className="max-h-64 mx-auto"
                controls
              />
            </div>
          )}
          {isVideoFile(selectedFile) && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-xs">
              <Car className="h-4 w-4 shrink-0" />
              <span>{t('ws.videoHint')}</span>
            </div>
          )}
          <FileInfo file={selectedFile} />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('ws.drive.questionPlaceholder')}
              className="flex-1 border rounded-xl px-4 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-green-500/50"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button
              className="rounded-xl bg-green-500 hover:bg-green-600"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <AnalysisResult loading={loading} result={result} error={error} loadingText={t('ws.analyzing')} />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
              setResult(null);
              setError(null);
              setQuestion('');
            }}
          >
            {t('ws.drive.uploadHint')}
          </Button>
        </div>
      ) : (
        <DropZone
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          color="green"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('ws.drive.uploadHint')}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {t('ws.drive.supportedFormats')}
          </p>
        </DropZone>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Industrial Workspace                                               */
/* ------------------------------------------------------------------ */

function IndustrialWorkspace() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const tabs: { key: TranslationKey; defaultQ: string }[] = [
    { key: 'ws.ind.tab1', defaultQ: 'Inspect this image for any defects, anomalies, or quality issues. Describe each finding with its location and severity.' },
    { key: 'ws.ind.tab2', defaultQ: 'Read and extract all meter readings, gauge values, and instrument data visible in this image.' },
    { key: 'ws.ind.tab3', defaultQ: 'Analyze this industrial scene for safety compliance. Identify any violations, hazards, or areas needing attention.' },
  ];

  const processFile = useCallback((file: File) => {
    const v = validateFile(file, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE);
    if (!v.ok) {
      setError(t(v.errorKey).replace('{max}', v.params.max ?? '').replace('{type}', v.params.type ?? ''));
      return;
    }
    setSelectedFile(file);
    setResult(null);
    setError(null);
    if (file.type.startsWith('image/')) {
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      setPreviewUrl(null);
    }
  }, [t]);

  const handleFileDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleAnalyze = useCallback(async () => {
    if (!selectedFile) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const base64 = await readFileAsBase64(selectedFile);
      const q = question.trim() || tabs[activeTab].defaultQ;
      const res = await analyzeWithVLM(base64, q, selectedFile.type, (accumulated) => {
        setResult(accumulated);
      });
      if (res.success) {
        setResult(res.result || '');
      } else {
        setError(res.error || 'Analysis failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error');
    } finally {
      setLoading(false);
    }
  }, [selectedFile, question, activeTab, tabs]);

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Factory className="h-6 w-6 text-orange-500" />
          {t('ws.ind.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('ws.ind.subtitle')}</p>
      </div>

      <div className="flex gap-3 justify-center">
        {tabs.map((tab, idx) => (
          <button
            key={idx}
            className={`px-4 py-1.5 rounded-full text-sm transition-colors ${
              activeTab === idx
                ? 'bg-orange-500 text-white'
                : 'border hover:bg-accent'
            }`}
            onClick={() => { setActiveTab(idx); setResult(null); setError(null); }}
          >
            {t(tab.key)}
          </button>
        ))}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      {selectedFile ? (
        <div className="space-y-4">
          {previewUrl && (
            <div className="rounded-xl overflow-hidden border">
              <img
                src={previewUrl}
                alt="Preview"
                className="max-h-64 mx-auto object-contain"
              />
            </div>
          )}
          <FileInfo file={selectedFile} />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder={t('ws.ind.questionPlaceholder')}
              className="flex-1 border rounded-xl px-4 py-2 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/50"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
            />
            <Button
              className="rounded-xl bg-orange-500 hover:bg-orange-600"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          <AnalysisResult loading={loading} result={result} error={error} loadingText={t('ws.analyzing')} />
          <Button
            variant="outline"
            className="w-full"
            onClick={() => {
              setSelectedFile(null);
              setPreviewUrl(null);
              setResult(null);
              setError(null);
              setQuestion('');
            }}
          >
            {t('ws.ind.uploadHint')}
          </Button>
        </div>
      ) : (
        <DropZone
          dragOver={dragOver}
          setDragOver={setDragOver}
          onDrop={handleFileDrop}
          onClick={() => fileInputRef.current?.click()}
          color="orange"
        >
          <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">{t('ws.ind.uploadHint')}</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            {t('ws.ind.supportedFormats')}
          </p>
        </DropZone>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Discover Workspace — agent marketplace with category filtering     */
/* ------------------------------------------------------------------ */

function DiscoverWorkspace() {
  const { t } = useI18n();
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');

  const categories: TranslationKey[] = [
    'ws.disc.catAll',
    'ws.disc.catDraw',
    'ws.disc.catUtil',
    'ws.disc.catFun',
    'ws.disc.catLearn',
    'ws.disc.catWork',
  ];

  type AgentDef = {
    nameKey: TranslationKey;
    descKey: TranslationKey;
    icon: typeof Eye;
    color: string;
    users: string;
    category: number[];
    route?: string;
  };

  const agents: AgentDef[] = [
    {
      nameKey: 'ws.disc.agent.vqa',
      descKey: 'ws.disc.agent.vqa.desc',
      icon: Eye,
      color: 'text-blue-500',
      users: '2.8万+',
      category: [0, 2],
      route: '/agent/visual-qa',
    },
    {
      nameKey: 'ws.disc.agent.drive',
      descKey: 'ws.disc.agent.drive.desc',
      icon: Car,
      color: 'text-green-500',
      users: '1.2万+',
      category: [0, 2],
      route: '/agent/auto-drive',
    },
    {
      nameKey: 'ws.disc.agent.doc',
      descKey: 'ws.disc.agent.doc.desc',
      icon: FileSearch,
      color: 'text-purple-500',
      users: '5.3万+',
      category: [0, 2],
      route: '/agent/doc-ai',
    },
    {
      nameKey: 'ws.disc.agent.ind',
      descKey: 'ws.disc.agent.ind.desc',
      icon: Factory,
      color: 'text-orange-500',
      users: '8000+',
      category: [0, 5],
      route: '/agent/industrial',
    },
    {
      nameKey: 'ws.disc.agent.draw',
      descKey: 'ws.disc.agent.draw.desc',
      icon: Paintbrush,
      color: 'text-rose-500',
      users: '4.2万+',
      category: [0, 1],
    },
    {
      nameKey: 'ws.disc.agent.avatar',
      descKey: 'ws.disc.agent.avatar.desc',
      icon: Eye,
      color: 'text-violet-500',
      users: '2.0万+',
      category: [0, 1, 3],
    },
    {
      nameKey: 'ws.disc.agent.format',
      descKey: 'ws.disc.agent.format.desc',
      icon: FileText,
      color: 'text-cyan-500',
      users: '1.2万+',
      category: [0, 2],
    },
    {
      nameKey: 'ws.disc.agent.ocr',
      descKey: 'ws.disc.agent.ocr.desc',
      icon: Eye,
      color: 'text-indigo-500',
      users: '3.1万+',
      category: [0, 2],
    },
    {
      nameKey: 'ws.disc.agent.translate',
      descKey: 'ws.disc.agent.translate.desc',
      icon: Languages,
      color: 'text-sky-500',
      users: '6.7万+',
      category: [0, 2, 4],
    },
    {
      nameKey: 'ws.disc.agent.code',
      descKey: 'ws.disc.agent.code.desc',
      icon: Code2,
      color: 'text-emerald-500',
      users: '1.4万+',
      category: [0, 2, 5],
    },
    {
      nameKey: 'ws.disc.agent.writing',
      descKey: 'ws.disc.agent.writing.desc',
      icon: FileText,
      color: 'text-amber-500',
      users: '9800+',
      category: [0, 2, 5],
    },
    {
      nameKey: 'ws.disc.agent.fitness',
      descKey: 'ws.disc.agent.fitness.desc',
      icon: Dumbbell,
      color: 'text-red-500',
      users: '5000+',
      category: [0, 3],
    },
    {
      nameKey: 'ws.disc.agent.legal',
      descKey: 'ws.disc.agent.legal.desc',
      icon: Scale,
      color: 'text-slate-500',
      users: '5.3万+',
      category: [0, 2, 5],
    },
    {
      nameKey: 'ws.disc.agent.study',
      descKey: 'ws.disc.agent.study.desc',
      icon: GraduationCap,
      color: 'text-teal-500',
      users: '3.8万+',
      category: [0, 4],
    },
    {
      nameKey: 'ws.disc.agent.resume',
      descKey: 'ws.disc.agent.resume.desc',
      icon: FileSpreadsheet,
      color: 'text-lime-600',
      users: '2.1万+',
      category: [0, 5],
    },
    {
      nameKey: 'ws.disc.agent.ppt',
      descKey: 'ws.disc.agent.ppt.desc',
      icon: Presentation,
      color: 'text-orange-500',
      users: '4.5万+',
      category: [0, 2, 5],
    },
  ];

  const filtered = agents.filter((a) => {
    const matchCat = activeCategory === 0 || a.category.includes(activeCategory);
    const matchSearch =
      !searchQuery ||
      t(a.nameKey).toLowerCase().includes(searchQuery.toLowerCase()) ||
      t(a.descKey).toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-4xl w-full mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold flex items-center justify-center gap-2">
          <Compass className="h-6 w-6 text-pink-500" />
          {t('ws.disc.title')}
        </h1>
        <p className="text-muted-foreground mt-1">{t('ws.disc.subtitle')}</p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          {categories.map((catKey, idx) => (
            <button
              key={idx}
              className={`px-3 py-1 rounded-full text-sm transition-colors ${
                activeCategory === idx
                  ? 'bg-pink-500 text-white'
                  : 'border hover:bg-accent'
              }`}
              onClick={() => setActiveCategory(idx)}
            >
              {t(catKey)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 border rounded-full px-3 py-1.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder={t('ws.disc.searchPlaceholder')}
            className="bg-transparent text-sm focus:outline-none w-32"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {filtered.map((agent, idx) => {
          const AgentIcon = agent.icon;
          return (
            <div
              key={idx}
              className="p-4 rounded-xl border bg-card hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => agent.route && navigate(agent.route)}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <AgentIcon className={`h-5 w-5 ${agent.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {t(agent.nameKey)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {t(agent.descKey)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    ♡ {agent.users}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Agent Workspace page                                               */
/* ------------------------------------------------------------------ */

const AgentWorkspace = () => {
  const navigate = useNavigate();
  const { agentType } = useParams<{ agentType: string }>();
  const { t } = useI18n();

  const renderWorkspace = () => {
    switch (agentType) {
      case 'visual-qa':
        return <VisualQAWorkspace />;
      case 'doc-ai':
        return <DocAIWorkspace />;
      case 'auto-drive':
        return <AutoDriveWorkspace />;
      case 'industrial':
        return <IndustrialWorkspace />;
      case 'discover':
        return <DiscoverWorkspace />;
      default:
        return <p className="text-center">Unknown agent workspace</p>;
    }
  };

  return (
    <div className="w-full h-full flex flex-col">
      <DragArea />
      <div className="flex items-center gap-3 px-4 py-3 border-b">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t('ws.back')}
        </Button>
      </div>
      <div className="flex-1 overflow-auto p-6">{renderWorkspace()}</div>
    </div>
  );
};

export default AgentWorkspace;
