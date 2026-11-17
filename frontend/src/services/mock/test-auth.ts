import { expect, vi } from "vitest";
import type { Services } from "../contracts";

/** Explicit test setup, never imported by the running app. Dynamic import also supports upgrade tests' module reload. */
export async function signInTestDemo(): Promise<void> {
  const { signInDemo } = await import("./auth-db");
  await signInDemo();
}

/** Reuse in every auth story: errors, console output and change events must not leak submitted credentials. */
export function watchAuthSecrets(services: Services, secrets: string[]) {
  const events: unknown[] = [];
  const off = services.subscribe((event) => events.push(event));
  const logs = [vi.spyOn(console, "log"), vi.spyOn(console, "warn"), vi.spyOn(console, "error"), vi.spyOn(console, "info"), vi.spyOn(console, "debug")];
  return {
    check(...errors: unknown[]) {
      const text = JSON.stringify([events, errors.map((e) => e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : e), logs.map((spy) => spy.mock.calls)]);
      for (const secret of secrets) expect(text).not.toContain(secret);
    },
    stop() { off(); for (const spy of logs) spy.mockRestore(); },
  };
}
