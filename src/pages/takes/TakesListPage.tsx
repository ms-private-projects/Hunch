import { useMemo, type ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "@dev-mainsequence/command-center-sdk/controls";
import { ApplicationPage, ApplicationPageStack } from "@dev-mainsequence/command-center-sdk/layout";
import {
  createHttpResourceAdapter,
  defineResourceApplication,
  type ResourceColumnDefinition,
} from "@dev-mainsequence/command-center-sdk/resource";
import {
  ResourceIconLabelCell,
  ResourceListPage,
  ResourcePicker,
  ResourceStatusCell,
} from "@dev-mainsequence/command-center-sdk/views";

import { resourceHttpClient } from "../../api/resource-client";
import { TAKE_STATUSES, type Collection, type TakeResource } from "../../api/types";
import { formatDate, humanize } from "../../lib/format";
import { takeStatusTone } from "../../lib/status";

/** Local renderers keyed by the discovered column ids of `GET /v1/takes/discovery`. */
const columns: ResourceColumnDefinition<TakeResource, ReactNode>[] = [
  {
    id: "title",
    header: "Title",
    importance: "primary",
    renderCell: (take) => (
      <ResourceIconLabelCell
        label={take.title}
        meta={take.owner_handle ? `@${take.owner_handle}` : undefined}
      />
    ),
  },
  {
    id: "status",
    header: "Status",
    importance: "secondary",
    renderCell: (take) => <ResourceStatusCell label={humanize(take.status)} tone={takeStatusTone(take.status)} />,
  },
  {
    id: "execution-mode",
    header: "Mode",
    importance: "secondary",
    renderCell: (take) => <ResourceStatusCell label={humanize(take.execution_mode)} tone="neutral" />,
  },
  {
    id: "visibility",
    header: "Visibility",
    importance: "tertiary",
    renderCell: (take) => (
      <ResourceStatusCell
        label={humanize(take.visibility)}
        tone={take.visibility === "public" ? "info" : "neutral"}
      />
    ),
  },
  {
    id: "owner",
    header: "Owner",
    importance: "tertiary",
    renderCell: (take) => (take.owner_handle ? `@${take.owner_handle}` : "—"),
  },
  {
    id: "activated-at",
    header: "Active since",
    importance: "tertiary",
    renderCell: (take) => formatDate(take.activated_at),
  },
  {
    id: "created-at",
    header: "Created",
    importance: "tertiary",
    renderCell: (take) => formatDate(take.created_at),
  },
];

const takesApplication = defineResourceApplication<TakeResource, string>({
  id: "takes",
  label: "Takes",
  itemLabel: "takes",
  getId: (take) => take.uid,
  adapter: createHttpResourceAdapter<TakeResource, string, Collection<TakeResource>>({
    client: resourceHttpClient,
    endpoints: {
      list: "/v1/takes",
      discovery: "/v1/takes/discovery",
      detail: (uid) => `/v1/takes/${encodeURIComponent(uid)}`,
    },
    normalizeList: (response) => ({ items: response.items, pageInfo: response.pageInfo }),
    // The API pages by limit/offset and does not take a sort; the filters are its own keys.
    serializeListQuery: (request) => ({
      ...(request.filters ?? {}),
      limit: request.pageSize,
      offset: request.pageIndex * request.pageSize,
      ...(request.search ? { search: request.search } : {}),
    }),
  }),
  columns,
});

const ANY_STATUS = "__any__";
const statusOptions = [
  { value: ANY_STATUS, label: "Any status" },
  ...TAKE_STATUSES.map((status) => ({ value: status, label: humanize(status) })),
];

export function TakesListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope = params.get("scope") === "public" ? "public" : "mine";
  const status = params.get("status") ?? "";

  const update = (key: string, value: string) => {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );
  };

  const filters = useMemo(() => ({ scope, ...(status ? { status } : {}) }), [scope, status]);

  return (
    <ApplicationPage maxWidth="wide">
      <ApplicationPageStack>
        <ResourceListPage
          definition={takesApplication}
          emptyContent={
            <div className="hunch-empty">
              <p>
                {scope === "mine"
                  ? "No takes yet. Describe an investment thesis and Hunch turns it into a basket of US equities you can practise with, publish and fund."
                  : "Nobody has published a take yet."}
              </p>
              {scope === "mine" ? (
                <Button onClick={() => navigate("/takes/new")} variant="primary">
                  Create your first take
                </Button>
              ) : null}
            </div>
          }
          filterControls={
            <ResourcePicker
              ariaLabel="Status"
              fitContent
              mode="single"
              onValueChange={(value) => update("status", value === ANY_STATUS ? "" : value)}
              options={statusOptions}
              presentation="auto"
              value={status || ANY_STATUS}
            />
          }
          filters={filters}
          onRowActivate={(take) => navigate(`/takes/${encodeURIComponent(take.uid)}`)}
          primaryActions={[{ id: "new-take", label: "New take", onSelect: () => navigate("/takes/new") }]}
          refreshable
          searchPlaceholder="Search titles and theses"
          searchable
          tablePresentation="auto"
          toolbarLeading={
            <div className="hunch-actions" role="group" aria-label="Scope">
              <Button
                aria-pressed={scope === "mine"}
                onClick={() => update("scope", "")}
                size="small"
                variant={scope === "mine" ? "primary" : "outline"}
              >
                My takes
              </Button>
              <Button
                aria-pressed={scope === "public"}
                onClick={() => update("scope", "public")}
                size="small"
                variant={scope === "public" ? "primary" : "outline"}
              >
                Public
              </Button>
            </div>
          }
        />
      </ApplicationPageStack>
    </ApplicationPage>
  );
}
