import AsyncStorage from "@react-native-async-storage/async-storage";
import { I18n } from "i18n-js";
import { getLocales } from "expo-localization";
import { useEffect, useState } from "react";

import { translations } from "../constants/translations";

type AppLocale = "tr" | "en";

const STORAGE_KEY = "readygo_language";
const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = "en";

const listeners = new Set<(locale: AppLocale) => void>();

function detectDeviceLocale(): AppLocale {
  const localeTag = getLocales()[0]?.languageCode?.toLowerCase();
  return localeTag === "tr" ? "tr" : "en";
}

function notify(locale: AppLocale) {
  listeners.forEach((listener) => listener(locale));
}

export async function initI18n(): Promise<void> {
  const saved = (await AsyncStorage.getItem(STORAGE_KEY)) as AppLocale | null;
  const locale = saved ?? detectDeviceLocale();
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
