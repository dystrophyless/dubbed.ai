import { randomUUID } from 'node:crypto'

export interface E2ECredentials {
  email: string
  password: string
}

/** Per-test identity for the local mock namespace; never a real mailbox or account. */
export function newE2ECredentials(label: string): E2ECredentials {
  const id = randomUUID()
  return {
    email: `dubbed-${label}-${id}@example.test`,
    password: `Local-e2e-${id}!`,
  }
}
