import { useLocation, useNavigate } from "react-router-dom";

import { ChatRail, ChatThread } from "@dev-mainsequence/command-center-ai";

import { ASSISTANT_ROUTE, useAssistant } from "./AssistantProvider";

/** The floating conversation rail; the take pages show the launcher that opens it. */
export function AssistantRail() {
  const assistant = useAssistant();
  const navigate = useNavigate();
  const location = useLocation();
  if (!assistant.enabled || !assistant.railOpen || location.pathname.startsWith(ASSISTANT_ROUTE)) {
    return null;
  }
  return (
    <ChatRail
      mode="overlay"
      onClose={assistant.closeRail}
      onExpand={() => {
        assistant.closeRail();
        navigate(ASSISTANT_ROUTE, { state: { returnTo: `${location.pathname}${location.search}` } });
      }}
      subtitle="Takes, baskets, proposals and reviews."
      title={assistant.displayName}
    >
      <ChatThread copy={assistant.copy} surface="overlay" viewer={assistant.viewer} />
    </ChatRail>
  );
}
