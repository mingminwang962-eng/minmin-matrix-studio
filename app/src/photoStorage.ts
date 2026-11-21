export type PhotoKind = "avatar" | "background";
export type SavedPhotos = Record<PhotoKind, string | null>;
const DATABASE = "minmin-matrix-photos";
const STORE = "current-photos";
let connection: Promise<IDBDatabase> | undefined;

function database() {
  if (!connection) {
    connection = new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DATABASE, 1);
      request.onupgradeneeded = () => request.result.createObjectStore(STORE);
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error("照片存储暂不可用"));
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => { db.close(); connection = undefined; };
        resolve(db);
      };
    }).catch(error => { connection = undefined; throw error; });
  }
  return connection;
}

export async function readPhotos(): Promise<SavedPhotos> {
  const db = await database();
  return new Promise((resolve, reject) => {
    const photos: SavedPhotos = { avatar: null, background: null };
    const tx = db.transaction(STORE, "readonly");
    for (const kind of ["avatar", "background"] as const) {
      const request = tx.objectStore(STORE).get(kind);
      request.onsuccess = () => {
        if (typeof request.result === "string" && request.result.startsWith("data:image/")) photos[kind] = request.result;
      };
    }
    tx.oncomplete = () => resolve(photos);
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}

export async function savePhoto(kind: PhotoKind, dataUrl: string | null): Promise<void> {
  if (dataUrl !== null && !dataUrl.startsWith("data:image/")) throw new Error("请选择图片");
  const db = await database();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    if (dataUrl === null) store.delete(kind);
    else store.put(dataUrl, kind);
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error);
    tx.onerror = () => reject(tx.error);
  });
}
