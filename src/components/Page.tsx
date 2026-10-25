import type { ReactNode } from "react";

import { ApplicationCard } from "@dev-mainsequence/command-center-sdk/layout";

/** A standard card with an `h2` header and an optional action row. */
export function SectionCard({
  title,
  actions,
  children,
  contentPadding,
}: {
  title: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  contentPadding?: "none" | "standard";
}) {
  return (
    <ApplicationCard
      contentPadding={contentPadding}
      header={
        <div className="hunch-item-head">
          <h2 className="hunch-section-title">{title}</h2>
          {actions ? <div className="hunch-actions">{actions}</div> : null}
        </div>
      }
    >
      {children}
    </ApplicationCard>
  );
}
