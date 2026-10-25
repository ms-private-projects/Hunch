import { Link } from "react-router-dom";

import { ApplicationPage, ApplicationPageHeader } from "@dev-mainsequence/command-center-sdk/layout";

export function NotFoundPage() {
  return (
    <ApplicationPage maxWidth="content">
      <ApplicationPageHeader
        description={
          <>
            There is nothing at this address. <Link className="hunch-link" to="/takes">Back to your takes</Link>.
          </>
        }
        title="Page not found"
      />
    </ApplicationPage>
  );
}
