import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18n } from "i18n-js";
import { useEffect, useState } from "react";

import { translations } from "../constants/translations";

type AppLocale = "tr" | "en";

const STORAGE_KEY = "language";
const LEGACY_STORAGE_KEY = "readygo_language";
const DEFAULT_LOCALE: AppLocale = "tr";

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = DEFAULT_LOCALE;
i18n.locale = DEFAULT_LOCALE;

const listeners = new Set<(locale: AppLocale) => void>();

function isAppLocale(value: string | null): value is AppLocale {
  return value === "tr" || value === "en";
}

function notify(locale: AppLocale) {
  listeners.forEach((listener) => listener(locale));
}

async function readSavedLocale(): Promise<AppLocale | null> {
  const saved = await AsyncStorage.getItem(STORAGE_KEY);
  if (isAppLocale(saved)) return saved;

  const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
  if (isAppLocale(legacy)) {
    await AsyncStorage.setItem(STORAGE_KEY, legacy);
    await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    return legacy;
  }

  return null;
}

export async function initI18n(): Promise<void> {
  const saved = await readSavedLocale();
  const locale = saved ?? DEFAULT_LOCALE;
  i18n.locale = locale;
  notify(locale);
}

export async function setLanguage(locale: AppLocale): Promise<void> {
  i18n.locale = locale;
  await AsyncStorage.setItem(STORAGE_KEY, locale);
  notify(locale);
}

export function getLanguage(): AppLocale {
  return (i18n.locale?.startsWith("tr") ? "tr" : "en") as AppLocale;
}

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, options) as string;
}

export function useTranslation() {
  const [locale, setLocale] = useState<AppLocale>(getLanguage());

  useEffect(() => {
    const handler = (nextLocale: AppLocale) => setLocale(nextLocale);
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return {
    t,
    locale,
    setLanguage,
  };
}
