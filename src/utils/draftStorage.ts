// ブラウザ内の下書き(未保存の変更)の保存先。
//
// file:// で開いた HTML はフォルダやファイル名に関係なく同じ保存領域(オリジン "file://")を
// 共有するので、1 つのキーに書くとタブどうし・アプリのコピーどうしで上書きし合う。
// そのため下書きは 1 件ずつ draftId をキーにして持ち、どのタブのものかは ownerTabId で表す。
// localStorage は 5MB ほどで書き込み中に画面が止まるため、容量が大きく非同期の IndexedDB を使う。
import type { ProjectData } from './ExportImportHandler';

// dirty: 保存されていない変更がある。起動時に復元するかを尋ねる対象。
// downloaded: その内容をダウンロード済み。尋ねはしないが、ダウンロードを取り消した場合などに
//             ファイルメニューの「下書き」から開き直せるよう残しておく。
export type DraftStatus = 'dirty' | 'downloaded';

export interface DraftRecord {
  draftId: string;
  // 書いているタブの ID。タブを離れた(新規・開くで別のプロジェクトに切り替えた)下書きは空文字。
  ownerTabId: string;
  status: DraftStatus;
  projectId: string;
  title: string;
  rowCount: number;
  updatedAt: number;
  // 最後に保存した(または開いた)時点の中身のハッシュ。中身がこれに戻ったら下書きは要らない。
  baseHash: string | null;
  // 書いたアプリの EXPORT_SCHEMA_VERSION。新しい版が書いた下書きは警告してから開く。
  schemaVersion: number;
  project: ProjectData;
}

export interface DraftStorage {
  get(draftId: string): Promise<DraftRecord | undefined>;
  put(record: DraftRecord): Promise<void>;
  remove(draftId: string): Promise<void>;
  list(): Promise<DraftRecord[]>;
}

const DB_NAME = 'gantty-drafts';
const STORE_NAME = 'drafts';

const requestToPromise = <T>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

export const createIndexedDbDraftStorage = (): DraftStorage => {
  let dbPromise: Promise<IDBDatabase> | null = null;
  const openDb = () => {
    if (!dbPromise) {
      dbPromise = new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          request.result.createObjectStore(STORE_NAME, { keyPath: 'draftId' });
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      // 開けなかったら次の呼び出しで開き直す
      dbPromise.catch(() => { dbPromise = null; });
    }
    return dbPromise;
  };

  const run = async <T>(mode: IDBTransactionMode, body: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
    const db = await openDb();
    const transaction = db.transaction(STORE_NAME, mode);
    const result = requestToPromise(body(transaction.objectStore(STORE_NAME)));
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error);
    });
    return result;
  };

  return {
    get: (draftId) => run('readonly', (store) => store.get(draftId) as IDBRequest<DraftRecord | undefined>),
    put: async (record) => { await run('readwrite', (store) => store.put(record)); },
    remove: async (draftId) => { await run('readwrite', (store) => store.delete(draftId)); },
    list: () => run('readonly', (store) => store.getAll() as IDBRequest<DraftRecord[]>),
  };
};

// テスト用と、IndexedDB が使えない環境の代わり(タブを閉じると消える)。
export const createMemoryDraftStorage = (): DraftStorage => {
  const records = new Map<string, DraftRecord>();
  return {
    get: async (draftId) => records.get(draftId),
    put: async (record) => { records.set(record.draftId, record); },
    remove: async (draftId) => { records.delete(draftId); },
    list: async () => Array.from(records.values()),
  };
};
