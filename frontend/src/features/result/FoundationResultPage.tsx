import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type SyntheticEvent } from 'react';
import { Download, LogOut, Maximize, Minimize, Pause, Play, RotateCcw, Undo2, Volume2, VolumeX } from 'lucide-react';
import type { GenerationId, ImmutableResultSnapshot, LayoutVariant, Locale, MockResultJob, MockResultWorkspace, NavigationIntent, PreparedProject } from '../../services/contracts';
import { operationId, projectId, resultStartOperationId } from '../../services/contracts';
import { useServices } from '../../shared/ServicesContext';
import { translate } from '../../shared/i18n';
import { Button, StatusNotice } from '../../shared/ui';

type Source = 'original' | 'dub';
type MediaIdentity = {
  video: HTMLVideoElement;
  key: string;
  url: string;
  scopeKey: string;
  loadEpoch: number;
};
type PlaybackRequest = MediaIdentity & { interactionEpoch: number };
type PendingSource = { key: string; seconds: number; resume: boolean; interactionEpoch: number };

function isAbortError(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error
    && (error as { name?: unknown }).name === 'AbortError';
}

function timeLabel(seconds: number | null): string {
  if (seconds === null || !Number.isFinite(seconds) || seconds < 0) return '—:—';
  const minutes = Math.floor(seconds / 60);
  const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

export function FoundationResultPage({ project, snapshot, workspace: initialWorkspace, layout, locale, onNavigate }: {
  project: PreparedProject;
  snapshot: ImmutableResultSnapshot | null;
  workspace: MockResultWorkspace | null;
  layout: LayoutVariant;
  locale: Locale;
  onNavigate(intent: NavigationIntent): Promise<void> | void;
}) {
  const services = useServices();
  const scope = useMemo(() => ({ actorId: services.actorId, projectId: projectId(project.id) }), [project.id, services.actorId]);
  const scopeKey = JSON.stringify([scope.actorId, scope.projectId]);
  const [workspace, setWorkspace] = useState(initialWorkspace);
  const [unavailableScopeKey, setUnavailableScopeKey] = useState<string | null>(null);
  const [comparison, setComparison] = useState<Source>('dub');
  const [presentedGenerationId, setPresentedGenerationId] = useState<GenerationId | null>(initialWorkspace?.currentGeneration?.id ?? null);
  const [dubSource, setDubSource] = useState<{ id: GenerationId; url: string } | null>(null);
  const [dubLoading, setDubLoading] = useState(false);
  const [dubError, setDubError] = useState(false);
  const [mediaReadAttempt, setMediaReadAttempt] = useState(0);
  const [sourceError, setSourceError] = useState(false);
  const [sourceLoading, setSourceLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [mediaLoadEpoch, setMediaLoadEpoch] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [ended, setEnded] = useState(false);
  const [volume, setVolume] = useState(0.7);
  const [fullscreen, setFullscreen] = useState(false);
  const [resultAction, setResultAction] = useState<'idle' | 'busy' | 'failed' | 'unknown'>('idle');
  const [operationToCheck, setOperationToCheck] = useState<import('../../services/contracts').OperationId | null>(null);
  const [downloadState, setDownloadState] = useState<'idle' | 'busy' | 'failed'>('idle');
  const resultPageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sourceKeyRef = useRef('dub:none');
  const sourceUrlRef = useRef<string | null>(null);
  const mediaLoadEpochRef = useRef(0);
  const playbackInteractionEpochRef = useRef(0);
  const activePlayInteractionEpochRef = useRef<number | null>(null);
  const pendingSourceRef = useRef<PendingSource | null>(null);
  const seekActiveRef = useRef(false);
  const heldSeekKeysRef = useRef(new Set<string>());
  const pinnedDownloadGenerationRef = useRef<GenerationId | null>(null);
  const downloadUrlsRef = useRef<string[]>([]);
  const downloadRequestRef = useRef(0);
  const pageIsActiveRef = useRef(true);
  const scopeKeyRef = useRef(scopeKey);
  const projectAvailableRef = useRef(true);
  scopeKeyRef.current = scopeKey;

  const markProjectUnavailable = useCallback((expectedScopeKey: string) => {
    if (!pageIsActiveRef.current || scopeKeyRef.current !== expectedScopeKey) return;
    projectAvailableRef.current = false;
    playbackInteractionEpochRef.current += 1;
    activePlayInteractionEpochRef.current = null;
    pendingSourceRef.current = null;
    downloadRequestRef.current += 1;
    setUnavailableScopeKey(expectedScopeKey);
    setWorkspace(null);
    setPresentedGenerationId(null);
    setDubSource(null);
    setDubLoading(false);
    setDubError(false);
    setDownloadState('idle');
    setPlaying(false);
    videoRef.current?.pause();
    for (const url of downloadUrlsRef.current) services.media.revokeObjectUrl(url);
    downloadUrlsRef.current = [];
  }, [services.media]);
  const projectUnavailable = unavailableScopeKey === scopeKey;

  useLayoutEffect(() => {
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      secondFrame = window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        headingRef.current?.focus({ preventScroll: true });
      });
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      if (secondFrame) window.cancelAnimationFrame(secondFrame);
    };
  }, [snapshot?.id]);

  useLayoutEffect(() => {
    const page = resultPageRef.current;
    if (!page) return;
    const fit = () => {
      if (window.innerWidth < 768 || document.fullscreenElement) {
        page.style.removeProperty('--result-content-width');
        return;
      }
      const workspace = page.querySelector<HTMLElement>('.result-workspace');
      const screen = page.querySelector<HTMLElement>('.result-player__screen');
      const rail = page.querySelector<HTMLElement>('.result-player__transport');
      const details = page.querySelector<HTMLElement>('.result-workspace__details');
      if (!workspace || !screen || !rail || !details) return;
      const maximum = Math.max(0, Math.min(920, window.innerWidth - 64));
      const configuredMinimum = Number.parseFloat(getComputedStyle(workspace).getPropertyValue('--result-min-width')) || 520;
      const minimum = Math.min(configuredMinimum, maximum);
      let width = maximum;
      for (let pass = 0; pass < 6; pass += 1) {
        page.style.setProperty('--result-content-width', `${width}px`);
        const availableHeight = window.innerHeight - screen.getBoundingClientRect().top + window.scrollY
          - rail.offsetHeight - details.offsetHeight - 40;
        const next = Math.min(width, Math.max(minimum, Math.min(920, availableHeight * 16 / 9)));
        if (Math.abs(next - width) < 1) break;
        width = next;
      }
      page.style.setProperty('--result-content-width', `${width}px`);
    };
    let frame = 0;
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(fit);
    };
    fit();
    const screen = page.querySelector<HTMLElement>('.result-player__screen');
    const rail = page.querySelector<HTMLElement>('.result-player__transport');
    const details = page.querySelector<HTMLElement>('.result-workspace__details');
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(schedule);
    if (screen) observer?.observe(screen);
    if (rail) observer?.observe(rail);
    if (details) observer?.observe(details);
    window.addEventListener('resize', schedule);
    document.fonts?.ready.then(schedule);
    return () => {
      window.removeEventListener('resize', schedule);
      observer?.disconnect();
      window.cancelAnimationFrame(frame);
      page.style.removeProperty('--result-content-width');
    };
  }, [layout, snapshot?.id, workspace, fullscreen, downloadState, resultAction, sourceError, dubError, dubLoading]);

  useEffect(() => {
    pageIsActiveRef.current = true;
    return () => {
      pageIsActiveRef.current = false;
      playbackInteractionEpochRef.current += 1;
      activePlayInteractionEpochRef.current = null;
      pendingSourceRef.current = null;
      downloadRequestRef.current += 1;
    };
  }, []);

  useEffect(() => {
    projectAvailableRef.current = true;
    downloadRequestRef.current += 1;
    pinnedDownloadGenerationRef.current = null;
    setUnavailableScopeKey(null);
    setDownloadState('idle');
    setWorkspace(initialWorkspace);
    setPresentedGenerationId(initialWorkspace?.currentGeneration?.id ?? null);
    setDubSource(null);
  }, [initialWorkspace, scopeKey]);

  const refreshWorkspace = useCallback(async () => {
    if (!snapshot) return;
    const next = await services.results.loadWorkspace(scope, snapshot.id);
    if (next) setWorkspace(next);
    else {
      const prepared = await services.projects.loadPreparedProject(scope).catch(() => null);
      if (!prepared) markProjectUnavailable(scopeKey);
    }
  }, [markProjectUnavailable, scope, scopeKey, services.projects, services.results, snapshot]);

  useEffect(() => {
    if (!snapshot) return;
    let active = true;
    const effectScopeKey = scopeKey;
    const refresh = () => {
      void services.results.loadWorkspace(scope, snapshot.id).then((next) => {
        if (!active || !pageIsActiveRef.current || scopeKeyRef.current !== effectScopeKey) return;
        if (next) {
          setWorkspace(next);
          return;
        }
        void services.projects.loadPreparedProject(scope).then((prepared) => {
          if (active && pageIsActiveRef.current && scopeKeyRef.current === effectScopeKey && !prepared) markProjectUnavailable(effectScopeKey);
        }).catch(() => undefined);
      }).catch(() => undefined);
    };
    const unsubscribe = services.results.subscribe(scope, refresh);
    refresh();
    return () => { active = false; unsubscribe(); };
  }, [markProjectUnavailable, scope, scopeKey, services.projects, services.results, snapshot]);

  const job = workspace?.job ?? null;
  const latestReady = job?.status === 'ready' ? job : null;
  const sourceKey = comparison === 'original'
    ? 'original'
    : presentedGenerationId ? `dub:${presentedGenerationId}` : 'dub:none';
  sourceKeyRef.current = sourceKey;
  const sourceUrl = comparison === 'original'
    ? project.source.url
    : dubSource?.id === presentedGenerationId ? dubSource.url : null;
  sourceUrlRef.current = sourceUrl;
  useLayoutEffect(() => {
    const nextEpoch = mediaLoadEpochRef.current + 1;
    mediaLoadEpochRef.current = nextEpoch;
    setMediaLoadEpoch(nextEpoch);
    setSourceError(false);
  }, [scopeKey, sourceKey, sourceUrl]);
  const isPreviousPresentation = Boolean(presentedGenerationId && job && job.id !== presentedGenerationId);
  const newVersionReady = Boolean(latestReady && latestReady.id !== presentedGenerationId);

  useEffect(() => {
    if (!workspace?.currentGeneration || presentedGenerationId) return;
    setPresentedGenerationId(workspace.currentGeneration.id);
  }, [presentedGenerationId, workspace?.currentGeneration]);

  useEffect(() => {
    if (!latestReady || latestReady.id === presentedGenerationId) return;
    const video = videoRef.current;
    const hasPreviousPresentation = Boolean(presentedGenerationId);
    if (video && !video.paused && !video.ended && hasPreviousPresentation) return;
    if (comparison === 'dub' && video) {
      const interactionEpoch = ++playbackInteractionEpochRef.current;
      activePlayInteractionEpochRef.current = null;
      video.pause();
      pendingSourceRef.current = { key: `dub:${latestReady.id}`, seconds: 0, resume: false, interactionEpoch };
    }
    setPresentedGenerationId(latestReady.id);
    setCurrentTime(0);
    setEnded(false);
  }, [comparison, latestReady, presentedGenerationId]);

  useEffect(() => {
    if (!presentedGenerationId) {
      setDubSource(null);
      setDubLoading(false);
      setDubError(false);
      return;
    }
    let active = true;
    let url: string | null = null;
    const requestScopeKey = scopeKey;
    const isCurrent = () => active && pageIsActiveRef.current && scopeKeyRef.current === requestScopeKey && projectAvailableRef.current;
    setDubSource(null);
    setDubError(false);
    setDubLoading(true);
    void (async () => {
      const payload = await services.results.readGenerationMedia(scope, presentedGenerationId);
      if (!isCurrent()) return;
      const prepared = await services.projects.loadPreparedProject(scope).catch(() => null);
      if (!isCurrent()) return;
      if (!prepared) {
        markProjectUnavailable(requestScopeKey);
        return;
      }
      url = services.media.createObjectUrl(payload.blob);
      if (!isCurrent()) {
        services.media.revokeObjectUrl(url);
        url = null;
        return;
      }
      setDubSource({ id: presentedGenerationId, url });
      setDubLoading(false);
    })().catch(() => {
      if (isCurrent()) { setDubLoading(false); setDubError(true); }
    });
    return () => {
      active = false;
      if (url) services.media.revokeObjectUrl(url);
    };
  }, [markProjectUnavailable, mediaReadAttempt, presentedGenerationId, scope, scopeKey, services.media, services.projects, services.results]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.volume = volume;
  }, [sourceKey, volume, sourceUrl]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === playerRef.current);
    document.addEventListener('fullscreenchange', update);
    return () => document.removeEventListener('fullscreenchange', update);
  }, []);

  useEffect(() => () => {
    for (const url of downloadUrlsRef.current) services.media.revokeObjectUrl(url);
  }, [services.media]);

  const startOrRetry = useCallback(async () => {
    if (!snapshot || workspace?.isLatestAuthorization === false || resultAction === 'busy') return;
    setResultAction('busy');
    const operation = resultStartOperationId(snapshot.id);
    setOperationToCheck(operation);
    try {
      const outcome = await services.results.startOrReconcile({ scope, snapshotId: snapshot.id });
      await refreshWorkspace();
      setResultAction(outcome.kind === 'unknown' ? 'unknown' : 'idle');
      if (outcome.kind === 'committed') setOperationToCheck(null);
    } catch {
      setResultAction('failed');
    }
  }, [refreshWorkspace, resultAction, scope, services.results, snapshot, workspace?.isLatestAuthorization]);

  const retryAssembly = useCallback(async () => {
    if (!snapshot || workspace?.isLatestAuthorization === false || !job || job.status !== 'failed' || resultAction === 'busy') return;
    const operation = operationId(`result-retry:${crypto.randomUUID()}`);
    setOperationToCheck(operation);
    setResultAction('busy');
    try {
      const outcome = await services.results.retryAssembly({ scope, snapshotId: snapshot.id, operationId: operation });
      await refreshWorkspace();
      setResultAction(outcome.kind === 'unknown' ? 'unknown' : 'idle');
      if (outcome.kind === 'committed') setOperationToCheck(null);
    } catch {
      setResultAction('failed');
    }
  }, [job, refreshWorkspace, resultAction, scope, services.results, snapshot, workspace?.isLatestAuthorization]);

  const checkResultStatus = useCallback(async () => {
    const id = operationToCheck ?? (snapshot ? resultStartOperationId(snapshot.id) : null);
    if (!id || resultAction === 'busy') return;
    setResultAction('busy');
    try {
      const lookup = await services.results.lookupResultOperation(scope, id);
      if (lookup.kind === 'committed') {
        await refreshWorkspace();
        setResultAction('idle');
        setOperationToCheck(null);
      } else if (lookup.kind === 'pending') {
        setResultAction('unknown');
      } else {
        setResultAction('failed');
      }
    } catch {
      setResultAction('unknown');
    }
  }, [operationToCheck, refreshWorkspace, resultAction, scope, services.results, snapshot]);

  const isCurrentMedia = useCallback((identity: MediaIdentity) => (
    pageIsActiveRef.current
    && projectAvailableRef.current
    && scopeKeyRef.current === identity.scopeKey
    && videoRef.current === identity.video
    && sourceKeyRef.current === identity.key
    && sourceUrlRef.current === identity.url
    && mediaLoadEpochRef.current === identity.loadEpoch
    && identity.video.getAttribute('src') === identity.url
  ), []);

  const requestPlayback = useCallback((request: PlaybackRequest) => {
    const isCurrent = () => isCurrentMedia(request)
      && playbackInteractionEpochRef.current === request.interactionEpoch;
    if (!isCurrent()) return;
    activePlayInteractionEpochRef.current = request.interactionEpoch;
    let result: Promise<void>;
    try {
      result = request.video.play();
    } catch (error) {
      result = Promise.reject(error);
    }
    void result.catch((error: unknown) => {
      if (!isCurrent()) return;
      if (activePlayInteractionEpochRef.current === request.interactionEpoch) {
        activePlayInteractionEpochRef.current = null;
      }
      setPlaying(false);
      if (!isAbortError(error)) setSourceError(true);
    });
  }, [isCurrentMedia]);

  const playCurrent = useCallback(() => {
    const video = videoRef.current;
    const url = sourceUrlRef.current;
    if (!video || !url) return;
    if (video.ended) video.currentTime = 0;
    pendingSourceRef.current = null;
    const interactionEpoch = ++playbackInteractionEpochRef.current;
    requestPlayback({
      video,
      key: sourceKeyRef.current,
      url,
      scopeKey: scopeKeyRef.current,
      loadEpoch: mediaLoadEpochRef.current,
      interactionEpoch,
    });
  }, [requestPlayback]);

  const pauseCurrent = useCallback(() => {
    playbackInteractionEpochRef.current += 1;
    activePlayInteractionEpochRef.current = null;
    pendingSourceRef.current = null;
    videoRef.current?.pause();
    setPlaying(false);
  }, []);

  const switchSource = useCallback((next: Source) => {
    if (next === comparison || (next === 'dub' && (!presentedGenerationId || !dubSource || dubSource.id !== presentedGenerationId))) return;
    const video = videoRef.current;
    const seconds = video?.currentTime ?? currentTime;
    const resume = Boolean(video && !video.paused && !video.ended);
    const interactionEpoch = ++playbackInteractionEpochRef.current;
    activePlayInteractionEpochRef.current = null;
    video?.pause();
    const key = next === 'original' ? 'original' : `dub:${presentedGenerationId}`;
    pendingSourceRef.current = { key, seconds, resume, interactionEpoch };
    setSourceError(false);
    setComparison(next);
  }, [comparison, currentTime, dubSource, presentedGenerationId]);

  const watchNew = useCallback((next: MockResultJob) => {
    const interactionEpoch = ++playbackInteractionEpochRef.current;
    activePlayInteractionEpochRef.current = null;
    videoRef.current?.pause();
    pendingSourceRef.current = { key: `dub:${next.id}`, seconds: 0, resume: false, interactionEpoch };
    setComparison('dub');
    setPresentedGenerationId(next.id);
    setCurrentTime(0);
    setEnded(false);
    setPlaying(false);
    setSourceError(false);
  }, []);

  const beginSeek = useCallback(() => {
    const video = videoRef.current;
    if (!video || seekActiveRef.current) return;
    seekActiveRef.current = true;
    playbackInteractionEpochRef.current += 1;
    activePlayInteractionEpochRef.current = null;
    pendingSourceRef.current = null;
    video.pause();
    setPlaying(false);
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const video = videoRef.current;
    if (!video || duration === null || !Number.isFinite(seconds)) return;
    video.currentTime = Math.max(0, Math.min(duration, seconds));
    setCurrentTime(video.currentTime);
  }, [duration]);

  const endSeek = useCallback((resume: boolean) => {
    if (!seekActiveRef.current) return;
    seekActiveRef.current = false;
    if (!resume) return;
    const video = videoRef.current;
    if (duration !== null && video && video.currentTime >= duration) {
      setCurrentTime(duration);
      setEnded(true);
      setPlaying(false);
      return;
    }
    playCurrent();
  }, [duration, playCurrent]);

  const replay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = 0;
    setCurrentTime(0);
    setEnded(false);
    playCurrent();
  }, [playCurrent]);

  const retryPlayback = useCallback(() => {
    if (dubError) {
      setMediaReadAttempt((attempt) => attempt + 1);
      return;
    }
    const video = videoRef.current;
    const url = sourceUrlRef.current;
    if (!video || !url) return;
    const interactionEpoch = ++playbackInteractionEpochRef.current;
    const loadEpoch = ++mediaLoadEpochRef.current;
    setMediaLoadEpoch(loadEpoch);
    activePlayInteractionEpochRef.current = null;
    pendingSourceRef.current = null;
    setSourceError(false);
    setCurrentTime(0);
    setEnded(false);
    setPlaying(false);
    video.load();
    requestPlayback({
      video,
      key: sourceKeyRef.current,
      url,
      scopeKey: scopeKeyRef.current,
      loadEpoch,
      interactionEpoch,
    });
  }, [dubError, requestPlayback]);

  const toggleFullscreen = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (document.fullscreenElement === player) void document.exitFullscreen().catch(() => undefined);
    else void player.requestFullscreen?.().catch(() => undefined);
  }, []);

  const downloadMyDub = useCallback(async (retry = false) => {
    if (downloadState === 'busy') return;
    const target = retry ? pinnedDownloadGenerationRef.current : presentedGenerationId;
    if (!target) return;
    const requestScopeKey = scopeKey;
    const requestId = ++downloadRequestRef.current;
    const isCurrent = () => pageIsActiveRef.current && scopeKeyRef.current === requestScopeKey
      && projectAvailableRef.current && downloadRequestRef.current === requestId;
    pinnedDownloadGenerationRef.current = target;
    setDownloadState('busy');
    try {
      const payload = await services.results.readGenerationMedia(scope, target);
      if (!isCurrent()) return;
      const prepared = await services.projects.loadPreparedProject(scope).catch(() => null);
      if (!isCurrent()) return;
      if (!prepared) {
        markProjectUnavailable(requestScopeKey);
        return;
      }
      if (!isCurrent()) return;
      const url = services.media.createObjectUrl(payload.blob);
      downloadUrlsRef.current.push(url);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = payload.filename;
      anchor.style.display = 'none';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => {
        services.media.revokeObjectUrl(url);
        downloadUrlsRef.current = downloadUrlsRef.current.filter((item) => item !== url);
      }, 60000);
      if (isCurrent()) setDownloadState('idle');
    } catch {
      if (isCurrent()) setDownloadState('failed');
    }
  }, [downloadState, markProjectUnavailable, presentedGenerationId, scope, scopeKey, services.media, services.projects, services.results]);

  const exit = () => {
    videoRef.current?.pause();
    setPlaying(false);
    void onNavigate({ kind: 'exit' });
  };

  const returnToRecording = () => {
    videoRef.current?.pause();
    setPlaying(false);
    const first = project.windows[0];
    if (first) void onNavigate({ kind: 'advance', targetTurnId: first.id, layout });
  };

  if (projectUnavailable) {
    return (
      <div ref={resultPageRef} className={`page-shell result-page result-page--${layout.toLowerCase()}`} data-layout={layout} data-testid="deleted-project-boundary">
        <main className="result-workspace">
          <StatusNotice tone="error">{translate(locale, 'notFound')}</StatusNotice>
          <div className="result-recovery"><a className="button button--secondary" href="/">{translate(locale, 'backToPreview')}</a></div>
        </main>
      </div>
    );
  }

  if (!snapshot) {
    const first = project.windows[0];
    return (
      <div ref={resultPageRef} className={`page-shell result-page result-page--${layout.toLowerCase()}`} data-layout={layout}>
        <header className="result-header">
          <Button intent="secondary" className="exit-link" type="button" onClick={() => void onNavigate({ kind: 'exit' })} aria-label={translate(locale, 'exit')} data-logical-focus="exit">
            <LogOut aria-hidden="true" size={16} strokeWidth={1.1} /><span>{translate(locale, 'exit')}</span>
          </Button>
          <div className="result-header__title">
            <h1 ref={headingRef} tabIndex={-1}>{translate(locale, 'resultHeading')}</h1>
            <p>{project.title}</p>
          </div>
        </header>
        <main className="result-workspace" aria-label={translate(locale, 'resultHeading')}>
          <StatusNotice tone="error">{translate(locale, 'resultNotAuthorized')}</StatusNotice>
          <div className="result-recovery">
            <Button intent="secondary" onClick={returnToRecording} disabled={!first}><Undo2 aria-hidden="true" size={16} strokeWidth={1.1} />{translate(locale, 'returnRecording')}</Button>
          </div>
        </main>
      </div>
    );
  }

  const onLoadedMetadata = (
    event: SyntheticEvent<HTMLVideoElement>,
    key: string,
    url: string,
    eventScopeKey: string,
    loadEpoch: number,
  ) => {
    const video = event.currentTarget;
    const identity: MediaIdentity = { video, key, url, scopeKey: eventScopeKey, loadEpoch };
    if (!isCurrentMedia(identity)) return;
    const knownDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null;
    setDuration(knownDuration);
    const pending = pendingSourceRef.current;
    if (pending?.key === key) {
      pendingSourceRef.current = null;
      if (knownDuration !== null) video.currentTime = Math.max(0, Math.min(knownDuration, pending.seconds));
      else video.currentTime = 0;
      setCurrentTime(video.currentTime);
      if (pending.interactionEpoch !== playbackInteractionEpochRef.current) return;
      if (pending.resume) requestPlayback({ ...identity, interactionEpoch: pending.interactionEpoch });
      else video.pause();
      return;
    }
    if (activePlayInteractionEpochRef.current === playbackInteractionEpochRef.current) return;
    video.pause();
    video.currentTime = 0;
    setCurrentTime(0);
  };

  const onVideoError = (video: HTMLVideoElement, key: string, url: string, eventScopeKey: string, loadEpoch: number) => {
    if (!isCurrentMedia({ video, key, url, scopeKey: eventScopeKey, loadEpoch })) return;
    activePlayInteractionEpochRef.current = null;
    setSourceLoading(false);
    setSourceError(true);
    setPlaying(false);
  };

  return (
    <div ref={resultPageRef} className={`page-shell result-page result-page--${layout.toLowerCase()}`} data-layout={layout}>
      <main id="main" className="result-workspace" aria-label={translate(locale, 'resultHeading')}>
        {layout === 'A' ? (
          <header className="project-header result-header">
            <button id="exit" className="hf-button workspace-exit exit-link" type="button" onClick={exit}
              aria-label={translate(locale, 'exit')} data-logical-focus="exit">
              <span className="hf-icon" aria-hidden="true"><LogOut size={16} strokeWidth={1.1} /></span>{translate(locale, 'exit')}
            </button>
            <div className="project-heading">
              <h1 id="heading" ref={headingRef} tabIndex={-1}>{translate(locale, 'resultHeading')}</h1>
              <p id="result-project" className="project-name">{project.title}</p>
              <div id="dots" aria-label={locale === 'ru' ? 'Текущая реплика' : 'Current line'}>
                {project.windows.map((window, index) => (
                  <span key={window.id} aria-current={index === project.windows.length - 1 ? 'true' : 'false'}
                    aria-label={`${translate(locale, 'line')} ${index + 1}`} />
                ))}
              </div>
            </div>
            <div id="header-actions" />
          </header>
        ) : (
          <header className="studio-header result-header">
            <button id="exit" className="hf-button exit-link" type="button" onClick={exit}
              aria-label={translate(locale, 'exit')} data-logical-focus="exit">
              <span className="hf-icon" aria-hidden="true"><LogOut size={16} strokeWidth={1.1} /></span>{translate(locale, 'exit')}
            </button>
            <div className="studio-title">
              <h1 id="heading" ref={headingRef} tabIndex={-1}>{translate(locale, 'resultHeading')}</h1>
              <p id="result-project" className="secondary">{project.title}</p>
              <div id="dots" aria-label={locale === 'ru' ? 'Текущая реплика' : 'Current line'}>
                {project.windows.map((window, index) => (
                  <span key={window.id} aria-current={index === project.windows.length - 1 ? 'true' : 'false'}
                    aria-label={`${translate(locale, 'line')} ${index + 1}`} />
                ))}
              </div>
            </div>
            <p id="position" className="record-header__line-count">
              {locale === 'ru' ? `Реплика ${project.windows.length} / ${project.windows.length}` : `Line ${project.windows.length} / ${project.windows.length}`}
            </p>
          </header>
        )}
        {newVersionReady && latestReady && (
          <div className="result-new-version" role="status">
            <span>{translate(locale, 'newVersionReady')}</span>
            <Button intent="secondary" onClick={() => watchNew(latestReady)}>{translate(locale, 'watchNew')}</Button>
          </div>
        )}
        {isPreviousPresentation && <p className="result-previous-version">{translate(locale, 'previousVersion')}</p>}

        <section id="result-view" aria-label={translate(locale, 'result')}>
          <div className="result-stage">
            <div id="result-player" className="result-player" ref={playerRef} data-testid="result-player">
              <div className="result-player__screen result-picture">
                <div className="result-player__source-tabs result-sources" role="group" aria-label={translate(locale, 'result')}
              onKeyDown={(event) => {
                const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'));
                const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
                if (currentIndex < 0 || buttons.length < 2) return;
                let nextIndex: number;
                if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
                else if (event.key === 'ArrowLeft') nextIndex = (currentIndex + buttons.length - 1) % buttons.length;
                else if (event.key === 'Home') nextIndex = 0;
                else if (event.key === 'End') nextIndex = buttons.length - 1;
                else return;
                event.preventDefault();
                const target = buttons[nextIndex];
                target?.focus();
                target?.click();
              }}>
              <button id="source-original" type="button" aria-pressed={comparison === 'original'} onClick={() => switchSource('original')}>
                {translate(locale, 'original')}
              </button>
              <button id="source-dub" type="button" aria-pressed={comparison === 'dub'} disabled={!presentedGenerationId || !dubSource}
                onClick={() => switchSource('dub')}>
                {translate(locale, 'myDub')}
              </button>
            </div>
            {sourceUrl ? (
              <video
                id="result"
                key={sourceKey}
                ref={videoRef}
                data-testid="result-video"
                data-source={comparison}
                data-generation-id={comparison === 'dub' ? presentedGenerationId ?? '' : ''}
                src={sourceUrl}
                preload="metadata"
                playsInline
                aria-label={translate(locale, comparison === 'original' ? 'original' : 'myDub')}
                onLoadStart={(event) => {
                  if (isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })) {
                    setSourceLoading(true);
                    setSourceError(false);
                  }
                }}
                onLoadedMetadata={(event) => onLoadedMetadata(event, sourceKey, sourceUrl, scopeKey, mediaLoadEpoch)}
                onCanPlay={(event) => {
                  if (isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })) setSourceLoading(false);
                }}
                onPlay={(event) => {
                  if (!isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })) return;
                  setPlaying(true);
                  setEnded(false);
                  setSourceError(false);
                }}
                onPause={(event) => {
                  if (!isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })
                    || !event.currentTarget.paused) return;
                  activePlayInteractionEpochRef.current = null;
                  setPlaying(false);
                }}
                onTimeUpdate={(event) => {
                  if (isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })) {
                    setCurrentTime(event.currentTarget.currentTime);
                  }
                }}
                onDurationChange={(event) => {
                  if (!isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })) return;
                  const value = event.currentTarget.duration;
                  setDuration(Number.isFinite(value) && value > 0 ? value : null);
                }}
                onEnded={(event) => {
                  if (!isCurrentMedia({ video: event.currentTarget, key: sourceKey, url: sourceUrl, scopeKey, loadEpoch: mediaLoadEpoch })) return;
                  activePlayInteractionEpochRef.current = null;
                  setPlaying(false);
                  setEnded(true);
                }}
                onError={(event) => onVideoError(event.currentTarget, sourceKey, sourceUrl, scopeKey, mediaLoadEpoch)}
              />
            ) : (
              <div className="result-player__empty" role="status">
                <span>{dubLoading ? translate(locale, 'videoLoading') : dubError || job?.status === 'failed'
                  ? translate(locale, 'videoUnavailable') : translate(locale, 'resultSamplePreparing')}</span>
              </div>
            )}
            {sourceLoading && <span className="result-player__loading" role="status">{translate(locale, 'videoLoading')}</span>}
            {sourceError && <span className="result-player__error" role="status">{translate(locale, 'videoUnavailable')}</span>}
                </div>
              <div className="result-player__transport result-transport" role="group" aria-label={translate(locale, 'result')}>
            <input id="result-seek" className="result-player__seek" type="range" min="0" max={duration ?? 0} step="0.1" value={Math.min(currentTime, duration ?? 0)}
              aria-label={translate(locale, 'seek')} disabled={duration === null || sourceLoading || sourceError}
              onPointerDown={beginSeek} onPointerUp={() => endSeek(true)} onPointerCancel={() => endSeek(false)}
              onBlur={() => { heldSeekKeysRef.current.clear(); endSeek(false); }}
              onKeyDown={(event) => {
                if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
                  heldSeekKeysRef.current.add(event.key);
                  beginSeek();
                }
              }}
              onKeyUp={(event) => {
                if (!heldSeekKeysRef.current.delete(event.key)) return;
                if (heldSeekKeysRef.current.size === 0) endSeek(true);
              }}
              onChange={(event) => seekTo(Number(event.currentTarget.value))} />
            <div className="result-player__transport-row result-transport-row">
              <button id="result-play" type="button" className="result-player__icon-button" onClick={playing ? pauseCurrent : ended ? replay : playCurrent}
                disabled={!sourceUrl || sourceError} aria-label={translate(locale, playing ? 'pause' : ended ? 'replay' : 'play')}>
                {playing ? <Pause aria-hidden="true" size={18} strokeWidth={1.1} />
                  : ended ? <RotateCcw aria-hidden="true" size={18} strokeWidth={1.1} />
                    : <Play aria-hidden="true" size={18} strokeWidth={1.1} />}
              </button>
              <span id="result-time" className="result-player__time" aria-live="off">{timeLabel(currentTime)} / {timeLabel(duration)}</span>
              <label className="result-player__volume result-volume">
                <span className="sr-only">{translate(locale, 'volume')}</span>
                <span className="hf-icon" aria-hidden="true">{volume === 0 ? <VolumeX size={18} strokeWidth={1.1} /> : <Volume2 size={18} strokeWidth={1.1} />}</span>
                <input id="result-volume" type="range" min="0" max="1" step="0.05" value={volume} aria-label={translate(locale, 'volume')}
                  onChange={(event) => setVolume(Number(event.currentTarget.value))} />
              </label>
              <button id="result-fullscreen" type="button" className="result-player__icon-button" onClick={toggleFullscreen} aria-label={translate(locale, fullscreen ? 'exitFullscreen' : 'fullscreen')}>
                {fullscreen ? <Minimize aria-hidden="true" size={18} strokeWidth={1.1} /> : <Maximize aria-hidden="true" size={18} strokeWidth={1.1} />}
              </button>
            </div>
              </div>
            </div>
          </div>

        <div className="result-workspace__details result-bottom">
          <div className="result-workspace__status" role="status" aria-live="polite">
            {workspace?.isLatestAuthorization === false
              ? <StatusNotice tone="error">{translate(locale, 'resultSnapshotStale')}</StatusNotice>
              : resultAction === 'unknown'
                ? <StatusNotice tone="error">{translate(locale, 'resultStatusUnknown')}</StatusNotice>
                : resultAction === 'failed' || job?.status === 'failed' || dubError
                  ? <StatusNotice tone="error">{translate(locale, 'resultSampleFailed')}</StatusNotice>
                  : <h2 className={job?.status === 'ready' ? 'result-ready' : 'result-pending'}>
                    {translate(locale, job?.status === 'ready' ? 'resultSampleReady' : 'resultSamplePreparing')}
                  </h2>}
            <p className="result-disclosure">{translate(locale, 'resultSampleDisclosure')}</p>
          </div>
          <div className="result-workspace__actions result-actions">
            <Button intent="primary" className="result-download" onClick={() => void downloadMyDub()} disabled={!presentedGenerationId || downloadState === 'busy'}>
              <Download aria-hidden="true" size={16} strokeWidth={1.1} />
              {downloadState === 'busy' ? translate(locale, 'savingAction') : translate(locale, 'downloadMyDub')}
            </Button>
            <Button intent="secondary" onClick={returnToRecording}><Undo2 aria-hidden="true" size={16} strokeWidth={1.1} />{translate(locale, 'returnRecording')}</Button>
          </div>
        </div>

        {downloadState === 'failed' && (
          <div className="result-download-error" role="alert">
            <p>{translate(locale, 'downloadFailed')}</p>
            <Button intent="secondary" onClick={() => void downloadMyDub(true)}>{translate(locale, 'retryDownload')}</Button>
          </div>
        )}
        {(dubError || sourceError) && <div className="result-recovery"><Button intent="secondary" onClick={retryPlayback}>{translate(locale, 'retryPlayback')}</Button></div>}

        {workspace?.isLatestAuthorization === false ? null : resultAction === 'unknown' ? (
          <div className="result-recovery"><Button intent="secondary" onClick={() => void checkResultStatus()}>{translate(locale, 'checkResultStatus')}</Button></div>
        ) : resultAction === 'failed' || job?.status === 'failed' || !job ? (
          <div className="result-recovery">
            <Button intent="secondary" onClick={() => void (job?.status === 'failed' ? retryAssembly() : startOrRetry())} disabled={resultAction === 'busy'}>
              {resultAction === 'busy' ? translate(locale, 'savingAction') : translate(locale, 'retryResult')}
            </Button>
            {operationToCheck && resultAction === 'failed' && <Button intent="quiet" onClick={() => void checkResultStatus()}>{translate(locale, 'checkResultStatus')}</Button>}
          </div>
        ) : null}
        </section>
      </main>
    </div>
  );
}
