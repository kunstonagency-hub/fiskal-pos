import { openDB } from 'idb';

export const initDB = async () => {
  return openDB('fiskal-offline-db', 2, {
    upgrade(db, oldVersion) {
      // Mantenemos la tabla vieja por si quedó algo atrapado ahí
      if (oldVersion < 1 && !db.objectStoreNames.contains('offline_sales')) {
        db.createObjectStore('offline_sales', { keyPath: 'id', autoIncrement: true });
      }
      // Nueva tabla para la cola de acciones avanzadas
      if (!db.objectStoreNames.contains('offline_actions')) {
        db.createObjectStore('offline_actions', { keyPath: 'local_id' });
      }
    },
  });
};

export const queueOfflineAction = async (action) => {
  const db = await initDB();
  await db.put('offline_actions', { 
    local_id: Date.now().toString() + '_' + Math.random().toString(36).substr(2, 9), 
    ...action, 
    timestamp: Date.now() 
  });
};

export const getOfflineActions = async () => {
  const db = await initDB();
  return db.getAll('offline_actions');
};

export const clearOfflineAction = async (local_id) => {
  const db = await initDB();
  await db.delete('offline_actions', local_id);
};

// Funciones heredadas (Por si instalaste la versión anterior hace un momento)
export const getOfflineSales = async () => {
  const db = await initDB();
  if (db.objectStoreNames.contains('offline_sales')) {
    return db.getAll('offline_sales');
  }
  return [];
};

export const clearOfflineSale = async (id) => {
  const db = await initDB();
  if (db.objectStoreNames.contains('offline_sales')) {
     await db.delete('offline_sales', id);
  }
};