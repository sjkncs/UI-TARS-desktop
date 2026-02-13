/*
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Build utilities
 */

import { execa } from 'execa';

import { logger } from './logger';

/**
 * Runs build script with proper environment variables
 */
export async function runBuildScript(
  build: string | boolean,
  cwd: string,
  dryRun = false,
): Promise<void> {
  const buildScript = typeof build === 'string' ? build : 'npm run build';

  // Validate build script contains only safe characters to prevent command injection
  if (!/^[\w\s./@:=-]+$/.test(buildScript)) {
    throw new Error(`Unsafe build script detected: ${buildScript.slice(0, 50)}`);
  }

  if (dryRun) {
    logger.info(`[dry-run] Would run build with: ${buildScript}`);
    return;
  }

  logger.info(`Running build script: ${buildScript}`);
  const [command, ...args] = buildScript.split(' ');
  await execa(command, args, {
    shell: true,
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
}
