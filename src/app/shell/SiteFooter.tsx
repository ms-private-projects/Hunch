import { useConfiguration } from "../config/ConfigurationContext";
import { ThemeToggle } from "../theme/ThemeToggle";

export function SiteFooter() {
  const { configuration } = useConfiguration();
  const { research } = configuration;
  const model = research.models?.research?.model ?? research.inference_model;
  return (
    <footer className="hunch-footer">
      <div className="hunch-footer__row">
        <span>
          Hunch · API {configuration.api_version} · research {research.mode}
          {research.mode === "inference" && model ? ` (${model})` : ""}
        </span>
        <ThemeToggle />
      </div>
      <ul>
        {configuration.disclaimers.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </footer>
  );
}
