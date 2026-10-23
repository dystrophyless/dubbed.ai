export const creditsMayHaveChangedEvent = 'dubbed:credits-may-have-changed'

/** Ask consumers to re-read the authoritative snapshot after a committed mutation. */
export function notifyCreditsMayHaveChanged(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(creditsMayHaveChangedEvent))
  }
}
