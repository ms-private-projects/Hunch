import { Bell, Bot, Landmark, Lightbulb, ListChecks, Plus, Trophy } from "lucide-react";

import {
  defineNavigationApplication,
  type NavigationIcon,
} from "@dev-mainsequence/command-center-sdk/navigation";

const icon = (component: unknown) => component as NavigationIcon;

/** One work area, one level: the durable destinations of Hunch. */
export const navigationApplication = defineNavigationApplication({
  id: "hunch",
  label: "Hunch",
  defaultDestinationId: "takes",
  subApplications: [
    {
      id: "hunch",
      label: "Hunch",
      destinations: [
        { id: "takes", label: "Takes", href: "/takes", icon: icon(Lightbulb), order: 1 },
        { id: "new-take", label: "New take", href: "/takes/new", icon: icon(Plus), order: 2 },
        { id: "leaderboard", label: "Leaderboard", href: "/leaderboard", icon: icon(Trophy), order: 3 },
        { id: "accounts", label: "Accounts", href: "/accounts", icon: icon(Landmark), order: 4 },
        { id: "proposals", label: "Proposals", href: "/proposals", icon: icon(ListChecks), order: 5 },
        { id: "notifications", label: "Notifications", href: "/notifications", icon: icon(Bell), order: 6 },
        { id: "assistant", label: "Assistant", href: "/assistant", icon: icon(Bot), order: 7 },
      ],
    },
  ],
});

/** The destination a pathname belongs to. */
export function resolveActiveDestination(pathname: string): string {
  if (pathname === "/takes/new") return "new-take";
  if (pathname.startsWith("/takes")) return "takes";
  if (pathname.startsWith("/leaderboard")) return "leaderboard";
  if (pathname.startsWith("/accounts")) return "accounts";
  if (pathname.startsWith("/proposals")) return "proposals";
  if (pathname.startsWith("/notifications")) return "notifications";
  if (pathname.startsWith("/assistant")) return "assistant";
  return "takes";
}
