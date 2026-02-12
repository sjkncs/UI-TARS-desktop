/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useTheme } from 'next-themes';
import { Moon, Sun, Globe, Activity, Link, Maximize } from 'lucide-react';

import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
} from '@renderer/components/ui/sidebar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@renderer/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@renderer/components/ui/dropdown-menu';
import { useSetting } from '@renderer/hooks/useSetting';
import { useI18n } from '@renderer/i18n/useI18n';

/**
 * Theme toggle button
 */
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton
            className="font-medium"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            <span>{theme === 'dark' ? t('nav.lightMode') : t('nav.darkMode')}</span>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{t('nav.toggleTheme')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Language switcher
 */
function LanguageSwitcher() {
  const { settings, updateSetting } = useSetting();
  const { t } = useI18n();
  const currentLanguage = settings?.language || 'zh';

  const handleLanguageChange = async (lang: 'zh' | 'en') => {
    try {
      await updateSetting({ ...settings, language: lang });
    } catch (error) {
      console.error('[LanguageSwitcher] Failed to update language:', error);
    }
  };

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton className="font-medium">
                <Globe className="h-4 w-4" />
                <span>{currentLanguage === 'zh' ? '中文' : 'English'}</span>
              </SidebarMenuButton>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>{t('nav.switchLanguage')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent side="right" align="start">
        <DropdownMenuItem onClick={() => handleLanguageChange('zh')}>
          {currentLanguage === 'zh' ? '✓ ' : ''}中文
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleLanguageChange('en')}>
          {currentLanguage === 'en' ? '✓ ' : ''}English
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/**
 * Performance dashboard quick entry
 */
function DashboardEntry({ onClick }: { onClick?: () => void }) {
  const { t } = useI18n();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton className="font-medium" onClick={onClick}>
            <Activity className="h-4 w-4" />
            <span>{t('nav.dashboard')}</span>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{t('nav.perfOptimization')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * API Service - opens external VLM service platform
 */
function ApiServiceEntry() {
  const { settings } = useSetting();
  const { t } = useI18n();

  const handleOpenService = () => {
    const providerUrls: Record<string, string> = {
      alibaba: 'https://www.aliyun.com/product/bailian',
      openai: 'https://platform.openai.com/',
      azure: 'https://portal.azure.com/',
      doubao: 'https://www.volcengine.com/product/doubao',
      deepseek: 'https://platform.deepseek.com/',
    };

    const provider = settings?.vlmProvider?.toLowerCase() || '';
    const url =
      providerUrls[provider] || 'https://www.aliyun.com/product/bailian';

    window.electron.ipcRenderer.invoke('system:openExternal', { url });
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton className="font-medium" onClick={handleOpenService}>
            <Link className="h-4 w-4" />
            <span>{t('nav.apiService')}</span>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{t('nav.openApiPlatform')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Fullscreen toggle
 */
function FullscreenToggle() {
  const { t } = useI18n();
  const handleToggle = async () => {
    try {
      await window.electron.ipcRenderer.invoke('system:toggleFullscreen');
    } catch (error) {
      console.error('[Fullscreen] Toggle failed:', error);
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <SidebarMenuButton className="font-medium" onClick={handleToggle}>
            <Maximize className="h-4 w-4" />
            <span>{t('nav.fullscreen')}</span>
          </SidebarMenuButton>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>{t('nav.toggleFullscreen')}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

interface NavToolbarProps {
  onDashboardClick?: () => void;
}

export function NavToolbar({ onDashboardClick }: NavToolbarProps) {
  return (
    <SidebarGroup>
      <SidebarMenu className="items-center gap-0.5">
        <ThemeToggle />
        <LanguageSwitcher />
        <ApiServiceEntry />
        <DashboardEntry onClick={onDashboardClick} />
        <FullscreenToggle />
      </SidebarMenu>
    </SidebarGroup>
  );
}
