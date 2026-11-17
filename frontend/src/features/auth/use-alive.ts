import { useEffect, useRef } from "react";

/**
 * `alive.current` is true while the page is mounted. An auth page checks it after every awaited service call and applies
 * nothing (no navigation, no state, no cache write) once the user has left: the service may have committed, the abandoned
 * page must not act on it. Set in the effect (not initialised only), so StrictMode's mount-unmount-mount stays correct.
 */
export function useAlive() {
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; };
  }, []);
  return alive;
}
