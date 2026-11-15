import { IDBFactory } from 'fake-indexeddb';
import { describe, expect, it } from 'vitest';
import { createServices, InvalidAdapterConfigurationError, RealAdapterUnavailableError } from './index';

describe('central Services factory', () => {
  it('uses the explicitly selected local mock and does not initialize another transport', () => {
    const services = createServices('mock', { store: { idbFactory: new IDBFactory(), databaseName: 'factory-test' } });
    expect(services.adapter).toBe('mock');
    expect(services.resultFixtures).toHaveLength(2);
  });

  it('rejects the unavailable real adapter without falling back to mock', () => {
    expect(() => createServices('real')).toThrow(RealAdapterUnavailableError);
  });

  it('rejects unknown adapter values', () => {
    expect(() => createServices('backendish')).toThrow(InvalidAdapterConfigurationError);
  });
});
