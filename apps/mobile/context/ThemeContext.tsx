import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useColorScheme } from "react-native";

type ThemeContextValue = {
  isDark: boolean;
  toggleDark: () => Promise<void>;
  setDarkMode: (value: boolean) => Promise<void>;
  isReady: boolean;
};

const STORAGE_KEY = "darkMode";

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemScheme === "dark");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreference() {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (cancelled) return;
        if (saved === "true") setIsDark(true);
        else if (saved === "false") setIsDark(false);
        else setIsDark(systemScheme === "dark");
      } finally {
        if (!cancelled) setIsReady(true);
      }
    }

    void loadPreference();
    return () => {
      cancelled = true;
    };
  }, [systemScheme]);

  const setDarkMode = useCallback(async (value: boolean) => {
    setIsDark(value);
    await AsyncStorage.setItem(STORAGE_KEY, String(value));
  }, []);

  const toggleDark = useCallback(async () => {
    const next = !isDark;
    setIsDark(next);
    await AsyncStorage.setItem(STORAGE_KEY, String(next));
  }, [isDark]);

  const value = useMemo(
    () => ({ isDark, toggleDark, setDarkMode, isReady }),
    [isDark, toggleDark, setDarkMode, isReady]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useDarkMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useDarkMode must be used within ThemeProvider");
  }
  return context;
}
