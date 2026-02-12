/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { IMAGE_PLACEHOLDER } from '@ui-tars/shared/constants';
import { StatusEnum } from '@ui-tars/shared/types';

import { useRunAgent } from '@renderer/hooks/useRunAgent';
import { useStore } from '@renderer/hooks/useStore';

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import { Button } from '@renderer/components/ui/button';
// import { useScreenRecord } from '@renderer/hooks/useScreenRecord';
import { api } from '@renderer/api';

import {
  Play,
  Send,
  Square,
  Loader2,
  Paperclip,
  ImagePlus,
  Sparkles,
  Brain,
  Search,
  Code2,
  Image as ImageIcon,
  MoreHorizontal,
  Mic,
  Globe,
} from 'lucide-react';
import { Textarea } from '@renderer/components/ui/textarea';
import { useSession } from '@renderer/hooks/useSession';

import { Operator } from '@main/store/types';
import { useSetting } from '../../hooks/useSetting';

const ChatInput = ({
  operator,
  sessionId,
  disabled,
  checkBeforeRun,
}: {
  operator: Operator;
  sessionId: string;
  disabled: boolean;
  checkBeforeRun?: () => Promise<boolean>;
}) => {
  const {
    status,
    instructions: savedInstructions,
    messages,
    restUserData,
  } = useStore();
  const [localInstructions, setLocalInstructions] = useState('');
  const { run, stopAgentRuning } = useRunAgent();
  const { getSession, updateSession, chatMessages } = useSession();
  const { settings, updateSetting } = useSetting();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const running = status === StatusEnum.RUNNING;

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (status === StatusEnum.INIT) {
      return;
    }
  }, [status]);

  useEffect(() => {
    switch (operator) {
      case Operator.RemoteComputer:
        updateSetting({ ...settings, operator: Operator.RemoteComputer });
        break;
      case Operator.RemoteBrowser:
        updateSetting({ ...settings, operator: Operator.RemoteBrowser });
        break;
      case Operator.LocalComputer:
        updateSetting({ ...settings, operator: Operator.LocalComputer });
        break;
      case Operator.LocalBrowser:
        updateSetting({ ...settings, operator: Operator.LocalBrowser });
        break;
      default:
        updateSetting({ ...settings, operator: Operator.LocalComputer });
        break;
    }
  }, [operator]);

  const getInstantInstructions = () => {
    if (localInstructions?.trim()) {
      return localInstructions;
    }
    if (isCallUser && savedInstructions?.trim()) {
      return savedInstructions;
    }
    return '';
  };

  // console.log('running', 'status', status, running);

  const startRun = async () => {
    if (checkBeforeRun) {
      const checked = await checkBeforeRun();

      if (!checked) {
        return;
      }
    }

    const instructions = getInstantInstructions();

    console.log('startRun', instructions, restUserData);

    let history = chatMessages;

    const session = await getSession(sessionId);
    await updateSession(sessionId, {
      name: instructions,
      meta: {
        ...session!.meta,
        ...(restUserData || {}),
      },
    });

    run(instructions, history, () => {
      setLocalInstructions('');
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.nativeEvent.isComposing) {
      return;
    }

    // `enter` to submit
    if (
      e.key === 'Enter' &&
      !e.shiftKey &&
      !e.metaKey &&
      getInstantInstructions()
    ) {
      e.preventDefault();

      startRun();
    }
  };

  const isCallUser = useMemo(() => status === StatusEnum.CALL_USER, [status]);

  const lastHumanMessage =
    [...(messages || [])]
      .reverse()
      .find((m) => m?.from === 'human' && m?.value !== IMAGE_PLACEHOLDER)
      ?.value || '';

  const stopRun = async () => {
    await stopAgentRuning(() => {
      setLocalInstructions('');
    });
    await api.clearHistory();
  };

  const renderButton = () => {
    if (running) {
      return (
        <Button
          variant="secondary"
          size="icon"
          className="h-8 w-8"
          onClick={stopRun}
        >
          <Square className="h-4 w-4" />
        </Button>
      );
    }

    if (isCallUser && !localInstructions) {
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-pink-100 hover:bg-pink-200 text-pink-500 border-pink-200"
                onClick={startRun}
                disabled={!getInstantInstructions()}
              >
                <Play className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p className="whitespace-pre-line">
                send last instructions when you done for ui-tars&apos;s
                &apos;CALL_USER&apos;
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    }

    return (
      <Button
        variant="secondary"
        size="icon"
        className="h-8 w-8"
        onClick={startRun}
        disabled={!getInstantInstructions() || disabled}
      >
        <Send className="h-4 w-4" />
      </Button>
    );
  };

  return (
    <div className="px-4 w-full">
      <div className="flex flex-col space-y-4">
        <div className="relative w-full">
          <Textarea
            ref={textareaRef}
            placeholder={
              isCallUser && savedInstructions
                ? `${savedInstructions}`
                : running && lastHumanMessage && messages?.length > 1
                  ? lastHumanMessage
                  : 'What can I do for you today?'
            }
            className="min-h-[120px] rounded-2xl resize-none px-4 pb-16" // 调整内边距
            value={localInstructions}
            disabled={running || disabled}
            onChange={(e) => setLocalInstructions(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute left-4 bottom-4 flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={running || disabled}
                  >
                    <Paperclip className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Attach file</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={running || disabled}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upload image</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="absolute right-4 bottom-4 flex items-center gap-2">
            {running && (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            )}
            {renderButton()}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".txt,.pdf,.doc,.docx,.csv,.json,.md"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('[Upload] File selected:', file.name);
              }
              e.target.value = '';
            }}
          />
          <input
            ref={imageInputRef}
            type="file"
            className="hidden"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                console.log('[Upload] Image selected:', file.name);
              }
              e.target.value = '';
            }}
          />
        </div>
        {/* Capability quick-action chips (Qwen-style) */}
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { icon: Sparkles, label: 'Task Assistant', key: 'task' },
              { icon: Brain, label: 'Deep Thinking', key: 'think' },
              { icon: Search, label: 'Deep Research', key: 'research' },
              { icon: Code2, label: 'Code', key: 'code' },
              { icon: ImageIcon, label: 'Image', key: 'image' },
            ].map((chip) => (
              <button
                key={chip.key}
                type="button"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={running || disabled}
                onClick={() => {
                  const prefix = `[${chip.label}] `;
                  if (!localInstructions.startsWith(prefix)) {
                    setLocalInstructions(prefix + localInstructions);
                  }
                  textareaRef.current?.focus();
                }}
              >
                <chip.icon className="h-3 w-3" />
                {chip.label}
              </button>
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full border border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors cursor-pointer"
              onClick={() => {
                console.log('[Chips] More capabilities clicked');
              }}
            >
              <MoreHorizontal className="h-3 w-3" />
              More
            </button>
          </div>
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      console.log('[Action] Language/Globe clicked');
                    }}
                  >
                    <Globe className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Translate</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      console.log('[Action] Voice input clicked');
                    }}
                  >
                    <Mic className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Voice input</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
