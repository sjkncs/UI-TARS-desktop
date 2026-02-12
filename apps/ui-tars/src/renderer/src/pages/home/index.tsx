/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import { useNavigate } from 'react-router';
import {
  Info,
  Eye,
  Car,
  Factory,
  FileSearch,
  Compass,
} from 'lucide-react';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { Button } from '@renderer/components/ui/button';
import { Alert, AlertDescription } from '@renderer/components/ui/alert';
import { useI18n } from '@renderer/i18n/useI18n';
import type { TranslationKey } from '@renderer/i18n/translations';

import { Operator } from '@main/store/types';
import { useSession } from '../../hooks/useSession';
import {
  checkVLMSettings,
  LocalSettingsDialog,
} from '@renderer/components/Settings/local';

import computerUseImg from '@resources/home_img/computer_use.png?url';
import browserUseImg from '@resources/home_img/browser_use.png?url';
import { sleep } from '@ui-tars/shared/utils';

import { FreeTrialDialog } from '../../components/AlertDialog/freeTrialDialog';
import { DragArea } from '../../components/Common/drag';
import { OPERATOR_URL_MAP } from '../../const';

const Home = () => {
  const navigate = useNavigate();
  const { createSession } = useSession();
  const { t: tHome } = useI18n();
  const [localConfig, setLocalConfig] = useState({
    open: false,
    operator: Operator.LocalComputer,
  });
  const [remoteConfig, setRemoteConfig] = useState({
    open: false,
    operator: Operator.RemoteComputer,
  });

  const toRemoteComputer = async (value: 'free' | 'paid') => {
    console.log('toRemoteComputer', value);
    const session = await createSession('New Session', {
      operator: Operator.RemoteComputer,
      isFree: value === 'free',
    });

    if (value === 'free') {
      navigate('/free-remote', {
        state: {
          operator: Operator.RemoteComputer,
          sessionId: session?.id,
          isFree: true,
          from: 'home',
        },
      });

      return;
    }

    navigate('/paid-remote', {
      state: {
        operator: Operator.RemoteComputer,
        sessionId: session?.id,
        isFree: false,
        from: 'home',
      },
    });
  };

  const toRemoteBrowser = async (value: 'free' | 'paid') => {
    console.log('toRemoteBrowser', value);

    const session = await createSession('New Session', {
      operator: Operator.RemoteBrowser,
      isFree: value === 'free',
    });

    if (value === 'free') {
      navigate('/free-remote', {
        state: {
          operator: Operator.RemoteBrowser,
          sessionId: session?.id,
          isFree: true,
          from: 'home',
        },
      });
      return;
    }

    navigate('/paid-remote', {
      state: {
        operator: Operator.RemoteBrowser,
        sessionId: session?.id,
        isFree: false,
        from: 'home',
      },
    });
  };

  /** local click logic start */
  const toLocal = async (operator: Operator) => {
    const session = await createSession('New Session', {
      operator: operator,
    });

    navigate('/local', {
      state: {
        operator: operator,
        sessionId: session?.id,
        from: 'home',
      },
    });
  };

  const handleLocalPress = async (operator: Operator) => {
    const hasVLM = await checkVLMSettings();

    if (hasVLM) {
      toLocal(operator);
    } else {
      setLocalConfig({ open: true, operator: operator });
    }
  };

  const handleFreeDialogComfirm = async () => {
    if (remoteConfig.operator === Operator.RemoteBrowser) {
      toRemoteBrowser('free');
    } else {
      toRemoteComputer('free');
    }
  };

  const handleRemoteDialogClose = (status: boolean) => {
    setRemoteConfig({ open: status, operator: remoteConfig.operator });
  };

  const handleLocalSettingsSubmit = async () => {
    setLocalConfig({ open: false, operator: localConfig.operator });

    await sleep(200);

    await toLocal(localConfig.operator);
  };

  const handleLocalSettingsClose = () => {
    setLocalConfig({ open: false, operator: localConfig.operator });
  };
  /** local click logic end */

  return (
    <div className="w-full h-full flex flex-col">
      <DragArea></DragArea>
      <div className="w-full h-full flex flex-col items-center justify-center">
        <h1 className="text-2xl font-semibold mt-1 mb-8">
          {tHome('home.welcome')}
        </h1>
        <Alert className="mb-4 w-[824px]">
          <Info className="h-4 w-4 mt-2" />
          <AlertDescription>
            <div className="flex items-center">
              <p className="text-sm text-muted-foreground">
                {tHome('home.alertRemote')}
              </p>
              <Button
                variant="link"
                className="p-0 text-blue-500 hover:text-blue-600 hover:underline cursor-pointer"
                onClick={() =>
                  window.open(
                    OPERATOR_URL_MAP[Operator.RemoteComputer].url,
                    '_blank',
                  )
                }
              >
                {tHome('home.computerOperator')}
              </Button>
              <span>{tHome('home.alertAnd')}</span>
              <Button
                variant="link"
                className="p-0 text-blue-500 hover:text-blue-600 hover:underline cursor-pointer"
                onClick={() =>
                  window.open(
                    OPERATOR_URL_MAP[Operator.RemoteBrowser].url,
                    '_blank',
                  )
                }
              >
                {tHome('home.browserOperator')}
              </Button>
            </div>
          </AlertDescription>
        </Alert>
        <div className="flex gap-6">
          <Card className="w-[400px] py-5">
            <CardHeader className="px-5">
              <CardTitle>{tHome('home.computerOperator')}</CardTitle>
              <CardDescription>
                {tHome('home.computerOperatorDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <img
                src={computerUseImg}
                alt=""
                className="w-full h-full aspect-video object-fill rounded-lg"
              />
            </CardContent>
            <CardFooter className="gap-3 px-5 flex justify-between">
              <Button
                onClick={() => handleLocalPress(Operator.LocalComputer)}
                className="w-full"
              >
                {tHome('home.useLocalComputer')}
              </Button>
            </CardFooter>
          </Card>
          <Card className="w-[400px] py-5">
            <CardHeader className="px-5">
              <CardTitle>{tHome('home.browserOperator')}</CardTitle>
              <CardDescription>
                {tHome('home.browserOperatorDesc')}
              </CardDescription>
            </CardHeader>
            <CardContent className="px-5">
              <img
                src={browserUseImg}
                alt=""
                className="w-full h-full aspect-video object-fill rounded-lg"
              />
            </CardContent>
            <CardFooter className="gap-3 px-5 flex justify-between">
              <Button
                onClick={() => handleLocalPress(Operator.LocalBrowser)}
                className="w-full"
              >
                {tHome('home.useLocalBrowser')}
              </Button>
            </CardFooter>
          </Card>
        </div>
        {/* VLM Capability Showcase Tiles (Qwen-style) */}
        <div className="flex items-center gap-6 mt-8">
          {([
            {
              icon: Eye,
              labelKey: 'home.visualQA' as TranslationKey,
              route: 'visual-qa',
              color: 'text-blue-500',
              bg: 'bg-blue-50 dark:bg-blue-950/40',
            },
            {
              icon: Car,
              labelKey: 'home.autoDrive' as TranslationKey,
              route: 'auto-drive',
              color: 'text-green-500',
              bg: 'bg-green-50 dark:bg-green-950/40',
            },
            {
              icon: Factory,
              labelKey: 'home.industrial' as TranslationKey,
              route: 'industrial',
              color: 'text-orange-500',
              bg: 'bg-orange-50 dark:bg-orange-950/40',
            },
            {
              icon: FileSearch,
              labelKey: 'home.docAI' as TranslationKey,
              route: 'doc-ai',
              color: 'text-purple-500',
              bg: 'bg-purple-50 dark:bg-purple-950/40',
            },
            {
              icon: Compass,
              labelKey: 'home.discover' as TranslationKey,
              route: 'discover',
              color: 'text-pink-500',
              bg: 'bg-pink-50 dark:bg-pink-950/40',
            },
          ]).map((tile) => (
            <button
              key={tile.route}
              type="button"
              className="flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-accent/50 transition-colors cursor-pointer group"
              onClick={() => navigate(`/agent/${tile.route}`)}
            >
              <div
                className={`w-12 h-12 rounded-xl ${tile.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}
              >
                <tile.icon className={`h-6 w-6 ${tile.color}`} />
              </div>
              <span className="text-xs font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {tHome(tile.labelKey)}
              </span>
            </button>
          ))}
        </div>

        <LocalSettingsDialog
          isOpen={localConfig.open}
          onSubmit={handleLocalSettingsSubmit}
          onClose={handleLocalSettingsClose}
        />
        <FreeTrialDialog
          open={remoteConfig.open}
          onOpenChange={handleRemoteDialogClose}
          onConfirm={handleFreeDialogComfirm}
        />
      </div>
      <DragArea></DragArea>
    </div>
  );
};

export default Home;
