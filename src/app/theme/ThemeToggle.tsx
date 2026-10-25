import { Moon, Sun } from "lucide-react";

import { Button } from "@dev-mainsequence/command-center-sdk/controls";

import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { mode, toggle } = useTheme();
  const next = mode === "light" ? "dark" : "light";
  return (
    <Button
      aria-label={`Switch to the ${next} theme`}
      iconOnly
      onClick={toggle}
      size="small"
      title={`Switch to the ${next} theme`}
      variant="ghost"
    >
      {mode === "light" ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
    </Button>
  );
}
