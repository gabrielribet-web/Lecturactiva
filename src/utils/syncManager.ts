/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ReadingDocument, Highlight, Annotation, Prediction, SyncPayload } from '../types';
import { preloadedDocuments } from './preloadedDocs';

export class ImageStore {
  private static dbName = 'LecturaActivaImages';
  private static storeName = 'images';
  private static dbPromise: Promise<IDBDatabase> | null = null;

  private static getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(this.storeName)) {
          db.createObjectStore(this.storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return this.dbPromise;
  }

  static async set(key: string, val: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.put(val, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  static async get(key: string): Promise<string | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readonly');
      const store = tx.objectStore(this.storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  static async delete(key: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  static async clear(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(this.storeName, 'readwrite');
      const store = tx.objectStore(this.storeName);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
}

const STORAGE_KEY_DOCS = 'lectura_activa_docs';
const STORAGE_KEY_HIGHLIGHTS = 'lectura_activa_highlights';
const STORAGE_KEY_ANNOTATIONS = 'lectura_activa_annotations';
const STORAGE_KEY_PREDICTIONS = 'lectura_activa_predictions';
const STORAGE_KEY_LAST_SYNC = 'lectura_activa_last_sync';
const STORAGE_KEY_DELETED_DOCS = 'lectura_activa_deleted_doc_ids';

export class SyncManager {
  /**
   * Deleted Document IDs tracking
   */
  static getDeletedDocIds(): string[] {
    const data = localStorage.getItem(STORAGE_KEY_DELETED_DOCS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static addDeletedDocId(id: string) {
    const ids = this.getDeletedDocIds();
    if (!ids.includes(id)) {
      ids.push(id);
      localStorage.setItem(STORAGE_KEY_DELETED_DOCS, JSON.stringify(ids));
    }
  }

  static clearDeletedDocIds() {
    localStorage.removeItem(STORAGE_KEY_DELETED_DOCS);
  }

  /**
   * Loads documents from LocalStorage or populates them with preloaded samples if empty.
   */
  static getDocuments(): ReadingDocument[] {
    const data = localStorage.getItem(STORAGE_KEY_DOCS);
    if (!data) {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(preloadedDocuments));
      return preloadedDocuments;
    }
    try {
      return JSON.parse(data);
    } catch {
      return preloadedDocuments;
    }
  }

  static saveDocuments(docs: ReadingDocument[]) {
    const cleanedDocs = docs.map(doc => {
      let imageUrl = doc.imageUrl;
      if (imageUrl && imageUrl.startsWith('data:image/')) {
        const imageId = doc.id;
        ImageStore.set(imageId, imageUrl).catch(err => console.error("Error storing image to IndexedDB:", err));
        imageUrl = `indexeddb:${imageId}`;
      }

      let pages = doc.pages;
      if (pages && pages.length > 0) {
        pages = pages.map((page, idx) => {
          if (page && page.startsWith('data:image/')) {
            const pageId = `${doc.id}_page_${idx}`;
            ImageStore.set(pageId, page).catch(err => console.error("Error storing page to IndexedDB:", err));
            return `indexeddb:${pageId}`;
          }
          return page;
        });
      }

      return {
        ...doc,
        imageUrl,
        pages
      };
    });

    try {
      localStorage.setItem(STORAGE_KEY_DOCS, JSON.stringify(cleanedDocs));
    } catch (err) {
      console.error("Error saving documents to localStorage:", err);
    }
  }

  /**
   * Highlights
   */
  static getHighlights(): Highlight[] {
    const data = localStorage.getItem(STORAGE_KEY_HIGHLIGHTS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveHighlights(highlights: Highlight[]) {
    localStorage.setItem(STORAGE_KEY_HIGHLIGHTS, JSON.stringify(highlights));
  }

  /**
   * Annotations (margin notes)
   */
  static getAnnotations(): Annotation[] {
    const data = localStorage.getItem(STORAGE_KEY_ANNOTATIONS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static saveAnnotations(annotations: Annotation[]) {
    localStorage.setItem(STORAGE_KEY_ANNOTATIONS, JSON.stringify(annotations));
  }

  /**
   * Predictions
   */
  static getPredictions(): Prediction[] {
    const data = localStorage.getItem(STORAGE_KEY_PREDICTIONS);
    if (!data) return [];
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static savePredictions(predictions: Prediction[]) {
    localStorage.setItem(STORAGE_KEY_PREDICTIONS, JSON.stringify(predictions));
  }

  /**
   * Sync timestamp
   */
  static getLastSyncTime(): string | null {
    return localStorage.getItem(STORAGE_KEY_LAST_SYNC);
  }

  static saveLastSyncTime(time: string) {
    localStorage.setItem(STORAGE_KEY_LAST_SYNC, time);
  }

  /**
   * Synchronize local client state with the Express backend
   */
  static async syncWithCloud(): Promise<{ success: boolean; error?: string }> {
    if (!navigator.onLine) {
      return { success: false, error: 'Dispositivo sin conexión a Internet (Modo Offline).' };
    }

    try {
      // Keep documents as lightweight metadata (with indexeddb references for heavy assets) for optimal sync performance
      const rawDocs = this.getDocuments();

      const payload: SyncPayload = {
        documents: rawDocs,
        highlights: this.getHighlights(),
        annotations: this.getAnnotations(),
        predictions: this.getPredictions(),
        deletedDocIds: this.getDeletedDocIds(),
        lastSyncTime: this.getLastSyncTime() || undefined
      };

      const response = await fetch('/api/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Error en el servidor: ${response.statusText}`);
      }

      const serverData = await response.json();

      if (serverData.success) {
        // Save merged server-side state back to local storage
        this.saveDocuments(serverData.documents);
        this.saveHighlights(serverData.highlights);
        this.saveAnnotations(serverData.annotations);
        this.savePredictions(serverData.predictions);
        this.saveLastSyncTime(serverData.timestamp);
        
        // Clear successfully synced deleted document trackers
        this.clearDeletedDocIds();
        
        return { success: true };
      } else {
        return { success: false, error: 'La sincronización fue rechazada por el servidor.' };
      }
    } catch (err) {
      console.error('Error de sincronización:', err);
      return { success: false, error: err instanceof Error ? err.message : 'Error desconocido de conexión.' };
    }
  }

  /**
   * Clears all local user data and resets back to the beautiful preloaded educational documents
   */
  static resetToDefault() {
    localStorage.removeItem(STORAGE_KEY_DOCS);
    localStorage.removeItem(STORAGE_KEY_HIGHLIGHTS);
    localStorage.removeItem(STORAGE_KEY_ANNOTATIONS);
    localStorage.removeItem(STORAGE_KEY_PREDICTIONS);
    localStorage.removeItem(STORAGE_KEY_LAST_SYNC);
    ImageStore.clear().catch(err => console.error("Error clearing ImageStore:", err));
    return this.getDocuments();
  }
}
