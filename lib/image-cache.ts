const DATABASE_NAME = 'xgen-small-world-images';
const STORE_NAME = 'scene-images';
const DATABASE_VERSION = 1;
const MAX_CACHED_IMAGES = 12;

type CachedSceneImage = {
  key: string;
  assetUrl: string;
  savedAt: number;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        const store = database.createObjectStore(STORE_NAME, { keyPath: 'key' });
        store.createIndex('savedAt', 'savedAt');
      }
    };
  });
}

function waitForTransaction(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
}

export async function cacheSceneImage(key: string, assetUrl: string): Promise<boolean> {
  if (!assetUrl.startsWith('data:image/') || typeof window === 'undefined' || !window.indexedDB) return false;
  const database = await openDatabase();
  try {
    const write = database.transaction(STORE_NAME, 'readwrite');
    write.objectStore(STORE_NAME).put({ key, assetUrl, savedAt: Date.now() } satisfies CachedSceneImage);
    await waitForTransaction(write);

    const read = database.transaction(STORE_NAME, 'readonly');
    const allRequest = read.objectStore(STORE_NAME).getAll();
    const all = await new Promise<CachedSceneImage[]>((resolve, reject) => {
      allRequest.onsuccess = () => resolve(allRequest.result as CachedSceneImage[]);
      allRequest.onerror = () => reject(allRequest.error);
    });
    if (all.length > MAX_CACHED_IMAGES) {
      const oldest = all.sort((left, right) => left.savedAt - right.savedAt).slice(0, all.length - MAX_CACHED_IMAGES);
      const cleanup = database.transaction(STORE_NAME, 'readwrite');
      oldest.forEach((entry) => cleanup.objectStore(STORE_NAME).delete(entry.key));
      await waitForTransaction(cleanup);
    }
    return true;
  } finally {
    database.close();
  }
}

export async function getCachedSceneImage(key: string): Promise<string | null> {
  if (typeof window === 'undefined' || !window.indexedDB) return null;
  const database = await openDatabase();
  try {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);
    return await new Promise<string | null>((resolve, reject) => {
      request.onsuccess = () => {
        const entry = request.result as CachedSceneImage | undefined;
        resolve(entry?.assetUrl?.startsWith('data:image/') ? entry.assetUrl : null);
      };
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
}
