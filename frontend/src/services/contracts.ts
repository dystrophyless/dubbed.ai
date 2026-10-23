export type Brand<T, Name extends string> = T & { readonly __brand: Name }

export type AccountId = Brand<string, 'AccountId'>
export type SessionId = Brand<string, 'SessionId'>
export type ProjectId = Brand<string, 'ProjectId'>
export type SourceId = Brand<string, 'SourceId'>
export type PreparationId = Brand<string, 'PreparationId'>
export type TurnId = Brand<string, 'TurnId'>
export type CandidateId = Brand<string, 'CandidateId'>
export type DraftId = Brand<string, 'DraftId'>
export type TakeId = Brand<string, 'TakeId'>
export type OperationId = Brand<string, 'OperationId'>
export type ReservationId = OperationId
export type QuoteId = Brand<string, 'QuoteId'>
export type GenerationId = Brand<string, 'GenerationId'>
export type MediaId = Brand<string, 'MediaId'>
export type Revision = Brand<number, 'Revision'>

export const ids = {
  account: (value: string) => value as AccountId,
  session: (value: string) => value as SessionId,
  project: (value: string) => value as ProjectId,
  source: (value: string) => value as SourceId,
  preparation: (value: string) => value as PreparationId,
  turn: (value: string) => value as TurnId,
  candidate: (value: string) => value as CandidateId,
  draft: (value: string) => value as DraftId,
  take: (value: string) => value as TakeId,
  operation: (value: string) => value as OperationId,
  quote: (value: string) => value as QuoteId,
  generation: (value: string) => value as GenerationId,
  media: (value: string) => value as MediaId,
}

export const asRevision = (value: number): Revision => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`Invalid revision: ${value}`)
  }
  return value as Revision
}

export type RetryDirective = 'none' | 'same-operation' | 'reconcile-first'

export interface ServiceError {
  code:
    | 'already-exists'
    | 'account-deleted'
    | 'adapter-unavailable'
    | 'capacity-reached'
    | 'conflict'
    | 'expired'
    | 'forbidden'
    | 'incompatible-candidate'
    | 'invalid-code'
    | 'insufficient-credits'
    | 'lease-held'
    | 'media-invalid'
    | 'not-found'
    | 'operation-not-found'
    | 'quota'
    | 'rate-limited'
    | 'storage-unavailable'
    | 'stale-source'
    | 'unauthenticated'
    | 'unsupported'
    | 'validation'
  message: string
  retry: RetryDirective
  fieldErrors?: Readonly<Record<string, string>>
}

export type ServiceResult<T> =
  | { status: 'ok'; data: T; replayed: boolean }
  | {
      status: 'conflict'
      code: 'revision-conflict' | 'stale-source' | 'lease-held' | 'already-accepted' | 'intent-conflict'
      currentRevision?: Revision
      message: string
    }
  | { status: 'unknown'; operationId: OperationId; message: string }
  | { status: 'error'; error: ServiceError }

export interface Session {
  id: SessionId
  accountId: AccountId
  expiresAt: number
  revision: Revision
}

export interface AccountSnapshot {
  id: AccountId
  email: string
  locale: 'en' | 'ru'
  revision: Revision
  deleted: boolean
  createdAt: number
}

export interface PendingVerification {
  id: OperationId
  email: string
  purpose: 'registration' | 'password-reset' | 'link-email'
  /** Present only for the local mock’s simulated delivery channel. */
  scenarioCode?: { value: string; note: 'synthetic-mock-scenario' }
  expiresAt: number
  resendAvailableAt: number
  resendCount: number
  /** Total sends still inside the service-defined mock hour, including the initial send. */
  sendCount: number
  /** Remaining sends in the same service-defined mock hour; the current scenario caps at five. */
  remainingSends: number
  revision: Revision
}

export interface LoginMethodSnapshot {
  kind: 'email-password' | 'google'
  address: string
  verified: boolean
  linkedAt: number
}

export interface AccountSettingsSnapshot extends AccountSnapshot {
  methods: LoginMethodSnapshot[]
  deletionEligible: boolean
  purchasedRemainder: number
  note: 'synthetic-mock-scenario'
}

export interface OwnedProject {
  id: ProjectId
  accountId: AccountId
  revision: Revision
  title: string
  titleSource: 'filename' | 'manual'
  createdAt: number
  updatedAt: number
  lastActivityAt: number
  lastActivityEventId?: OperationId
  /** Durable mock history fence set when the first AI preparation launch is accepted. */
  firstAiLaunchAt?: number
  /** The project's single included reprocessing attempt, granted after initial success and consumed by its terminal success/running cancellation. */
  includedRetryAvailable?: boolean
  sourceId: SourceId
  sourceRevision: Revision
  sourceDurationMs: number
  selection: SectionSelection
  preparationId?: PreparationId
  preparationRevision: Revision
  state: 'uploaded' | 'preparing' | 'recording' | 'assembling' | 'ready' | 'failed'
  deletedAt?: number
}

export interface SectionSelection {
  startMs: number
  endMs: number
  revision: Revision
}

export interface SourceFacts {
  fileName: string
  mimeType: string
  byteLength: number
  durationMs: number
  width?: number
  height?: number
  hasAudio: boolean
  validation: 'mock-scenario'
}

export interface ProjectCapacity {
  used: number
  total: number
  firstPurchaseUpgrade: boolean
  revision: Revision
}

export interface PreparationStage {
  id: string
  label: string
  state: 'queued' | 'running' | 'complete' | 'failed'
}

export type PreparationAttemptClass = 'initial' | 'included-retry' | 'paid-reprocessing'

export interface PreparationSnapshot {
  projectId: ProjectId
  projectRevision: Revision
  operation: OperationSnapshot
  currentPreparationId?: PreparationId
  currentPreparationRevision: Revision
  priorUsablePreparationId?: PreparationId
  turns: Array<{ id: TurnId; text: string; startMs: number; endMs: number }>
  percentage?: { value: number; trusted: true; operationRevision: Revision }
  currentStage?: PreparationStage
  attemptClass: PreparationAttemptClass
  includedRetryAvailable: boolean
  reprocessingLocked: boolean
  reservationId?: OperationId
}

export interface RecordingAccess {
  projectId: ProjectId
  grantId: OperationId
  accountId: AccountId
  sessionId: SessionId
  state: 'held-by-session' | 'held-elsewhere' | 'reacquiring' | 'unavailable' | 'released'
  fenceToken: number
  expiresAt: number
  revision: Revision
}

export interface RecordingCandidate {
  id: CandidateId
  projectId: ProjectId
  turnId: TurnId
  mediaId: MediaId
  draftId?: DraftId
  draftRevision?: Revision
  processingRevision: Revision
  timingRevision: Revision
  revision: Revision
  audioTrackPresent: boolean
  hasRecordedBytes: boolean
  audioFrames: 'present' | 'absent' | 'unknown'
  decodedDurationMs: number | null
  durationMs: number
  accepted: false
}

export interface ResultGeneration {
  id: GenerationId
  projectId: ProjectId
  revision: Revision
  mediaId: MediaId
  durationMs: number
  width: number
  height: number
  current: boolean
  fixtureKey: string
  note: 'synthetic-mock-scenario'
}

export interface PlaybackDescriptor {
  projectId: ProjectId
  generationId: GenerationId
  mediaId: MediaId
  url: string
  mediaType: string
  durationMs: number
  revision: Revision
  note: 'synthetic-mock-scenario'
}

export interface AcceptedTakeDescriptor {
  projectId: ProjectId
  turnId: TurnId
  takeId: TakeId
  mediaId: MediaId
  url: string
  mediaType: string
  durationMs: number
  revision: Revision
  note: 'synthetic-mock-scenario'
}

export interface CreditSnapshot {
  accountId: AccountId
  revision: Revision
  available: number
  reserved: number
  purchasedRemainder: number
  welcomeGrantEligible: boolean
  welcomeGrantApplied: boolean
  projectCapacity: ProjectCapacity
}

export type LedgerKind =
  | 'welcome-grant'
  | 'verified-purchase'
  | 'processing-reservation'
  | 'processing-settlement'
  | 'reservation-release'
  | 'credit-return'
  | 'pending-purchase'

export interface LedgerEntry {
  id: OperationId
  accountId: AccountId
  revision: Revision
  kind: LedgerKind
  occurredAt: number
  delta: number | null
  availableAfter: number | null
  reservedAfter: number
  projectId?: ProjectId
  relatedOperationId?: OperationId
  note: 'synthetic-mock-scenario'
}

declare const creditHistoryCursorBrand: unique symbol

/** Opaque service-owned continuation token for older credit-history pages. */
export type CreditHistoryCursor = string & { readonly [creditHistoryCursorBrand]: true }

export interface CreditHistoryPage {
  /** Newest first. Every value is copied from the authoritative ledger. */
  entries: LedgerEntry[]
  /** Null means the account has no older ledger rows. */
  nextCursor: CreditHistoryCursor | null
}

export interface ProcessingQuote {
  id: QuoteId
  accountId: AccountId
  projectId: ProjectId
  projectRevision: Revision
  sourceId: SourceId
  sourceRevision: Revision
  selectionRevision: Revision
  activePreparationId?: PreparationId
  activePreparationRevision: Revision
  /** Exact unaccepted drafts bound to the current preparation that activation would remove. */
  draftIdsToDeleteOnActivation: DraftId[]
  creditRevision: Revision
  attemptClass: PreparationAttemptClass
  durationMs: number
  credits: number
  available: number
  reserved: number
  expiresAt: number
  revision: Revision
  note: 'synthetic-mock-scenario'
}

export interface CancellationQuote {
  kind: 'cancellation'
  quoteId: QuoteId
  reservationId: OperationId
  targetOperationId: OperationId
  projectId: ProjectId
  attemptClass: PreparationAttemptClass
  exactCharge: number
  releaseAmount: number
  includedRetryRemains: boolean
  expiresAt: number
  revision: Revision
  note: 'synthetic-mock-scenario'
}

export interface ProjectActivityEvent {
  id: OperationId
  accountId: AccountId
  projectId: ProjectId
  kind: 'opened' | 'user-change' | 'processing-completed' | 'result-completed'
  occurredAt: number
  revision: Revision
}

export interface ProcessingStartSnapshot {
  projectId: ProjectId
  operation: OperationSnapshot
  attemptClass: PreparationAttemptClass
  reservationId: OperationId
  quoteId: QuoteId
  currentPreparationId?: PreparationId
  currentPreparationRevision: Revision
  priorUsablePreparationId?: PreparationId
  projectRevision: Revision
}

export interface AssemblyAuthorization {
  id: OperationId
  projectId: ProjectId
  kind: 'initial-sequence-completion' | 'completed-project-to-result'
  acceptedTakeRevision: Revision
  createdAt: number
  assemblySnapshotKey: string
  turnTakeSnapshot: Array<{
    turnId: TurnId
    takeId: TakeId
    processingRevision: Revision
    timingRevision: Revision
  }>
  note: 'synthetic-mock-scenario'
}

export interface CreditPack {
  id: string
  credits: number
  currency: string
  amountMinor: number
  note: 'synthetic-mock-scenario'
}

export interface PurchaseSnapshot {
  id: OperationId
  accountId: AccountId
  initiationId: OperationId
  packId: string
  state: 'pending' | 'verified' | 'failed' | 'cancelled'
  verificationId?: OperationId
  returnContextId?: OperationId
  revision: Revision
  note: 'synthetic-mock-scenario'
}

export type SimulatedCheckoutOutcome = 'pending' | 'verified' | 'failed' | 'cancelled'

export type SimulatedCheckoutSnapshot =
  | {
      outcome: 'verified'
      purchase: Omit<PurchaseSnapshot, 'state' | 'verificationId'> & { state: 'verified'; verificationId: OperationId }
      verificationId: OperationId
      note: 'synthetic-mock-scenario'
    }
  | {
      outcome: 'pending' | 'failed' | 'cancelled'
      purchase: Omit<PurchaseSnapshot, 'state' | 'verificationId'> & { state: 'pending' | 'failed' | 'cancelled'; verificationId?: never }
      note: 'synthetic-mock-scenario'
    }

export interface MediaInput {
  id: string
  label: string
  selected: boolean
}

export interface FixedWindowCapture {
  candidateId: CandidateId
  blob: Blob
  startedAt: number
  finishedAt: number
  interrupted: boolean
  audioTrackPresent: boolean
  hasRecordedBytes: boolean
  audioFrames: 'present' | 'absent' | 'unknown'
  decodedDurationMs: number | null
  durationMs: number
}

export interface DecodedAudioWaveform {
  /** Duration of the decoded and selected local audio interval. */
  durationMs: number
  /** Bounded, normalized peak amplitudes for that interval. */
  peaks: number[]
}

export interface AudioWaveformRequest {
  /** A local Blob, or a browser-owned blob: URL returned for accepted local playback. */
  source: Blob | string
  /** Optional absolute source interval in milliseconds. Both bounds must be provided together. */
  startMs?: number
  endMs?: number
}

/** Browser-only microphone capability. It never transports media to a server. */
export interface BrowserMediaService {
  listInputs(): Promise<ServiceResult<MediaInput[]>>
  requestMicrophone(inputId?: string): Promise<ServiceResult<{ stream: MediaStream; inputId: string }>>
  /** Checks device-local recording readiness without prompting or opening a stream. */
  isRecordingEntryReady(): Promise<boolean>
  /** Remembers an explicitly connected input and grants a one-entry live-ready handoff. */
  completeMicrophoneCheck(inputId: string): void
  /** Starts local input-level monitoring without recording. A failed meter is a non-blocking error. */
  watchInputLevel(input: { stream: MediaStream; onLevel: (sample: AudioLevelSample) => void }): { ready: Promise<ServiceResult<void>>; stop(): void }
  /** Decodes local audio into bounded waveform peaks without uploading media. */
  decodeAudioWaveform(input: AudioWaveformRequest): Promise<ServiceResult<DecodedAudioWaveform>>
  captureFixedWindow(input: { stream: MediaStream; candidateId: CandidateId; windowMs: number; onProgress: (elapsedMs: number) => void; onLevel?: (sample: AudioLevelSample) => void }): Promise<ServiceResult<FixedWindowCapture>>
  startMicrophoneTest(input: { stream: MediaStream; durationLimitMs: number; onProgress: (elapsedMs: number) => void; onLevel?: (sample: AudioLevelSample) => void }): MicrophoneTestCapture
}

export interface AudioLevelSample {
  /** Local signal amplitude estimate in the [0, 1] range; it makes no speech or audibility claim. */
  rms: number
  peak: number
}

export type MicrophoneTestOutcome =
  | { state: 'captured'; blob: Blob; audioTrackPresent: boolean; hasRecordedBytes: boolean; audioFrames: 'present' | 'absent' | 'unknown'; decodedDurationMs: number | null; durationMs: number; stoppedByUser: boolean }
  | { state: 'cancelled' }

export interface MicrophoneTestCapture {
  result: Promise<ServiceResult<MicrophoneTestOutcome>>
  stop(): void
  cancel(): void
}

export interface OperationSnapshot<T = unknown> {
  id: OperationId
  accountId: AccountId
  state: 'pending' | 'committed' | 'rejected'
  kind: string
  result?: T
  error?: ServiceError
  revision: Revision
  updatedAt: number
}

export interface MutationOptions {
  operationId: OperationId
  expectedRevision?: Revision
}

export type SignInIntent =
  | { kind: 'new-dub' }
  | { kind: 'resume-project-screen'; projectId: ProjectId; screen: 'processing' | 'record' | 'result' }

/** Bounded local outcomes for the synthetic Google identity used by the mock adapter. */
export type MockGoogleScenario = 'default' | 'cancelled' | 'denied' | 'conflict' | 'link-required'

export interface GoogleIdentityResult {
  purpose: 'sign-in' | 'registration' | 'link'
  state: 'completed' | 'canceled' | 'denied' | 'conflict' | 'link-required' | 'account-not-found'
  account?: AccountSnapshot
  session?: Session
  destination: SignInIntent
  providerProofId?: OperationId
  linkStep?: 'current' | 'candidate'
  verifiedAddress?: string
  /** Present on every outcome; true only when this operation wrote the one-time grant entry. */
  welcomeGrantApplied: boolean
  note: 'synthetic-mock-scenario'
  message?: string
}


export interface IdentityService {
  current(): Promise<ServiceResult<{ account: AccountSnapshot; session: Session } | null>>
  signIn(input: { email: string; password: string; intent?: SignInIntent } & MutationOptions): Promise<ServiceResult<{ account: AccountSnapshot; session: Session; destination: SignInIntent }>>
  signOut(input: MutationOptions): Promise<ServiceResult<{ signedOut: true }>>
  google(input: (
    | { purpose: 'sign-in' | 'registration'; intentId: OperationId; destination?: SignInIntent }
    | { purpose: 'link'; intentId: OperationId; linkStep: 'current' | 'candidate' }
  ) & MutationOptions): Promise<ServiceResult<GoogleIdentityResult>>
}

export interface RegistrationService {
  start(input: { email: string; password: string } & MutationOptions): Promise<ServiceResult<PendingVerification>>
  verify(input: { requestId: OperationId; code: string } & MutationOptions): Promise<ServiceResult<{ account: AccountSnapshot; session: Session; credits: CreditSnapshot; outcome: 'new-account' | 'password-method-added'; welcomeGrantApplied: boolean }>>
  resend(input: { requestId: OperationId } & MutationOptions): Promise<ServiceResult<PendingVerification>>
  correctEmail(input: { requestId: OperationId; email: string; password: string } & MutationOptions): Promise<ServiceResult<PendingVerification>>
  resolve(input: { requestId: OperationId }): Promise<ServiceResult<PendingVerification | { state: 'expired' | 'completed' | 'not-found' }>>
}

export interface PasswordResetService {
  start(input: { email: string; returnIntent?: SignInIntent } & MutationOptions): Promise<ServiceResult<PendingVerification>>
  verify(input: { requestId: OperationId; code: string } & MutationOptions): Promise<ServiceResult<{ resetGrantId: OperationId; expiresAt: number }>>
  complete(input: { resetGrantId: OperationId; newPassword: string } & MutationOptions): Promise<ServiceResult<{ account: AccountSnapshot; session: Session; destination: SignInIntent }>>
  resend(input: { requestId: OperationId } & MutationOptions): Promise<ServiceResult<PendingVerification>>
  resolve(input: { requestId: OperationId }): Promise<ServiceResult<PendingVerification | { state: 'expired' | 'not-found' } | { state: 'verified'; resetGrantId: OperationId; expiresAt: number } | { state: 'completed'; destination: SignInIntent }>>
}

export interface AccountService {
  load(): Promise<ServiceResult<AccountSettingsSnapshot>>
  setLocale(input: { locale: 'en' | 'ru'; expectedRevision: Revision } & MutationOptions): Promise<ServiceResult<AccountSnapshot>>
  changePassword(input: { currentPassword: string; newPassword: string; expectedRevision: Revision } & MutationOptions): Promise<ServiceResult<{ account: AccountSnapshot; revokedOtherSessions: true }>>
  delete(input: { confirmation: string; locale: 'en' | 'ru'; expectedRevision: Revision } & MutationOptions): Promise<ServiceResult<{ deleted: true; purchasedRemainder: number }>>
  resolveDelete(input: { operationId: OperationId }): Promise<ServiceResult<
    | { state: 'completed'; receipt: { deleted: true; purchasedRemainder: number } }
    | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }
    | { state: 'unknown' }
  >>
}

export type LinkMethodKind = 'email-password' | 'google'

export interface LinkIntentSnapshot {
  id: OperationId
  accountId: AccountId
  currentMethod: LinkMethodKind
  candidate: { method: LinkMethodKind; address?: string }
  expectedAccountRevision: Revision
  candidateVerificationRequestId?: OperationId
  /** Present only when the local mock simulates email delivery for this intent. */
  candidateScenarioCode?: { value: string; note: 'synthetic-mock-scenario' }
  currentProofId?: OperationId
  candidateProofId?: OperationId
  expiresAt: number
  state: 'pending' | 'ready-to-review' | 'completed' | 'cancelled' | 'conflict' | 'expired'
  note: 'synthetic-mock-scenario'
}

export interface AccountLinkingService {
  start(input: {
    currentMethod: LinkMethodKind
    candidate: { method: 'email-password'; email: string; password: string } | { method: 'google' }
    expectedAccountRevision: Revision
  } & MutationOptions): Promise<ServiceResult<LinkIntentSnapshot>>
  proveCurrent(input: ({ intentId: OperationId; password: string } | { intentId: OperationId; providerProofId: OperationId }) & MutationOptions): Promise<ServiceResult<{ proofId: OperationId; method: LinkMethodKind; expiresAt: number; note: 'synthetic-mock-scenario' }>>
  proveCandidate(input: ({ intentId: OperationId; code: string } | { intentId: OperationId; providerProofId: OperationId }) & MutationOptions): Promise<ServiceResult<{ proofId: OperationId; candidate: { method: LinkMethodKind; address: string }; expiresAt: number; note: 'synthetic-mock-scenario' }>>
  resendCandidate(input: { intentId: OperationId } & MutationOptions): Promise<ServiceResult<LinkIntentSnapshot>>
  commit(input: { intentId: OperationId; currentProofId: OperationId; candidateProofId: OperationId; expectedAccountRevision: Revision } & MutationOptions): Promise<ServiceResult<{ state: 'completed'; account: AccountSnapshot; methods: LoginMethodSnapshot[] } | { state: 'conflict'; intent: LinkIntentSnapshot }>>
  cancel(input: { intentId: OperationId } & MutationOptions): Promise<ServiceResult<{ state: 'cancelled'; intent: LinkIntentSnapshot }>>
  resolve(input: { intentId: OperationId }): Promise<ServiceResult<{ state: 'not-found' } | { state: 'expired' | 'pending' | 'ready-to-review' | 'cancelled'; intent: LinkIntentSnapshot } | { state: 'completed'; intent: LinkIntentSnapshot; account: AccountSnapshot; methods: LoginMethodSnapshot[] } | { state: 'conflict'; intent: LinkIntentSnapshot }>>
}

export interface ProjectsService {
  list(): Promise<ServiceResult<{ projects: OwnedProject[]; capacity: ProjectCapacity }>>
  /** Read-only route lookup; it never changes library activity order. */
  open(projectId: ProjectId): Promise<ServiceResult<OwnedProject>>
  /** Records a successfully opened project once for this navigation operation. */
  recordOpened(input: { projectId: ProjectId } & MutationOptions): Promise<ServiceResult<OwnedProject>>
  rename(input: { projectId: ProjectId; title: string; expectedRevision: Revision } & MutationOptions): Promise<ServiceResult<OwnedProject>>
  deletionImpact(projectId: ProjectId): Promise<ServiceResult<{ projectId: ProjectId; title: string; sourceBytes: number; acceptedTakeCount: number; draftCount: number; resultCount: number }>>
  delete(input: { projectId: ProjectId; expectedRevision: Revision } & MutationOptions): Promise<ServiceResult<{ deleted: true; freedSlot: true }>>
}

export interface UploadService {
  commitInitial(input: { file: File; title?: string; facts: Omit<SourceFacts, 'fileName' | 'mimeType' | 'byteLength' | 'validation'> } & MutationOptions): Promise<ServiceResult<{ project: OwnedProject; source: SourceFacts }>>
  replaceSource(input: { projectId: ProjectId; file: File; facts: Omit<SourceFacts, 'fileName' | 'mimeType' | 'byteLength' | 'validation'>; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<{ project: OwnedProject; source: SourceFacts }>>
  getSource(projectId: ProjectId): Promise<ServiceResult<{ facts: SourceFacts; blob: Blob }>>
}

export type PreviewScenario = 'preview-transient-error'
export type PreviewEligibility = 'supported-fixture' | 'conversion-unavailable'

export interface PreviewInspection {
  accountId: AccountId
  projectId: ProjectId
  projectRevision: Revision
  sourceId: SourceId
  sourceRevision: Revision
  sourceSha256: string
  sourceFacts: SourceFacts
  eligibility: PreviewEligibility
  note: 'synthetic-mock-scenario'
}

export interface PreviewMediaAssetDescriptor {
  url: string
  sha256: string
  byteLength: number
  mediaType: string
  durationMs: number
  width?: number
  height?: number
}

export interface PreviewDialogueSection {
  id: string
  text: string
  startMs: number
  endMs: number
}

export interface CompatiblePreviewDescriptor {
  accountId: AccountId
  projectId: ProjectId
  sourceId: SourceId
  sourceRevision: Revision
  sourceSha256: string
  sourceByteLength: number
  sourceDurationMs: number
  /** The exact uploaded video fixture bytes used as this scenario's input. */
  sourceVideo: PreviewMediaAssetDescriptor
  /** The exact same source scene and video bytes presented during the synthetic compatibility simulation. */
  video: PreviewMediaAssetDescriptor
  timeline: {
    sourceDurationMs: number
    note: string
    sections: PreviewDialogueSection[]
  }
  conversionNote: 'synthetic-compatible-playback-simulation'
  note: 'synthetic-mock-scenario'
}

export interface CompatiblePreviewError {
  code: 'conversion-unavailable' | 'simulated-transient'
  message: string
  retryable: boolean
}

export interface CompatiblePreviewSnapshot {
  id: OperationId
  accountId: AccountId
  projectId: ProjectId
  projectRevision: Revision
  sourceId: SourceId
  sourceRevision: Revision
  sourceSha256: string
  state: 'pending' | 'ready' | 'error'
  attempt: number
  scenario?: PreviewScenario
  revision: Revision
  requestedAt: number
  updatedAt: number
  descriptor?: CompatiblePreviewDescriptor
  error?: CompatiblePreviewError
  note: 'synthetic-mock-scenario'
}

export interface PreviewService {
  /** Read-only capability check. Unknown uploads remain conversion-unavailable and must not be requested. */
  inspect(input: { projectId: ProjectId }): Promise<ServiceResult<PreviewInspection>>
  request(input: { projectId: ProjectId; expectedProjectRevision: Revision; expectedSourceRevision: Revision; scenario?: PreviewScenario } & MutationOptions): Promise<ServiceResult<CompatiblePreviewSnapshot>>
  /** Advances a pending scenario once; repeat observations return the same durable state. */
  observe(input: { projectId: ProjectId; sourceId: SourceId; sourceRevision: Revision; targetOperationId: OperationId }): Promise<ServiceResult<CompatiblePreviewSnapshot>>
  retry(input: { projectId: ProjectId; sourceId: SourceId; sourceRevision: Revision; priorOperationId: OperationId; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<CompatiblePreviewSnapshot>>
}

export interface PreparationService {
  updateSelection(input: { projectId: ProjectId; startMs: number; endMs: number; expectedProjectRevision: Revision; expectedSourceRevision: Revision } & MutationOptions): Promise<ServiceResult<OwnedProject>>
  quote(input: { projectId: ProjectId; expectedProjectRevision: Revision; expectedActivePreparationId?: PreparationId; expectedActivePreparationRevision: Revision } & MutationOptions): Promise<ServiceResult<ProcessingQuote>>
  start(input: { quoteId: QuoteId; expectedProjectRevision: Revision; expectedSourceRevision: Revision; expectedActivePreparationId?: PreparationId; expectedActivePreparationRevision: Revision; acknowledgedDraftIds: DraftId[]; replacementAcknowledged: boolean; draftLossAcknowledged: boolean; explicitAuthorization: true } & MutationOptions): Promise<ServiceResult<ProcessingStartSnapshot>>
  resolve(input: { projectId: ProjectId; targetOperationId?: OperationId }): Promise<ServiceResult<PreparationSnapshot>>
  observe(input: { projectId: ProjectId; targetOperationId: OperationId }): Promise<ServiceResult<PreparationSnapshot>>
  cancellationQuote(input: { projectId: ProjectId; targetOperationId: OperationId; expectedRevision: Revision } & MutationOptions): Promise<ServiceResult<CancellationQuote>>
  cancel(input: { projectId: ProjectId; targetOperationId: OperationId; cancellationQuoteId: QuoteId; expectedRevision: Revision; explicitConfirmation: true } & MutationOptions): Promise<ServiceResult<OperationSnapshot>>
  activate(input: { projectId: ProjectId; targetOperationId: OperationId; expectedRevision: Revision; expectedActivePreparationId?: PreparationId; expectedActivePreparationRevision: Revision } & MutationOptions): Promise<ServiceResult<OwnedProject>>
}

export interface RecordingService {
  loadContext(projectId: ProjectId): Promise<ServiceResult<{ project: OwnedProject; turns: Array<{ id: TurnId; text: string; startMs: number; endMs: number; windowStartMs: number; windowEndMs: number; processingRevision: Revision; timingRevision: Revision; captureWindowNote: 'synthetic-mock-scenario'; acceptedTakeId?: TakeId }>; currentTurnId?: TurnId; takeRevision: Revision; acceptedTakeCount: number; missingAcceptedCount: number; firstMissingTurnId?: TurnId; includedRetryAvailable: boolean; reprocessingLocked: boolean }>>
  navigate(input: { projectId: ProjectId; turnId: TurnId; direction: 'back' | 'next'; expectedProjectRevision: Revision }): Promise<ServiceResult<{ turnId?: TurnId; boundary?: 'start' | 'end' | 'incomplete' | 'complete'; missingAcceptedCount: number; firstMissingTurnId?: TurnId; assemblyAuthorizationId?: OperationId }>>
  acquireAccess(input: { projectId: ProjectId; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<RecordingAccess>>
  /** Extends a still-live grant held by this client/session; it never reacquires a lost lease. */
  renewAccess(input: { projectId: ProjectId; grantId: OperationId; expectedGrantRevision: Revision; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<RecordingAccess>>
  releaseAccess(input: { projectId: ProjectId; grantId: OperationId; expectedGrantRevision: Revision; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<{ released: true }>>
  acceptedTakePlayback(input: { projectId: ProjectId; turnId: TurnId; takeId: TakeId }): Promise<ServiceResult<AcceptedTakeDescriptor>>
  refreshAcceptedTakePlayback(input: { projectId: ProjectId; turnId: TurnId; takeId: TakeId }): Promise<ServiceResult<AcceptedTakeDescriptor>>
  /** Releases a local object URL returned for an accepted user recording. */
  releasePlaybackUrl(url: string): void
  restoreDraft(input: { projectId: ProjectId; turnId: TurnId }): Promise<ServiceResult<{ candidate: RecordingCandidate; blob: Blob } | null>>
  persistDraft(input: { projectId: ProjectId; turnId: TurnId; candidate: RecordingCandidate; blob: Blob; grantId: OperationId; expectedGrantRevision: Revision; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<{ candidate: RecordingCandidate; recoverable: true; accepted: false; retainedUsableCandidate?: RecordingCandidate }>>
  acceptCandidate(input: { projectId: ProjectId; turnId: TurnId; candidate: RecordingCandidate; blob?: Blob; draftId?: DraftId; grantId: OperationId; expectedGrantRevision: Revision; expectedProjectRevision: Revision; expectedTakeRevision: Revision } & MutationOptions): Promise<ServiceResult<{ takeId: TakeId; acceptedCount: number; requiredCount: number; missingAcceptedCount: number; firstMissingTurnId?: TurnId; initialAssemblyAuthorizationId?: OperationId; reprocessingLocked: true; access: RecordingAccess }>>
  discardDraft(input: { projectId: ProjectId; turnId: TurnId; draftId: DraftId; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<{ discarded: true }>>
  resolveLeave(input: { projectId: ProjectId; turnId: TurnId; action: 'save-and-leave' | 'leave-without-saving' | 'stay'; candidate?: RecordingCandidate; blob?: Blob; draftId?: DraftId; grantId: OperationId; expectedGrantRevision: Revision; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<{ action: 'save-and-leave' | 'leave-without-saving' | 'stay'; disposition: 'stayed' | 'draft-saved' | 'take-accepted' | 'draft-discarded' | 'unchanged'; draftId?: DraftId; acceptedTakeId?: TakeId; initialAssemblyAuthorizationId?: OperationId; draftDiscarded: boolean; grantReleased: boolean }>>
  authorizeCompletedRevision(input: { projectId: ProjectId; expectedProjectRevision: Revision; action: 'to-result' } & MutationOptions): Promise<ServiceResult<AssemblyAuthorization>>
}

export interface ResultService {
  load(projectId: ProjectId): Promise<ServiceResult<{ project: OwnedProject; currentGeneration?: ResultGeneration; displayedGeneration?: ResultGeneration; operation?: OperationSnapshot; retryLineageId?: OperationId; retryAvailable: boolean }>>
  ensureAssembly(input: { projectId: ProjectId; authorizationId: OperationId; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<OperationSnapshot>>
  loadPlayback(input: { projectId: ProjectId; displayedGenerationId: GenerationId }): Promise<ServiceResult<{ generation: ResultGeneration; descriptor: PlaybackDescriptor }>>
  refreshPlayback(input: { projectId: ProjectId; displayedGenerationId: GenerationId }): Promise<ServiceResult<{ generation: ResultGeneration; descriptor: PlaybackDescriptor }>>
  requestDownload(input: { projectId: ProjectId; displayedGenerationId: GenerationId } & MutationOptions): Promise<ServiceResult<{ generationId: GenerationId; descriptor: PlaybackDescriptor; fileName: string }>>
  retry(input: { projectId: ProjectId; priorOperationId: OperationId; retryLineageId: OperationId; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<OperationSnapshot>>
}

export interface CreditsService {
  snapshot(): Promise<ServiceResult<CreditSnapshot>>
  history(): Promise<ServiceResult<LedgerEntry[]>>
  /** Returns up to 20 newest rows initially, then older rows from the opaque cursor. */
  historyPage(input: { cursor?: CreditHistoryCursor }): Promise<ServiceResult<CreditHistoryPage>>
  packs(): Promise<ServiceResult<CreditPack[]>>
  grantEligibleWelcome(input: MutationOptions): Promise<ServiceResult<CreditSnapshot>>
  reserve(input: { projectId: ProjectId; quoteId: QuoteId; expectedCreditRevision: Revision; expectedProjectRevision: Revision } & MutationOptions): Promise<ServiceResult<{ reservationId: OperationId; snapshot: CreditSnapshot }>>
  settle(input: { reservationId: OperationId; authoritativeOperationId: OperationId; outcome: 'successful-completion' | 'confirmed-cancellation'; cancellationQuoteId?: QuoteId } & MutationOptions): Promise<ServiceResult<CreditSnapshot>>
  release(input: { reservationId: OperationId; reason: 'system-failure' | 'queued-cancellation' } & MutationOptions): Promise<ServiceResult<CreditSnapshot>>
  applyVerifiedPurchase(input: { purchaseId: OperationId; verificationId: OperationId } & MutationOptions): Promise<ServiceResult<CreditSnapshot>>
  startPurchase(input: { packId: string; initiationId: OperationId; returnContextId?: OperationId } & MutationOptions): Promise<ServiceResult<{ purchaseId: OperationId; state: 'pending'; returnContextId?: OperationId }>>
  simulateCheckout(input: { purchaseId: OperationId; outcome: SimulatedCheckoutOutcome } & MutationOptions): Promise<ServiceResult<SimulatedCheckoutSnapshot>>
  resolvePurchase(input: { initiationId: OperationId }): Promise<ServiceResult<{ purchase: PurchaseSnapshot; snapshot: CreditSnapshot }>>
  createReturnContext(input: { projectId: ProjectId; sourceId: SourceId; selection: SectionSelection; quoteId?: QuoteId } & MutationOptions): Promise<ServiceResult<{ returnContextId: OperationId; expiresAt: number }>>
  resolveReturnContext(input: { returnContextId: OperationId }): Promise<ServiceResult<{ valid: boolean; projectId?: ProjectId; sourceId?: SourceId; selection?: SectionSelection; lastQuote?: ProcessingQuote }>>
}

export interface OperationService {
  resolve<T = unknown>(operationId: OperationId): Promise<ServiceResult<OperationSnapshot<T> | { state: 'not-started'; operationId: OperationId; safeToRetrySameId: true }>>
}

/** Explicit reset for this mock namespace only; it never contacts or resets a real adapter. */
export interface WorkspaceService {
  readonly namespace: string
  reset(): Promise<ServiceResult<{ reset: true; namespace: string }>>
}

export interface Services {
  readonly identity: IdentityService
  readonly registration: RegistrationService
  readonly passwordReset: PasswordResetService
  readonly accountLinking: AccountLinkingService
  readonly account: AccountService
  readonly projects: ProjectsService
  readonly uploads: UploadService
  readonly previews: PreviewService
  readonly preparation: PreparationService
  readonly recording: RecordingService
  readonly results: ResultService
  readonly credits: CreditsService
  readonly browserMedia: BrowserMediaService
  readonly operations: OperationService
  readonly workspace: WorkspaceService
}

export type ServiceAdapterKind = 'mock' | 'real'

export interface ServiceClock {
  now(): number
}
