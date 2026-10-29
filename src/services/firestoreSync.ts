import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Product, Batch, StoreSettings } from '../types';
import { calculateDaysRemaining, getExpirationStatus } from './storage';

/**
 * Service to manage cloud synchronization of store inventory with Firestore
 * All operations are scoped to /stores/{storeId}/...
 */

export interface StoreSyncUnsubscribers {
  unsubStore: () => void;
  unsubProducts: () => void;
  unsubBatches: () => void;
  unsubAlerts: () => void;
}

export const firestoreSyncService = {
  /**
   * Initialize or retrieve the Store document
   */
  async ensureStore(storeId: string, storeName: string, ownerId: string): Promise<StoreSettings> {
    const storeRef = doc(db, 'stores', storeId);
    const path = `stores/${storeId}`;

    try {
      const snap = await getDoc(storeRef);
      if (snap.exists()) {
        const data = snap.data();
        return {
          storeName: data.name || storeName,
          businessType: data.businessType || 'Comercio',
          currencySymbol: data.currencySymbol || '$',
          alertThresholds: data.alertThresholds || {
            today: true,
            days1: true,
            days3: true,
            days7: true,
            days30: false,
          },
          soundAlerts: data.soundAlerts !== false,
        };
      } else {
        const newSettings: StoreSettings = {
          storeName,
          businessType: 'Almacén / Comercio',
          currencySymbol: '$',
          alertThresholds: {
            today: true,
            days1: true,
            days3: true,
            days7: true,
            days30: false,
          },
          soundAlerts: true,
        };

        await setDoc(storeRef, {
          id: storeId,
          name: storeName,
          businessType: newSettings.businessType,
          currencySymbol: newSettings.currencySymbol,
          alertThresholds: newSettings.alertThresholds,
          soundAlerts: newSettings.soundAlerts,
          ownerId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        return newSettings;
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, path);
    }
  },

  /**
   * Save store profile settings
   */
  async updateStoreSettings(storeId: string, settings: StoreSettings): Promise<void> {
    const storeRef = doc(db, 'stores', storeId);
    const path = `stores/${storeId}`;
    try {
      await updateDoc(storeRef, {
        name: settings.storeName,
        businessType: settings.businessType,
        currencySymbol: settings.currencySymbol,
        alertThresholds: settings.alertThresholds,
        soundAlerts: settings.soundAlerts,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  /**
   * Real-time listener for all store data
   */
  subscribeToStore(
    storeId: string,
    callbacks: {
      onProducts: (products: Product[]) => void;
      onBatches: (batches: Batch[]) => void;
      onSettings: (settings: StoreSettings) => void;
      onError?: (err: unknown) => void;
    }
  ): StoreSyncUnsubscribers {
    const storePath = `stores/${storeId}`;
    const productsPath = `stores/${storeId}/products`;
    const batchesPath = `stores/${storeId}/batches`;

    // 1. Store settings listener
    const unsubStore = onSnapshot(
      doc(db, 'stores', storeId),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          callbacks.onSettings({
            storeName: d.name || 'Mi Comercio',
            businessType: d.businessType || 'Comercio',
            currencySymbol: d.currencySymbol || '$',
            alertThresholds: d.alertThresholds || {
              today: true,
              days1: true,
              days3: true,
              days7: true,
              days30: false,
            },
            soundAlerts: d.soundAlerts !== false,
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, storePath);
      }
    );

    // 2. Products listener
    const unsubProducts = onSnapshot(
      collection(db, 'stores', storeId, 'products'),
      (snap) => {
        const list: Product[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            name: d.name || '',
            category: d.category || 'Otros',
            unit: d.unit || 'unidades',
            barcode: d.barcode || undefined,
            costPrice: d.costPrice,
            salePrice: d.salePrice,
            notes: d.notes,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        });
        callbacks.onProducts(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, productsPath);
      }
    );

    // 3. Batches listener
    const unsubBatches = onSnapshot(
      collection(db, 'stores', storeId, 'batches'),
      (snap) => {
        const list: Batch[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            productId: d.productId,
            lotNumber: d.lotNumber,
            quantity: Number(d.quantity) || 0,
            expirationDate: d.expirationDate || '',
            costPrice: d.costPrice,
            createdAt: d.createdAt || new Date().toISOString(),
          });
        });
        callbacks.onBatches(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, batchesPath);
      }
    );

    return {
      unsubStore,
      unsubProducts,
      unsubBatches,
      unsubAlerts: () => {},
    };
  },

  /**
   * Save Product to Firestore
   */
  async saveProduct(storeId: string, product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, productId?: string): Promise<Product> {
    const isNew = !productId;
    const id = productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'stores', storeId, 'products', id);
    const path = `stores/${storeId}/products/${id}`;

    const now = new Date().toISOString();
    const productData: Product = {
      ...product,
      id,
      createdAt: now,
      updatedAt: now,
    };

    try {
      if (isNew) {
        await setDoc(docRef, {
          ...productData,
          storeId,
        });
      } else {
        await updateDoc(docRef, {
          name: product.name,
          category: product.category,
          unit: product.unit,
          barcode: product.barcode || null,
          costPrice: product.costPrice ?? null,
          salePrice: product.salePrice ?? null,
          notes: product.notes || null,
          updatedAt: now,
        });
      }
      return productData;
    } catch (err) {
      handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  },

  /**
   * Delete Product and its batches
   */
  async deleteProduct(storeId: string, productId: string): Promise<void> {
    const productRef = doc(db, 'stores', storeId, 'products', productId);
    const path = `stores/${storeId}/products/${productId}`;

    try {
      // 1. Delete product
      await deleteDoc(productRef);

      // 2. Delete all batches of this product
      const batchesQuery = query(
        collection(db, 'stores', storeId, 'batches'),
        where('productId', '==', productId)
      );
      const batchesSnap = await getDocs(batchesQuery);
      const batchPromises = batchesSnap.docs.map(d => deleteDoc(d.ref));
      await Promise.all(batchPromises);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  /**
   * Save Batch to Firestore
   */
  async saveBatch(storeId: string, batch: Omit<Batch, 'id' | 'createdAt'>, batchId?: string): Promise<Batch> {
    const isNew = !batchId;
    const id = batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'stores', storeId, 'batches', id);
    const path = `stores/${storeId}/batches/${id}`;

    const now = new Date().toISOString();
    const batchData: Batch = {
      ...batch,
      id,
      createdAt: now,
    };

    try {
      if (isNew) {
        await setDoc(docRef, {
          ...batchData,
          storeId,
        });
      } else {
        await updateDoc(docRef, {
          lotNumber: batch.lotNumber || null,
          quantity: Number(batch.quantity) || 0,
          expirationDate: batch.expirationDate,
          costPrice: batch.costPrice ?? null,
        });
      }
      return batchData;
    } catch (err) {
      handleFirestoreError(err, isNew ? OperationType.CREATE : OperationType.UPDATE, path);
    }
  },

  /**
   * Update Batch quantity (e.g. subtract for sale or waste)
   */
  async updateBatchQuantity(storeId: string, batchId: string, delta: number): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'batches', batchId);
    const path = `stores/${storeId}/batches/${batchId}`;

    try {
      const snap = await getDoc(docRef);
      if (!snap.exists()) return;
      const current = Number(snap.data().quantity) || 0;
      const next = Math.max(0, current + delta);
      await updateDoc(docRef, { quantity: next });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  /**
   * Delete Batch
   */
  async deleteBatch(storeId: string, batchId: string): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'batches', batchId);
    const path = `stores/${storeId}/batches/${batchId}`;
    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  /**
   * Migrate existing local products/batches to cloud store
   */
  async migrateLocalData(storeId: string, localProducts: Product[], localBatches: Batch[]): Promise<number> {
    let count = 0;
    try {
      for (const prod of localProducts) {
        const prodRef = doc(db, 'stores', storeId, 'products', prod.id);
        await setDoc(prodRef, {
          ...prod,
          storeId,
        });
        count++;
      }

      for (const b of localBatches) {
        const batchRef = doc(db, 'stores', storeId, 'batches', b.id);
        await setDoc(batchRef, {
          ...b,
          storeId,
        });
      }
      return count;
    } catch (err) {
      console.error('Migration error:', err);
      return count;
    }
  }
};
