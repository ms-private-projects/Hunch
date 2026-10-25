import {
  applyThemePresetToRoot,
  mainSequenceSpaceTheme,
  quartzLightTheme,
  resolveCommandCenterThemeById,
  type ThemePreset,
} from "@dev-mainsequence/command-center-sdk/theme";

export type ThemeMode = "light" | "dark";

export const THEME_STORAGE_KEY = "hunch.theme-mode";

/** Quartz Light by default; Main Sequence Space for the dark mode. */
export const themePresets: Record<ThemeMode, ThemePreset> = {
  light: quartzLightTheme,
  dark: mainSequenceSpaceTheme,
};

export function readStoredThemeMode(): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

export function storeThemeMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // Storage is a convenience; the mode still applies for this page.
  }
}

export function resolveInitialThemeMode(): ThemeMode {
  return readStoredThemeMode() ?? "light";
}

export function applyThemeMode(mode: ThemeMode): void {
  applyThemePreset(themePresets[mode], mode);
}

/** A host-supplied preset id, with the mode as the fallback for an unknown id. */
export function applyHostTheme(themeId: string, themeMode: ThemeMode): void {
  const preset = resolveCommandCenterThemeById(themeId) ?? themePresets[themeMode];
  applyThemePreset(preset, preset.mode);
}

function applyThemePreset(preset: ThemePreset, mode: ThemeMode): void {
  applyThemePresetToRoot(document.documentElement, { theme: preset });
  document.documentElement.style.colorScheme = mode;
}
