import { useCallback } from "react";

type TranslationFn = (key: string) => string;

/**
 * Temporary i18n hook placeholder.
 * Replace with real translation provider when available.
 */
export function useI18n(): { t: TranslationFn } {
  const t = useCallback<TranslationFn>((key: string) => key, []);
  return { t };
}


