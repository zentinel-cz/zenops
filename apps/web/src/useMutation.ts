import { useRef, useState } from "react";

/** Prevent repeated writes and always release the form after network failures. */
export function useMutation(onError: (message: string) => void) {
  const running = useRef(false);
  const [busy, setBusy] = useState(false);
  async function runMutation(action: () => Promise<void>) {
    if (running.current) return;
    running.current = true; setBusy(true);
    try { await action(); }
    catch (error) { onError(error instanceof RangeError ? error.message : "Spojení se serverem selhalo. Před opakováním ověřte, zda se změna uložila."); }
    finally { running.current = false; setBusy(false); }
  }
  return { busy, runMutation };
}
