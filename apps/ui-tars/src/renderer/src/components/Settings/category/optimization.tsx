/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { Switch } from '@renderer/components/ui/switch';
import { Label } from '@renderer/components/ui/label';
import { Separator } from '@renderer/components/ui/separator';
import { Badge } from '@renderer/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@renderer/components/ui/alert-dialog';

interface OptFlag {
  key: string;
  label: string;
  description: string;
  risk: 'low' | 'medium';
}

const FLAGS: OptFlag[] = [
  {
    key: 'enableRetry',
    label: 'Smart Retry',
    description: 'Automatically retry failed critical actions with intelligent backoff',
    risk: 'low',
  },
  {
    key: 'enablePerformanceMonitor',
    label: 'Performance Monitor',
    description: 'Track operation timings, generate reports, detect slow operations',
    risk: 'low',
  },
  {
    key: 'enableVisualization',
    label: 'Visualization API',
    description: 'Expose IPC endpoints for performance dashboards and real-time data',
    risk: 'low',
  },
  {
    key: 'enableOCR',
    label: 'OCR Text Recognition',
    description: 'Recognize text in screenshots using Tesseract.js (requires network on first use)',
    risk: 'medium',
  },
  {
    key: 'enableMultiModel',
    label: 'Multi-Model Support',
    description: 'Intelligent model selection, failover, and performance-based routing',
    risk: 'medium',
  },
  {
    key: 'enableWorkflow',
    label: 'Workflow Engine',
    description: 'Record, replay, and manage automated task workflows',
    risk: 'medium',
  },
];

const OPT_STORAGE_KEY = 'ui-tars-optimization-flags';

export function OptimizationSettings() {
  const [flags, setFlags] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(OPT_STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch { /* ignore */ }
    const initial: Record<string, boolean> = {};
    FLAGS.forEach((f) => {
      initial[f.key] = f.risk === 'low';
    });
    return initial;
  });

  const [confirmKey, setConfirmKey] = useState<string | null>(null);
  const confirmFlag = confirmKey ? FLAGS.find((f) => f.key === confirmKey) : null;

  const persistFlags = (updated: Record<string, boolean>) => {
    try { localStorage.setItem(OPT_STORAGE_KEY, JSON.stringify(updated)); } catch { /* ignore */ }
  };

  const toggleFlag = (key: string) => {
    const flag = FLAGS.find((f) => f.key === key);
    if (flag && flag.risk === 'medium' && !flags[key]) {
      setConfirmKey(key);
      return;
    }
    const updated = { ...flags, [key]: !flags[key] };
    setFlags(updated);
    persistFlags(updated);
  };

  const handleConfirm = () => {
    if (confirmKey) {
      const updated = { ...flags, [confirmKey]: true };
      setFlags(updated);
      persistFlags(updated);
      setConfirmKey(null);
    }
  };

  const enabledCount = Object.values(flags).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Control which optimization features are active. Low-risk features are
          enabled by default.
        </p>
        <Badge variant="secondary">
          {enabledCount}/{FLAGS.length} enabled
        </Badge>
      </div>

      <Separator />

      <div className="space-y-4">
        {FLAGS.map((flag) => (
          <div
            key={flag.key}
            className="flex items-start justify-between gap-4 rounded-lg border p-4"
          >
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2">
                <Label htmlFor={flag.key} className="text-sm font-medium">
                  {flag.label}
                </Label>
                <Badge
                  variant={flag.risk === 'low' ? 'secondary' : 'outline'}
                  className={
                    flag.risk === 'low'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                  }
                >
                  {flag.risk === 'low' ? 'Low Risk' : 'Medium Risk'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {flag.description}
              </p>
            </div>
            <Switch
              id={flag.key}
              checked={flags[flag.key]}
              onCheckedChange={() => toggleFlag(flag.key)}
            />
          </div>
        ))}
      </div>

      <Separator />

      <div className="text-xs text-muted-foreground space-y-1">
        <p>
          Changes take effect on next app restart. Low-risk features have
          minimal performance impact.
        </p>
      </div>

      <AlertDialog open={!!confirmKey} onOpenChange={() => setConfirmKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmFlag?.risk === 'medium' ? 'Enable Medium Risk Feature?' : 'Enable Feature?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              You are about to enable <strong>{confirmFlag?.label}</strong>.
              {confirmFlag?.risk === 'medium' && ' This is a medium-risk feature that may affect system stability or require additional resources.'}
              {' '}Are you sure you want to proceed?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>Confirm</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
