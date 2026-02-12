/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useSetting } from '../hooks/useSetting';
import { translations, type TranslationKey, type Language } from './translations';

export function useI18n() {
  const { settings } = useSetting();
  const lang: Language = (settings?.language as Language) || 'zh';

  const t = (key: TranslationKey): string => {
    const entry = translations[key];
    if (!entry) return key;
    return entry[lang] || entry['en'] || key;
  };

  return { t, lang };
}
