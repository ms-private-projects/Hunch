import { createContext, useContext } from "react";

import type { ApiTransport } from "../../api/transport";
import type { ProjectConfiguration } from "../../api/types";

export interface ConfigurationValue {
  configuration: ProjectConfiguration;
  transport: ApiTransport;
  /** Re-read `/v1/project-state/configuration` (for example when the assistant comes up). */
  refresh: () => Promise<void>;
}

export const ConfigurationContext = createContext<ConfigurationValue | null>(null);

export function useConfiguration(): ConfigurationValue {
  const value = useContext(ConfigurationContext);
  if (!value) throw new Error("useConfiguration needs the application to be ready.");
  return value;
}

/** Whether the signed-in person owns a record, by its owner uid. */
export function useIsOwner(ownerUserUid: string | null | undefined): boolean {
  const { configuration } = useConfiguration();
  // Without a request identity the API still authorises every action, so show them.
  if (!configuration.request_user_uid) return true;
  return ownerUserUid === configuration.request_user_uid;
}
