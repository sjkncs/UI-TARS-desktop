/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useNavigate, useParams } from 'react-router';
import { Eye, Car, Factory, FileSearch, Compass, ArrowLeft } from 'lucide-react';
import { Button } from '@renderer/components/ui/button';
import { DragArea } from '../../components/Common/drag';
import { useI18n } from '@renderer/i18n/useI18n';
import type { TranslationKey } from '@renderer/i18n/translations';

type AgentConfig = {
  icon: typeof Eye;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  color: string;
  bg: string;
  capKeys: TranslationKey[];
  scenarioKeys: { title: TranslationKey; desc: TranslationKey }[];
};

const AGENT_CONFIGS: Record<string, AgentConfig> = {
  'visual-qa': {
    icon: Eye,
    titleKey: 'agent.visualQA.title',
    subtitleKey: 'agent.visualQA.subtitle',
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    capKeys: ['agent.visualQA.cap1', 'agent.visualQA.cap2', 'agent.visualQA.cap3', 'agent.visualQA.cap4'],
    scenarioKeys: [
      { title: 'agent.visualQA.s1', desc: 'agent.visualQA.s1d' },
      { title: 'agent.visualQA.s2', desc: 'agent.visualQA.s2d' },
      { title: 'agent.visualQA.s3', desc: 'agent.visualQA.s3d' },
      { title: 'agent.visualQA.s4', desc: 'agent.visualQA.s4d' },
    ],
  },
  'auto-drive': {
    icon: Car,
    titleKey: 'agent.autoDrive.title',
    subtitleKey: 'agent.autoDrive.subtitle',
    color: 'text-green-500',
    bg: 'bg-green-50 dark:bg-green-950/40',
    capKeys: ['agent.autoDrive.cap1', 'agent.autoDrive.cap2', 'agent.autoDrive.cap3', 'agent.autoDrive.cap4'],
    scenarioKeys: [
      { title: 'agent.autoDrive.s1', desc: 'agent.autoDrive.s1d' },
      { title: 'agent.autoDrive.s2', desc: 'agent.autoDrive.s2d' },
      { title: 'agent.autoDrive.s3', desc: 'agent.autoDrive.s3d' },
      { title: 'agent.autoDrive.s4', desc: 'agent.autoDrive.s4d' },
    ],
  },
  industrial: {
    icon: Factory,
    titleKey: 'agent.industrial.title',
    subtitleKey: 'agent.industrial.subtitle',
    color: 'text-orange-500',
    bg: 'bg-orange-50 dark:bg-orange-950/40',
    capKeys: ['agent.industrial.cap1', 'agent.industrial.cap2', 'agent.industrial.cap3', 'agent.industrial.cap4'],
    scenarioKeys: [
      { title: 'agent.industrial.s1', desc: 'agent.industrial.s1d' },
      { title: 'agent.industrial.s2', desc: 'agent.industrial.s2d' },
      { title: 'agent.industrial.s3', desc: 'agent.industrial.s3d' },
      { title: 'agent.industrial.s4', desc: 'agent.industrial.s4d' },
    ],
  },
  'doc-ai': {
    icon: FileSearch,
    titleKey: 'agent.docAI.title',
    subtitleKey: 'agent.docAI.subtitle',
    color: 'text-purple-500',
    bg: 'bg-purple-50 dark:bg-purple-950/40',
    capKeys: ['agent.docAI.cap1', 'agent.docAI.cap2', 'agent.docAI.cap3', 'agent.docAI.cap4'],
    scenarioKeys: [
      { title: 'agent.docAI.s1', desc: 'agent.docAI.s1d' },
      { title: 'agent.docAI.s2', desc: 'agent.docAI.s2d' },
      { title: 'agent.docAI.s3', desc: 'agent.docAI.s3d' },
      { title: 'agent.docAI.s4', desc: 'agent.docAI.s4d' },
    ],
  },
  discover: {
    icon: Compass,
    titleKey: 'agent.discover.title',
    subtitleKey: 'agent.discover.subtitle',
    color: 'text-pink-500',
    bg: 'bg-pink-50 dark:bg-pink-950/40',
    capKeys: ['agent.discover.cap1', 'agent.discover.cap2', 'agent.discover.cap3', 'agent.discover.cap4'],
    scenarioKeys: [
      { title: 'agent.discover.s1', desc: 'agent.discover.s1d' },
      { title: 'agent.discover.s2', desc: 'agent.discover.s2d' },
      { title: 'agent.discover.s3', desc: 'agent.discover.s3d' },
      { title: 'agent.discover.s4', desc: 'agent.discover.s4d' },
    ],
  },
};

const AgentPage = () => {
  const navigate = useNavigate();
  const { agentType } = useParams<{ agentType: string }>();
  const { t } = useI18n();

  const config = agentType ? AGENT_CONFIGS[agentType] : undefined;

  if (!config) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p>{t('agent.notFound')}</p>
      </div>
    );
  }

  const Icon = config.icon;

  const handleStart = () => {
    navigate(`/agent/${agentType}/workspace`);
  };

  return (
    <div className="w-full h-full flex flex-col">
      <DragArea />
      <div className="w-full h-full flex flex-col items-center justify-center p-6 overflow-auto">
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 left-4"
          onClick={() => navigate('/')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t('agent.back')}
        </Button>

        <div className="max-w-2xl w-full space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl ${config.bg} flex items-center justify-center`}>
              <Icon className={`h-10 w-10 ${config.color}`} />
            </div>
            <h1 className="text-3xl font-semibold">{t(config.titleKey)}</h1>
            <p className="text-muted-foreground text-center">{t(config.subtitleKey)}</p>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">{t('agent.coreCapabilities')}</h2>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {config.capKeys.map((key, idx) => (
                <li key={idx}>• {t(key)}</li>
              ))}
            </ul>
          </div>

          <div className="space-y-4">
            <h2 className="text-lg font-medium">{t('agent.scenarios')}</h2>
            <div className="grid grid-cols-2 gap-3">
              {config.scenarioKeys.map((s, idx) => (
                <div key={idx} className="p-3 rounded-lg border bg-card">
                  <p className="font-medium text-sm">{t(s.title)}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t(s.desc)}</p>
                </div>
              ))}
            </div>
          </div>

          <Button className="w-full" size="lg" onClick={handleStart}>
            {t('agent.startUsing')} {t(config.titleKey)}
          </Button>
        </div>
      </div>
      <DragArea />
    </div>
  );
};

export default AgentPage;
