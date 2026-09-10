const DB_NAME = 'pavilion';
const DB_VERSION = 1;
const STORE = 'saves';

export interface SaveRecord<T = unknown> {
  key: string;
  label: string;
  savedAt: number;
  payload: T;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('indexedDB open failed'));
  });
}

export async function putSave<T>(record: SaveRecord<T>): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('save failed'));
  });
  db.close();
}

export async function getSave<T>(key: string): Promise<SaveRecord<T> | undefined> {
  const db = await openDb();
  const record = await new Promise<SaveRecord<T> | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).get(key);
    request.onsuccess = () => resolve(request.result as SaveRecord<T> | undefined);
    request.onerror = () => reject(request.error ?? new Error('load failed'));
  });
  db.close();
  return record;
}

export async function listSaves(): Promise<SaveRecord[]> {
  const db = await openDb();
  const records = await new Promise<SaveRecord[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const request = tx.objectStore(STORE).getAll();
    request.onsuccess = () => resolve(request.result as SaveRecord[]);
    request.onerror = () => reject(request.error ?? new Error('list failed'));
  });
  db.close();
  return records.sort((a, b) => b.savedAt - a.savedAt);
}

export async function deleteSave(key: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('delete failed'));
  });
  db.close();
}
