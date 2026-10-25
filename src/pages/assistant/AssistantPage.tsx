import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

import { ChatPageLayout, ChatThread } from "@dev-mainsequence/command-center-ai";
import {
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";

import { useAssistant } from "../../app/assistant/AssistantProvider";
import { InfoNotice } from "../../components/Notices";

export function AssistantPage() {
  const assistant = useAssistant();
  const navigate = useNavigate();
  const location = useLocation();
  const [, setParams] = useSearchParams();
  const returnTo = (location.state as { returnTo?: string } | null)?.returnTo ?? "/takes";

  if (!assistant.enabled) {
    return (
      <ApplicationPage maxWidth="content">
        <ApplicationPageHeader
          description="Chat with the Hunch Agent about your takes, baskets, reviews and proposals."
          eyebrow="Assistant"
          title={assistant.displayName}
        />
        <ApplicationPageStack>
          <InfoNotice tone="warning">
            {assistant.unavailableReason ?? "The Hunch Agent is not available right now."}
          </InfoNotice>
        </ApplicationPageStack>
      </ApplicationPage>
    );
  }

  const setSession = (sessionId: string | null) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (sessionId) next.set("session", sessionId);
        else next.delete("session");
        return next;
      },
      { replace: true },
    );
  };

  return (
    <ApplicationPage maxWidth="full">
      <div className="hunch-assistant-page">
        <ChatPageLayout
          explorer={{ onOpenSession: setSession }}
          onCreateSession={() => setSession(null)}
          onMinimize={() => {
            navigate(returnTo);
            assistant.openRail();
          }}
        >
          <ChatThread copy={assistant.copy} surface="page" viewer={assistant.viewer} />
        </ChatPageLayout>
      </div>
    </ApplicationPage>
  );
}
