import { useEffect, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, LogOut } from 'lucide-react';
import {
  operationId,
  type CandidateId,
  type Locale,
  type OperationId,
  type PreparedProject,
  type StoredCandidate,
} from '../../services/contracts';
import type { Services } from '../../services/contracts';
import { translate } from '../../shared/i18n';
import { Button, LocaleControl, StatusNotice } from '../../shared/ui';

export const NATIVE_MEDIA_PROOF_DURATION_MS = 1800;

type ProofState = 'ready' | 'capturing' | 'saving' | 'saved' | 'unknown' | 'empty' | 'error';

function scopeFor(services: Services, project: PreparedProject) {
  return { actorId: services.actorId, projectId: project.id };
}

export function NativeMediaProofPage({ services, project, locale, onLocaleChange, fakeInput, operationIdFromUrl }: {
  services: Services;
  project: PreparedProject;
  locale: Locale;
  onLocaleChange(locale: Locale): void;
  fakeInput: boolean;
  operationIdFromUrl?: string;
}) {
  const firstWindow = project.windows[0];
  const [state, setState] = useState<ProofState>('ready');
  const [candidate, setCandidate] = useState<StoredCandidate | null>(null);
  const [currentOperation, setCurrentOperation] = useState<OperationId | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const abortController = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;
    const restore = async () => {
      if (!operationIdFromUrl) return;
      const id = operationId(operationIdFromUrl);
      setCurrentOperation(id);
      const lookup = await services.projects.lookupOperation(scopeFor(services, project), id);
      if (active && lookup.kind === 'pending') {
        setState('unknown');
        setMessage(translate(locale, 'operationPending'));
        return;
      }
      if (!active || lookup.kind !== 'committed' || !lookup.candidateId) return;
      const stored = await services.projects.getCandidate(scopeFor(services, project), lookup.candidateId);
      if (active && stored?.purpose === 'verification-only') {
        setCandidate(stored);
        setState('saved');
      }
    };
    void restore().catch(() => undefined);
    return () => { active = false; };
  }, [locale, operationIdFromUrl, project, services]);

  useEffect(() => {
    if (!candidate) return undefined;
    const url = services.media.createObjectUrl(candidate.blob);
    setAudioUrl(url);
    return () => {
      services.media.revokeObjectUrl(url);
      setAudioUrl(null);
    };
  }, [candidate, services]);

  useEffect(() => () => abortController.current?.abort(), []);

  const beginCapture = async () => {
    if (state === 'capturing' || state === 'saving') return;
    const id = operationId(crypto.randomUUID());
    const controller = new AbortController();
    abortController.current = controller;
    setCurrentOperation(id);
    setCandidate(null);
    setMessage(null);
    setState('capturing');
    try {
      const capture = await services.media.captureFixedWindow({
        durationMs: NATIVE_MEDIA_PROOF_DURATION_MS,
        purpose: 'verification-only',
        signal: controller.signal,
      });
      if (capture.blob.size === 0) {
        setState('empty');
        setMessage(translate(locale, 'zeroData'));
        return;
      }
      setState('saving');
      const outcome = await services.projects.saveCandidate({
        scope: scopeFor(services, project),
        turnId: firstWindow.id,
        expectedTurnRevision: firstWindow.revision,
        expectedProjectRevision: project.revision,
        operationId: id,
        capture,
      });
      if (outcome.kind === 'unknown') {
        setState('unknown');
        setMessage(translate(locale, 'unknown'));
        return;
      }
      const stored = await services.projects.getCandidate(scopeFor(services, project), outcome.candidateId);
      if (!stored) throw new Error('The committed capture could not be read back.');
      setCandidate(stored);
      setState('saved');
      setMessage(translate(locale, 'saved'));
    } catch (error) {
      setState('error');
      setMessage(error instanceof Error ? error.message : translate(locale, 'captureError'));
    } finally {
      if (abortController.current === controller) abortController.current = null;
    }
  };

  const checkStatus = async () => {
    if (!currentOperation) return;
    try {
      const lookup = await services.projects.lookupOperation(scopeFor(services, project), currentOperation);
      if (lookup.kind === 'committed' && lookup.candidateId) {
        const stored = await services.projects.getCandidate(scopeFor(services, project), lookup.candidateId);
        if (stored) {
          setCandidate(stored);
          setState('saved');
          setMessage(translate(locale, 'saved'));
          return;
        }
      }
      setState('unknown');
      setMessage(lookup.kind === 'pending' ? translate(locale, 'operationPending') : translate(locale, 'operationMissing'));
    } catch {
      setState('unknown');
      setMessage(translate(locale, 'unknown'));
    }
  };

  const busy = state === 'capturing' || state === 'saving';
  return (
    <div className="page-shell">
      <header className="page-header">
        <a className="exit-link" href="/" aria-label={translate(locale, 'exit')}>
          <LogOut aria-hidden="true" size={16} strokeWidth={1.1} />
          <span>{translate(locale, 'exit')}</span>
        </a>
        <h1>{translate(locale, 'localMediaTitle')}</h1>
        <LocaleControl locale={locale} label={translate(locale, 'language')} onChange={onLocaleChange} />
      </header>
      <main className="proof-page" data-testid="native-media-proof">
        <p>{translate(locale, 'localMediaNote')}</p>
        {fakeInput && <StatusNotice>{translate(locale, 'fakeInput')}</StatusNotice>}
        <Button onClick={() => void beginCapture()} disabled={busy}>
          {state === 'capturing' ? translate(locale, 'capturing') : translate(locale, 'captureSample')}
        </Button>
        {state === 'saving' && <StatusNotice>{translate(locale, 'saving')}</StatusNotice>}
        {message && <StatusNotice tone={state === 'error' || state === 'empty' ? 'error' : state === 'saved' ? 'success' : 'info'}>
          {state === 'saved' ? <CircleCheck aria-hidden="true" size={16} strokeWidth={1.1} /> : state === 'error' || state === 'empty' ? <CircleAlert aria-hidden="true" size={16} strokeWidth={1.1} /> : null}
          <span>{message}</span>
        </StatusNotice>}
        {state === 'unknown' && <Button intent="secondary" onClick={() => void checkStatus()}>{translate(locale, 'checkStatus')}</Button>}
        {candidate && <CaptureEvidence candidate={candidate} audioUrl={audioUrl} locale={locale} />}
        <p className="muted-copy">{translate(locale, 'fixtureNote')}</p>
      </main>
    </div>
  );
}

function CaptureEvidence({ candidate, audioUrl, locale }: { candidate: StoredCandidate; audioUrl: string | null; locale: Locale }) {
  const details = [
    [translate(locale, 'mime'), candidate.mimeType],
    [translate(locale, 'byteSize'), String(candidate.byteSize)],
    [translate(locale, 'duration'), candidate.probe.durationSeconds?.toFixed(3) ?? 'unavailable'],
    [translate(locale, 'frames'), candidate.probe.decodedFrames?.toLocaleString(locale) ?? 'unavailable'],
    [translate(locale, 'channels'), candidate.probe.channelCount?.toString() ?? 'unavailable'],
    [translate(locale, 'sampleRate'), candidate.probe.sampleRate?.toLocaleString(locale) ?? 'unavailable'],
    [translate(locale, 'fingerprint'), candidate.sha256],
  ];
  return (
    <section className="capture-evidence" data-testid="capture-details" data-status="saved" data-purpose={candidate.purpose} data-end-reason={candidate.endReason} data-operation-id={candidate.operationId} data-candidate-id={candidate.id as CandidateId} data-sha256={candidate.sha256} data-byte-size={candidate.byteSize} data-mime-type={candidate.mimeType} data-decoded-frames={candidate.probe.decodedFrames ?? ''} data-duration={candidate.probe.durationSeconds ?? ''} data-elapsed-ms={candidate.elapsedMs}>
      <h2>{translate(locale, 'saved')}</h2>
      <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      {audioUrl && <audio controls preload="metadata" src={audioUrl} aria-label={locale === 'ru' ? 'Прослушать сохранённый аудиообразец' : 'Listen to saved audio sample'} />}
    </section>
  );
}
