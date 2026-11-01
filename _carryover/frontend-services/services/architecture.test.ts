import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const sourceRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts')) return [path];
    return [];
  });
}

describe('architecture boundary', () => {
  it('keeps UI routes and features behind Services instead of raw transport, storage, or device APIs', () => {
    const files = [...sourceFiles(join(sourceRoot, 'app')), ...sourceFiles(join(sourceRoot, 'features'))];
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      expect(source, file).not.toMatch(/\bindexedDB\b|\bfetch\s*\(|\baxios\b|\blocalStorage\b|\bgetUserMedia\b|\bMediaRecorder\b/);
      expect(source, file).not.toMatch(/from\s+['"][^'"]*IndexedDbProjectStore/);
    }
  });
});
