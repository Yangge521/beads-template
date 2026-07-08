/**
 * IndexedDB 封装：作为 localStorage 的容量扩展方案
 *
 * - 原生 IndexedDB API 实现，不引入 idb 等第三方库
 * - 数据库：beads-db (v1)
 * - Object stores：
 *   - ai-history：AI 生成历史（keyPath: 'id'）
 *   - templates：自定义模板（keyPath: 'id'）
 *   - snapshots：编辑器快照（keyPath: 'id'）
 *   - kv：通用键值存储（keyPath: 'key'）
 * - 所有操作在 try/catch 中执行，失败返回安全默认值（undefined / [] / 0）
 * - 隐私模式（indexedDB 不存在）下所有函数静默降级
 */

const DB_NAME = 'beads-db';
const DB_VERSION = 1;

/** 缓存的数据库连接 Promise，避免重复打开 */
let dbPromise: Promise<IDBDatabase> | null = null;

/** 检测 indexedDB 是否可用（隐私模式 / SSR 下可能不存在） */
function isIDBAvailable(): boolean {
  return typeof indexedDB !== 'undefined';
}

/**
 * 打开 / 创建数据库（带缓存）
 * - 首次调用时打开数据库并按需创建 object stores
 * - 后续调用返回缓存的 Promise，避免重复打开
 * - 隐私模式下 reject，调用方需自行 catch（idb* 系列函数已内置兜底）
 */
export function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (!isIDBAvailable()) {
      reject(new Error('IndexedDB 不可用（可能处于隐私模式）'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 首次创建或版本升级时，创建 object stores
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('ai-history')) {
        db.createObjectStore('ai-history', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('templates')) {
        db.createObjectStore('templates', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('snapshots')) {
        db.createObjectStore('snapshots', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      // 其他标签页触发版本升级时，主动关闭当前连接并清空缓存，以便重新打开
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };

    request.onerror = () => {
      dbPromise = null;
      reject(request.error ?? new Error('打开 IndexedDB 失败'));
    };

    // 被其他标签页阻塞时保持 pending，不立即 reject（等其关闭后会继续）
    request.onblocked = () => {
      /* 等待其他连接关闭 */
    };
  });
  return dbPromise;
}

/**
 * 在指定 store 上执行事务
 * @param store  object store 名称
 * @param mode   事务模式（readonly / readwrite）
 * @param fn     接收 object store，返回要执行的 request
 */
function runTransaction<T>(
  store: string,
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openDB().then(
    db =>
      new Promise<T>((resolve, reject) => {
        let tx!: IDBTransaction;
        let request!: IDBRequest<T>;
        try {
          tx = db.transaction(store, mode);
          request = fn(tx.objectStore(store));
        } catch (err) {
          // store 不存在等同步异常，转为 reject
          reject(err);
          return;
        }
        // 事务完成（读写均适用）后读取 request 结果
        tx.oncomplete = () => resolve(request.result);
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      })
  );
}

/**
 * 读取单条记录
 * @param store  object store 名称
 * @param key    主键
 * @returns 命中返回记录，未命中或失败返回 undefined
 */
export async function idbGet<T>(store: string, key: IDBValidKey): Promise<T | undefined> {
  if (!isIDBAvailable()) return undefined;
  try {
    return await runTransaction<T>(store, 'readonly', os => os.get(key));
  } catch {
    return undefined;
  }
}

/**
 * 写入（覆盖）一条记录
 * @param store  object store 名称
 * @param value  要存储的值
 * @param key    主键；带 keyPath 的 store 可省略，kv（out-of-line）需要传入
 */
export async function idbPut(store: string, value: unknown, key?: IDBValidKey): Promise<void> {
  if (!isIDBAvailable()) return;
  try {
    await runTransaction(store, 'readwrite', os => os.put(value, key));
  } catch {
    // 写入失败静默
  }
}

/**
 * 删除一条记录
 */
export async function idbDelete(store: string, key: IDBValidKey): Promise<void> {
  if (!isIDBAvailable()) return;
  try {
    await runTransaction(store, 'readwrite', os => os.delete(key));
  } catch {
    // 删除失败静默
  }
}

/**
 * 读取全部记录
 * @returns 全部记录数组，失败返回空数组
 */
export async function idbGetAll<T>(store: string): Promise<T[]> {
  if (!isIDBAvailable()) return [];
  try {
    return await runTransaction<T[]>(store, 'readonly', os => os.getAll());
  } catch {
    return [];
  }
}

/**
 * 清空整个 store
 */
export async function idbClear(store: string): Promise<void> {
  if (!isIDBAvailable()) return;
  try {
    await runTransaction(store, 'readwrite', os => os.clear());
  } catch {
    // 清空失败静默
  }
}

/**
 * 统计 store 中的记录数
 * @returns 记录数，失败返回 0
 */
export async function idbCount(store: string): Promise<number> {
  if (!isIDBAvailable()) return 0;
  try {
    return await runTransaction<number>(store, 'readonly', os => os.count());
  } catch {
    return 0;
  }
}
