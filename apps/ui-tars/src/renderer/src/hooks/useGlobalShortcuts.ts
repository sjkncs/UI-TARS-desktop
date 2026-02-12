/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useGlobalSettings } from '../components/Settings/global';

/**
 * Listen for global shortcut events sent from the main process via IPC.
 * - shortcut:newChat → navigate to home page
 * - shortcut:openSettings → open settings dialog
 */
export function useGlobalShortcuts() {
  const navigate = useNavigate();
  const openSettings = useGlobalSettings((s) => s.openSettings);

  useEffect(() => {
    const ipc = window.electron?.ipcRenderer;
    if (!ipc) return;

    const unsubNewChat = ipc.on(
      'shortcut:newChat' as never,
      () => {
        localStorage.removeItem('ui-tars-chat-current-session');
        navigate('/chat', { state: { newChat: true } });
      },
    );

    const unsubSettings = ipc.on(
      'shortcut:openSettings' as never,
      () => {
        openSettings();
      },
    );

    return () => {
      unsubNewChat?.();
      unsubSettings?.();
    };
  }, [navigate, openSettings]);
}
