import { createNativeBrowserMedia } from './browser-media/NativeBrowserMedia';
import { createWebLockCaptureGrants } from './browser-capture/WebLockCaptureGrants';
import type { Services } from './contracts';
import { IndexedDbProjectStore, type IndexedDbProjectStoreOptions } from './mock/IndexedDbProjectStore';
import { RESULT_FIXTURES, SEEDED_ACTOR_ID, SEEDED_PROJECT_ID } from './mock/fixtures';

export class InvalidAdapterConfigurationError extends Error {
  constructor(adapter: string) {
    super(`Unsupported service adapter "${adapter}". Expected "mock" or "real".`);
    this.name = 'InvalidAdapterConfigurationError';
  }
}

export class RealAdapterUnavailableError extends Error {
  constructor() {
    super('The real service adapter is not available in this local core slice. The app will not fall back to the mock.');
    this.name = 'RealAdapterUnavailableError';
  }
}

export interface ServiceFactoryOptions {
  store?: IndexedDbProjectStoreOptions;
}

export function createServices(adapter: string | undefined, options: ServiceFactoryOptions = {}): Services {
  const selected = adapter ?? 'mock';
  if (selected === 'real') throw new RealAdapterUnavailableError();
  if (selected !== 'mock') throw new InvalidAdapterConfigurationError(selected);

  const resultFixtures = options.store?.resultFixtures ?? RESULT_FIXTURES;
  const projects = new IndexedDbProjectStore({ ...options.store, resultFixtures });
  const seededScope = { actorId: SEEDED_ACTOR_ID, projectId: SEEDED_PROJECT_ID };
  return {
    adapter: 'mock',
    actorId: SEEDED_ACTOR_ID,
    projects,
    results: projects,
    grants: createWebLockCaptureGrants(projects),
    media: createNativeBrowserMedia(),
    resultFixtures,
    initialize: async () => {
      await projects.initialize();
      await projects.resumeAuthorized(seededScope);
    },
  };
}

export function createServicesFromEnvironment(): Services {
  return createServices(import.meta.env.VITE_DUBBED_ADAPTER);
}
