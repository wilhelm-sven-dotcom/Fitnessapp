/**
 * Toast-Store — bewusst OHNE React: `toast("…")` ist von überall aufrufbar
 * (Sonner-Prinzip), der <Toaster> abonniert und rendert. Max. 3 gleichzeitig
 * (der älteste fliegt), Auto-Dismiss nach `duration` (Fehler halten länger).
 */

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastOptions {
  kind?: "info" | "success" | "error";
  /** Anzeigedauer in ms; Default 3000 (error: 4500). */
  duration?: number;
  action?: ToastAction;
}

export interface ToastRecord {
  id: number;
  message: string;
  kind: NonNullable<ToastOptions["kind"]>;
  duration: number;
  action?: ToastAction;
}

type Listener = (list: readonly ToastRecord[]) => void;

const MAX_VISIBLE = 3;

let seq = 0;
let toasts: readonly ToastRecord[] = [];
const listeners = new Set<Listener>();

function emit() {
  for (const fn of listeners) fn(toasts);
}

export function toast(message: string, opts: ToastOptions = {}): number {
  const kind = opts.kind ?? "info";
  const record: ToastRecord = {
    id: ++seq,
    message,
    kind,
    duration: opts.duration ?? (kind === "error" ? 4500 : 3000),
    action: opts.action,
  };
  toasts = [...toasts, record].slice(-MAX_VISIBLE);
  emit();
  return record.id;
}

toast.dismiss = (id: number) => {
  if (!toasts.some((t) => t.id === id)) return;
  toasts = toasts.filter((t) => t.id !== id);
  emit();
};

export function subscribeToasts(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Snapshot für useSyncExternalStore (Referenz bleibt zwischen Emits stabil). */
export function getToasts(): readonly ToastRecord[] {
  return toasts;
}
