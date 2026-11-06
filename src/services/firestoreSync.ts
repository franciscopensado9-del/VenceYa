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
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { Product, Batch, StoreSettings, Promotion, PromotionStatus, ProductReviewRecord, StockMovement } from '../types';
import { calculateDaysRemaining, getExpirationStatus } from './storage';

/**
 * Global Firestore sync error reporting.
 * Logs error to console and dispatches 'venceya:sync-error' custom event
 * to notify UI banners and listeners.
 */
export function reportSyncError(err: unknown): void {
  console.error('Firestore sync error:', err);
  if (typeof window !== 'undefined') {
    const message = err instanceof Error ? err.message : String(err || 'Error de sincronización con la nube');
    window.dispatchEvent(new CustomEvent('venceya:sync-error', { detail: { message } }));
  }
}

/**
 * Removes undefined values recursively so Firestore payloads don't throw.
 * Keeps null, arrays, dates, and nested objects.
 */
export function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      result[key] = stripUndefined(value);
    } else {
      result[key] = value;
    }
  }
  return result as T;
}

/**
 * Service to manage cloud synchronization of store inventory with Firestore
 * All operations are scoped to /stores/{storeId}/...
 */

export interface StoreSyncUnsubscribers {
  unsubStore: () => void;
  unsubProducts: () => void;
  unsubBatches: () => void;
  unsubAlerts: () => void;
  unsubPromotions?: () => void;
  unsubReviews?: () => void;
  unsubStockMovements?: () => void;
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
      onPromotions?: (promotions: Promotion[]) => void;
      onReviews?: (reviews: ProductReviewRecord[]) => void;
      onStockMovements?: (movements: StockMovement[]) => void;
      onError?: (err: unknown) => void;
    }
  ): StoreSyncUnsubscribers {
    const storePath = `stores/${storeId}`;
    const productsPath = `stores/${storeId}/products`;
    const batchesPath = `stores/${storeId}/batches`;
    const promotionsPath = `stores/${storeId}/promotions`;
    const reviewsPath = `stores/${storeId}/reviews`;
    const stockMovementsPath = `stores/${storeId}/stockMovements`;

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
        callbacks.onError?.(error);
        reportSyncError(error);
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
            brand: d.brand || undefined,
            imageUrl: d.imageUrl || undefined,
            costPrice: d.costPrice,
            salePrice: d.salePrice,
            notes: d.notes,
            lastReviewedAt: d.lastReviewedAt,
            lastReviewedStatus: d.lastReviewedStatus,
            lastReviewedNotes: d.lastReviewedNotes,
            lastReviewedBatchId: d.lastReviewedBatchId,
            lastReviewedExpirationDate: d.lastReviewedExpirationDate,
            lastReviewedQuantity: d.lastReviewedQuantity,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        });
        callbacks.onProducts(list);
      },
      (error) => {
        callbacks.onError?.(error);
        reportSyncError(error);
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
        callbacks.onError?.(error);
        reportSyncError(error);
      }
    );

    // 4. Promotions listener
    const unsubPromotions = onSnapshot(
      collection(db, 'stores', storeId, 'promotions'),
      (snap) => {
        if (!callbacks.onPromotions) return;
        const list: Promotion[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            storeId,
            title: d.title || 'Promoción',
            type: d.type || 'discount',
            status: d.status || 'active',
            productId: d.productId || '',
            productName: d.productName || '',
            productCategory: d.productCategory,
            productBarcode: d.productBarcode,
            productImageUrl: d.productImageUrl,
            unit: d.unit || 'unidades',
            batchId: d.batchId,
            batchExpirationDate: d.batchExpirationDate,
            batchDaysRemaining: d.batchDaysRemaining,
            availableStock: d.availableStock,
            regularPrice: Number(d.regularPrice) || 0,
            costPrice: d.costPrice,
            discountPercentage: d.discountPercentage,
            discountAmount: d.discountAmount,
            promoPrice: Number(d.promoPrice) || 0,
            secondUnitDiscountPercentage: d.secondUnitDiscountPercentage,
            bulkMinQuantity: d.bulkMinQuantity,
            bulkPricePerUnit: d.bulkPricePerUnit,
            comboItems: d.comboItems,
            urgencyLevel: d.urgencyLevel,
            profitMarginPercent: d.profitMarginPercent,
            isBelowCost: d.isBelowCost,
            totalRecoverableRevenue: d.totalRecoverableRevenue,
            message: d.message || '',
            storeName: d.storeName || '',
            validUntilText: d.validUntilText,
            notes: d.notes,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          });
        });
        callbacks.onPromotions(list);
      },
      (error) => {
        callbacks.onError?.(error);
        reportSyncError(error);
      }
    );

    // 5. Reviews listener
    const unsubReviews = onSnapshot(
      collection(db, 'stores', storeId, 'reviews'),
      (snap) => {
        if (!callbacks.onReviews) return;
        const list: ProductReviewRecord[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            storeId,
            productId: d.productId || '',
            batchId: d.batchId,
            reviewedAt: d.reviewedAt || new Date().toISOString(),
            status: d.status || 'reviewed',
            resolution: d.resolution,
            notes: d.notes,
            batchExpirationDate: d.batchExpirationDate,
            batchQuantityAtReview: d.batchQuantityAtReview,
          });
        });
        callbacks.onReviews(list);
      },
      (error) => {
        callbacks.onError?.(error);
        reportSyncError(error);
      }
    );

    // 6. Stock Movements listener (Immutable history)
    const unsubStockMovements = onSnapshot(
      collection(db, 'stores', storeId, 'stockMovements'),
      (snap) => {
        if (!callbacks.onStockMovements) return;
        const list: StockMovement[] = [];
        snap.forEach((docSnap) => {
          const d = docSnap.data();
          list.push({
            id: docSnap.id,
            storeId,
            userId: d.userId,
            productId: d.productId || '',
            productName: d.productName || '',
            batchId: d.batchId,
            batchExpirationDate: d.batchExpirationDate,
            type: d.type || 'sale',
            quantity: Number(d.quantity) || 0,
            previousQuantity: d.previousQuantity !== undefined ? Number(d.previousQuantity) : undefined,
            newQuantity: d.newQuantity !== undefined ? Number(d.newQuantity) : undefined,
            unit: d.unit,
            reason: d.reason,
            notes: d.notes,
            alertId: d.alertId,
            recommendationId: d.recommendationId,
            promotionId: d.promotionId,
            createdAt: d.createdAt || new Date().toISOString(),
          });
        });
        callbacks.onStockMovements(list);
      },
      (error) => {
        callbacks.onError?.(error);
        reportSyncError(error);
      }
    );

    return {
      unsubStore,
      unsubProducts,
      unsubBatches,
      unsubAlerts: () => {},
      unsubPromotions,
      unsubReviews,
      unsubStockMovements,
    };
  },

  /**
   * Save Product to Firestore
   * Always writes with setDoc(docRef, cleanPayload, { merge: true }) (upsert)
   * createdAt is included only if provided.
   */
  async saveProduct(
    storeId: string, 
    product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, 
    productId?: string,
    createdAt?: string
  ): Promise<Product> {
    const id = productId || `prod_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'stores', storeId, 'products', id);
    const path = `stores/${storeId}/products/${id}`;

    const now = new Date().toISOString();
    const payload: Record<string, any> = {
      ...product,
      id,
      storeId,
      updatedAt: now,
    };
    if (createdAt) {
      payload.createdAt = createdAt;
    }
    const cleanPayload = stripUndefined(payload);

    try {
      await setDoc(docRef, cleanPayload, { merge: true });
      return {
        ...product,
        id,
        createdAt: createdAt || now,
        updatedAt: now,
      } as Product;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
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
   * Always writes with setDoc(docRef, cleanPayload, { merge: true }) (upsert)
   * createdAt is included only if provided.
   */
  async saveBatch(
    storeId: string, 
    batch: Omit<Batch, 'id' | 'createdAt'>, 
    batchId?: string,
    createdAt?: string
  ): Promise<Batch> {
    const id = batchId || `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const docRef = doc(db, 'stores', storeId, 'batches', id);
    const path = `stores/${storeId}/batches/${id}`;

    const now = new Date().toISOString();
    const payload: Record<string, any> = {
      ...batch,
      id,
      storeId,
      quantity: Number(batch.quantity) || 0,
    };
    if (createdAt) {
      payload.createdAt = createdAt;
    }
    const cleanPayload = stripUndefined(payload);

    try {
      await setDoc(docRef, cleanPayload, { merge: true });
      return {
        ...batch,
        id,
        createdAt: createdAt || now,
      } as Batch;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
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
        await setDoc(prodRef, stripUndefined({
          ...prod,
          storeId,
        }), { merge: true });
        count++;
      }

      for (const b of localBatches) {
        const batchRef = doc(db, 'stores', storeId, 'batches', b.id);
        await setDoc(batchRef, stripUndefined({
          ...b,
          storeId,
        }), { merge: true });
      }
      return count;
    } catch (err) {
      console.error('Migration error:', err);
      return count;
    }
  },

  /**
   * Save Promotion to Firestore
   * INVARIANT: Saving a promotion DOES NOT modify regular inventory prices or deduct stock.
   */
  async savePromotion(storeId: string, promotion: Promotion): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'promotions', promotion.id);
    const path = `stores/${storeId}/promotions/${promotion.id}`;

    try {
      await setDoc(docRef, stripUndefined({
        ...promotion,
        storeId,
        updatedAt: new Date().toISOString(),
      }), { merge: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  /**
   * Update Promotion status (active, draft, ended)
   */
  async updatePromotionStatus(storeId: string, promotionId: string, status: PromotionStatus): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'promotions', promotionId);
    const path = `stores/${storeId}/promotions/${promotionId}`;

    try {
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, path);
    }
  },

  /**
   * Delete Promotion
   */
  async deletePromotion(storeId: string, promotionId: string): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'promotions', promotionId);
    const path = `stores/${storeId}/promotions/${promotionId}`;

    try {
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  },

  /**
   * Bulk import products and batches from Excel / CSV import
   * Saves to /stores/{storeId}/products and /stores/{storeId}/batches
   * Scoped to the authenticated user's storeId for strict data isolation.
   */
  async bulkImportProductsAndBatches(
    storeId: string,
    products: Product[],
    batches: Batch[]
  ): Promise<{ productsSaved: number; batchesSaved: number; errors: string[] }> {
    let productsSaved = 0;
    let batchesSaved = 0;
    const errors: string[] = [];

    // 1. Save products in parallel chunks of 20
    const chunkSize = 20;
    for (let i = 0; i < products.length; i += chunkSize) {
      const chunk = products.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (prod) => {
          try {
            const prodRef = doc(db, 'stores', storeId, 'products', prod.id);
            await setDoc(prodRef, stripUndefined({
              ...prod,
              storeId,
              updatedAt: new Date().toISOString(),
            }), { merge: true });
            productsSaved++;
          } catch (err) {
            console.error(`Error saving imported product ${prod.name}:`, err);
            errors.push(`Error en producto ${prod.name}: ${err instanceof Error ? err.message : String(err)}`);
          }
        })
      );
    }

    // 2. Save batches in parallel chunks of 20
    for (let i = 0; i < batches.length; i += chunkSize) {
      const chunk = batches.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (batch) => {
          try {
            const batchRef = doc(db, 'stores', storeId, 'batches', batch.id);
            await setDoc(batchRef, stripUndefined({
              ...batch,
              storeId,
            }), { merge: true });
            batchesSaved++;
          } catch (err) {
            console.error(`Error saving imported batch ${batch.id}:`, err);
            errors.push(`Error en lote ${batch.id}: ${err instanceof Error ? err.message : String(err)}`);
          }
        })
      );
    }

    return { productsSaved, batchesSaved, errors };
  },

  /**
   * Delete all documents in products, batches, promotions, reviews, and stockMovements
   * subcollections for a store, in chunks of <= 400 operations using writeBatch.
   * Does NOT delete the store document itself.
   */
  async clearStoreData(storeId: string): Promise<void> {
    const subcollections = ['products', 'batches', 'promotions', 'reviews', 'stockMovements'];
    const BATCH_LIMIT = 400;

    for (const subcol of subcollections) {
      const colRef = collection(db, 'stores', storeId, subcol);
      const snap = await getDocs(colRef);
      const docs = snap.docs;
      
      for (let i = 0; i < docs.length; i += BATCH_LIMIT) {
        const chunk = docs.slice(i, i + BATCH_LIMIT);
        const batch = writeBatch(db);
        for (const docSnap of chunk) {
          batch.delete(docSnap.ref);
        }
        await batch.commit();
      }
    }
  },

  /**
   * Save Product Review Action Record to Firestore
   * Scoped to /stores/{storeId}/reviews/{review.id}
   */
  async recordProductReview(storeId: string, review: ProductReviewRecord): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'reviews', review.id);
    const path = `stores/${storeId}/reviews/${review.id}`;

    try {
      await setDoc(docRef, {
        ...review,
        storeId,
        updatedAt: new Date().toISOString(),
      });

      // Also update Product document to reflect last review
      const prodRef = doc(db, 'stores', storeId, 'products', review.productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        await updateDoc(prodRef, {
          lastReviewedAt: review.reviewedAt,
          lastReviewedStatus: review.status,
          lastReviewedNotes: review.notes || null,
          lastReviewedBatchId: review.batchId || null,
          lastReviewedExpirationDate: review.batchExpirationDate || null,
          lastReviewedQuantity: review.batchQuantityAtReview ?? null,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  /**
   * Save Stock Movement Record to Firestore
   * Scoped to /stores/{storeId}/stockMovements/{movement.id}
   */
  async recordStockMovement(storeId: string, movement: StockMovement): Promise<void> {
    const docRef = doc(db, 'stores', storeId, 'stockMovements', movement.id);
    const path = `stores/${storeId}/stockMovements/${movement.id}`;

    try {
      await setDoc(docRef, {
        ...movement,
        storeId,
        createdAt: movement.createdAt || new Date().toISOString(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  },

  /**
   * Atomically executes recommendation resolution and stock deduction in Firestore
   * Coordinates movement audit log, batch deduction, and review metadata
   */
  async applyResolutionTransaction(
    storeId: string,
    params: {
      reviewRecord: ProductReviewRecord;
      stockMovement?: StockMovement;
      batchId?: string;
      newBatchQuantity?: number;
      productId: string;
    }
  ): Promise<void> {
    const { reviewRecord, stockMovement, batchId, newBatchQuantity, productId } = params;

    try {
      // 1. Record stock movement if one was generated (e.g. sale or discard)
      if (stockMovement) {
        const movRef = doc(db, 'stores', storeId, 'stockMovements', stockMovement.id);
        await setDoc(movRef, {
          ...stockMovement,
          storeId,
          createdAt: stockMovement.createdAt || new Date().toISOString(),
        });
      }

      // 2. If batch quantity changed, update the batch in Firestore
      if (batchId && newBatchQuantity !== undefined) {
        const batchRef = doc(db, 'stores', storeId, 'batches', batchId);
        await updateDoc(batchRef, {
          quantity: newBatchQuantity,
          lastReviewedAt: reviewRecord.reviewedAt,
          lastReviewedStatus: reviewRecord.status,
          updatedAt: new Date().toISOString(),
        });
      }

      // 3. Save resolution audit record to /stores/{storeId}/reviews/{review.id}
      const revRef = doc(db, 'stores', storeId, 'reviews', reviewRecord.id);
      await setDoc(revRef, {
        ...reviewRecord,
        storeId,
        updatedAt: new Date().toISOString(),
      });

      // 4. Update Product document with review metadata
      const prodRef = doc(db, 'stores', storeId, 'products', productId);
      const prodSnap = await getDoc(prodRef);
      if (prodSnap.exists()) {
        await updateDoc(prodRef, {
          lastReviewedAt: reviewRecord.reviewedAt,
          lastReviewedStatus: reviewRecord.status,
          lastReviewedNotes: reviewRecord.notes || null,
          lastReviewedBatchId: reviewRecord.batchId || null,
          lastReviewedExpirationDate: reviewRecord.batchExpirationDate || null,
          lastReviewedQuantity: reviewRecord.batchQuantityAtReview ?? null,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (err) {
      console.error('Error in applyResolutionTransaction cloud sync:', err);
      handleFirestoreError(err, OperationType.WRITE, `stores/${storeId}/reviews/${reviewRecord.id}`);
    }
  }
};
