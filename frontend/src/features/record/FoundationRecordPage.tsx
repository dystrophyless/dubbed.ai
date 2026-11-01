import { useCallback, useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { CircleAlert, ChevronLeft, ChevronRight, Headphones, LogOut, Mic, Pause, Play, RotateCcw } from 'lucide-react';
import type { LayoutVariant, Locale, NavigationIntent, OperationId, PreparedProject } from '../../services/contracts';
import { translate } from '../../shared/i18n';
import type { MessageKey } from '../../shared/i18n';
import { Button, Dialog, StatusNotice } from '../../shared/ui';
import { useServices } from '../../shared/ServicesContext';
import { useRecordController } from './useRecordController';

function PositionDots({ project, currentIndex, locale }: { project: PreparedProject; currentIndex: number; locale: Locale }) {
  return (
    <div id="dots" aria-label={locale === 'ru' ? 'Текущая реплика' : 'Current line'}>
      {project.windows.map((window, index) => (
        <span key={window.id} aria-current={index === currentIndex ? 'true' : 'false'}
          aria-label={`${translate(locale, 'line')} ${index + 1}`} />
      ))}
    </div>
  );
}

function waveformPath(peaks: readonly number[]) {
  const values = peaks.length ? peaks : Array.from({ length: 64 }, () => 0);
  const maximum = Math.max(...values, 0);
  const points = values.map((peak, index) => [
    values.length === 1 ? 0 : index / (values.length - 1) * 1000,
    Math.max(1.5, maximum > 0 ? Math.max(0, peak) / maximum * 29 : 0),
  ] as const);
  const upper = points.map(([x, amplitude]) => `${x.toFixed(2)},${(32 - amplitude).toFixed(2)}`);
  const lower = [...points].reverse().map(([x, amplitude]) => `${x.toFixed(2)},${(32 + amplitude).toFixed(2)}`);
  return `M${upper.join(' L')} L${lower.join(' L')} Z`;
}

function formatClock(milliseconds: number) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function Waveform({ sourcePeaks, takePeaks, locale, takeActive, takeAvailable, sourceUnavailable, progressRatio }: {
  sourcePeaks: readonly number[];
  takePeaks: readonly number[];
  locale: Locale;
  takeActive: boolean;
  takeAvailable: boolean;
  sourceUnavailable: boolean;
  progressRatio: number;
}) {
  const label = `${translate(locale, 'original')}${takeAvailable ? ` · ${translate(locale, 'yourTake')}` : ''}`;
  const sourceDecoded = sourcePeaks.length > 0;
  const cursorX = Math.max(0, Math.min(1, progressRatio)) * 1000;
  return (
    <div className={`wave waveform-row${takeActive ? ' is-take-active' : ''}`} role="img"
      aria-label={label} title={translate(locale, 'sourceWaveformNote')}
      data-source-waveform={sourceDecoded ? 'decoded' : sourceUnavailable ? 'unavailable' : 'loading'}>
      <svg viewBox="0 0 1000 64" preserveAspectRatio="none" aria-hidden="true">
        <path className="original-envelope waveform-source" d={waveformPath(sourcePeaks)} />
        {takeAvailable && <path className="take-envelope waveform-take" d={waveformPath(takePeaks)} />}
        <line className="cursor waveform-cursor" x1={cursorX} x2={cursorX} y1="0" y2="64" />
      </svg>
    </div>
  );
}

function ControllerNotice({ notice, locale }: { notice: MessageKey | null; locale: Locale }) {
  if (!notice) return null;
  if (notice === 'nextNeedsTake') return <p className="muted-copy record-next-hint" role="status">{translate(locale, notice)}</p>;
  const errorKeys = new Set<MessageKey>([
    'recordingAccessUnavailable', 'recordingTabHeld', 'projectReloadFailed', 'sourcePlaybackFailed', 'takePlaybackFailed',
    'saveFailed', 'saveOutcomeUnknown', 'recordingFailed', 'zeroDataCapture', 'microphonePermissionFailed',
    'acceptanceOutcomeUnknown', 'acceptanceFailed', 'nextNeedsTake', 'discardOutcomeUnknown', 'discardFailed',
    'operationStillPending', 'operationReceiptMissing', 'operationCheckFailed', 'snapshotOutcomeUnknown', 'snapshotAuthorizationFailed',
  ]);
  const successKeys = new Set(['takeSavedAsCandidate', 'partialTakeSaved', 'takeAccepted']);
  return <StatusNotice tone={errorKeys.has(notice) ? 'error' : successKeys.has(notice) ? 'success' : 'info'}>{translate(locale, notice)}</StatusNotice>;
}

function takePresentationFor(state: ReturnType<typeof useRecordController>['state']) {
  const candidateAvailable = Boolean(state.candidate || state.localCapture);
  const hasUsableTake = candidateAvailable || Boolean(state.accepted);
  const candidateSuccess = state.notice === 'takeSavedAsCandidate'
    || state.notice === 'partialTakeSaved'
    || state.notice === 'takeAccepted';
  const notice = state.notice === 'takeSavedAsCandidate' || state.notice === 'takeAccepted' ? null : state.notice;
  const helperKey: MessageKey | null = state.notice && !candidateSuccess
    ? null
    : candidateAvailable ? 'candidateNextHint' : state.accepted ? 'savedTakeReadyHint' : 'nextNeedsTake';
  const statusKey: MessageKey | null = candidateAvailable ? 'newTakeStatus' : state.accepted ? 'savedTakeStatus' : null;
  return { hasUsableTake, helperKey, notice, statusKey };
}

const RECOVERY_TOAST_KEYS = new Set<MessageKey>([
  'recordingAccessUnavailable', 'recordingTabHeld', 'projectReloadFailed', 'sourcePlaybackFailed', 'takePlaybackFailed',
  'saveFailed', 'saveOutcomeUnknown', 'recordingFailed', 'zeroDataCapture', 'microphonePermissionFailed',
  'acceptanceOutcomeUnknown', 'acceptanceFailed', 'discardOutcomeUnknown', 'discardFailed',
  'operationStillPending', 'operationReceiptMissing', 'operationCheckFailed', 'snapshotOutcomeUnknown', 'snapshotAuthorizationFailed',
]);

function RecoveryToast({ notice, noticeRevision, phase, audition, locale }: {
  notice: MessageKey | null;
  noticeRevision: number;
  phase: 'loading' | 'ready' | 'missing';
  audition: 'original' | 'take' | null;
  locale: Locale;
}) {
  const [toast, setToast] = useState<{ notice: MessageKey; phase: 'entering' | 'visible' | 'leaving' } | null>(null);
  const toastElementRef = useRef<HTMLDivElement>(null);
  const wasReady = useRef(false);
  const seenRevision = useRef(noticeRevision);
  const entryTimer = useRef<number | null>(null);
  const readTimer = useRef<number | null>(null);
  const exitTimer = useRef<number | null>(null);
  const remainingReadMs = useRef(8000);
  const readStartedAt = useRef(0);
  const shownAt = useRef(0);
  const paused = useRef(false);
  const clearanceRef = useRef<{ body: HTMLElement; hadClass: boolean; previousClearance: string } | null>(null);

  const clearTimers = useCallback(() => {
    if (entryTimer.current !== null) window.clearTimeout(entryTimer.current);
    if (readTimer.current !== null) window.clearTimeout(readTimer.current);
    if (exitTimer.current !== null) window.clearTimeout(exitTimer.current);
    entryTimer.current = null;
    readTimer.current = null;
    exitTimer.current = null;
  }, []);

  const leave = useCallback((preserveScroll = false) => {
    const scrollPosition = preserveScroll ? window.scrollY : null;
    if (entryTimer.current !== null) window.clearTimeout(entryTimer.current);
    entryTimer.current = null;
    if (readTimer.current !== null) window.clearTimeout(readTimer.current);
    readTimer.current = null;
    paused.current = false;
    setToast((current) => current ? { ...current, phase: 'leaving' } : null);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    exitTimer.current = window.setTimeout(() => {
      setToast(null);
      if (scrollPosition !== null) {
        window.requestAnimationFrame(() => window.scrollTo({ top: scrollPosition, behavior: 'auto' }));
      }
    }, reducedMotion ? 0 : 140);
  }, []);

  const startReadTimer = useCallback((durationMs: number) => {
    readStartedAt.current = performance.now();
    readTimer.current = window.setTimeout(() => leave(true), durationMs);
  }, [leave]);

  useEffect(() => {
    if (phase !== 'ready') {
      wasReady.current = false;
      return;
    }
    if (!wasReady.current) {
      wasReady.current = true;
      seenRevision.current = noticeRevision;
      return;
    }
    if (seenRevision.current === noticeRevision) return;
    seenRevision.current = noticeRevision;
    clearTimers();
    setToast(null);
    if (!notice || !RECOVERY_TOAST_KEYS.has(notice)) return;

    remainingReadMs.current = 8000;
    paused.current = false;
    setToast({ notice, phase: 'entering' });
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const entryMs = reducedMotion ? 0 : 180;
    entryTimer.current = window.setTimeout(() => {
      setToast({ notice, phase: 'visible' });
      shownAt.current = performance.now();
      startReadTimer(remainingReadMs.current);
    }, entryMs);
    return () => {
      clearTimers();
      setToast(null);
    };
  }, [clearTimers, notice, noticeRevision, phase, startReadTimer]);

  useEffect(() => {
    if (!toast || toast.phase === 'leaving') return;
    const dismissOnScroll = () => leave();
    const dismissOnScrollKey = (event: KeyboardEvent) => {
      if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) leave();
    };
    window.addEventListener('wheel', dismissOnScroll, { passive: true });
    window.addEventListener('touchmove', dismissOnScroll, { passive: true });
    window.addEventListener('keydown', dismissOnScrollKey);
    return () => {
      window.removeEventListener('wheel', dismissOnScroll);
      window.removeEventListener('touchmove', dismissOnScroll);
      window.removeEventListener('keydown', dismissOnScrollKey);
    };
  }, [leave, toast]);

  useEffect(() => {
    if (audition) leave();
  }, [audition, leave]);

  const releaseDocumentFloor = useCallback(() => {
    const previous = clearanceRef.current;
    if (!previous) return;
    if (previous.previousClearance) previous.body.style.setProperty('--notice-clearance', previous.previousClearance);
    else previous.body.style.removeProperty('--notice-clearance');
    if (!previous.hadClass) previous.body.classList.remove('has-notice');
    clearanceRef.current = null;
  }, []);

  useEffect(() => () => releaseDocumentFloor(), [releaseDocumentFloor]);

  useEffect(() => {
    if (!toast) return;
    const body = document.body;
    if (!clearanceRef.current) {
      clearanceRef.current = {
        body,
        hadClass: body.classList.contains('has-notice'),
        previousClearance: body.style.getPropertyValue('--notice-clearance'),
      };
    }
    const node = toastElementRef.current;
    if (node) {
      const bottom = Number.parseFloat(window.getComputedStyle(node).bottom) || 0;
      const requested = node.offsetHeight + bottom + 16;
      const existing = Number.parseFloat(body.style.getPropertyValue('--notice-clearance')) || 0;
      body.style.setProperty('--notice-clearance', `${Math.max(existing, requested)}px`);
      body.classList.add('has-notice');
    }
    const frame = window.requestAnimationFrame(() => {
      const action = document.querySelector<HTMLElement>('.record-page [data-recovery-action]:not(:disabled)');
      const currentToast = toastElementRef.current;
      if (!action || !currentToast) return;
      const safeBottom = currentToast.getBoundingClientRect().top - 16;
      const actionBottom = action.getBoundingClientRect().bottom;
      if (actionBottom > safeBottom) {
        window.scrollTo({ top: window.scrollY + actionBottom - safeBottom, behavior: 'auto' });
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [toast]);

  const pauseOnDeliberateHover = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || toast?.phase !== 'visible' || paused.current || performance.now() - shownAt.current < 250) return;
    if (readTimer.current !== null) window.clearTimeout(readTimer.current);
    readTimer.current = null;
    remainingReadMs.current = Math.max(0, remainingReadMs.current - (performance.now() - readStartedAt.current));
    paused.current = true;
  };
  const resumeAfterHover = () => {
    if (!paused.current || toast?.phase !== 'visible') return;
    paused.current = false;
    startReadTimer(remainingReadMs.current);
  };

  if (!toast) return null;
  return <div ref={toastElementRef} className={`recovery-toast recovery-toast--${toast.phase}`} aria-hidden="true" role="presentation"
    onPointerMove={pauseOnDeliberateHover} onPointerLeave={resumeAfterHover}>
    <CircleAlert className="recovery-toast__icon" aria-hidden="true" size={20} strokeWidth={1.1} />
    <div className="recovery-toast__copy">
      <p className="recovery-toast__title">{translate(locale, 'recoveryTitle')}</p>
      <p className="recovery-toast__body">{translate(locale, toast.notice)}</p>
    </div>
  </div>;
}

function getResultActionState(controller: ReturnType<typeof useRecordController>) {
  const { state, currentIndex, allAccepted } = controller;
  const project = state.project;
  const completedLastLine = Boolean(project && state.accepted && !state.candidate && !state.localCapture
    && currentIndex === project.windows.length - 1 && allAccepted);
  return { canGoResult: allAccepted && Boolean(state.grant), completedLastLine };
}

function Controls({ layout, locale, controller, returnFocus, resultAction }: {
  layout: LayoutVariant;
  locale: Locale;
  controller: ReturnType<typeof useRecordController>;
  returnFocus?: 'exit' | 'settings';
  resultAction: ReactNode;
}) {
  const { state, currentIndex, canRecord, canListenToTake, actions } = controller;
  const project = state.project;
  const presentation = takePresentationFor(state);
  const busy = state.captureState !== 'idle' || state.operation !== null;
  const { canGoResult, completedLastLine } = getResultActionState(controller);
  const recordLabel = state.captureState === 'starting' ? translate(locale, 'preparingRecording')
    : state.captureState === 'capturing' ? translate(locale, 'recordingAction')
      : state.captureState === 'saving' ? translate(locale, 'savingAction')
        : translate(locale, presentation.hasUsableTake ? 'recordAgain' : 'recordNow');
  const originalAction = (
    <button id="replay" type="button" className={`hf-button${state.audition === 'original' ? ' primary hf-primary' : ''}`}
      onClick={() => void actions.playOriginal()} disabled={busy} aria-describedby="position dialogue">
      <span className="hf-icon" aria-hidden="true"><RotateCcw size={16} strokeWidth={1.1} /></span>{translate(locale, 'original')}
    </button>
  );
  const takeAction = (
    <button id="take" type="button" className="hf-button"
      onClick={() => void actions.playTake()} disabled={!canListenToTake || busy} aria-describedby="take-help">
      <span className="hf-icon" aria-hidden="true"><Headphones size={16} strokeWidth={1.1} /></span>{translate(locale, 'yourTake')}
    </button>
  );
  const recordAction = (
    <button id="record" type="button" className="hf-button record hf-record" onClick={() => void actions.record()} disabled={!canRecord}
      aria-describedby="position dialogue take-help"
      aria-busy={state.captureState === 'starting' || state.captureState === 'capturing' || state.captureState === 'saving'}>
      <span className="hf-icon" aria-hidden="true"><Mic size={16} strokeWidth={1.1} /></span>{recordLabel}
    </button>
  );
  const previousAction = (
    <button id="previous" type="button" className="hf-button" onClick={actions.previous} disabled={busy || currentIndex <= 0}>
      <span className="hf-icon" aria-hidden="true"><ChevronLeft size={16} strokeWidth={1.1} /></span>{translate(locale, 'previous')}
    </button>
  );
  const nextAction = (
    <button id="next" type="button" className="hf-button primary hf-primary" data-testid={completedLastLine ? 'final-to-result' : 'next'}
      onClick={() => void (completedLastLine ? actions.authorizeResult() : actions.next())} aria-describedby="take-help"
      disabled={busy || (completedLastLine ? !canGoResult : !presentation.hasUsableTake)}>
      {translate(locale, completedLastLine ? 'toResult' : 'next')}<span className="hf-icon" aria-hidden="true"><ChevronRight size={16} strokeWidth={1.1} /></span>
    </button>
  );
  const hasUtilities = Boolean(state.microphoneFailed || returnFocus === 'settings' || (state.localCapture && !state.operation && state.notice === 'saveFailed')
    || state.operation || (project && !state.grant));
  const utilities = hasUtilities && (
    <>
      {(state.microphoneFailed || returnFocus === 'settings') && <div id="mic-recovery"><button id="open-settings" type="button" className="hf-button hf-ghost"
        data-logical-focus="settings" data-recovery-action="settings" onClick={actions.openSettings} disabled={busy} aria-describedby="take-help">{translate(locale, 'settingsBoundary')}</button></div>}
      {state.localCapture && !state.operation && state.notice === 'saveFailed' && <button type="button" className="hf-button" data-recovery-action="retry-save"
        onClick={() => void actions.retrySave()} disabled={busy}>{translate(locale, 'retrySave')}</button>}
      {state.operation && <button type="button" className="hf-button" data-recovery-action="check-status"
        onClick={() => void actions.checkOperation()} disabled={state.captureState !== 'idle'}>{translate(locale, 'checkStatus')}</button>}
      {project && !state.grant && <p className="muted-copy">{translate(locale, state.grantStatus === 'held' ? 'recordingTabHeld' : 'recordingAccessUnavailable')}</p>}
    </>
  );
  return layout === 'A' ? (
    <>
      <div className="performance-actions">{originalAction}{recordAction}{takeAction}</div>
      {presentation.helperKey && <p id="take-help" className="secondary hint">{translate(locale, presentation.helperKey)}</p>}
      <ControllerNotice notice={presentation.notice} locale={locale} />
      <div className="navigation">{previousAction}{nextAction}</div>
      {hasUtilities && <div className="capture-help">{utilities}</div>}
    </>
  ) : (
    <>
      <div className="studio-controls">{previousAction}{originalAction}{recordAction}{takeAction}{nextAction}</div>
      <div className="take-status">
        <span id="saved" className="secondary" aria-live="polite">{presentation.statusKey ? translate(locale, presentation.statusKey) : ''}</span>
        {presentation.helperKey && <p id="take-help" className="secondary hint">{translate(locale, presentation.helperKey)}</p>}
        <ControllerNotice notice={presentation.notice} locale={locale} />
      </div>
      <div className="studio-utilities">{resultAction}{utilities}</div>
    </>
  );
}

function RecordHeader({ project, currentIndex, layout, locale, onExit, disabled, resultAction }: {
  project: PreparedProject;
  currentIndex: number;
  layout: LayoutVariant;
  locale: Locale;
  onExit(): void;
  disabled: boolean;
  resultAction: ReactNode;
}) {
  const exit = (
    <button id="exit" type="button" className={`hf-button${layout === 'A' ? ' workspace-exit' : ''} exit-link`}
      onClick={onExit} aria-label={translate(locale, 'exit')} data-logical-focus="exit" disabled={disabled}>
      <span className="hf-icon" aria-hidden="true"><LogOut size={16} strokeWidth={1.1} /></span>{translate(locale, 'exit')}
    </button>
  );
  return layout === 'A' ? (
    <header className="project-header record-header record-header--a">
      {exit}
      <div className="project-heading">
        <h1 id="heading">{project.title}</h1>
        <p id="result-project" className="project-name" hidden>{project.title}</p>
        <PositionDots project={project} currentIndex={currentIndex} locale={locale} />
      </div>
      <div id="header-actions">{resultAction}</div>
    </header>
  ) : (
    <header className="studio-header record-header record-header--b">
      {exit}
      <div className="studio-title">
        <h1 id="heading">{project.title}</h1>
        <p id="result-project" className="secondary" hidden>{project.title}</p>
        <PositionDots project={project} currentIndex={currentIndex} locale={locale} />
      </div>
      <p id="position" className="record-header__line-count">{locale === 'ru' ? `Реплика ${currentIndex + 1} / ${project.windows.length}` : `Line ${currentIndex + 1} / ${project.windows.length}`}</p>
    </header>
  );
}

function DialogCopy({ intent, locale }: { intent: NavigationIntent | null; locale: Locale }) {
  if (!intent) return null;
  return <p>{translate(locale, intent.kind === 'result' ? 'candidateResultBody' : 'candidateLeaveBody')}</p>;
}

export function FoundationRecordPage({ project, layout, locale, initialTurnId, returnFocus, onNavigate }: {
  project: PreparedProject;
  layout: LayoutVariant;
  locale: Locale;
  initialTurnId?: string;
  returnFocus?: 'exit' | 'settings';
  onNavigate(intent: NavigationIntent, operationId?: OperationId): Promise<void> | void;
}) {
  const services = useServices();
  const recordPageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [takeUrl, setTakeUrl] = useState<string | null>(null);
  const controller = useRecordController({ preparedProject: project, layout, initialTurnId, videoRef, audioRef, navigate: onNavigate });
  const { state, currentWindow, currentIndex, currentTakeBlob, takeWaveform, actions } = controller;
  const captureBusy = state.captureState !== 'idle' || state.operation !== null;
  const pauseAction = state.audition && (
    <button id="pause" type="button" className="hf-button media-pause" onClick={state.playing ? actions.pauseAudition : () => void actions.resumeAudition()} disabled={captureBusy}>
      <span className="hf-icon" aria-hidden="true">{state.playing ? <Pause size={16} strokeWidth={1.1} /> : <Play size={16} strokeWidth={1.1} />}</span>
      {translate(locale, state.playing ? 'pause' : 'resume')}
    </button>
  );
  const seekInteractionRef = useRef<{ pointerId: number | null; keys: Set<string> }>({ pointerId: null, keys: new Set() });
  const returnedFocus = useRef(false);
  useLayoutEffect(() => {
    if (state.phase !== 'ready' || !returnFocus || returnedFocus.current) return;
    const frame = window.requestAnimationFrame(() => {
      document.querySelector<HTMLElement>(`[data-logical-focus="${returnFocus}"]`)?.focus({ preventScroll: true });
      returnedFocus.current = true;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [returnFocus, state.phase]);

  const recoveryFocus = state.guardIntent && (state.notice === 'saveFailed' || state.notice === 'acceptanceFailed')
    ? 'retry-guard'
    : !state.guardIntent && state.notice === 'saveFailed' ? 'retry-save' : null;
  useLayoutEffect(() => {
    if (!recoveryFocus || state.captureState !== 'idle') return;
    const frame = window.requestAnimationFrame(() => {
      recordPageRef.current?.querySelector<HTMLElement>(`[data-recovery-action="${recoveryFocus}"]:not(:disabled)`)?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [recoveryFocus, state.captureState, state.noticeRevision]);

  useLayoutEffect(() => {
    const page = recordPageRef.current;
    const main = page?.querySelector<HTMLElement>('#main');
    if (!page || !main) return;
    const fit = () => {
      const desktop = layout === 'A' ? window.innerWidth >= 1248 : window.innerWidth >= 768;
      main.classList.toggle('compact-desktop', layout === 'A' && desktop && window.innerHeight < 760);
      main.classList.toggle('compact-studio', layout === 'B' && desktop);
      document.body.classList.toggle('compact-studio-page', layout === 'B' && desktop);
      if (document.fullscreenElement) return;

      const scene = main.querySelector<HTMLElement>('.scene');
      const rehearsal = main.querySelector<HTMLElement>('.rehearsal');
      const script = main.querySelector<HTMLElement>('.script');
      const timeline = main.querySelector<HTMLElement>('.timeline');
      if (!scene || !rehearsal || !script || !timeline) return;

      if (layout === 'A') {
        if (!desktop) {
          main.style.removeProperty('--workspace-width');
          main.style.removeProperty('--media-width');
          main.style.removeProperty('--panel-width');
          return;
        }
        const panelWidth = 272;
        const maxMediaWidth = Math.min(920, window.innerWidth - 2 * (32 + panelWidth + 24));
        main.style.setProperty('--panel-width', `${panelWidth}px`);
        let width = maxMediaWidth;
        for (let pass = 0; pass < 4; pass += 1) {
          main.style.setProperty('--media-width', `${width}px`);
          main.style.setProperty('--workspace-width', `${width}px`);
          const top = rehearsal.getBoundingClientRect().top + window.scrollY;
          const timelineGap = Number.parseFloat(getComputedStyle(timeline).marginTop) || 0;
          const available = window.innerHeight - top - 16 - timeline.offsetHeight - timelineGap - script.offsetHeight;
          const next = Math.min(maxMediaWidth, Math.max(288, available * 16 / 9));
          if (Math.abs(next - width) < 1) break;
          width = next;
        }
        return;
      }

      main.style.removeProperty('--studio-width');
      if (!desktop) return;
      const performance = main.querySelector<HTMLElement>('.performance');
      if (!performance) return;
      const maxWidth = Math.min(920, window.innerWidth - 66);
      const minimum = Math.min(576, maxWidth);
      let width = maxWidth;
      for (let pass = 0; pass < 6; pass += 1) {
        main.style.setProperty('--studio-width', `${width + 32}px`);
        const top = scene.getBoundingClientRect().top + window.scrollY;
        const bottom = Number.parseFloat(getComputedStyle(main).paddingBottom);
        const available = window.innerHeight - top - script.offsetHeight - timeline.offsetHeight - performance.offsetHeight - bottom;
        const next = Math.min(maxWidth, Math.max(minimum, available * 16 / 9));
        if (Math.abs(next - width) < 1) break;
        width = next;
      }
      main.style.setProperty('--studio-width', `${width + 32}px`);
    };
    let firstFrame = 0;
    let secondFrame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      firstFrame = window.requestAnimationFrame(() => {
        firstFrame = 0;
        secondFrame = window.requestAnimationFrame(() => {
          secondFrame = 0;
          fit();
        });
      });
    };
    fit();
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      main.style.removeProperty('--workspace-width');
      main.style.removeProperty('--media-width');
      main.style.removeProperty('--panel-width');
      main.style.removeProperty('--studio-width');
      main.classList.remove('compact-desktop', 'compact-studio');
      document.body.classList.remove('compact-studio-page');
    };
  }, [layout, currentWindow?.id, state.captureState, state.notice, state.candidate, state.localCapture, state.accepted, state.operation]);
  const readyProject = state.project ?? project;
  const takePresentation = takePresentationFor(state);
  const busy = state.captureState !== 'idle' || state.operation !== null;
  const [sourceVolume, setSourceVolume] = useState(0.7);
  const setSceneVideoRef = useCallback((video: HTMLVideoElement | null) => {
    videoRef.current = video;
    if (video) video.volume = sourceVolume;
  }, [sourceVolume]);
  const [decodedWaveforms, setDecodedWaveforms] = useState<Readonly<Record<string, readonly number[]>>>({});
  const [waveformUnavailable, setWaveformUnavailable] = useState(false);

  useEffect(() => {
    const abortController = new AbortController();
    setDecodedWaveforms({});
    setWaveformUnavailable(false);
    void services.media.decodeSourceWaveforms({
      url: readyProject.source.url,
      expectedSha256: readyProject.source.sha256,
      windows: readyProject.windows,
      signal: abortController.signal,
    }).then((waveforms) => {
      if (abortController.signal.aborted) return;
      setDecodedWaveforms(Object.fromEntries(readyProject.windows.map((window, index) => [window.id, waveforms[index] ?? []])));
    }).catch((error: unknown) => {
      if (!abortController.signal.aborted && !(error instanceof DOMException && error.name === 'AbortError')) setWaveformUnavailable(true);
    });
    return () => abortController.abort();
  }, [readyProject.id, readyProject.preparationRevision, readyProject.source.sha256, readyProject.source.url, readyProject.windows, services.media]);

  useEffect(() => {
    if (!currentTakeBlob) {
      setTakeUrl(null);
      return;
    }
    const url = services.media.createObjectUrl(currentTakeBlob);
    setTakeUrl(url);
    return () => services.media.revokeObjectUrl(url);
  }, [currentTakeBlob, services.media]);

  if (state.phase === 'loading') {
    return <div className="page-shell"><p>{translate(locale, 'loading')}</p></div>;
  }
  if (state.phase === 'missing' || !currentWindow) {
    return <div className="page-shell boundary-page"><StatusNotice tone="error">{translate(locale, 'notFound')}</StatusNotice></div>;
  }

  const lineText = currentWindow.text[locale];
  const durationMs = currentWindow.endMs - currentWindow.startMs;
  const closeGuard = () => actions.stay();
  const saveLabel = state.notice === 'saveFailed' ? translate(locale, 'retrySave')
    : state.notice === 'acceptanceFailed' ? translate(locale, 'retryAcceptAndLeave')
      : state.guardIntent?.kind === 'previous' || state.guardIntent?.kind === 'result' ? translate(locale, 'saveAndGo') : translate(locale, 'saveAndLeave');
  const discardLabel = state.guardIntent?.kind === 'previous' || state.guardIntent?.kind === 'result'
    ? translate(locale, 'goWithoutSaving') : translate(locale, 'leaveWithoutSaving');
  const { canGoResult, completedLastLine } = getResultActionState(controller);
  const resultAction = (
    <button id="to-result" type="button" className="hf-button primary hf-primary" onClick={() => void actions.authorizeResult()}
      hidden={!canGoResult || completedLastLine} disabled={busy}>
      {translate(locale, 'toResult')}<span className="hf-icon" aria-hidden="true"><ChevronRight size={16} strokeWidth={1.1} /></span>
    </button>
  );
  const positionLabel = locale === 'ru'
    ? `Реплика ${currentIndex + 1} / ${readyProject.windows.length}`
    : `Line ${currentIndex + 1} / ${readyProject.windows.length}`;
  const durationText = `${formatClock(state.progressMs)} / ${formatClock(durationMs)}`;
  const captureText = locale === 'ru'
    ? `Запись · осталось ${formatClock(durationMs - state.progressMs)}`
    : `Recording · ${formatClock(durationMs - state.progressMs)} left`;
  const takeAvailable = Boolean(state.localCapture || state.candidate || state.accepted || state.captureState === 'capturing');
  const waveDescription = state.captureState === 'capturing'
    ? (locale === 'ru' ? 'Исходная звуковая волна. Записывается ваш дубль.' : 'Original waveform. Your take is being recorded.')
    : locale === 'ru'
      ? `Исходная звуковая волна${takeAvailable ? ' с наложением вашего дубля' : ''}. Прослушивание: ${state.audition === 'take' ? 'ваш дубль' : 'оригинал'}.`
      : `Original waveform${takeAvailable ? ' with your take overlay' : ''}. Listening source: ${state.audition === 'take' ? 'Your take' : 'Original'}.`;
  const recordScene = (
    <div className="scene media-viewport record-stage">
      <video id="scene" ref={setSceneVideoRef} playsInline preload="auto" muted src={readyProject.source.url}
        onTimeUpdate={actions.onVideoTimeUpdate} aria-label={locale === 'ru' ? 'Исходное видео Sintel' : 'Sintel source video'} />
      <span id="capture-badge" hidden={state.captureState !== 'capturing'}>{captureText}</span>
      {pauseAction}
    </div>
  );
  const recordScript = <div className="script"><p id="dialogue">{lineText}</p></div>;
  const recordTimeline = (
    <div className="timeline">
      <Waveform sourcePeaks={decodedWaveforms[currentWindow.id] ?? []} takePeaks={takeWaveform} locale={locale}
        takeActive={state.audition === 'take'} takeAvailable={takeAvailable} sourceUnavailable={waveformUnavailable}
        progressRatio={durationMs > 0 ? state.progressMs / durationMs : 0} />
      <p id="wave-description" className="sr-only">{waveDescription}</p>
      <label className="sr-only" htmlFor="scrub">{translate(locale, 'windowPosition')}</label>
      <input id="scrub" data-testid="record-window-seek" className="record-seek" type="range" min={0} max={1000} step={1}
        value={Math.round(Math.min(durationMs, state.progressMs) / Math.max(1, durationMs) * 1000)} disabled={busy}
        aria-label={translate(locale, 'windowPosition')} aria-describedby="time wave-description"
        onPointerDown={(event) => {
          seekInteractionRef.current.pointerId = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          if (seekInteractionRef.current.keys.size === 0) actions.beginSeek();
        }}
        onPointerUp={(event) => {
          if (seekInteractionRef.current.pointerId !== event.pointerId) return;
          seekInteractionRef.current.pointerId = null;
          if (seekInteractionRef.current.keys.size === 0) actions.endSeek();
        }}
        onPointerCancel={(event) => {
          if (seekInteractionRef.current.pointerId !== event.pointerId) return;
          seekInteractionRef.current.pointerId = null;
          seekInteractionRef.current.keys.clear();
          actions.cancelSeek();
        }}
        onLostPointerCapture={(event) => {
          if (seekInteractionRef.current.pointerId !== event.pointerId) return;
          seekInteractionRef.current.pointerId = null;
          seekInteractionRef.current.keys.clear();
          actions.cancelSeek();
        }}
        onBlur={() => {
          if (seekInteractionRef.current.pointerId === null && seekInteractionRef.current.keys.size === 0) return;
          seekInteractionRef.current.pointerId = null;
          seekInteractionRef.current.keys.clear();
          actions.cancelSeek();
        }}
        onKeyDown={(event) => {
          if (!event.key.startsWith('Arrow') || seekInteractionRef.current.keys.has(event.key)) return;
          if (seekInteractionRef.current.pointerId === null && seekInteractionRef.current.keys.size === 0) actions.beginSeek();
          seekInteractionRef.current.keys.add(event.key);
        }}
        onKeyUp={(event) => {
          if (!event.key.startsWith('Arrow') || !seekInteractionRef.current.keys.delete(event.key)) return;
          if (seekInteractionRef.current.pointerId === null && seekInteractionRef.current.keys.size === 0) actions.endSeek();
        }}
        onChange={(event) => actions.seekTo(Number(event.currentTarget.value) / 1000 * durationMs)} />
      <div className="timeline-meta">
        <span id="time">{durationText}</span>
        <label>
          <span id="reference-volume-label">{translate(locale, 'referenceVolume')}</span>
          <input id="volume" aria-label={translate(locale, 'referenceVolume')} type="range" min="0" max="1" step="0.1" value={sourceVolume}
            onChange={(event) => {
              const volume = Number(event.currentTarget.value);
              setSourceVolume(volume);
              if (videoRef.current) videoRef.current.volume = volume;
            }} />
        </label>
      </div>
    </div>
  );

  return (
    <div id="product" ref={recordPageRef} className={`prototype-record--${layout.toLowerCase()}`} data-record-page data-layout={layout}>
      <main id="main" data-layout={layout}>
        <RecordHeader project={readyProject} currentIndex={currentIndex} layout={layout} locale={locale} onExit={actions.exit} disabled={busy} resultAction={resultAction} />
        <section id="record-view" className="record-workspace" aria-label={translate(locale, 'record')}>
          <div className="rehearsal">
            {recordScene}
            {recordScript}
            {recordTimeline}
          </div>
          {layout === 'A' ? (
            <aside className="performance" aria-label={translate(locale, 'performanceControls')}>
              <div className="line-context">
                <span><span id="position">{positionLabel}</span></span>
                <span id="saved" className="secondary" aria-live="polite">{takePresentation.statusKey ? translate(locale, takePresentation.statusKey) : ''}</span>
              </div>
              <div id="compact-script-slot" />
              <Controls layout={layout} locale={locale} controller={controller} returnFocus={returnFocus} resultAction={resultAction} />
            </aside>
          ) : (
            <section className="performance" aria-label={translate(locale, 'performanceControls')}>
              <Controls layout={layout} locale={locale} controller={controller} returnFocus={returnFocus} resultAction={resultAction} />
            </section>
          )}
        </section>
      </main>
      <audio id="take-audio" ref={audioRef} src={takeUrl ?? undefined} preload="auto" className="sr-only"
        onTimeUpdate={actions.onAudioTimeUpdate} onEnded={actions.onAudioEnded} aria-label={translate(locale, 'yourTake')} />
      <Dialog open={Boolean(state.guardIntent)} title={translate(locale, state.guardIntent?.kind === 'result' ? 'candidateResultTitle' : 'candidateLeaveTitle')} closeLabel={translate(locale, 'stayHere')} onOpenChange={(open) => { if (!open) closeGuard(); }}>
        <DialogCopy intent={state.guardIntent} locale={locale} />
        {state.guardIntent && <ControllerNotice notice={state.notice} locale={locale} />}
        <div className="guard-actions">
          <Button intent="primary" data-recovery-action="retry-guard" onClick={() => void actions.saveAndLeave()} disabled={busy}>{saveLabel}</Button>
          <Button intent="secondary" onClick={() => void actions.discardAndLeave()} disabled={busy}>{discardLabel}</Button>
          <Button intent="quiet" onClick={closeGuard} disabled={busy}>{translate(locale, 'stayHere')}</Button>
          {state.operation && <Button intent="secondary" data-recovery-action="check-status" onClick={() => void actions.checkOperation()} disabled={state.captureState !== 'idle'}>{translate(locale, 'checkStatus')}</Button>}
        </div>
      </Dialog>
      <RecoveryToast notice={state.notice} noticeRevision={state.noticeRevision} phase={state.phase} audition={state.audition} locale={locale} />
    </div>
  );
}
