import { useConfiguration } from "../config/ConfigurationContext";
import { ThemeToggle } from "../theme/ThemeToggle";

export function SiteFooter() {
  const { configuration } = useConfiguration();
  return (
    <footer className="hunch-footer">
      <div className="hunch-footer__row">
        <span>
          Hunch · API {configuration.api_version} · research {configuration.research.mode}
          {configuration.research.inference_model ? ` (${configuration.research.inference_model})` : ""}
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
