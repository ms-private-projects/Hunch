import { useEffect, useState, type FormEvent } from "react";

import { Button } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationCard,
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";

import { api } from "../../api/hunch";
import type { ProfileResource, ProfileUpdateBody } from "../../api/types";
import { useAction, useQuery } from "../../api/useQuery";
import { useNotices } from "../../app/notices/NoticesProvider";
import { SelectField, TextField, YES_NO_OPTIONS } from "../../components/fields";
import { KeyValueList } from "../../components/KeyValueList";
import { ErrorNotice, LoadingNotice } from "../../components/Notices";
import { formatDateTime, shortUid } from "../../lib/format";

const HANDLE_PATTERN = /^[A-Za-z0-9_.-]{3,32}$/;

function IdentityCard({ profile, onSaved }: { profile: ProfileResource; onSaved: (next: ProfileResource) => void }) {
  const { notify } = useNotices();
  const action = useAction();
  const [handle, setHandle] = useState(profile.handle);
  const [displayName, setDisplayName] = useState(profile.display_name ?? "");

  useEffect(() => {
    setHandle(profile.handle);
    setDisplayName(profile.display_name ?? "");
  }, [profile.display_name, profile.handle]);

  const handleError =
    handle.trim() && !HANDLE_PATTERN.test(handle.trim()) ? "3 to 32 letters, digits, dots, dashes or underscores." : undefined;
  const changes: ProfileUpdateBody = {
    ...(handle.trim() !== profile.handle ? { handle: handle.trim() } : {}),
    ...(displayName.trim() !== (profile.display_name ?? "") ? { display_name: displayName.trim() } : {}),
  };
  const dirty = Object.keys(changes).length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty || handleError || !handle.trim()) return;
    const next = await action.run(() => api.profile.update(changes));
    if (!next) return;
    onSaved(next);
    notify({ title: "Profile saved", description: `You appear as @${next.handle}.`, variant: "success" });
  }

  return (
    <form noValidate onSubmit={submit}>
      <ApplicationCard
        footer={
          <div className="hunch-actions">
            <Button disabled={!dirty || Boolean(handleError) || !handle.trim()} pending={action.pending} type="submit" variant="primary">
              Save
            </Button>
          </div>
        }
        header={<h2 className="hunch-section-title">Identity</h2>}
      >
        <div className="hunch-form-stack">
          {action.error ? <ErrorNotice error={action.error} /> : null}
          <TextField
            description="Shown on published takes and the leaderboard; it must be unique."
            error={handleError}
            label="Handle"
            onChange={setHandle}
            required
            value={handle}
          />
          <TextField description="Optional. Shown next to your handle." label="Display name" onChange={setDisplayName} value={displayName} />
        </div>
      </ApplicationCard>
    </form>
  );
}

function DigestCard({ profile, onSaved }: { profile: ProfileResource; onSaved: (next: ProfileResource) => void }) {
  const { notify } = useNotices();
  const action = useAction();
  const [digest, setDigest] = useState<"yes" | "no">(profile.email_digest ? "yes" : "no");
  const [address, setAddress] = useState(profile.email_address ?? "");

  useEffect(() => {
    setDigest(profile.email_digest ? "yes" : "no");
    setAddress(profile.email_address ?? "");
  }, [profile.email_address, profile.email_digest]);

  const wantDigest = digest === "yes";
  const changes: ProfileUpdateBody = {
    ...(wantDigest !== profile.email_digest ? { email_digest: wantDigest } : {}),
    // An empty address clears the override; the API then uses the account email.
    ...(address.trim() !== (profile.email_address ?? "") ? { email_address: address.trim() } : {}),
  };
  const dirty = Object.keys(changes).length > 0;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!dirty) return;
    const next = await action.run(() => api.profile.update(changes));
    if (!next) return;
    onSaved(next);
    notify({
      title: next.email_digest ? "Email digest on" : "Email digest off",
      description: next.email_digest
        ? `Sent to ${next.email_address ?? "your Main Sequence account email"} after each trading day.`
        : undefined,
      variant: "success",
    });
  }

  return (
    <form noValidate onSubmit={submit}>
      <ApplicationCard
        footer={
          <div className="hunch-actions">
            <Button disabled={!dirty} pending={action.pending} type="submit" variant="primary">
              Save
            </Button>
          </div>
        }
        header={<h2 className="hunch-section-title">Email digest</h2>}
      >
        <div className="hunch-form-stack">
          <p className="hunch-prose hunch-muted">
            The digest arrives once per trading day, after the daily reviews. It includes the reviews, the executions and
            the proposals waiting for your decision.
          </p>
          {action.error ? <ErrorNotice error={action.error} /> : null}
          <SelectField label="Send the email digest" onChange={(value) => setDigest(value === "no" ? "no" : "yes")} options={YES_NO_OPTIONS} value={digest} />
          <TextField
            autoComplete="email"
            description="Leave empty to use your Main Sequence account email."
            label="Email address"
            onChange={setAddress}
            placeholder="you@example.com"
            value={address}
          />
        </div>
      </ApplicationCard>
    </form>
  );
}

export function ProfilePage() {
  const profile = useQuery((signal) => api.profile.get(signal), []);
  const data = profile.data;

  return (
    <ApplicationPage maxWidth="content">
      <ApplicationPageHeader
        description="How you appear to other Hunch users, and how Hunch keeps you posted."
        eyebrow="Profile"
        title={data ? `@${data.handle}` : "Profile"}
      />
      <ApplicationPageStack>
        {profile.error ? <ErrorNotice error={profile.error} onRetry={profile.refetch} /> : null}
        {profile.loading ? <LoadingNotice label="Loading your profile…" /> : null}
        {data ? (
          <>
            <IdentityCard onSaved={profile.setData} profile={data} />
            <DigestCard onSaved={profile.setData} profile={data} />
            <ApplicationCard header={<h2 className="hunch-section-title">Account</h2>}>
              <KeyValueList
                items={[
                  { key: "uid", label: "User uid", value: <span className="hunch-code">{shortUid(data.user_uid)}</span> },
                  { key: "created", label: "Member since", value: formatDateTime(data.created_at) },
                  { key: "updated", label: "Last updated", value: formatDateTime(data.updated_at) },
                ]}
              />
            </ApplicationCard>
          </>
        ) : null}
      </ApplicationPageStack>
    </ApplicationPage>
  );
}
