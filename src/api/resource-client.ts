import type {
  ResourceHttpClient,
  ResourceHttpRequest,
} from "@dev-mainsequence/command-center-sdk/resource";

import { apiRequest } from "./client";

/** The SDK resource adapters' HTTP client, over the same transport as every other call. */
export const resourceHttpClient: ResourceHttpClient = {
  request<TResponse>(request: ResourceHttpRequest): Promise<TResponse> {
    return apiRequest<TResponse>({
      method: request.method,
      path: request.path,
      query: request.query,
      body: request.body,
      signal: request.signal,
    });
  },
};
