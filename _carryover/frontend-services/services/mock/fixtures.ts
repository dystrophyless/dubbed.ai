import fixtureData from './fixture-data.json';
import {
  actorId,
  projectId,
  turnId,
  type MockGenerationFixture,
  type PreparedProject,
} from '../contracts';

export const SEEDED_ACTOR_ID = actorId(fixtureData.project.accountId);
export const SEEDED_PROJECT_ID = projectId(fixtureData.project.id);

export function createSeedProject(): PreparedProject {
  return {
    ...fixtureData.project,
    id: SEEDED_PROJECT_ID,
    accountId: SEEDED_ACTOR_ID,
    source: { ...fixtureData.project.source },
    windows: fixtureData.project.windows.map((window) => ({
      ...window,
      id: turnId(window.id),
      sourceWaveform: [],
      sourceWaveformProvenance: 'Source waveform is decoded from the manifested source media by BrowserMediaPort.',
    })),
    draftCandidateByTurn: {},
    acceptedByTurn: {},
    acceptedProjectRevisionByTurn: {},
    acceptedOperationByTurn: {},
    acceptedHistory: [],
    tombstonedAt: null,
  };
}

export const RESULT_FIXTURES: readonly MockGenerationFixture[] = fixtureData.resultFixtures.map((fixture) => ({
  ...fixture,
  filename: fixture.url.split('/').at(-1) ?? `${fixture.id}.mp4`,
  mimeType: fixture.url.endsWith('.webm') ? 'video/webm' : 'video/mp4',
  productRendered: false,
  assembledFromAcceptedTakes: false,
}));

export const PROJECT_SEED_SOURCE = Object.freeze({
  manifest: 'src/services/mock/fixture-data.json',
  sourceMedia: 'public/media/scene.mp4',
  resultMedia: ['public/media/example-dub.mp4', 'public/media/result-generation-002.webm'],
  sourceAttribution: fixtureData.project.source.attribution,
  sourceLicense: fixtureData.project.source.license,
});
