import { useCallback, useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";

import { Badge } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationNavigationPanelShell,
  findNavigationDestination,
  type NavigationIntent,
} from "@dev-mainsequence/command-center-sdk/navigation";

import { AssistantRail } from "../assistant/AssistantRail";
import { useUnread } from "../notifications/UnreadProvider";
import { navigationApplication, resolveActiveDestination } from "./navigation";
import { SiteFooter } from "./SiteFooter";

/** Depth-one navigation; the SDK owns the docked panel and the phone drawer. */
export function ApplicationShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const { unread } = useUnread();
  const [menuOpen, setMenuOpen] = useState(false);

  const onNavigate = useCallback(
    (intent: NavigationIntent) => {
      const found = findNavigationDestination(navigationApplication, intent.destinationId);
      if (found?.destination.href) navigate(found.destination.href);
      setMenuOpen(false);
    },
    [navigate],
  );

  return (
    <ApplicationNavigationPanelShell
      activeDestinationId={resolveActiveDestination(location.pathname)}
      application={navigationApplication}
      menuLabel="Hunch navigation"
      menuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      onNavigate={onNavigate}
      presentation="auto"
      renderDestinationTrailing={({ destination }) =>
        destination.id === "notifications" && unread > 0 ? (
          <Badge aria-label={`${unread} unread`} variant="primary">
            {unread > 99 ? "99+" : unread}
          </Badge>
        ) : null
      }
    >
      <div className="hunch-content">
        <Outlet />
        <SiteFooter />
      </div>
      <AssistantRail />
    </ApplicationNavigationPanelShell>
  );
}
