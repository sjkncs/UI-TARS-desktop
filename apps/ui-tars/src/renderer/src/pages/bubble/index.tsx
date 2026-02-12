/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import {
  MessageSquarePlus,
  Settings,
  FolderOpen,
  FileText,
  X,
  Keyboard,
} from 'lucide-react';
import { useI18n } from '@renderer/i18n/useI18n';
import { api } from '@renderer/api';

import logoVector from '@resources/logo-vector.png?url';

const ipc = window.electron?.ipcRenderer;

const BubblePage = () => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useI18n();
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMoved = useRef(false);

  // Drag handling — communicate with main process for frameless window move
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (expanded) return;
    isDragging.current = true;
    hasMoved.current = false;
    dragStartPos.current = { x: e.screenX, y: e.screenY };
    ipc?.sendMessage('bubble:startDrag' as never, { mouseX: e.screenX, mouseY: e.screenY } as never);

    const handleMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current) return;
      const dx = Math.abs(ev.screenX - dragStartPos.current.x);
      const dy = Math.abs(ev.screenY - dragStartPos.current.y);
      if (dx > 3 || dy > 3) {
        hasMoved.current = true;
      }
      ipc?.sendMessage('bubble:dragging' as never, { mouseX: ev.screenX, mouseY: ev.screenY } as never);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      ipc?.sendMessage('bubble:endDrag' as never);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }, [expanded]);

  const handleBubbleClick = useCallback(() => {
    if (hasMoved.current) return;
    if (expanded) {
      setExpanded(false);
      ipc?.sendMessage('bubble:collapse' as never);
    } else {
      setExpanded(true);
      ipc?.sendMessage('bubble:expand' as never);
    }
  }, [expanded]);

  // Close menu when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = () => {
      setExpanded(false);
      ipc?.sendMessage('bubble:collapse' as never);
    };
    const timer = setTimeout(() => {
      window.addEventListener('blur', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('blur', handleClickOutside);
    };
  }, [expanded]);

  function collapse() {
    setExpanded(false);
    ipc?.sendMessage('bubble:collapse' as never);
  }

  function showMainAndSend(channel: string) {
    ipc?.sendMessage('bubble:showMainAndSend' as never, channel as never);
    collapse();
  }

  const menuItems = [
    {
      icon: MessageSquarePlus,
      label: t('shortcuts.newChat'),
      action: () => showMainAndSend('shortcut:newChat'),
    },
    {
      icon: Settings,
      label: t('shortcuts.openSettings'),
      action: () => showMainAndSend('shortcut:openSettings'),
    },
    {
      icon: FolderOpen,
      label: t('export.openFolder'),
      action: () => {
        api['system:getExportDir']({ open: true });
        collapse();
      },
    },
    {
      icon: FileText,
      label: t('bubble.exportLogs'),
      action: () => {
        api['system:exportLogs']();
        collapse();
      },
    },
    {
      icon: Keyboard,
      label: t('shortcuts.title'),
      action: () => showMainAndSend('shortcut:openSettings'),
    },
  ];

  return (
    <div className="w-full h-full select-none" style={{ background: 'transparent' }}>
      {expanded ? (
        <div className="flex flex-col h-full animate-in fade-in duration-150">
          {/* Menu panel */}
          <div
            className="flex-1 rounded-xl overflow-hidden"
            style={{
              background: 'rgba(255, 255, 255, 0.96)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.08)',
              backdropFilter: 'blur(12px)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <img src={logoVector} alt="UI-TARS" className="w-5 h-5" />
                <span className="text-sm font-semibold text-gray-800">UI-TARS</span>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  collapse();
                }}
                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {menuItems.map((item, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    item.action();
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <item.icon className="w-4 h-4 text-gray-500 shrink-0" />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>

            {/* Footer hint */}
            <div className="px-3 py-2 border-t border-gray-100">
              <p className="text-[10px] text-gray-400 leading-tight">
                Ctrl+Shift+T {t('shortcuts.showHide')}
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Collapsed bubble — circular avatar */
        <div
          className="w-14 h-14 rounded-full cursor-pointer flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            boxShadow: '0 4px 16px rgba(102, 126, 234, 0.4), 0 2px 4px rgba(0,0,0,0.1)',
          }}
          onMouseDown={handleMouseDown}
          onClick={handleBubbleClick}
        >
          <img
            src={logoVector}
            alt="UI-TARS"
            className="w-8 h-8 pointer-events-none"
            draggable={false}
          />
        </div>
      )}
    </div>
  );
};

export default BubblePage;
