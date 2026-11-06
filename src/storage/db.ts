import { openDB, type IDBPDatabase } from 'idb';

/** The extension's IndexedDB (background service worker only). */
export const STORES = {
  translations: 'translations',
  dictionary: 'dictionary',
  /** Which dictionary version is imported, per language. */
  meta: 'meta',
} as const;

let db: Promise<IDBPDatabase> | null = null;

export function openDatabase() {
  db ??= openDB('linguaiuto', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) database.createObjectStore(STORES.translations);
      if (oldVersion < 2) {
        database.createObjectStore(STORES.dictionary);
        database.createObjectStore(STORES.meta);
      }
    },
  });
  return db;
}
