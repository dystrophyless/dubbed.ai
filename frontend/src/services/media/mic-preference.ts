const key = (accountId: string) => `dubbed.mic.${accountId}`;

export function saveMicrophone(accountId: string, deviceId: string): void {
  try {
    localStorage.setItem(key(accountId), deviceId);
  } catch {
    // Storage may be disabled or unavailable.
  }
}

export function loadMicrophone(accountId: string): string | null {
  try {
    return localStorage.getItem(key(accountId));
  } catch {
    return null;
  }
}
