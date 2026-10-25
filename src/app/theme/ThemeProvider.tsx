import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { applyThemeMode, resolveInitialThemeMode, storeThemeMode, type ThemeMode } from "./theme";

interface ThemeValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(resolveInitialThemeMode);

  useEffect(() => {
    applyThemeMode(mode);
  }, [mode]);

  const setMode = useCallback((next: ThemeMode) => {
    storeThemeMode(next);
    setModeState(next);
  }, []);
  const toggle = useCallback(() => setMode(mode === "light" ? "dark" : "light"), [mode, setMode]);
  const value = useMemo(() => ({ mode, setMode, toggle }), [mode, setMode, toggle]);

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeValue {
  const value = useContext(ThemeContext);
  if (!value) throw new Error("useTheme needs a ThemeProvider.");
  return value;
}
