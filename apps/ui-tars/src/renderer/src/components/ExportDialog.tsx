/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { Download, FileText, Code, FolderOpen, Check } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';
import { Button } from './ui/button';

interface ExportDialogProps {
  onClose: () => void;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
    screenshotBase64?: string;
    timestamp?: number;
  }>;
}

export function ExportDialog({ onClose, messages }: ExportDialogProps) {
  const { t } = useI18n();
  const [format, setFormat] = useState<'markdown' | 'html' | 'json'>('markdown');
  const [includeScreenshots, setIncludeScreenshots] = useState(true);
  const [includeTimestamps, setIncludeTimestamps] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    setExportSuccess(false);

    try {
      const result = await window.electron.ipcRenderer.invoke('system:exportConversation', {
        messages,
        options: {
          format,
          includeScreenshots,
          includeTimestamps,
        },
      });

      if (result.success) {
        setExportSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        alert(t('export.failed').replace('{error}', result.error || 'Unknown error'));
      }
    } catch (error) {
      alert(
        t('export.failed').replace(
          '{error}',
          error instanceof Error ? error.message : 'Unknown error',
        ),
      );
    } finally {
      setExporting(false);
    }
  };

  const handleOpenFolder = async () => {
    await window.electron.ipcRenderer.invoke('system:getExportDir', { open: true });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Download className="h-5 w-5" />
            {t('export.title')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          {/* Format selection */}
          <div>
            <label className="block text-sm font-medium mb-2">{t('export.format')}</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setFormat('markdown')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  format === 'markdown'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs">Markdown</div>
              </button>
              <button
                onClick={() => setFormat('html')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  format === 'html'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <Code className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs">HTML</div>
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`p-3 rounded-lg border-2 transition-all ${
                  format === 'json'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <FileText className="h-5 w-5 mx-auto mb-1" />
                <div className="text-xs">JSON</div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeScreenshots}
                onChange={(e) => setIncludeScreenshots(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">{t('export.includeScreenshots')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={includeTimestamps}
                onChange={(e) => setIncludeTimestamps(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm">{t('export.includeTimestamps')}</span>
            </label>
          </div>

          {/* Export info */}
          <div className="text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            📁 {messages.length} {t('export.messageCount')}
            {includeScreenshots &&
              ` · ${messages.filter((m) => m.screenshotBase64).length} ${t('export.screenshotCount')}`}
          </div>

          {/* Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleOpenFolder}
              variant="outline"
              className="flex-1"
              disabled={exporting}
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              {t('export.openFolder')}
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1 bg-blue-500 hover:bg-blue-600"
              disabled={exporting || exportSuccess}
            >
              {exportSuccess ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  {t('export.success')}
                </>
              ) : exporting ? (
                t('export.exporting')
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  {t('export.exportBtn')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
