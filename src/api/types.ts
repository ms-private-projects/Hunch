/** TypeScript mirrors of the Hunch API models (`hunch.api.app.schemas`). */

export interface PageInfo {
  pageIndex: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Collection<T> {
  items: T[];
  pageInfo: PageInfo;
}

export type TakeStatus =
  | "draft"
  | "built"
  | "active_practice"
  | "funding"
  | "active_funded"
  | "archived";
export const TAKE_STATUSES: readonly TakeStatus[] = [
  "draft",
  "built",
  "active_practice",
  "funding",
  "active_funded",
  "archived",
];

export type ExecutionMode = "practice" | "approval" | "autopilot";
export type Visibility = "private" | "public";
export type RiskLevel = "low" | "medium" | "high";
export type Venue = "alpaca" | "ibkr";

export interface TakeConstraints {
  horizon_months: number;
  cash_buffer: number;
  max_single_name_weight: number;
  max_positions: number;
  exclusions: string[];
  allow_leveraged_etf: boolean;
  risk_level: RiskLevel;
  change_my_mind: string | null;
}

export interface TakeResource {
  uid: string;
  owner_user_uid: string;
  owner_handle: string | null;
  title: string;
  thesis_text: string;
  constraints: TakeConstraints;
  status: TakeStatus | string;
  execution_mode: ExecutionMode | string;
  visibility: Visibility | string;
  forked_from_take_uid: string | null;
  origin_take_uid: string | null;
  signal_uid: string | null;
  activated_at: string | null;
  published_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface TakeCreateBody {
  title: string;
  thesis_text: string;
  constraints: Partial<TakeConstraints>;
}

export type EvidenceKind = "quant" | "news" | "fundamental";

/** One numbered evidence item a rationale, a candidate or a thesis check cites (`E1`, `E2`, …). */
export interface EvidenceItem {
  id: string;
  figi: string;
  ticker: string;
  kind: EvidenceKind | string;
  title: string;
  summary: string;
  source: string;
  url: string | null;
  published_at: string | null;
}

/** Fractions; everything but `sessions` and `total_return` is null until two sessions. */
export interface PerformanceMetrics {
  sessions: number;
  total_return: number | null;
  annualised_return: number | null;
  annualised_volatility: number | null;
  sharpe_ratio: number | null;
  max_drawdown: number | null;
  best_day: number | null;
  worst_day: number | null;
}

export interface RevisionCandidate {
  ticker?: string;
  role?: string;
  case?: string;
  risks?: string[];
  conviction?: number;
  /** Evidence ids (`E3`) the research cited for this candidate. */
  citations?: string[];
  [key: string]: unknown;
}

export interface RevisionResource {
  uid: string;
  take_uid: string;
  revision: number;
  /** The research this basket was constructed from; null on revisions older than research. */
  research_uid?: string | null;
  kind: string;
  rationale_md: string;
  weights: Array<Record<string, unknown>>;
  cash_weight: number | null;
  guardrail_notes: string[];
  candidates: RevisionCandidate[];
  evidence: EvidenceItem[];
  created_by: string;
  inference_request_uids: string[];
  signal_time_index: string | null;
  created_at: string | null;
}

export interface BuildResponse {
  execution: "inline" | "job";
  take: TakeResource;
  revision: RevisionResource | null;
  job_run_uid: string | null;
}

/** One research of a take's target universe: candidates and their case, no weights. */
export interface ResearchResource {
  uid: string;
  take_uid: string;
  /** 1, 2, ... per take, in research order. */
  number: number;
  mode: string;
  /** The thesis parsed: claims, beneficiaries, losers, keywords, horizon. */
  brief: Record<string, unknown>;
  candidates: RevisionCandidate[];
  rationale_md: string;
  evidence: EvidenceItem[];
  provider: string | null;
  model: string | null;
  inference_request_uids: string[];
  conversation_uid: string | null;
  created_by: string;
  created_at: string | null;
}

/** Hosted, research runs as a platform Job: `research` stays null and `job_run_uid` is set. */
export interface ResearchResponse {
  execution: "inline" | "job";
  take: TakeResource;
  research: ResearchResource | null;
  job_run_uid: string | null;
}

export interface ThesisClaim {
  claim: string;
  /** `strong`, `moderate` or `weak`. */
  strength: string;
  note: string;
}

/** What a take claims, what it assumes, what would show it wrong; never a change to it. */
export interface ThesisCritiqueResource {
  take_uid: string;
  /** `inference` (the analysis model) or `heuristic`. */
  mode: string;
  summary: string;
  /** `clear`, `partly_clear` or `vague`. */
  clarity: string;
  claims: ThesisClaim[];
  assumptions: string[];
  counterarguments: string[];
  risks: string[];
  /** Checkable conditions that would show the thesis wrong. */
  suggested_conditions: string[];
  constraint_notes: string[];
  questions: string[];
  provider: string | null;
  model: string | null;
  inference_request_uids: string[];
  conversation_uid: string | null;
  disclaimers: string[];
}

export interface WeightItem {
  figi: string;
  ticker: string | null;
  name: string | null;
  weight: number;
  price: number | null;
  time_index?: string | null;
}

export interface WeightsResponse {
  take_uid: string;
  as_of: string | null;
  items: WeightItem[];
  invested: number;
  cash: number;
}

export interface TabularFrameField {
  key: string;
  type: string;
  label?: string | null;
  nullable?: boolean | null;
}

export interface TabularFrameSource {
  kind: string;
  id: string;
  label?: string | null;
  context?: Record<string, unknown> | null;
}

/** The Command Center tabular frame. Rows are records; a positional row is tolerated too. */
export interface TabularFrame {
  status: string;
  columns: string[];
  rows: Array<Record<string, unknown> | unknown[]>;
  error?: string | null;
  fields?: TabularFrameField[] | null;
  source?: TabularFrameSource | null;
}

export interface LinkedAccountResource {
  uid: string;
  venue: Venue | string;
  account_uid: string;
  account_identifier: string | null;
  account_name: string | null;
  is_paper: boolean;
  status: "pending" | "active" | "revoked" | string;
  ownership_verified: boolean;
  simulated: boolean;
  currency: string;
  equity: number | null;
  cash: number | null;
  linked_at: string | null;
  revoked_at: string | null;
}

export interface LinkAccountBody {
  venue: Venue;
  account_uid?: string;
  account_name?: string;
}

export interface HoldingResource {
  asset_identifier: string;
  kind: string;
  quantity: number;
  direction: number;
  symbol: string | null;
  figi: string | null;
  market_value: number | null;
}

export interface HoldingsSnapshot {
  account_uid: string;
  time_index: string;
  holdings_set_uid: string | null;
  cash: number;
  holdings: HoldingResource[];
}

export interface AutopilotPolicy {
  max_turnover_per_day: number;
  max_notional_per_order: number;
  max_single_name_weight: number;
  allow_new_instruments: boolean;
  trading_window: "session" | "any";
}

export interface FundBody {
  profile_account_uid: string;
  target_notional: number;
  execution_mode: "approval" | "autopilot";
  autopilot_policy?: AutopilotPolicy;
}

export interface FundPosition {
  figi: string;
  ticker: string | null;
  quantity: number;
  price: number | null;
  value: number;
  weight: number | null;
}

export interface FundingResource {
  uid: string;
  take_uid: string;
  take_title: string | null;
  profile_account_uid: string;
  venue: string;
  status: string;
  target_notional: number;
  currency: string;
  execution_mode: string | null;
  autopilot_policy: AutopilotPolicy | null;
  execution_capability: string | null;
  nav: number | null;
  cash: number | null;
  invested: number | null;
  return_on_notional: number | null;
  as_of: string | null;
  positions: FundPosition[];
  created_at: string | null;
  activated_at: string | null;
  closed_at: string | null;
}

export interface ProposalLeg {
  client_order_id: string;
  figi: string;
  ticker: string | null;
  side: string;
  quantity: number;
  estimated_price: number | null;
  estimated_notional: number | null;
  target_weight: number | null;
  current_weight: number | null;
  reason: string | null;
  [key: string]: unknown;
}

export interface ProposalResource {
  uid: string;
  take_uid: string;
  take_title: string | null;
  funding_uid: string;
  trigger: string;
  status: string;
  legs: ProposalLeg[];
  summary_md: string;
  estimated_turnover: number | null;
  autopilot_check: Record<string, unknown> | null;
  manual_execution: boolean;
  expires_at: string | null;
  decided_at: string | null;
  submitted_at: string | null;
  completed_at: string | null;
  created_at: string | null;
  orders: Array<Record<string, unknown>>;
  notes: string[];
}

export interface FundResponse {
  funding: FundingResource;
  proposal: ProposalResource;
}

export interface ReviewResource {
  uid: string;
  take_uid: string;
  review_date: string;
  outcome: string;
  verdict: string | null;
  drift: Record<string, unknown> | null;
  thesis_check: Record<string, unknown> | null;
  proposal_uid: string | null;
  summary_md: string;
  created_at: string | null;
}

export interface LeaderboardEntry {
  rank: number;
  take_uid: string;
  title: string | null;
  owner_handle: string | null;
  return_since_activation: number;
  days_active: number;
  value_points: number;
  is_simulated: boolean;
  is_funded: boolean;
  origin_take_uid: string | null;
  /** Null on a snapshot written before metrics existed, or before two sessions. */
  metrics: PerformanceMetrics | null;
}

export interface LeaderboardResponse {
  snapshot_date: string;
  live: boolean;
  entries: LeaderboardEntry[];
  disclaimers: string[];
}

export interface NotificationResource {
  uid: string;
  kind: string;
  title: string;
  body_md: string;
  take_uid: string | null;
  payload: Record<string, unknown> | null;
  created_at: string | null;
  read_at: string | null;
}

export interface NotificationsResponse {
  items: NotificationResource[];
  unread: number;
}

export interface AssistantRuntime {
  mode: "local" | "platform";
  base_path: string | null;
}

export interface AssistantConfiguration {
  enabled: boolean;
  runtime: AssistantRuntime | null;
  agent_uid: string | null;
  environment_uid: string | null;
  display_name: string;
}

export interface ResearchConfiguration {
  mode: string;
  build_execution: string;
  bars_provider: string;
  inference_provider: string | null;
  /** The shared default; a role may run on another model (`models`). */
  inference_model: string | null;
  /** The model each role runs on in `inference` mode, by role (`research`, `review`, `analysis`). */
  models?: Record<string, { provider: string; model: string; thinking: string | null }>;
}

export interface ConnectorsConfiguration {
  /** `simulated` keeps a paper venue inside Hunch (local development); `live` calls the connectors. */
  mode: "live" | "simulated";
  /** Whether each venue's connector is configured in this deployment. */
  venues: Record<string, boolean>;
}

export interface ProjectConfiguration {
  api_version: string;
  venues: string[];
  /** Absent on an API older than the connectors field. */
  connectors?: ConnectorsConfiguration | null;
  research: ResearchConfiguration;
  assistant: AssistantConfiguration;
  organization_environment_uid: string | null;
  agent_uid: string | null;
  request_user_uid: string | null;
  disclaimers: string[];
}

export interface ProfileResource {
  user_uid: string;
  handle: string;
  display_name: string | null;
  /** Whether the daily digest email is sent. */
  email_digest: boolean;
  /** An address overriding the Main Sequence account's; null means the account email. */
  email_address: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/** Any subset; an empty `email_address` clears the override. */
export interface ProfileUpdateBody {
  handle?: string;
  display_name?: string;
  email_digest?: boolean;
  email_address?: string;
}
