import { apiRequest } from "./client";
import type {
  BuildResponse,
  Collection,
  FundBody,
  FundResponse,
  FundingResource,
  HoldingsSnapshot,
  LeaderboardResponse,
  LinkAccountBody,
  LinkedAccountResource,
  NotificationsResponse,
  ProfileResource,
  ProfileUpdateBody,
  ProjectConfiguration,
  ProposalResource,
  ResearchResource,
  ResearchResponse,
  ReviewResource,
  RevisionResource,
  TabularFrame,
  TakeCreateBody,
  TakeResource,
  ThesisCritiqueResource,
  WeightsResponse,
} from "./types";

const takePath = (uid: string) => `/v1/takes/${encodeURIComponent(uid)}`;
const accountPath = (uid: string) => `/v1/profile/accounts/${encodeURIComponent(uid)}`;
const proposalPath = (uid: string) => `/v1/proposals/${encodeURIComponent(uid)}`;

export const api = {
  configuration: (signal?: AbortSignal) =>
    apiRequest<ProjectConfiguration>({ path: "/v1/project-state/configuration", signal }),

  profile: {
    get: (signal?: AbortSignal) => apiRequest<ProfileResource>({ path: "/v1/profile", signal }),
    update: (body: ProfileUpdateBody) =>
      apiRequest<ProfileResource>({ method: "PATCH", path: "/v1/profile", body }),
  },

  takes: {
    list: (query: Record<string, unknown>, signal?: AbortSignal) =>
      apiRequest<Collection<TakeResource>>({ path: "/v1/takes", query, signal }),
    get: (uid: string, signal?: AbortSignal) =>
      apiRequest<TakeResource>({ path: takePath(uid), signal }),
    create: (body: TakeCreateBody) =>
      apiRequest<TakeResource>({ method: "POST", path: "/v1/takes", body }),
    research: (uid: string) =>
      apiRequest<ResearchResponse>({ method: "POST", path: `${takePath(uid)}/actions/research`, body: {} }),
    researchList: (uid: string, signal?: AbortSignal) =>
      apiRequest<ResearchResource[]>({ path: `${takePath(uid)}/research`, query: { limit: 30 }, signal }),
    /** Portfolio construction from a stored research: the latest one unless `researchUid` names one. */
    build: (uid: string, researchUid?: string) =>
      apiRequest<BuildResponse>({
        method: "POST",
        path: `${takePath(uid)}/actions/build`,
        body: researchUid ? { research_uid: researchUid } : {},
      }),
    critique: (uid: string) =>
      apiRequest<ThesisCritiqueResource>({
        method: "POST",
        path: `${takePath(uid)}/actions/critique-thesis`,
        body: {},
      }),
    refresh: (uid: string) =>
      apiRequest<BuildResponse>({ method: "POST", path: `${takePath(uid)}/actions/refresh`, body: {} }),
    activatePractice: (uid: string) =>
      apiRequest<TakeResource>({ method: "POST", path: `${takePath(uid)}/actions/activate-practice` }),
    publish: (uid: string) =>
      apiRequest<TakeResource>({ method: "POST", path: `${takePath(uid)}/actions/publish` }),
    unpublish: (uid: string) =>
      apiRequest<TakeResource>({ method: "POST", path: `${takePath(uid)}/actions/unpublish` }),
    fork: (uid: string) =>
      apiRequest<TakeResource>({ method: "POST", path: `${takePath(uid)}/actions/fork` }),
    archive: (uid: string, confirmation: string) =>
      apiRequest<TakeResource>({
        method: "POST",
        path: `${takePath(uid)}/actions/archive`,
        body: { confirmation },
      }),
    fund: (uid: string, body: FundBody) =>
      apiRequest<FundResponse>({ method: "POST", path: `${takePath(uid)}/actions/fund`, body }),
    withdraw: (uid: string) =>
      apiRequest<ProposalResource>({ method: "POST", path: `${takePath(uid)}/actions/withdraw` }),
    review: (uid: string) =>
      apiRequest<ReviewResource>({ method: "POST", path: `${takePath(uid)}/actions/review`, body: {} }),
    revisions: (uid: string, signal?: AbortSignal) =>
      apiRequest<RevisionResource[]>({ path: `${takePath(uid)}/revisions`, signal }),
    weights: (uid: string, signal?: AbortSignal) =>
      apiRequest<WeightsResponse>({ path: `${takePath(uid)}/weights`, signal }),
    performance: (uid: string, signal?: AbortSignal) =>
      apiRequest<TabularFrame>({ path: `${takePath(uid)}/performance`, signal }),
    funding: (uid: string, signal?: AbortSignal) =>
      apiRequest<FundingResource>({ path: `${takePath(uid)}/funding`, signal }),
    reviews: (uid: string, signal?: AbortSignal) =>
      apiRequest<ReviewResource[]>({ path: `${takePath(uid)}/reviews`, query: { limit: 60 }, signal }),
  },

  accounts: {
    list: (includeRevoked: boolean, signal?: AbortSignal) =>
      apiRequest<LinkedAccountResource[]>({
        path: "/v1/profile/accounts",
        query: { include_revoked: includeRevoked },
        signal,
      }),
    link: (body: LinkAccountBody) =>
      apiRequest<LinkedAccountResource>({ method: "POST", path: "/v1/profile/accounts/actions/link", body }),
    revoke: (uid: string) =>
      apiRequest<LinkedAccountResource>({ method: "POST", path: `${accountPath(uid)}/actions/revoke` }),
    holdings: (uid: string, capture: boolean, signal?: AbortSignal) =>
      apiRequest<HoldingsSnapshot>({ path: `${accountPath(uid)}/holdings`, query: { capture }, signal }),
  },

  proposals: {
    list: (
      query: { status?: string; take_uid?: string; open_only?: boolean },
      signal?: AbortSignal,
    ) => apiRequest<ProposalResource[]>({ path: "/v1/proposals", query, signal }),
    get: (uid: string, signal?: AbortSignal) =>
      apiRequest<ProposalResource>({ path: proposalPath(uid), signal }),
    approve: (uid: string) =>
      apiRequest<ProposalResource>({ method: "POST", path: `${proposalPath(uid)}/actions/approve` }),
    reject: (uid: string, reason: string | null) =>
      apiRequest<ProposalResource>({
        method: "POST",
        path: `${proposalPath(uid)}/actions/reject`,
        body: reason ? { reason } : {},
      }),
    sync: (uid: string) =>
      apiRequest<ProposalResource>({ method: "POST", path: `${proposalPath(uid)}/actions/sync` }),
  },

  leaderboard: (signal?: AbortSignal) =>
    apiRequest<LeaderboardResponse>({ path: "/v1/leaderboard", query: { limit: 100 }, signal }),

  notifications: {
    list: (query: { unread_only?: boolean; limit?: number }, signal?: AbortSignal) =>
      apiRequest<NotificationsResponse>({ path: "/v1/notifications", query, signal }),
    markRead: (uids?: string[]) =>
      apiRequest<NotificationsResponse>({
        method: "POST",
        path: "/v1/notifications/actions/mark-read",
        body: uids ? { uids } : {},
      }),
  },
};
