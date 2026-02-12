/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useRef, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { useI18n } from '../i18n/useI18n';

interface ContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  type: 'screenshot' | 'code';
  data: {
    screenshotBase64?: string;
    code?: string;
    language?: string;
  };
}

export function ContextMenu({ x, y, onClose, type, data }: ContextMenuProps) {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleSave = async () => {
    if (type === 'screenshot' && data.screenshotBase64) {
      const result = await window.electron.ipcRenderer.invoke('system:exportScreenshot', {
        screenshotBase64: data.screenshotBase64,
      });

      if (!result.success) {
        alert(t('export.failed').replace('{error}', result.error || 'Unknown error'));
      }
    } else if (type === 'code' && data.code) {
      const result = await window.electron.ipcRenderer.invoke('system:exportCodeBlock', {
        code: data.code,
        language: data.language || 'txt',
      });

      if (!result.success) {
        alert(t('export.failed').replace('{error}', result.error || 'Unknown error'));
      }
    }
    onClose();
  };

  const handleCopy = async () => {
    if (type === 'code' && data.code) {
      await navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div
      ref={menuRef}
      className="fixed bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 py-1 z-50 min-w-[160px]"
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <button
        onClick={handleSave}
        className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        {type === 'screenshot' ? t('export.saveScreenshot') : t('export.saveCode')}
      </button>

      {type === 'code' && (
        <button
          onClick={handleCopy}
          className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              {t('export.copied')}
            </>
          ) : (
            <>
              <Copy className="h-4 w-4" />
              {t('export.copyCode')}
            </>
          )}
        </button>
      )}
    </div>
  );
}
