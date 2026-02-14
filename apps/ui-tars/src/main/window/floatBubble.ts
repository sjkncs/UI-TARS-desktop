/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import path from 'node:path';
import { BrowserWindow, app, screen, ipcMain } from 'electron';

import * as env from '@main/env';
import { logger } from '@main/logger';
import { showWindow } from '@main/window';

let bubbleWindow: BrowserWindow | null = null;

// Bubble collapsed size (just the avatar circle)
const BUBBLE_SIZE = 56;
// Bubble expanded size (avatar + popup menu)
const EXPANDED_WIDTH = 220;
const EXPANDED_HEIGHT = 340;

export function createBubbleWindow() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.show();
    return bubbleWindow;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } = primaryDisplay.size;

  bubbleWindow = new BrowserWindow({
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    x: Math.floor(screenWidth - BUBBLE_SIZE - 24),
    y: Math.floor(screenHeight / 2 - BUBBLE_SIZE / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    hasShadow: false,
    type: 'toolbar',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: !!env.isDev,
    },
  });

  bubbleWindow.setContentProtection(true);

  if (!app.isPackaged && env.rendererUrl) {
    bubbleWindow.loadURL(env.rendererUrl + '#/bubble');
  } else {
    bubbleWindow.loadFile(
      path.join(__dirname, '../renderer/index.html'),
      { hash: '#/bubble' },
    );
  }

  bubbleWindow.on('closed', () => {
    bubbleWindow = null;
  });

  logger.info('[floatBubble] Bubble window created');

  return bubbleWindow;
}

export function showBubbleWindow() {
  if (!bubbleWindow || bubbleWindow.isDestroyed()) {
    createBubbleWindow();
  } else {
    bubbleWindow.show();
  }
}

export function hideBubbleWindow() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.hide();
  }
}

export function destroyBubbleWindow() {
  if (bubbleWindow && !bubbleWindow.isDestroyed()) {
    bubbleWindow.close();
    bubbleWindow = null;
  }
}

export function isBubbleVisible(): boolean {
  return !!bubbleWindow && !bubbleWindow.isDestroyed() && bubbleWindow.isVisible();
}

// IPC handlers for bubble window resize & drag
export function registerBubbleIPC() {
  ipcMain.on('bubble:expand', () => {
    if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
    const [x, y] = bubbleWindow.getPosition();
    // Expand leftward and downward from current position
    const newX = x - (EXPANDED_WIDTH - BUBBLE_SIZE);
    bubbleWindow.setBounds({
      x: Math.max(0, newX),
      y,
      width: EXPANDED_WIDTH,
      height: EXPANDED_HEIGHT,
    });
  });

  ipcMain.on('bubble:collapse', () => {
    if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
    const [x, y] = bubbleWindow.getPosition();
    // Collapse back: move right to restore original position
    const newX = x + (EXPANDED_WIDTH - BUBBLE_SIZE);
    bubbleWindow.setBounds({
      x: newX,
      y,
      width: BUBBLE_SIZE,
      height: BUBBLE_SIZE,
    });
  });

  // Relay shortcut events from bubble renderer to main window renderer
  ipcMain.on('bubble:showMainAndSend', (_event, channel: string) => {
    // showWindow() recreates the main window if it was destroyed
    showWindow().then(() => {
      const mainWin = BrowserWindow.getAllWindows().find(
        (w) => w !== bubbleWindow && !w.isDestroyed(),
      );
      if (mainWin) {
        mainWin.show();
        mainWin.focus();
        // Forward the event to main window's renderer
        setTimeout(() => {
          mainWin.webContents.send(channel);
        }, 200);
      }
    });
  });

  ipcMain.on('bubble:startDrag', (_event, { mouseX, mouseY }: { mouseX: number; mouseY: number }) => {
    if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
    const [winX, winY] = bubbleWindow.getPosition();
    const offsetX = mouseX - winX;
    const offsetY = mouseY - winY;

    const moveHandler = (_e: Electron.Event, pos: { mouseX: number; mouseY: number }) => {
      if (!bubbleWindow || bubbleWindow.isDestroyed()) return;
      bubbleWindow.setPosition(
        Math.round(pos.mouseX - offsetX),
        Math.round(pos.mouseY - offsetY),
      );
    };

    ipcMain.on('bubble:dragging', moveHandler);

    ipcMain.once('bubble:endDrag', () => {
      ipcMain.removeListener('bubble:dragging', moveHandler);
    });
  });

  logger.info('[floatBubble] Bubble IPC handlers registered');
}
