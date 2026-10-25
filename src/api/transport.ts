/**
 * How the page reaches the Hunch API and, when the chat needs it, the platform.
 *
 * - Local: a top-level page under Vite. API requests go same-origin to `/v1/...`, which the dev
 *   server proxies to the loopback API; that API injects its own identity, so the browser never
 *   sends a credential. Platform requests go to the dev server's `/__mainsequence__` proxy.
 * - Hosted: the site is framed by Command Center. API requests use the SDK's delegated FastAPI
 *   transport for the release named at build time; platform requests go through the host.
 */
import {
  createStaticSiteIframeClient,
  type StaticSiteIframeContext,
} from "@dev-mainsequence/command-center-sdk/embed";

export type PlatformRequestRoute = "dev-server" | "host" | "unsupported";

export interface ApiTransport {
  readonly kind: "local" | "hosted";
  readonly platformRequests: PlatformRequestRoute;
  /** The host's context (theme and person) for a hosted page; null when top-level. */
  readonly context: StaticSiteIframeContext | null;
  fetch(path: string, init?: RequestInit): Promise<Response>;
  sendPlatformRequest(request: Request): Promise<Response>;
  subscribeContext(listener: (context: StaticSiteIframeContext) => void): () => void;
}

const HOST_HANDSHAKE_TIMEOUT_MS = 15_000;
const IFRAME_CHANNEL = "mainsequence.hunch" as const;

function runsTopLevel(): boolean {
  return typeof window !== "undefined" && window.parent === window;
}

function readHostOrigin(): string | null {
  const value = import.meta.env.VITE_COMMAND_CENTER_ORIGIN;
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

/** Whether this page is a hosted build framed by Command Center. */
export function isHostedPage(): boolean {
  return readHostOrigin() !== null && !runsTopLevel();
}

function createLocalTransport(): ApiTransport {
  const platformRequests: PlatformRequestRoute =
    import.meta.env.DEV && runsTopLevel() ? "dev-server" : "unsupported";
  return {
    kind: "local",
    platformRequests,
    context: null,
    fetch: (path, init) => fetch(path, { ...init, credentials: "same-origin" }),
    async sendPlatformRequest(request) {
      if (platformRequests !== "dev-server") {
        throw new Error("Platform requests are only available inside the Command Center host.");
      }
      const { pathname, search } = new URL(request.url);
      const bodyless = request.method === "GET" || request.method === "HEAD";
      return fetch(`/__mainsequence__${pathname}${search}`, {
        method: request.method,
        headers: request.headers,
        body: bodyless ? undefined : await request.text(),
        signal: request.signal,
      });
    },
    subscribeContext: () => () => {},
  };
}

async function createHostedTransport(hostOrigin: string): Promise<ApiTransport> {
  const releaseUid = (import.meta.env.VITE_HUNCH_API_RELEASE_UID ?? "").trim();
  if (!releaseUid) {
    throw new Error("This hosted build names no Hunch API release (VITE_HUNCH_API_RELEASE_UID).");
  }
  const listeners = new Set<(context: StaticSiteIframeContext) => void>();
  let context: StaticSiteIframeContext | null = null;
  let resolveFirstContext: ((context: StaticSiteIframeContext) => void) | null = null;
  const firstContext = new Promise<StaticSiteIframeContext>((resolve) => {
    resolveFirstContext = resolve;
  });
  const client = createStaticSiteIframeClient({
    channel: IFRAME_CHANNEL,
    hostOrigin,
    parentWindow: window.parent,
    onContext: (next) => {
      context = next;
      if (resolveFirstContext) {
        resolveFirstContext(next);
        resolveFirstContext = null;
      }
      listeners.forEach((listener) => listener(next));
    },
  });
  window.addEventListener("message", (event) => {
    client.handleMessage(event);
  });
  client.announceReady();
  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(
      () => reject(new Error("The Command Center host did not complete the handshake.")),
      HOST_HANDSHAKE_TIMEOUT_MS,
    );
  });
  await Promise.race([firstContext, timeout]);
  return {
    kind: "hosted",
    platformRequests: "host",
    get context() {
      return context;
    },
    fetch: (path, init) => client.fetchFastApi({ resourceReleaseUid: releaseUid, path }, init),
    sendPlatformRequest: (request) => client.sendPlatformRequest(request),
    subscribeContext(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}

let current: ApiTransport | null = null;
let connecting: Promise<ApiTransport> | null = null;

/** The transport in use. Before `connectTransport` resolves it is the local one. */
export function getTransport(): ApiTransport {
  if (!current) current = createLocalTransport();
  return current;
}

/** Choose and connect the transport once; later calls return the same one. */
export function connectTransport(): Promise<ApiTransport> {
  if (!connecting) {
    const hostOrigin = readHostOrigin();
    connecting = (hostOrigin && !runsTopLevel()
      ? createHostedTransport(hostOrigin)
      : Promise.resolve(createLocalTransport())
    ).then((transport) => {
      current = transport;
      return transport;
    });
    connecting.catch(() => {
      connecting = null;
    });
  }
  return connecting;
}
