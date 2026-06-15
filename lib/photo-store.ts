/**
 * Progress-photo storage. Photos are too large for localStorage, so blobs live
 * in IndexedDB (local-first, works offline). When Cloud-Sync is configured and
 * the user is signed in, blobs are mirrored to a private Supabase Storage bucket
 * so they follow the user across devices. All cloud calls no-op otherwise.
 */

import { getSupabase, isCloudConfigured } from "@/lib/supabase";

const DB_NAME = "wilhelm-training-photos";
const STORE = "photos";
const BUCKET = "progress-photos";

function idbSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

export function genPhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putPhoto(id: string, blob: Blob): Promise<void> {
  if (!idbSupported()) return;
  const db = await openDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(blob, id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function getPhoto(id: string): Promise<Blob | null> {
  if (!idbSupported()) return null;
  const db = await openDb();
  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve((req.result as Blob) ?? null);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

export async function deletePhoto(id: string): Promise<void> {
  if (idbSupported()) {
    const db = await openDb();
    try {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } finally {
      db.close();
    }
  }
  void deleteCloudPhoto(id);
}

/** Shrink an uploaded image to a sane size before storing. Falls back to the original. */
export async function downscaleImage(
  file: File,
  maxEdge = 1080,
  quality = 0.82,
): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    return await new Promise<Blob>((resolve) => {
      canvas.toBlob((b) => resolve(b ?? file), "image/jpeg", quality);
    });
  } catch {
    return file;
  }
}

// --- Cloud mirror (Supabase Storage) ----------------------------------------

async function cloudPath(id: string): Promise<{ path: string } | null> {
  if (!isCloudConfigured()) return null;
  const sb = getSupabase();
  if (!sb) return null;
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return null;
  return { path: `${session.user.id}/${id}` };
}

export async function uploadPhoto(id: string, blob: Blob): Promise<void> {
  const sb = getSupabase();
  const loc = await cloudPath(id);
  if (!sb || !loc) return;
  try {
    await sb.storage.from(BUCKET).upload(loc.path, blob, {
      upsert: true,
      contentType: blob.type || "image/jpeg",
    });
  } catch {
    /* offline — local blob stays authoritative */
  }
}

async function deleteCloudPhoto(id: string): Promise<void> {
  const sb = getSupabase();
  const loc = await cloudPath(id);
  if (!sb || !loc) return;
  try {
    await sb.storage.from(BUCKET).remove([loc.path]);
  } catch {
    /* ignore */
  }
}

/** Local-first: return the cached blob, else pull it from Storage and cache it. */
export async function fetchPhoto(id: string): Promise<Blob | null> {
  const local = await getPhoto(id);
  if (local) return local;
  const sb = getSupabase();
  const loc = await cloudPath(id);
  if (!sb || !loc) return null;
  try {
    const { data } = await sb.storage.from(BUCKET).download(loc.path);
    if (data) {
      await putPhoto(id, data);
      return data;
    }
  } catch {
    /* ignore */
  }
  return null;
}
