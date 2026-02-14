/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import {
  Menu,
  Tray,
  app,
  nativeImage,
  globalShortcut,
  BrowserWindow,
  shell,
} from 'electron';
import path from 'path';

import { StatusEnum } from '@ui-tars/shared/types';

import { exportLogs } from '@main/logger';
import { showWindow, getMainWindow } from '@main/window';
import { logger } from '@main/logger';

import { store } from './store/create';
import { server } from '@main/ipcRoutes';
import { SettingStore } from './store/setting';
import { ConversationExporter } from './utils/conversationExporter';
import { showBubbleWindow, hideBubbleWindow, isBubbleVisible } from './window/floatBubble';

export let tray: Tray | null = null;

/* ------------------------------------------------------------------ */
/*  i18n helper — reads language from SettingStore                     */
/* ------------------------------------------------------------------ */
type TrayKey =
  | 'open'
  | 'newChat'
  | 'settings'
  | 'exportFolder'
  | 'exportLogs'
  | 'shortcuts'
  | 'stopTask'
  | 'showBubble'
  | 'hideBubble'
  | 'quit';

const trayLabels: Record<TrayKey, { zh: string; en: string }> = {
  open: { zh: '打开 UI-TARS', en: 'Open UI-TARS' },
  newChat: { zh: '新建对话', en: 'New Chat' },
  settings: { zh: '设置', en: 'Settings' },
  exportFolder: { zh: '打开导出文件夹', en: 'Open Export Folder' },
  exportLogs: { zh: '导出日志', en: 'Export Logs' },
  shortcuts: { zh: '快捷键', en: 'Shortcuts' },
  stopTask: { zh: '⏹ 停止当前任务', en: '⏹ Stop Current Task' },
  showBubble: { zh: '显示悬浮助手', en: 'Show Float Bubble' },
  hideBubble: { zh: '隐藏悬浮助手', en: 'Hide Float Bubble' },
  quit: { zh: '退出 UI-TARS', en: 'Quit UI-TARS' },
};

function trayLabel(key: TrayKey): string {
  const lang = SettingStore.getStore()?.language || 'en';
  return trayLabels[key][lang as 'zh' | 'en'] || trayLabels[key].en;
}

/* ------------------------------------------------------------------ */
/*  Global shortcuts                                                   */
/* ------------------------------------------------------------------ */
export const SHORTCUT_MAP = {
  showHide: 'CommandOrControl+Shift+T',
  newChat: 'CommandOrControl+Shift+N',
  settings: 'CommandOrControl+Shift+,',
} as const;

function sendToRenderer(channel: string, ...args: unknown[]) {
  const wins = BrowserWindow.getAllWindows();
  wins.forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, ...args);
    }
  });
}

export function registerGlobalShortcuts() {
  // Ctrl+Shift+T — Show / Hide main window
  globalShortcut.register(SHORTCUT_MAP.showHide, () => {
    const mainWin = getMainWindow();
    if (mainWin && mainWin.isVisible() && mainWin.isFocused()) {
      mainWin.hide();
    } else {
      showWindow();
    }
  });

  // Ctrl+Shift+N — New Chat (send event to renderer)
  globalShortcut.register(SHORTCUT_MAP.newChat, () => {
    showWindow();
    sendToRenderer('shortcut:newChat');
  });

  // Ctrl+Shift+, — Open Settings
  globalShortcut.register(SHORTCUT_MAP.settings, () => {
    showWindow();
    sendToRenderer('shortcut:openSettings');
  });

  logger.info('[shortcuts] Global shortcuts registered:', Object.values(SHORTCUT_MAP).join(', '));
}

export function unregisterGlobalShortcuts() {
  globalShortcut.unregisterAll();
  logger.info('[shortcuts] Global shortcuts unregistered');
}

/* ------------------------------------------------------------------ */
/*  Tray                                                               */
/* ------------------------------------------------------------------ */
export async function createTray() {
  const normalIcon = nativeImage
    .createFromPath(path.join(__dirname, '../../resources/logo-vector.png'))
    .resize({ width: 16, height: 16 });

  const pauseIcon = nativeImage
    .createFromPath(path.join(__dirname, '../../resources/pause-light.png'))
    .resize({ width: 16, height: 16 });

  tray = new Tray(normalIcon);
  tray?.setImage(normalIcon);
  tray?.setToolTip('UI-TARS Desktop');

  const handleTrayClick = async () => {
    await server.stopRun();
  };

  // Listen for status changes
  store?.subscribe((state, prevState) => {
    if (state.status !== prevState.status) {
      updateContextMenu();
      if (state.status === StatusEnum.RUNNING) {
        tray?.setImage(pauseIcon);
        tray?.on('click', handleTrayClick);
      } else {
        tray?.setImage(normalIcon);
        tray?.removeListener('click', handleTrayClick);
      }
    }
  });

  // Listen for language changes to update menu labels
  SettingStore.getInstance().onDidChange('language', () => {
    updateContextMenu();
  });

  function updateContextMenu() {
    const isRunning = store.getState().status === StatusEnum.RUNNING;

    if (isRunning) {
      // Running: show stop task option
      const contextMenu = Menu.buildFromTemplate([
        {
          label: trayLabel('stopTask'),
          click: async () => {
            await server.stopRun();
          },
        },
        { type: 'separator' },
        {
          label: trayLabel('quit'),
          click: () => app.quit(),
        },
      ]);
      tray?.setContextMenu(contextMenu);
    } else {
      // Idle: show full menu
      const contextMenu = Menu.buildFromTemplate([
        {
          label: trayLabel('open'),
          accelerator: SHORTCUT_MAP.showHide,
          click: () => showWindow(),
        },
        {
          label: trayLabel('newChat'),
          accelerator: SHORTCUT_MAP.newChat,
          click: () => {
            showWindow();
            sendToRenderer('shortcut:newChat');
          },
        },
        { type: 'separator' },
        {
          label: trayLabel('settings'),
          accelerator: SHORTCUT_MAP.settings,
          click: () => {
            showWindow();
            sendToRenderer('shortcut:openSettings');
          },
        },
        {
          label: trayLabel('exportFolder'),
          click: () => {
            const exporter = new ConversationExporter();
            shell.openPath(exporter.getExportDir());
          },
        },
        {
          label: trayLabel('exportLogs'),
          click: () => exportLogs(),
        },
        {
          label: isBubbleVisible() ? trayLabel('hideBubble') : trayLabel('showBubble'),
          click: () => {
            if (isBubbleVisible()) {
              hideBubbleWindow();
            } else {
              showBubbleWindow();
            }
            // Refresh menu to update label
            setTimeout(() => updateContextMenu(), 100);
          },
        },
        { type: 'separator' },
        {
          label: trayLabel('shortcuts'),
          submenu: [
            {
              label: `${trayLabel('open')}  ${SHORTCUT_MAP.showHide}`,
              enabled: false,
            },
            {
              label: `${trayLabel('newChat')}  ${SHORTCUT_MAP.newChat}`,
              enabled: false,
            },
            {
              label: `${trayLabel('settings')}  ${SHORTCUT_MAP.settings}`,
              enabled: false,
            },
          ],
        },
        { type: 'separator' },
        {
          label: trayLabel('quit'),
          click: () => app.quit(),
        },
      ]);

      tray?.setContextMenu(contextMenu);
    }
  }

  updateContextMenu();

  return tray;
}
