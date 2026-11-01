import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  operationId,
  type AcceptOutcome,
  type CaptureGrant,
  type IdentityScope,
  type LayoutVariant,
  type CandidateId,
  type NavigationIntent,
  type NativeCapture,
  type OperationId,
  type PreparedProject,
  type StoredCandidate,
  type TurnId,
} from '../../services/contracts';
import { useServices } from '../../shared/ServicesContext';
import type { MessageKey } from '../../shared/i18n';

type ControllerOperation = {
  kind: 'save' | 'accept' | 'discard' | 'snapshot';
  operationId: OperationId;
  intent?: NavigationIntent;
};

export interface RecordControllerState {
  phase: 'loading' | 'ready' | 'missing';
  grantStatus: 'acquiring' | 'available' | 'held' | 'unavailable';
  grant: CaptureGrant | null;
  project: PreparedProject | null;
  turnId: TurnId | null;
  candidate: StoredCandidate | null;
  accepted: StoredCandidate | null;
  localCapture: NativeCapture | null;
  operation: ControllerOperation | null;
  captureState: 'idle' | 'starting' | 'capturing' | 'saving' | 'accepting' | 'discarding' | 'authorizing' | 'checking';
  notice: MessageKey | null;
  noticeRevision: number;
  microphoneFailed: boolean;
  audition: 'original' | 'take' | null;
  playing: boolean;
  progressMs: number;
  captureProgressMs: number;
  liveWaveform: readonly number[];
  guardIntent: NavigationIntent | null;
}

interface RecordControllerOptions {
  preparedProject: PreparedProject;
  layout: LayoutVariant;
  initialTurnId?: string;
  videoRef: RefObject<HTMLVideoElement | null>;
  audioRef: RefObject<HTMLAudioElement | null>;
  navigate(intent: NavigationIntent, operationId?: OperationId): Promise<void> | void;
}

type PersistedCapture = { candidate: StoredCandidate; project: PreparedProject };

const IDLE_WAVEFORM = Array.from({ length: 64 }, () => 0);

function newOperationId(): OperationId {
  return operationId(`operation:${globalThis.crypto.randomUUID()}`);
}

function waitForMediaMetadata(video: HTMLVideoElement): Promise<void> {
  if (video.readyState >= HTMLMediaElement.HAVE_METADATA) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => finish(new Error('The source video did not become ready.')), 6000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('loadedmetadata', onLoaded);
      video.removeEventListener('error', onError);
    };
    const finish = (error?: Error) => {
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onLoaded = () => finish();
    const onError = () => finish(new Error('The source video could not be loaded.'));
    video.addEventListener('loadedmetadata', onLoaded, { once: true });
    video.addEventListener('error', onError, { once: true });
  });
}

function seekVideo(video: HTMLVideoElement, seconds: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const target = Math.max(0, seconds);
    if (Math.abs(video.currentTime - target) < 0.015) {
      video.currentTime = target;
      resolve();
      return;
    }
    const timeout = window.setTimeout(() => finish(new Error('The requested source window could not be selected.')), 4000);
    const cleanup = () => {
      window.clearTimeout(timeout);
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
    };
    const finish = (error?: Error) => {
      cleanup();
      if (error) reject(error);
      else resolve();
    };
    const onSeeked = () => finish();
    const onError = () => finish(new Error('The requested source window could not be selected.'));
    video.addEventListener('seeked', onSeeked, { once: true });
    video.addEventListener('error', onError, { once: true });
    video.currentTime = target;
  });
}

export function useRecordController({
  preparedProject,
  layout,
  initialTurnId,
  videoRef,
  audioRef,
  navigate,
}: RecordControllerOptions) {
  const services = useServices();
  const scope = useMemo<IdentityScope>(() => ({ actorId: services.actorId, projectId: preparedProject.id }), [preparedProject.id, services.actorId]);
  const [state, setState] = useState<RecordControllerState>({
    phase: 'loading', grantStatus: 'acquiring', grant: null, project: preparedProject,
    turnId: null, candidate: null, accepted: null, localCapture: null, operation: null,
    captureState: 'idle', notice: null, noticeRevision: 0, microphoneFailed: false, audition: null,
    playing: false, progressMs: 0, captureProgressMs: 0, liveWaveform: IDLE_WAVEFORM, guardIntent: null,
  });
  const stateRef = useRef(state);
  const initialTurnIdRef = useRef(initialTurnId);
  const grantReleaseRef = useRef<(() => Promise<void>) | null>(null);
  const captureAbortRef = useRef<AbortController | null>(null);
  const releaseAfterCaptureRef = useRef(false);
  const busyRef = useRef(false);
  const seekResumeRef = useRef(false);
  const seekActiveRef = useRef(false);

  const update = useCallback((updater: (current: RecordControllerState) => RecordControllerState) => {
    const next = updater(stateRef.current);
    stateRef.current = next;
    setState(next);
  }, []);

  const updateFields = useCallback((fields: Partial<RecordControllerState>) => {
    update((current) => ({
      ...current,
      ...fields,
      noticeRevision: fields.notice !== undefined ? current.noticeRevision + 1 : current.noticeRevision,
    }));
  }, [update]);

  const loadSelection = useCallback(async (requestedTurnId?: string, grantStatus?: RecordControllerState['grantStatus'], grant?: CaptureGrant | null) => {
    const project = await services.projects.loadPreparedProject(scope);
    if (!project) {
      updateFields({ phase: 'missing', project: null, turnId: null, candidate: null, accepted: null });
      return;
    }
    const selected = project.windows.find((window) => window.id === requestedTurnId) ?? project.windows[0];
    if (!selected) {
      updateFields({ phase: 'missing', project, turnId: null, candidate: null, accepted: null });
      return;
    }
    const [candidate, accepted, pendingSave, pendingAccept, incompleteNavigation] = await Promise.all([
      services.projects.getCurrentCandidate(scope, selected.id),
      services.projects.getAcceptedCandidate(scope, selected.id),
      services.projects.findPendingCaptureOperation(scope, selected.id),
      services.projects.findPendingAcceptanceOperation(scope, selected.id),
      services.projects.findIncompleteNavigationIntent(scope),
    ]);
    const pendingOperationId = pendingAccept ?? pendingSave;
    let pendingOperation: ControllerOperation | null = null;
    if (pendingOperationId) {
      const lookup = await services.projects.lookupOperation(scope, pendingOperationId);
      if (lookup.kind === 'pending') {
        pendingOperation = {
          kind: pendingAccept ? 'accept' : 'save',
          operationId: pendingOperationId,
          intent: incompleteNavigation?.operationId === pendingOperationId ? incompleteNavigation.intent : undefined,
        };
      }
    }
    update((current) => ({
      ...current,
      phase: 'ready',
      grantStatus: grantStatus ?? current.grantStatus,
      grant: grant === undefined ? current.grant : grant,
      project,
      turnId: selected.id,
      candidate,
      accepted,
      localCapture: current.turnId === selected.id ? current.localCapture : null,
      operation: pendingOperation,
      captureState: 'idle',
      notice: pendingOperation ? 'operationNeedsCheck' : current.notice,
      microphoneFailed: current.microphoneFailed,
      audition: null,
      playing: false,
      progressMs: 0,
      guardIntent: null,
    }));
  }, [scope, services.projects, update, updateFields]);

  useEffect(() => {
    let active = true;
    void (async () => {
      updateFields({ phase: 'loading', grantStatus: 'acquiring', project: preparedProject });
      let acquiredGrant: CaptureGrant | null = null;
      let release: (() => Promise<void>) | null = null;
      try {
        const acquired = await services.grants.acquire(scope);
        if (acquired.kind === 'acquired') {
          acquiredGrant = acquired.grant;
          release = acquired.release;
        }
        if (!active) {
          if (release) await release();
          return;
        }
        grantReleaseRef.current = release;
        await loadSelection(initialTurnIdRef.current, acquired.kind === 'acquired' ? 'available' : acquired.kind, acquiredGrant);
        if (acquired.kind === 'unavailable') update((current) => ({ ...current, notice: 'recordingAccessUnavailable' }));
        else if (acquired.kind === 'held') update((current) => ({ ...current, notice: 'recordingTabHeld' }));
      } catch {
        if (!active) return;
        await loadSelection(initialTurnIdRef.current, 'unavailable', null).catch(() => undefined);
        update((current) => ({ ...current, grantStatus: 'unavailable', grant: null, notice: 'recordingAccessUnavailable' }));
      }
    })();
    return () => {
      active = false;
      if (captureAbortRef.current) {
        releaseAfterCaptureRef.current = true;
        captureAbortRef.current.abort();
      } else {
        void grantReleaseRef.current?.();
        grantReleaseRef.current = null;
      }
    };
  }, [loadSelection, preparedProject, scope, services.grants, updateFields]);

  useEffect(() => { initialTurnIdRef.current = initialTurnId; }, [initialTurnId]);

  useEffect(() => {
    if (state.phase !== 'ready' || !initialTurnId || state.turnId === initialTurnId || busyRef.current) return;
    void loadSelection(initialTurnId).catch(() => updateFields({ notice: 'projectReloadFailed' }));
  }, [initialTurnId, loadSelection, state.phase, state.turnId, updateFields]);

  const currentWindow = state.project?.windows.find((window) => window.id === state.turnId) ?? null;
  const index = currentWindow && state.project ? state.project.windows.findIndex((window) => window.id === currentWindow.id) : -1;

  const stopAudition = useCallback(() => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    updateFields({ playing: false, audition: null });
  }, [audioRef, updateFields, videoRef]);

  const playOriginal = useCallback(async () => {
    const current = stateRef.current;
    const project = current.project;
    const window = project?.windows.find((item) => item.id === current.turnId);
    const video = videoRef.current;
    if (!window || !video || current.captureState !== 'idle') return;
    try {
      audioRef.current?.pause();
      video.muted = false;
      await seekVideo(video, window.startMs / 1000);
      await video.play();
      updateFields({ audition: 'original', playing: true, progressMs: 0, notice: null });
    } catch {
      updateFields({ notice: 'sourcePlaybackFailed', playing: false, audition: null });
    }
  }, [audioRef, updateFields, videoRef]);

  const playTake = useCallback(async () => {
    const current = stateRef.current;
    const window = current.project?.windows.find((item) => item.id === current.turnId);
    const video = videoRef.current;
    const audio = audioRef.current;
    const blob = current.localCapture?.blob ?? current.candidate?.blob ?? current.accepted?.blob;
    if (!window || !video || !audio || !blob || current.captureState !== 'idle') return;
    try {
      video.muted = true;
      await seekVideo(video, window.startMs / 1000);
      audio.currentTime = 0;
      await Promise.all([video.play(), audio.play()]);
      updateFields({ audition: 'take', playing: true, progressMs: 0, notice: null });
    } catch {
      video.pause();
      audio.pause();
      updateFields({ notice: 'takePlaybackFailed', playing: false, audition: null });
    }
  }, [audioRef, updateFields, videoRef]);

  const pauseAudition = useCallback(() => {
    videoRef.current?.pause();
    audioRef.current?.pause();
    updateFields({ playing: false });
  }, [audioRef, updateFields, videoRef]);

  const resumeAudition = useCallback(async () => {
    const current = stateRef.current;
    if (!current.audition || current.captureState !== 'idle') return;
    try {
      if (current.audition === 'original') await videoRef.current?.play();
      else await Promise.all([videoRef.current?.play(), audioRef.current?.play()]);
      updateFields({ playing: true });
    } catch {
      updateFields({ notice: current.audition === 'original' ? 'sourcePlaybackFailed' : 'takePlaybackFailed', playing: false });
    }
  }, [audioRef, updateFields, videoRef]);

  const beginSeek = useCallback(() => {
    const current = stateRef.current;
    if (!seekActiveRef.current) {
      seekActiveRef.current = true;
      seekResumeRef.current = current.audition !== null;
    }
    videoRef.current?.pause();
    audioRef.current?.pause();
    updateFields({ playing: false });
  }, [audioRef, updateFields, videoRef]);

  const seekTo = useCallback((positionMs: number) => {
    const current = stateRef.current;
    const window = current.project?.windows.find((item) => item.id === current.turnId);
    if (!window || current.captureState === 'capturing') return;
    const bounded = Math.max(0, Math.min(window.endMs - window.startMs, positionMs));
    updateFields({ progressMs: bounded });
    const video = videoRef.current;
    if (video?.readyState && video.readyState >= HTMLMediaElement.HAVE_METADATA) video.currentTime = (window.startMs + bounded) / 1000;
    const audio = audioRef.current;
    if (audio && Number.isFinite(audio.duration)) audio.currentTime = Math.min(bounded / 1000, Math.max(0, audio.duration));
  }, [updateFields, videoRef, audioRef]);

  const endSeek = useCallback(() => {
    if (!seekActiveRef.current) return;
    const current = stateRef.current;
    const window = current.project?.windows.find((item) => item.id === current.turnId);
    const atFiniteEnd = window ? current.progressMs >= window.endMs - window.startMs : false;
    if (seekResumeRef.current && !atFiniteEnd) void resumeAudition();
    seekActiveRef.current = false;
    seekResumeRef.current = false;
  }, [resumeAudition]);

  const cancelSeek = useCallback(() => {
    seekActiveRef.current = false;
    seekResumeRef.current = false;
    videoRef.current?.pause();
    audioRef.current?.pause();
    updateFields({ playing: false });
  }, [audioRef, updateFields, videoRef]);

  const persistCapture = useCallback(async (capture: NativeCapture): Promise<PersistedCapture | null> => {
    const current = stateRef.current;
    const project = current.project;
    const turnId = current.turnId;
    const window = project?.windows.find((item) => item.id === turnId);
    const grant = current.grant;
    if (!project || !turnId || !window || !grant) {
      updateFields({ captureState: 'idle', localCapture: capture, notice: 'recordingAccessUnavailable' });
      return null;
    }
    const id = newOperationId();
    updateFields({ captureState: 'saving', localCapture: capture, operation: { kind: 'save', operationId: id }, notice: 'savingTake' });
    const resolveCommitted = async (candidateId: CandidateId, projectRevision: number): Promise<PersistedCapture | null> => {
      const [candidate, refreshed] = await Promise.all([
        services.projects.getCandidate(scope, candidateId),
        services.projects.loadPreparedProject(scope),
      ]);
      if (!candidate || !refreshed) throw new Error('The saved take could not be read back.');
      updateFields({
        project: refreshed.revision >= projectRevision ? refreshed : project,
        candidate,
        localCapture: null,
        operation: null,
        captureState: 'idle',
        notice: capture.endReason === 'interrupted' ? 'partialTakeSaved' : 'takeSavedAsCandidate',
      });
      return { candidate, project: refreshed.revision >= projectRevision ? refreshed : project };
    };
    try {
      const outcome = await services.projects.saveCandidate({
        scope,
        turnId,
        expectedTurnRevision: window.revision,
        expectedProjectRevision: project.revision,
        operationId: id,
        captureGrant: grant,
        capture,
      });
      if (outcome.kind === 'committed') return await resolveCommitted(outcome.candidateId, outcome.projectRevision);
      updateFields({ operation: { kind: 'save', operationId: id }, captureState: 'checking', notice: 'checkingSaveStatus' });
      const lookup = await services.projects.lookupOperation(scope, id);
      if (lookup.kind === 'committed' && lookup.candidateId) return await resolveCommitted(lookup.candidateId, lookup.projectRevision);
      if (lookup.kind === 'pending') {
        updateFields({ operation: { kind: 'save', operationId: id }, captureState: 'idle', notice: 'saveOutcomeUnknown' });
        return null;
      }
      updateFields({ operation: null, captureState: 'idle', localCapture: capture, notice: 'saveFailed' });
      return null;
    } catch (error) {
      try {
        const lookup = await services.projects.lookupOperation(scope, id);
        if (lookup.kind === 'committed' && lookup.candidateId) return await resolveCommitted(lookup.candidateId, lookup.projectRevision);
        if (lookup.kind === 'pending') {
          updateFields({ operation: { kind: 'save', operationId: id }, captureState: 'idle', localCapture: capture, notice: 'saveOutcomeUnknown' });
        } else {
          updateFields({ operation: null, captureState: 'idle', localCapture: capture, notice: 'saveFailed' });
        }
      } catch {
        updateFields({ operation: { kind: 'save', operationId: id }, captureState: 'idle', localCapture: capture, notice: 'saveOutcomeUnknown' });
      }
      if (error instanceof Error && error.name === 'CaptureGrantUnavailableError') updateFields({ grantStatus: 'unavailable', grant: null });
      return null;
    }
  }, [scope, services.projects, updateFields]);

  const record = useCallback(async () => {
    if (busyRef.current) return;
    const current = stateRef.current;
    const project = current.project;
    const turnId = current.turnId;
    const window = project?.windows.find((item) => item.id === turnId);
    const video = videoRef.current;
    if (!project || !turnId || !window || !video || !current.grant || current.operation || current.localCapture) return;
    busyRef.current = true;
    const abortController = new AbortController();
    const interruptController = new AbortController();
    captureAbortRef.current = abortController;
    let sourceFailed = false;
    let captureStarted = false;
    const interruptForLifecycle = () => {
      video.pause();
      audioRef.current?.pause();
      if (captureStarted) interruptController.abort();
      else abortController.abort();
    };
    const interruptWhenHidden = () => {
      if (document.visibilityState === 'hidden') interruptForLifecycle();
    };
    document.addEventListener('visibilitychange', interruptWhenHidden);
    globalThis.window.addEventListener('pagehide', interruptForLifecycle);
    updateFields({
      captureState: 'starting', notice: 'preparingRecording', microphoneFailed: false,
      audition: null, playing: false, captureProgressMs: 0, liveWaveform: IDLE_WAVEFORM,
    });
    video.pause();
    audioRef.current?.pause();
    try {
      await waitForMediaMetadata(video);
      if (abortController.signal.aborted) throw new DOMException('Capture was cancelled while the source became ready.', 'AbortError');
      if (!Number.isFinite(video.duration) || video.duration * 1000 < window.endMs) {
        throw new Error('The source video does not cover the prepared capture window.');
      }
      await seekVideo(video, window.startMs / 1000);
      if (abortController.signal.aborted) throw new DOMException('Capture was cancelled while selecting the prepared window.', 'AbortError');
      const onSourceError = () => {
        sourceFailed = true;
        abortController.abort();
      };
      video.addEventListener('error', onSourceError, { once: true });
      let capture: NativeCapture;
      try {
        capture = await services.media.captureFixedWindow({
          durationMs: window.endMs - window.startMs,
          purpose: 'recording',
          signal: abortController.signal,
          interruptSignal: interruptController.signal,
          onWindowStart: (startCapture) => {
            video.muted = false;
            return new Promise<void>((resolve, reject) => {
              let settled = false;
              const cleanup = () => {
                video.removeEventListener('playing', onPlaying);
                video.removeEventListener('error', onError);
                abortController.signal.removeEventListener('abort', onAbort);
              };
              const finish = (error?: Error) => {
                if (settled) return;
                settled = true;
                cleanup();
                if (error) reject(error);
                else resolve();
              };
              const onPlaying = () => {
                startCapture();
                finish();
              };
              const onError = () => finish(new Error('The source video failed before capture began.'));
              const onAbort = () => finish(new DOMException('Capture was cancelled before source playback began.', 'AbortError'));
              video.addEventListener('playing', onPlaying, { once: true });
              video.addEventListener('error', onError, { once: true });
              abortController.signal.addEventListener('abort', onAbort, { once: true });
              try {
                void video.play().catch((error: unknown) => {
                  finish(error instanceof Error ? error : new Error('The source video could not begin playback.'));
                });
              } catch (error) {
                finish(error instanceof Error ? error : new Error('The source video could not begin playback.'));
              }
            });
          },
          getWindowProgressMs: () => Number.isFinite(video.currentTime)
            ? Math.max(0, video.currentTime * 1000 - window.startMs)
            : null,
          onCaptureStarted: () => {
            captureStarted = true;
            updateFields({ captureState: 'capturing', notice: 'recordingNow' });
          },
          onProgress: (progress) => updateFields({ captureProgressMs: progress.elapsedMs, liveWaveform: progress.waveformPeaks }),
        });
      } finally {
        video.removeEventListener('error', onSourceError);
      }
      if (sourceFailed) throw new Error('The source video failed during the prepared capture window.');
      video.pause();
      updateFields({ audition: null, playing: false });
      const hasDecodedOrTimedAudio = capture.probe.byteSize === capture.blob.size
        && ((capture.probe.decodedFrames ?? 0) > 0 || (capture.probe.durationSeconds ?? 0) > 0);
      if (capture.blob.size === 0 || (capture.endReason === 'interrupted' && !hasDecodedOrTimedAudio)) {
        const notice = capture.blob.size === 0 ? 'zeroDataCapture' : 'recordingFailed';
        updateFields({ captureState: 'idle', localCapture: null, notice });
      } else {
        await persistCapture(capture);
      }
    } catch (error) {
      video.pause();
      const denied = error instanceof Error && (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError' || error.name === 'SecurityError');
      updateFields({
        captureState: 'idle',
        notice: denied ? 'microphonePermissionFailed' : 'recordingFailed',
        microphoneFailed: denied,
        audition: null,
        playing: false,
      });
    } finally {
      document.removeEventListener('visibilitychange', interruptWhenHidden);
      globalThis.window.removeEventListener('pagehide', interruptForLifecycle);
      captureAbortRef.current = null;
      busyRef.current = false;
      if (releaseAfterCaptureRef.current) {
        releaseAfterCaptureRef.current = false;
        await grantReleaseRef.current?.();
        grantReleaseRef.current = null;
      }
    }
  }, [audioRef, persistCapture, services.media, updateFields, videoRef]);

  const startAuthorizedResult = useCallback(async (authorizedSnapshotId: import('../../services/contracts').SnapshotId) => {
    try { await services.results.startOrReconcile({ scope, snapshotId: authorizedSnapshotId }); }
    catch { /* the durable snapshot remains available for startup reconciliation or Result recovery */ }
  }, [scope, services.results]);

  const applyAcceptance = useCallback(async (result: AcceptOutcome, requestedOperationId: OperationId) => {
    if (result.kind === 'unknown') return false;
    if (result.snapshotId) await startAuthorizedResult(result.snapshotId);
    updateFields({ operation: null, captureState: 'idle', localCapture: null, notice: result.navigationIntent.kind === 'stay' ? 'takeAccepted' : null });
    if (result.navigationIntent.kind === 'stay') {
      busyRef.current = false;
      await services.projects.completeNavigationIntent(scope, requestedOperationId);
      await loadSelection(stateRef.current.turnId ?? undefined, stateRef.current.grantStatus, stateRef.current.grant);
      return true;
    }
    busyRef.current = false;
    await navigate(result.navigationIntent, requestedOperationId);
    return true;
  }, [loadSelection, navigate, scope, services.projects, startAuthorizedResult, updateFields]);

  const accept = useCallback(async (candidate: StoredCandidate, intent: NavigationIntent) => {
    const current = stateRef.current;
    const project = current.project;
    const window = project?.windows.find((item) => item.id === current.turnId);
    if (!project || !window || !current.grant || busyRef.current) return false;
    busyRef.current = true;
    const id = intent.kind === 'result'
      ? intent.snapshotId.slice('snapshot:'.length) as OperationId
      : newOperationId();
    updateFields({ captureState: 'accepting', operation: { kind: 'accept', operationId: id, intent }, notice: 'acceptingTake' });
    try {
      const outcome = await services.projects.acceptCandidate({
        scope,
        grant: current.grant,
        turnId: window.id,
        candidateId: candidate.id,
        expectedTurnRevision: window.revision,
        expectedProjectRevision: project.revision,
        operationId: id,
        navigationIntent: intent,
      });
      if (outcome.kind === 'committed') return await applyAcceptance(outcome, id);
      updateFields({ captureState: 'checking', notice: 'checkingAcceptanceStatus' });
      const lookup = await services.projects.lookupOperation(scope, id);
      if (lookup.kind === 'committed' && lookup.candidateId && lookup.navigationIntent) {
        return await applyAcceptance({
          kind: 'committed', operationId: id, candidateId: lookup.candidateId,
          projectRevision: lookup.projectRevision, snapshotId: lookup.snapshotId,
          navigationIntent: lookup.navigationIntent,
        }, id);
      }
      if (lookup.kind === 'pending') {
        updateFields({ operation: { kind: 'accept', operationId: id, intent }, captureState: 'idle', notice: 'acceptanceOutcomeUnknown' });
        return false;
      }
      updateFields({ operation: null, captureState: 'idle', notice: 'acceptanceFailed' });
      return false;
    } catch {
      try {
        const lookup = await services.projects.lookupOperation(scope, id);
        if (lookup.kind === 'committed' && lookup.candidateId && lookup.navigationIntent) {
          return await applyAcceptance({
            kind: 'committed', operationId: id, candidateId: lookup.candidateId,
            projectRevision: lookup.projectRevision, snapshotId: lookup.snapshotId,
            navigationIntent: lookup.navigationIntent,
          }, id);
        }
        if (lookup.kind === 'pending') {
          updateFields({ operation: { kind: 'accept', operationId: id, intent }, captureState: 'idle', notice: 'acceptanceOutcomeUnknown' });
        } else {
          updateFields({ operation: null, captureState: 'idle', guardIntent: intent.kind === 'stay' ? null : stateRef.current.guardIntent, notice: 'acceptanceFailed' });
        }
      } catch {
        updateFields({ operation: { kind: 'accept', operationId: id, intent }, captureState: 'idle', notice: 'acceptanceOutcomeUnknown' });
      }
      return false;
    } finally {
      busyRef.current = false;
    }
  }, [applyAcceptance, scope, services.projects, updateFields]);

  const next = useCallback(async () => {
    const current = stateRef.current;
    if (!current.project || !current.turnId || busyRef.current || current.operation) return;
    const currentIndex = current.project.windows.findIndex((window) => window.id === current.turnId);
    if (current.localCapture) {
      busyRef.current = true;
      let persisted: PersistedCapture | null;
      try { persisted = await persistCapture(current.localCapture); }
      finally { busyRef.current = false; }
      if (!persisted) return;
      const refreshed = persisted.project;
      if (refreshed.initialResultSnapshotId) {
        await accept(persisted.candidate, { kind: 'stay' });
        return;
      }
      const acceptedAfter = { ...refreshed.acceptedByTurn, [current.turnId]: persisted.candidate.id };
      const nextMissing = refreshed.windows.find((window) => acceptedAfter[window.id] === undefined);
      const target = nextMissing ?? refreshed.windows[Math.min(currentIndex + 1, refreshed.windows.length - 1)];
      await accept(persisted.candidate, { kind: 'advance', targetTurnId: target.id, layout });
      return;
    }
    if (current.candidate) {
      if (current.project.initialResultSnapshotId) {
        await accept(current.candidate, { kind: 'stay' });
        return;
      }
      const acceptedAfter = { ...current.project.acceptedByTurn, [current.turnId]: current.candidate.id };
      const nextMissing = current.project.windows.find((window) => acceptedAfter[window.id] === undefined);
      const target = nextMissing ?? current.project.windows[Math.min(currentIndex + 1, current.project.windows.length - 1)];
      await accept(current.candidate, { kind: 'advance', targetTurnId: target.id, layout });
      return;
    }
    if (!current.accepted) {
      updateFields({ notice: 'nextNeedsTake' });
      return;
    }
    const nextWindow = current.project.windows[currentIndex + 1]
      ?? current.project.windows.find((window) => current.project?.acceptedByTurn[window.id] === undefined);
    if (nextWindow) {
      await navigate({ kind: 'advance', targetTurnId: nextWindow.id, layout });
    } else if (current.project.initialResultSnapshotId || current.project.windows.every((window) => current.project?.acceptedByTurn[window.id] !== undefined)) {
      updateFields({ notice: 'resultRequiresExplicitAction' });
    } else {
      updateFields({ notice: 'nextNeedsTake' });
    }
  }, [accept, layout, navigate, persistCapture, updateFields]);

  const saveCandidateForIntent = useCallback(async (intent: NavigationIntent) => {
    const current = stateRef.current;
    if (current.localCapture) {
      if (busyRef.current) return false;
      busyRef.current = true;
      let persisted: PersistedCapture | null;
      try { persisted = await persistCapture(current.localCapture); }
      finally { busyRef.current = false; }
      if (!persisted) return false;
      return accept(persisted.candidate, intent);
    }
    if (current.candidate) return accept(current.candidate, intent);
    return false;
  }, [accept, persistCapture]);

  const retrySave = useCallback(async () => {
    const current = stateRef.current;
    if (busyRef.current || current.operation || !current.localCapture) return;
    busyRef.current = true;
    try {
      await persistCapture(current.localCapture);
    } finally {
      busyRef.current = false;
    }
  }, [persistCapture]);

  const requestLeave = useCallback((intent: NavigationIntent) => {
    const current = stateRef.current;
    if (current.captureState !== 'idle' || current.operation) return;
    if (current.localCapture || current.candidate) updateFields({ guardIntent: intent, notice: null });
    else void navigate(intent);
  }, [navigate, updateFields]);

  const stay = useCallback(() => updateFields({ guardIntent: null }), [updateFields]);

  const saveAndLeave = useCallback(async () => {
    const intent = stateRef.current.guardIntent;
    if (!intent || busyRef.current) return;
    await saveCandidateForIntent(intent);
  }, [saveCandidateForIntent]);

  const discardAndLeave = useCallback(async () => {
    const current = stateRef.current;
    const intent = current.guardIntent;
    if (!intent || busyRef.current) return;
    if (current.localCapture && !current.candidate) {
      updateFields({ localCapture: null, guardIntent: null, notice: null });
      if (intent.kind === 'result') await authorizeResult(intent);
      else await navigate(intent);
      return;
    }
    if (current.localCapture && current.candidate) {
      updateFields({ localCapture: null, notice: null });
    }
    if (!current.candidate || !current.project || !current.turnId) {
      updateFields({ guardIntent: null });
      if (intent.kind === 'result') await authorizeResult(intent);
      else await navigate(intent);
      return;
    }
    if (!current.grant) {
      updateFields({ guardIntent: intent, notice: 'recordingAccessUnavailable' });
      return;
    }
    busyRef.current = true;
    const id = intent.kind === 'result'
      ? intent.snapshotId.slice('snapshot:'.length) as OperationId
      : newOperationId();
    updateFields({ captureState: 'discarding', operation: { kind: 'discard', operationId: id, intent }, notice: 'discardingTake' });
    try {
      const outcome = await services.projects.discardCandidate({
        scope,
        grant: current.grant,
        turnId: current.turnId,
        candidateId: current.candidate.id,
        expectedProjectRevision: current.project.revision,
        operationId: id,
        navigationIntent: intent,
      });
      if (outcome.kind === 'committed' && outcome.navigationIntent) {
        updateFields({ candidate: null, captureState: 'idle', operation: null, guardIntent: null });
        await navigate(outcome.navigationIntent, id);
      } else {
        updateFields({ captureState: 'idle', operation: { kind: 'discard', operationId: id, intent }, guardIntent: intent, notice: 'discardOutcomeUnknown' });
      }
    } catch {
      try {
        const lookup = await services.projects.lookupOperation(scope, id);
        if (lookup.kind === 'committed' && lookup.navigationIntent) {
          updateFields({ candidate: null, captureState: 'idle', operation: null, guardIntent: null });
          if (lookup.snapshotId) await startAuthorizedResult(lookup.snapshotId);
          await navigate(lookup.navigationIntent, id);
          return;
        }
        if (lookup.kind === 'pending') {
          updateFields({ captureState: 'idle', operation: { kind: 'discard', operationId: id, intent }, guardIntent: intent, notice: 'discardOutcomeUnknown' });
        } else {
          updateFields({ captureState: 'idle', operation: null, guardIntent: intent, notice: 'discardFailed' });
        }
      } catch {
        updateFields({ captureState: 'idle', operation: { kind: 'discard', operationId: id, intent }, guardIntent: intent, notice: 'discardOutcomeUnknown' });
      }
    } finally {
      busyRef.current = false;
    }
  }, [authorizeResult, navigate, scope, services.projects, startAuthorizedResult, updateFields]);

  const checkOperation = useCallback(async () => {
    const current = stateRef.current;
    const operation = current.operation;
    if (!operation || busyRef.current) return;
    busyRef.current = true;
    updateFields({ captureState: 'checking', notice: 'checkingOperationStatus' });
    try {
      const lookup = await services.projects.lookupOperation(scope, operation.operationId);
      if (lookup.kind === 'pending') {
        updateFields({ captureState: 'idle', notice: 'operationStillPending' });
        return;
      }
      if (lookup.kind === 'committed') {
        if (operation.kind === 'save' && lookup.candidateId) {
          const [candidate, project] = await Promise.all([
            services.projects.getCandidate(scope, lookup.candidateId),
            services.projects.loadPreparedProject(scope),
          ]);
          updateFields({
            candidate,
            project,
            localCapture: null,
            operation: null,
            captureState: 'idle',
            notice: 'takeSavedAsCandidate',
          });
          return;
        }
        if (operation.kind === 'accept' || operation.kind === 'discard') {
          if (lookup.snapshotId) await startAuthorizedResult(lookup.snapshotId);
          await loadSelection(stateRef.current.turnId ?? undefined, stateRef.current.grantStatus, stateRef.current.grant);
          if (lookup.navigationIntent) await navigate(lookup.navigationIntent, operation.operationId);
          return;
        }
        if (operation.kind === 'snapshot' && lookup.snapshotId) {
          const snapshot = await services.projects.getResultSnapshot(scope, lookup.snapshotId);
          if (snapshot) {
            await startAuthorizedResult(snapshot.id);
            updateFields({ operation: null, captureState: 'idle', notice: null });
            await navigate({ kind: 'result', snapshotId: snapshot.id, layout }, operation.operationId);
            return;
          }
        }
        updateFields({ operation: null, captureState: 'idle', notice: 'operationReceiptMissing' });
        return;
      }
      updateFields({
        operation: null,
        captureState: 'idle',
        notice: operation.kind === 'save' ? 'saveFailed' : operation.kind === 'accept' ? 'acceptanceFailed' : operation.kind === 'discard' ? 'discardFailed' : 'snapshotAuthorizationFailed',
      });
    } catch {
      updateFields({ captureState: 'idle', notice: 'operationCheckFailed' });
    } finally {
      busyRef.current = false;
    }
  }, [layout, loadSelection, navigate, scope, services.projects, startAuthorizedResult, updateFields]);

  async function authorizeResult(requestedIntent?: NavigationIntent) {
    const current = stateRef.current;
    if (!current.project || !current.grant || busyRef.current) return;
    if (!requestedIntent && (current.candidate || current.localCapture)) {
      const operation = newOperationId();
      updateFields({
        guardIntent: { kind: 'result', snapshotId: `snapshot:${operation}` as import('../../services/contracts').SnapshotId, layout },
        notice: null,
      });
      return;
    }
    if (requestedIntent && requestedIntent.kind !== 'result') return;
    busyRef.current = true;
    const id = requestedIntent
      ? requestedIntent.snapshotId.slice('snapshot:'.length) as OperationId
      : newOperationId();
    const expectedSnapshotId = requestedIntent?.snapshotId
      ?? `snapshot:${id}` as import('../../services/contracts').SnapshotId;
    const intent: NavigationIntent = requestedIntent ?? { kind: 'result', snapshotId: expectedSnapshotId, layout };
    updateFields({ captureState: 'authorizing', operation: { kind: 'snapshot', operationId: id, intent }, notice: 'authorizingResultSnapshot' });
    try {
      const outcome = await services.projects.authorizeResultSnapshot({
        scope,
        grant: current.grant,
        expectedProjectRevision: current.project.revision,
        operationId: id,
        navigationIntent: intent,
      });
      if (outcome.kind === 'committed') {
        updateFields({ captureState: 'idle', operation: null, project: await services.projects.loadPreparedProject(scope), notice: null });
        await startAuthorizedResult(outcome.snapshot.id);
        await navigate({ kind: 'result', snapshotId: outcome.snapshot.id, layout }, id);
        return;
      }
      updateFields({ captureState: 'checking', notice: 'snapshotOutcomeUnknown' });
      const lookup = await services.projects.lookupOperation(scope, id);
      if (lookup.kind === 'committed' && lookup.snapshotId) {
        const snapshot = await services.projects.getResultSnapshot(scope, lookup.snapshotId);
        if (snapshot) {
          await startAuthorizedResult(snapshot.id);
          updateFields({ captureState: 'idle', operation: null, notice: null });
          await navigate({ kind: 'result', snapshotId: snapshot.id, layout }, id);
          return;
        }
      }
      if (lookup.kind === 'pending') {
        updateFields({ captureState: 'idle', operation: { kind: 'snapshot', operationId: id, intent }, notice: 'snapshotOutcomeUnknown' });
        return;
      }
      updateFields({ captureState: 'idle', operation: null, notice: 'snapshotAuthorizationFailed' });
    } catch {
      try {
        const lookup = await services.projects.lookupOperation(scope, id);
        if (lookup.kind === 'committed' && lookup.snapshotId) {
          const snapshot = await services.projects.getResultSnapshot(scope, lookup.snapshotId);
          if (snapshot) {
            await startAuthorizedResult(snapshot.id);
            updateFields({ captureState: 'idle', operation: null, notice: null });
            await navigate({ kind: 'result', snapshotId: snapshot.id, layout }, id);
            return;
          }
        }
        if (lookup.kind === 'pending') {
          updateFields({ captureState: 'idle', operation: { kind: 'snapshot', operationId: id, intent }, notice: 'snapshotOutcomeUnknown' });
        } else {
          updateFields({ captureState: 'idle', operation: null, notice: 'snapshotAuthorizationFailed' });
        }
      } catch {
        updateFields({ captureState: 'idle', operation: { kind: 'snapshot', operationId: id, intent }, notice: 'snapshotOutcomeUnknown' });
      }
    } finally {
      busyRef.current = false;
    }
  }

  const onVideoTimeUpdate = useCallback(() => {
    const current = stateRef.current;
    const window = current.project?.windows.find((item) => item.id === current.turnId);
    const video = videoRef.current;
    if (!window || !video) return;
    const relativeMs = Math.max(0, Math.min(window.endMs - window.startMs, video.currentTime * 1000 - window.startMs));
    updateFields({ progressMs: relativeMs });
    if (current.captureState === 'capturing' && video.currentTime * 1000 >= window.endMs) video.pause();
    if (current.audition === 'original' && video.currentTime * 1000 >= window.endMs) stopAudition();
  }, [stopAudition, updateFields, videoRef]);

  const onAudioTimeUpdate = useCallback(() => {
    const current = stateRef.current;
    const audio = audioRef.current;
    if (!audio || current.audition !== 'take') return;
    updateFields({ progressMs: Math.round(audio.currentTime * 1000) });
  }, [audioRef, updateFields]);

  const currentTakeBlob = state.localCapture?.blob ?? state.candidate?.blob ?? state.accepted?.blob ?? null;
  const sourceWaveform = currentWindow?.sourceWaveform ?? IDLE_WAVEFORM;
  const takeWaveform = state.localCapture?.probe.waveformPeaks.length
    ? state.localCapture.probe.waveformPeaks
    : state.candidate?.probe.waveformPeaks.length
      ? state.candidate.probe.waveformPeaks
      : state.accepted?.probe.waveformPeaks.length
        ? state.accepted.probe.waveformPeaks
        : state.captureState === 'capturing' && state.liveWaveform.length ? state.liveWaveform : IDLE_WAVEFORM;
  const canRecord = state.phase === 'ready' && state.grantStatus === 'available' && Boolean(state.grant)
    && state.captureState === 'idle' && !state.operation && !state.localCapture;
  const canListenToTake = Boolean(currentTakeBlob) && state.captureState === 'idle';
  const allAccepted = Boolean(state.project?.windows.every((window) => state.project?.acceptedByTurn[window.id] !== undefined));

  return {
    state,
    currentWindow,
    currentIndex: index,
    currentTakeBlob,
    sourceWaveform,
    takeWaveform,
    canRecord,
    canListenToTake,
    allAccepted,
    actions: {
      record,
      next,
      previous: () => {
        if (index <= 0 || !state.project) return;
        const previousWindow = state.project.windows[index - 1];
        if (previousWindow) requestLeave({ kind: 'previous', targetTurnId: previousWindow.id, layout });
      },
      exit: () => requestLeave({ kind: 'exit' }),
      openSettings: () => requestLeave({ kind: 'settings', path: '/settings/microphone', layout }),
      stay,
      saveAndLeave,
      discardAndLeave,
      retrySave,
      checkOperation,
      authorizeResult,
      playOriginal,
      playTake,
      pauseAudition,
      resumeAudition,
      beginSeek,
      seekTo,
      endSeek,
      cancelSeek,
      onVideoTimeUpdate,
      onAudioTimeUpdate,
      onAudioEnded: stopAudition,
    },
  };
}
