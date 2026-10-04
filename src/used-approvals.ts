import type { UsedApprovals } from "./types.js";

/** In-process only: each process or restart starts with an empty list. */
export function memoryUsedApprovals(options: { now?: () => number } = {}): UsedApprovals {
  const now = options.now ?? Date.now;
  const claimed = new Map<string, number>();
  return {
    claim(nonce, expiresAt) {
      const time = now();
      // Safe to forget: an expired grant is refused by the expiry check before claim is reached.
      for (const [seen, seenExpiresAt] of claimed) {
        if (time >= seenExpiresAt) claimed.delete(seen);
      }
      if (claimed.has(nonce)) return false;
      claimed.set(nonce, expiresAt);
      return true;
    },
  };
}
