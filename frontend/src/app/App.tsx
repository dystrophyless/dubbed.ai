import { useCallback, useEffect, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import { useWorkspaceUiStore } from './state';
import { projectId, type LayoutVariant, type Locale, type NavigationIntent, type OperationId, type PreparedProject, type SnapshotId, type ImmutableResultSnapshot, type MockResultWorkspace } from '../services/contracts';
import { useServices } from '../shared/ServicesContext';
import { translate } from '../shared/i18n';
import { Button, Dialog, LocaleControl, StatusNotice } from '../shared/ui';
import { FoundationRecordPage } from '../features/record/FoundationRecordPage';
import { NativeMediaProofPage } from '../features/record/NativeMediaProofPage';
import { FoundationResultPage } from '../features/result/FoundationResultPage';

type Route =
  | { kind: 'home' }
  | { kind: 'project'; projectId: string; view: 'record' | 'result'; layout: LayoutVariant; turnId?: string; snapshotId?: SnapshotId; returnFocus?: 'exit' | 'settings' }
  | { kind: 'native-media'; operationId?: string; fakeInput: boolean }
  | { kind: 'boundary'; path: string; returnRecord?: { projectId: string; layout: LayoutVariant; turnId?: string; focus: 'exit' | 'settings' } };

function parseRoute(location: Location): Route {
  const url = new URL(location.href);
  if (url.pathname === '/') return { kind: 'home' };
  if (url.pathname === '/__dev/native-media') {
    return { kind: 'native-media', fakeInput: url.searchParams.get('fakeInput') === '1', operationId: url.searchParams.get('operationId') ?? undefined };
  }
  const match = /^\/projects\/([^/]+)\/(record|result)$/.exec(url.pathname);
  if (match) {
    return {
      kind: 'project',
      projectId: decodeURIComponent(match[1]),
      view: match[2] === 'result' ? 'result' : 'record',
      layout: url.searchParams.get('layout') === 'B' ? 'B' : 'A',
      turnId: url.searchParams.get('turn') ?? undefined,
      snapshotId: url.searchParams.get('snapshot') as SnapshotId | undefined,
      returnFocus: url.searchParams.get('returnFocus') === 'settings' ? 'settings' : url.searchParams.get('returnFocus') === 'exit' ? 'exit' : undefined,
    };
  }
  const returnProject = url.searchParams.get('returnProject');
  const returnFocus = url.searchParams.get('returnFocus');
  const returnLayout = url.searchParams.get('returnLayout');
  const returnTurn = url.searchParams.get('returnTurn') ?? undefined;
  const returnRecord = returnProject && /^[\w.-]+$/.test(returnProject) && (returnFocus === 'exit' || returnFocus === 'settings')
    ? { projectId: returnProject, layout: returnLayout === 'B' ? 'B' as const : 'A' as const, turnId: returnTurn, focus: returnFocus as 'exit' | 'settings' }
    : undefined;
  return { kind: 'boundary', path: url.pathname, returnRecord };
}

function HomePage({ locale, onLocaleChange, onSources }: { locale: Locale; onLocaleChange(locale: Locale): void; onSources(): void }) {
  const suffix = `&locale=${locale}`;
  return (
    <div className="page-shell home-page">
      <header className="home-header">
        <p className="eyebrow">{translate(locale, 'seededIdentity')}</p>
        <LocaleControl locale={locale} label={translate(locale, 'language')} onChange={onLocaleChange} />
      </header>
      <main className="home-content">
        <h1>{translate(locale, 'localPreview')}</h1>
        <p className="home-title">Sintel · The Search</p>
        <fieldset className="layout-choice">
          <legend>{translate(locale, 'chooseLayout')}</legend>
          <div className="choice-row">
          <a className="button button--primary" href={`/projects/sintel-prepared/record?layout=A${suffix}`}>{translate(locale, 'openLayoutA')}</a>
            <a className="button button--secondary" href={`/projects/sintel-prepared/record?layout=B${suffix}`}>{translate(locale, 'openLayoutB')}</a>
          </div>
        </fieldset>
        <a className="boundary-link" href={`/projects/sintel-prepared/result?layout=A&locale=${locale}`}>{translate(locale, 'openResultBoundary')}</a>
        <div className="home-footer">
          <Button intent="quiet" onClick={onSources}>{translate(locale, 'sourceDetails')}</Button>
          <p>{translate(locale, 'fixtureNote')}</p>
        </div>
      </main>
    </div>
  );
}

function SourcesDialog({ open, onOpenChange, locale }: { open: boolean; onOpenChange(open: boolean): void; locale: Locale }) {
  const services = useServices();
  return (
    <Dialog open={open} title={translate(locale, 'sourceDetailsTitle')} closeLabel={locale === 'ru' ? 'Закрыть' : 'Close'} onOpenChange={onOpenChange}>
      <p>Sintel · Blender Foundation · CC BY 3.0</p>
      <p>scene.mp4 · 960 × 408 · 13.416667 s · rotation 0°</p>
      {services.resultFixtures.map((fixture) => (
        <div className="fixture-detail" key={fixture.id}>
          <strong>{fixture.id}</strong>
          <p>{fixture.provenance}</p>
          <code>{fixture.bytes} bytes · {fixture.sha256}</code>
          <p>productRendered: false · assembledFromAcceptedTakes: false</p>
        </div>
      ))}
    </Dialog>
  );
}

function BoundaryPage({ path, locale, returnRecord }: { path: string; locale: Locale; returnRecord?: Extract<Route, { kind: 'boundary' }>['returnRecord'] }) {
  const returnHref = returnRecord
    ? `/projects/${encodeURIComponent(returnRecord.projectId)}/record?layout=${returnRecord.layout}${returnRecord.turnId ? `&turn=${encodeURIComponent(returnRecord.turnId)}` : ''}&returnFocus=${returnRecord.focus}&locale=${locale}`
    : null;
  return (
    <div className="page-shell boundary-page">
      <main>
        <p className="eyebrow">{path}</p>
        <h1>{translate(locale, 'boundaryTitle')}</h1>
        <p>{translate(locale, 'boundaryBody')}</p>
        {returnHref && <a className="button button--secondary" href={returnHref} data-testid="return-to-saved-record">
          <Undo2 aria-hidden="true" size={16} strokeWidth={1.1} />{translate(locale, 'returnRecording')}
        </a>}
        <a className="button button--secondary" href="/">{translate(locale, 'backToPreview')}</a>
      </main>
    </div>
  );
}

function ProjectRoute({ route, locale, onNavigate }: {
  route: Extract<Route, { kind: 'project' }>;
  locale: Locale;
  onNavigate(intent: NavigationIntent, operationId?: OperationId): Promise<void> | void;
}) {
  const services = useServices();
  const [state, setState] = useState<{ status: 'loading' } | { status: 'missing' } | { status: 'error' } | {
    status: 'ready'; routeKey: string; project: PreparedProject; snapshot: ImmutableResultSnapshot | null; workspace: MockResultWorkspace | null;
  }>({ status: 'loading' });
  const routeKey = JSON.stringify([route.projectId, route.view, route.view === 'result' ? route.snapshotId ?? null : null]);
  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    const scope = { actorId: services.actorId, projectId: projectId(route.projectId) };
    void services.projects.loadPreparedProject(scope).then(async (project) => {
      if (!project) { if (active) setState({ status: 'missing' }); return; }
      const requestedSnapshotId = route.view === 'result' ? route.snapshotId ?? project.latestResultSnapshotId : undefined;
      const snapshot = requestedSnapshotId
        ? await services.projects.getResultSnapshot(scope, requestedSnapshotId).catch(() => null)
        : null;
      let workspace: MockResultWorkspace | null = null;
      if (route.view === 'result' && snapshot) {
        try { await services.results.startOrReconcile({ scope, snapshotId: snapshot.id }); } catch { /* show the durable status and recovery action */ }
        workspace = await services.results.loadWorkspace(scope, snapshot.id).catch(() => null);
      }
      if (active) setState({ status: 'ready', routeKey, project, snapshot, workspace });
    }).catch(() => { if (active) setState({ status: 'error' }); });
    return () => { active = false; };
  }, [route.projectId, route.snapshotId, route.view, routeKey, services]);

  if (state.status === 'loading' || (state.status === 'ready' && state.routeKey !== routeKey)) return <div className="page-shell"><p>{translate(locale, 'loading')}</p></div>;
  if (state.status === 'missing') return (
    <div className="page-shell boundary-page"><main><StatusNotice tone="error">{translate(locale, 'notFound')}</StatusNotice><a className="button button--secondary" href="/">{translate(locale, 'backToPreview')}</a></main></div>
  );
  if (state.status === 'error') return <BoundaryPage path="/projects" locale={locale} />;
  if (route.view === 'result') return <FoundationResultPage project={state.project} snapshot={state.snapshot} workspace={state.workspace} layout={route.layout} locale={locale} onNavigate={onNavigate} />;
  return <FoundationRecordPage project={state.project} layout={route.layout} locale={locale} initialTurnId={route.turnId} returnFocus={route.returnFocus} onNavigate={onNavigate} />;
}

function NativeMediaRoute({ route, locale, onLocaleChange }: {
  route: Extract<Route, { kind: 'native-media' }>;
  locale: Locale;
  onLocaleChange(locale: Locale): void;
}) {
  const services = useServices();
  const [project, setProject] = useState<PreparedProject | null>(null);
  useEffect(() => {
    let active = true;
    void services.projects.loadPreparedProject({ actorId: services.actorId, projectId: projectId('sintel-prepared') })
      .then((prepared) => { if (active) setProject(prepared); })
      .catch(() => { if (active) setProject(null); });
    return () => { active = false; };
  }, [services]);
  if (!import.meta.env.DEV) return <BoundaryPage path="/__dev/native-media" locale={locale} />;
  if (!project) return <div className="page-shell"><p>{translate(locale, 'loading')}</p></div>;
  return <NativeMediaProofPage services={services} project={project} locale={locale} onLocaleChange={onLocaleChange} fakeInput={route.fakeInput} operationIdFromUrl={route.operationId} />;
}

export function App() {
  const services = useServices();
  const [route, setRoute] = useState(() => parseRoute(window.location));
  const locale = useWorkspaceUiStore((state) => state.locale);
  const setLocale = useWorkspaceUiStore((state) => state.setLocale);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const recoveredNavigation = useRef(false);

  const navigateRecordIntent = useCallback(async (intent: NavigationIntent, operation?: OperationId) => {
    const currentProjectId = route.kind === 'project' ? route.projectId : 'sintel-prepared';
    const currentLayout = route.kind === 'project' ? route.layout : 'A';
    const returnTurnId = route.kind === 'project' && route.view === 'record' ? route.turnId : undefined;
    const returnFocus = intent.kind === 'settings' ? 'settings' : 'exit';
    const boundaryParams = new URLSearchParams({ returnProject: currentProjectId, returnLayout: currentLayout, returnFocus, locale });
    if (returnTurnId) boundaryParams.set('returnTurn', returnTurnId);
    let destination: string | null = null;
    if (intent.kind === 'advance' || intent.kind === 'previous') {
      destination = `/projects/${encodeURIComponent(currentProjectId)}/record?layout=${intent.layout}&turn=${encodeURIComponent(intent.targetTurnId)}&locale=${locale}`;
    } else if (intent.kind === 'exit') {
      destination = `/projects?${boundaryParams.toString()}`;
    } else if (intent.kind === 'settings') {
      boundaryParams.set('from', 'record');
      destination = `${intent.path}?${boundaryParams.toString()}`;
    } else if (intent.kind === 'result') {
      destination = `/projects/${encodeURIComponent(currentProjectId)}/result?layout=${intent.layout}&snapshot=${encodeURIComponent(intent.snapshotId)}&locale=${locale}`;
    }
    if (destination && window.location.pathname + window.location.search !== destination) {
      window.history.pushState({}, '', destination);
      setRoute(parseRoute(window.location));
    }
    if (operation) {
      await services.projects.completeNavigationIntent(
        { actorId: services.actorId, projectId: projectId(currentProjectId) },
        operation,
      ).catch(() => undefined);
    }
  }, [locale, route, services.actorId, services.projects]);

  useEffect(() => {
    const onPopState = () => setRoute(parseRoute(window.location));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  useEffect(() => { document.documentElement.lang = locale; }, [locale]);
  useEffect(() => {
    const queryLocale = new URL(window.location.href).searchParams.get('locale');
    if (queryLocale === 'en' || queryLocale === 'ru') setLocale(queryLocale);
  }, [route, setLocale]);

  useEffect(() => {
    if (recoveredNavigation.current) return;
    recoveredNavigation.current = true;
    const scope = { actorId: services.actorId, projectId: projectId('sintel-prepared') };
    void services.projects.findIncompleteNavigationIntent(scope).then(async (pending) => {
      if (!pending) return;
      const lookup = await services.projects.lookupOperation(scope, pending.operationId);
      if (lookup.kind !== 'committed' || !lookup.navigationIntent) return;
      const target = lookup.navigationIntent;
      const url = new URL(window.location.href);
      const alreadyThere = target.kind === 'exit' ? url.pathname === '/'
        : target.kind === 'settings' ? url.pathname === target.path
          : target.kind === 'advance' || target.kind === 'previous'
            ? url.pathname === `/projects/${encodeURIComponent(scope.projectId)}/record` && url.searchParams.get('turn') === target.targetTurnId
            : target.kind === 'result'
              ? url.pathname === `/projects/${encodeURIComponent(scope.projectId)}/result` && url.searchParams.get('snapshot') === target.snapshotId
              : true;
      if (alreadyThere || target.kind === 'stay') {
        await services.projects.completeNavigationIntent(scope, pending.operationId);
      } else {
        await navigateRecordIntent(target, pending.operationId);
      }
    }).catch(() => undefined);
  }, [navigateRecordIntent, services.actorId, services.projects]);

  return (
    <>
      {route.kind === 'home' && <HomePage locale={locale} onLocaleChange={setLocale} onSources={() => setSourcesOpen(true)} />}
      {route.kind === 'project' && <ProjectRoute route={route} locale={locale} onNavigate={navigateRecordIntent} />}
      {route.kind === 'boundary' && <BoundaryPage path={route.path} locale={locale} returnRecord={route.returnRecord} />}
      {route.kind === 'native-media' && <NativeMediaRoute route={route} locale={locale} onLocaleChange={setLocale} />}
      <SourcesDialog open={sourcesOpen} onOpenChange={setSourcesOpen} locale={locale} />
    </>
  );
}
