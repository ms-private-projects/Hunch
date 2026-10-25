/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** The Command Center origin that embeds a hosted build; the platform sets it in its builds. */
  readonly VITE_COMMAND_CENTER_ORIGIN?: string;
  /** The Hunch API ResourceRelease a hosted build calls through the host's delegated transport. */
  readonly VITE_HUNCH_API_RELEASE_UID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
