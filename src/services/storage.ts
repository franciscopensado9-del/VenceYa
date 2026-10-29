import { 
  Product, 
  Batch, 
  ProductWithBatches, 
  BatchWithProduct, 
  ExpirationStatus, 
  StoreSettings, 
  AppAlert, 
  SalesSuggestion 
} from '../types';

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'Mi Almacén',
  businessType: 'Comercio Minorista',
  currencySymbol: '$',
  alertThresholds: {
    today: true,
    days1: true,
    days3: true,
    days7: true,
    days30: true,
  },
  soundAlerts: true,
};

/**
 * Normalizes a date to YYYY-MM-DD string
 */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Parses YYYY-MM-DD into a localized midnight Date object
 */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

/**
 * Calculates calendar days between today and expiration date
 */
export function calculateDaysRemaining(expirationDateStr: string): number {
  const expDate = parseDate(expirationDateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffTime = expDate.getTime() - today.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Determines expiration status based on remaining days
 */
export function getExpirationStatus(days: number): ExpirationStatus {
  if (days < 0) return 'expired';
  if (days === 0) return 'today';
  if (days <= 3) return 'warning_3d';
  if (days <= 7) return 'warning_7d';
  if (days <= 30) return 'warning_30d';
  return 'good';
}

/**
 * Human friendly status label with clear palette classes
 */
export function getStatusLabel(status: ExpirationStatus, days: number): { label: string; badgeClass: string; textClass: string } {
  switch (status) {
    case 'expired':
      return {
        label: `Vencido (${Math.abs(days)}d)`,
        badgeClass: 'bg-[#FCEBE5] text-[#C6533A] border border-[#FADBD0]',
        textClass: 'text-[#C6533A] font-semibold'
      };
    case 'today':
      return {
        label: 'Vence hoy',
        badgeClass: 'bg-[#FCEBE5] text-[#C6533A] border border-[#FADBD0] font-bold',
        textClass: 'text-[#C6533A] font-bold'
      };
    case 'warning_3d':
      return {
        label: `Vence en ${days} día${days === 1 ? '' : 's'}`,
        badgeClass: 'bg-[#FCEBE5] text-[#C6533A] border border-[#FADBD0]',
        textClass: 'text-[#C6533A] font-medium'
      };
    case 'warning_7d':
      return {
        label: `Vence en ${days} días`,
        badgeClass: 'bg-[#FFF3D9] text-[#A66B16] border border-[#FBEAC4]',
        textClass: 'text-[#A66B16] font-medium'
      };
    case 'warning_30d':
      return {
        label: `Vence en ${days} días`,
        badgeClass: 'bg-[#E8F3E9] text-[#246B4D] border border-[#D5E8D7]',
        textClass: 'text-[#246B4D]'
      };
    case 'good':
      return {
        label: `En fecha (${days}d)`,
        badgeClass: 'bg-[#E8F3E9] text-[#246B4D] border border-[#D5E8D7]',
        textClass: 'text-[#246B4D]'
      };
  }
}

/**
 * Realistic Argentine grocery store sample dataset for DEMO MODE ONLY
 * Between 10 and 15 everyday staple products with varied expiration dates
 */
export function getInitialSeedData(): { products: Product[]; batches: Batch[] } {
  const now = new Date();
  
  const addDays = (d: number) => {
    const target = new Date(now);
    target.setDate(target.getDate() + d);
    return formatDate(target);
  };

  const products: Product[] = [
    {
      id: 'demo-prod-1',
      name: 'Yogur Firme La Serenísima Vainilla 120g',
      category: 'Lácteos y Quesos',
      unit: 'unidades',
      barcode: '7790010001234',
      costPrice: 650,
      salePrice: 1100,
      notes: 'Mantener refrigerado entre 2° y 8°C. En góndola lácteos.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-2',
      name: 'Queso Cremoso La Paulina Fraccionado',
      category: 'Lácteos y Quesos',
      unit: 'kg',
      barcode: '7790020005678',
      costPrice: 5200,
      salePrice: 8900,
      notes: 'Horma fraccionada en bandejas de 500g y 1kg.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-3',
      name: 'Jamón Cocido Feteado Bocatti 200g',
      category: 'Fiambrería y Embutidos',
      unit: 'paquetes',
      barcode: '7791234007890',
      costPrice: 1800,
      salePrice: 2950,
      notes: 'Bandeja termoformada con atmósfera protectora.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-4',
      name: 'Pan de Molde Bimbo Artesano 500g',
      category: 'Panadería y Facturas',
      unit: 'paquetes',
      barcode: '7790040003456',
      costPrice: 1900,
      salePrice: 3200,
      notes: 'Exhibir en cabecera de panificados.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-5',
      name: 'Leche Entera La Serenísima Sachet 1L',
      category: 'Lácteos y Quesos',
      unit: 'unidades',
      barcode: '7790030009988',
      costPrice: 850,
      salePrice: 1400,
      notes: 'Heladera vertical lácteos.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-6',
      name: 'Yogur Bebible Ilolay Frutilla 1L',
      category: 'Lácteos y Quesos',
      unit: 'unidades',
      barcode: '7790050004433',
      costPrice: 1100,
      salePrice: 1950,
      notes: 'Bebible familiar.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-7',
      name: 'Ravioles 4 Quesos La Salteña 500g',
      category: 'Pastas Frescas',
      unit: 'paquetes',
      barcode: '7790090005566',
      costPrice: 1600,
      salePrice: 2800,
      notes: 'Heladera de pastas frescas.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-8',
      name: 'Tapas de Empanadas Criollas La Salteña x12',
      category: 'Pastas Frescas',
      unit: 'paquetes',
      barcode: '7790100007788',
      costPrice: 900,
      salePrice: 1600,
      notes: 'Masa rotisera hojaldrada.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-9',
      name: 'Salchichas Vienissima Clásicas x 6',
      category: 'Fiambrería y Embutidos',
      unit: 'paquetes',
      barcode: '7790110006655',
      costPrice: 1250,
      salePrice: 2150,
      notes: 'Heladera fiambrería.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-10',
      name: 'Galletitas Chocolinas Bagley 250g',
      category: 'Galletitas y Snacks',
      unit: 'paquetes',
      barcode: '7790060009876',
      costPrice: 950,
      salePrice: 1650,
      notes: 'Ideal para chocotorta. Alta rotación fin de semana.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-11',
      name: 'Mayonesa Hellmann\'s Clásica Doypack 475g',
      category: 'Almacén y Secos',
      unit: 'unidades',
      barcode: '7790070001122',
      costPrice: 1200,
      salePrice: 2100,
      notes: 'Estantería aderezos pasillo 2.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-12',
      name: 'Cerveza Quilmes Clásica Retornable 1L',
      category: 'Bebidas y Jugos',
      unit: 'unidades',
      barcode: '7790080003344',
      costPrice: 1400,
      salePrice: 2400,
      notes: 'Cajón de 12 botellas en depósito.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'demo-prod-13',
      name: 'Alfajor Guaymallén Triple Chocolate 70g',
      category: 'Golosinas y Chocolates',
      unit: 'unidades',
      barcode: '7790120008899',
      costPrice: 380,
      salePrice: 700,
      notes: 'Exhibidor junto a la caja.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  ];

  const batches: Batch[] = [
    // 1. Yogur Firme - 2 lotes (uno urgente en 2 días, uno en 14 días)
    {
      id: 'demo-batch-1a',
      productId: 'demo-prod-1',
      lotNumber: 'L-882A',
      quantity: 14,
      expirationDate: addDays(2), // 2 días (urgente)
      costPrice: 650,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-batch-1b',
      productId: 'demo-prod-1',
      lotNumber: 'L-890B',
      quantity: 24,
      expirationDate: addDays(14), // 14 días
      costPrice: 650,
      createdAt: new Date().toISOString(),
    },
    // 2. Queso Cremoso - Vence HOY (crítico!)
    {
      id: 'demo-batch-2',
      productId: 'demo-prod-2',
      lotNumber: 'L-PAU-09',
      quantity: 8,
      expirationDate: addDays(0), // Vence HOY
      costPrice: 5200,
      createdAt: new Date().toISOString(),
    },
    // 3. Jamón Cocido - Venció ayer (-1 días, retirar)
    {
      id: 'demo-batch-3',
      productId: 'demo-prod-3',
      lotNumber: 'L-BOC-14',
      quantity: 5,
      expirationDate: addDays(-1), // Vencido ayer
      costPrice: 1800,
      createdAt: new Date().toISOString(),
    },
    // 4. Pan Bimbo - Vence en 4 días
    {
      id: 'demo-batch-4',
      productId: 'demo-prod-4',
      lotNumber: 'L-ART-04',
      quantity: 18,
      expirationDate: addDays(4), // 4 días
      costPrice: 1900,
      createdAt: new Date().toISOString(),
    },
    // 5. Leche Sachet - Vence MAÑANA (1 día) y otro lote en 8 días
    {
      id: 'demo-batch-5a',
      productId: 'demo-prod-5',
      lotNumber: 'L-LEC-01',
      quantity: 16,
      expirationDate: addDays(1), // Vence mañana (1 día)
      costPrice: 850,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'demo-batch-5b',
      productId: 'demo-prod-5',
      lotNumber: 'L-LEC-02',
      quantity: 30,
      expirationDate: addDays(8), // 8 días
      costPrice: 850,
      createdAt: new Date().toISOString(),
    },
    // 6. Yogur Bebible - Vence en 3 días
    {
      id: 'demo-batch-6',
      productId: 'demo-prod-6',
      lotNumber: 'L-ILO-11',
      quantity: 10,
      expirationDate: addDays(3), // 3 días
      costPrice: 1100,
      createdAt: new Date().toISOString(),
    },
    // 7. Ravioles 4 Quesos - Vence en 3 días
    {
      id: 'demo-batch-7',
      productId: 'demo-prod-7',
      lotNumber: 'L-SAL-33',
      quantity: 12,
      expirationDate: addDays(3), // 3 días
      costPrice: 1600,
      createdAt: new Date().toISOString(),
    },
    // 8. Tapas de Empanadas - Vence en 6 días
    {
      id: 'demo-batch-8',
      productId: 'demo-prod-8',
      lotNumber: 'L-TAP-22',
      quantity: 25,
      expirationDate: addDays(6), // 6 días
      costPrice: 900,
      createdAt: new Date().toISOString(),
    },
    // 9. Salchichas Vienissima - Vence en 5 días
    {
      id: 'demo-batch-9',
      productId: 'demo-prod-9',
      lotNumber: 'L-VIE-88',
      quantity: 15,
      expirationDate: addDays(5), // 5 días
      costPrice: 1250,
      createdAt: new Date().toISOString(),
    },
    // 10. Galletitas Chocolinas - Vence en 25 días
    {
      id: 'demo-batch-10',
      productId: 'demo-prod-10',
      lotNumber: 'L-CHO-99',
      quantity: 36,
      expirationDate: addDays(25), // 25 días
      costPrice: 950,
      createdAt: new Date().toISOString(),
    },
    // 11. Mayonesa - Vence en 45 días
    {
      id: 'demo-batch-11',
      productId: 'demo-prod-11',
      lotNumber: 'L-HEL-12',
      quantity: 20,
      expirationDate: addDays(45), // 45 días
      costPrice: 1200,
      createdAt: new Date().toISOString(),
    },
    // 12. Cerveza Quilmes - Vence en 90 días
    {
      id: 'demo-batch-12',
      productId: 'demo-prod-12',
      lotNumber: 'L-QUI-77',
      quantity: 48,
      expirationDate: addDays(90), // 90 días
      costPrice: 1400,
      createdAt: new Date().toISOString(),
    },
    // 13. Alfajor Guaymallén - Vence en 60 días
    {
      id: 'demo-batch-13',
      productId: 'demo-prod-13',
      lotNumber: 'L-GUAY-04',
      quantity: 60,
      expirationDate: addDays(60), // 60 días
      costPrice: 380,
      createdAt: new Date().toISOString(),
    }
  ];

  return { products, batches };
}

const DEMO_KEYS = {
  PRODUCTS: 'venceya_demo_products_v2',
  BATCHES: 'venceya_demo_batches_v2',
  SETTINGS: 'venceya_demo_settings_v2',
  ALERTS: 'venceya_demo_alerts_v2',
  SNAPSHOT: 'venceya_demo_snapshot_v2',
};

class StorageService {
  private isBrowser = typeof window !== 'undefined';
  private currentStoreId: string = 'default';
  private isDemoMode: boolean = false;

  constructor() {
    this.ensureInitialized();
  }

  /**
   * Set active store context (e.g. from userProfile.storeId or user.uid)
   */
  setStoreContext(storeId: string | null): void {
    const nextId = storeId || 'default';
    if (this.currentStoreId !== nextId) {
      this.currentStoreId = nextId;
      this.ensureInitialized();
    }
  }

  /**
   * Resolve active storage keys based on Demo mode or User storeId
   */
  private getKeys() {
    if (this.isDemoMode) {
      return {
        PRODUCTS: DEMO_KEYS.PRODUCTS,
        BATCHES: DEMO_KEYS.BATCHES,
        SETTINGS: DEMO_KEYS.SETTINGS,
        ALERTS: DEMO_KEYS.ALERTS,
      };
    }
    const prefix = `venceya_store_${this.currentStoreId}`;
    return {
      PRODUCTS: `${prefix}_products`,
      BATCHES: `${prefix}_batches`,
      SETTINGS: `${prefix}_settings`,
      ALERTS: `${prefix}_alerts`,
    };
  }

  /**
   * Initializes storage with an EMPTY inventory for real users.
   * NEVER loads dummy data into real accounts!
   */
  private ensureInitialized() {
    if (!this.isBrowser) return;

    const keys = this.getKeys();
    if (localStorage.getItem(keys.PRODUCTS) === null) {
      localStorage.setItem(keys.PRODUCTS, JSON.stringify([]));
    }
    if (localStorage.getItem(keys.BATCHES) === null) {
      localStorage.setItem(keys.BATCHES, JSON.stringify([]));
    }
    if (localStorage.getItem(keys.SETTINGS) === null) {
      localStorage.setItem(keys.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (localStorage.getItem(keys.ALERTS) === null) {
      localStorage.setItem(keys.ALERTS, JSON.stringify([]));
    }
  }

  // --- DEMO MODE CONTROLS ---

  isDemoActive(): boolean {
    return this.isDemoMode;
  }

  enableDemoMode(): void {
    if (!this.isBrowser) return;
    this.isDemoMode = true;

    // Load or initialize demo data
    const existing = localStorage.getItem(DEMO_KEYS.PRODUCTS);
    if (!existing || JSON.parse(existing).length === 0) {
      this.resetDemoData();
    } else {
      this.recalculateAlerts();
    }
  }

  disableDemoMode(): void {
    this.isDemoMode = false;
    this.recalculateAlerts();
  }

  resetDemoData(): void {
    if (!this.isBrowser) return;
    const seed = getInitialSeedData();
    const demoSettings: StoreSettings = {
      ...DEFAULT_SETTINGS,
      storeName: 'Almacén Don Pepe (Demo)',
      businessType: 'Almacén de Barrio',
    };

    localStorage.setItem(DEMO_KEYS.PRODUCTS, JSON.stringify(seed.products));
    localStorage.setItem(DEMO_KEYS.BATCHES, JSON.stringify(seed.batches));
    localStorage.setItem(DEMO_KEYS.SETTINGS, JSON.stringify(demoSettings));
    
    // Save snapshot to detect if user made demo modifications
    localStorage.setItem(DEMO_KEYS.SNAPSHOT, JSON.stringify({
      productCount: seed.products.length,
      batchCount: seed.batches.length,
    }));

    this.recalculateAlerts();
  }

  hasDemoChanges(): boolean {
    if (!this.isBrowser || !this.isDemoMode) return false;
    try {
      const snapStr = localStorage.getItem(DEMO_KEYS.SNAPSHOT);
      if (!snapStr) return false;
      const snap = JSON.parse(snapStr);
      const currentProds = this.getProducts().length;
      const currentBatches = this.getBatches().length;
      return currentProds !== snap.productCount || currentBatches !== snap.batchCount;
    } catch {
      return false;
    }
  }

  clearDemoData(): void {
    if (!this.isBrowser) return;
    localStorage.removeItem(DEMO_KEYS.PRODUCTS);
    localStorage.removeItem(DEMO_KEYS.BATCHES);
    localStorage.removeItem(DEMO_KEYS.SETTINGS);
    localStorage.removeItem(DEMO_KEYS.ALERTS);
    localStorage.removeItem(DEMO_KEYS.SNAPSHOT);
  }

  // --- PRODUCTS ---

  getProducts(): Product[] {
    if (!this.isBrowser) return [];
    try {
      const keys = this.getKeys();
      const data = localStorage.getItem(keys.PRODUCTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getProductById(id: string): Product | undefined {
    return this.getProducts().find(p => p.id === id);
  }

  findProductByBarcode(barcode: string): Product | undefined {
    if (!barcode) return undefined;
    const clean = barcode.trim();
    return this.getProducts().find(p => p.barcode && p.barcode.trim() === clean);
  }

  saveProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>, id?: string): Product {
    const products = this.getProducts();
    const now = new Date().toISOString();

    if (id) {
      const index = products.findIndex(p => p.id === id);
      if (index >= 0) {
        const updated: Product = {
          ...products[index],
          ...product,
          updatedAt: now,
        };
        products[index] = updated;
        const keys = this.getKeys();
        localStorage.setItem(keys.PRODUCTS, JSON.stringify(products));
        this.recalculateAlerts();
        return updated;
      }
    }

    const newProduct: Product = {
      ...product,
      id: (this.isDemoMode ? 'demo_prod_' : 'prod_') + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: now,
      updatedAt: now,
    };
    products.unshift(newProduct);
    const keys = this.getKeys();
    localStorage.setItem(keys.PRODUCTS, JSON.stringify(products));
    this.recalculateAlerts();
    return newProduct;
  }

  deleteProduct(id: string): boolean {
    const products = this.getProducts().filter(p => p.id !== id);
    const keys = this.getKeys();
    localStorage.setItem(keys.PRODUCTS, JSON.stringify(products));

    // Also remove all batches associated with this product
    const batches = this.getBatches().filter(b => b.productId !== id);
    localStorage.setItem(keys.BATCHES, JSON.stringify(batches));

    this.recalculateAlerts();
    return true;
  }

  // --- BATCHES ---

  getBatches(): Batch[] {
    if (!this.isBrowser) return [];
    try {
      const keys = this.getKeys();
      const data = localStorage.getItem(keys.BATCHES);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  getBatchesByProductId(productId: string): Batch[] {
    return this.getBatches()
      .filter(b => b.productId === productId)
      .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate)); // PEPS FIFO order
  }

  saveBatch(batch: Omit<Batch, 'id' | 'createdAt'>, id?: string): Batch {
    const batches = this.getBatches();
    const now = new Date().toISOString();

    if (id) {
      const index = batches.findIndex(b => b.id === id);
      if (index >= 0) {
        const updated: Batch = {
          ...batches[index],
          ...batch,
        };
        batches[index] = updated;
        const keys = this.getKeys();
        localStorage.setItem(keys.BATCHES, JSON.stringify(batches));
        this.recalculateAlerts();
        return updated;
      }
    }

    const newBatch: Batch = {
      ...batch,
      id: (this.isDemoMode ? 'demo_batch_' : 'batch_') + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: now,
    };
    batches.push(newBatch);
    const keys = this.getKeys();
    localStorage.setItem(keys.BATCHES, JSON.stringify(batches));
    this.recalculateAlerts();
    return newBatch;
  }

  deleteBatch(id: string): boolean {
    const batches = this.getBatches().filter(b => b.id !== id);
    const keys = this.getKeys();
    localStorage.setItem(keys.BATCHES, JSON.stringify(batches));
    this.recalculateAlerts();
    return true;
  }

  updateBatchQuantity(id: string, deltaQuantity: number): Batch | null {
    const batches = this.getBatches();
    const index = batches.findIndex(b => b.id === id);
    if (index === -1) return null;

    const current = batches[index];
    const newQty = Math.max(0, current.quantity + deltaQuantity);
    batches[index] = { ...current, quantity: newQty };
    const keys = this.getKeys();
    localStorage.setItem(keys.BATCHES, JSON.stringify(batches));
    this.recalculateAlerts();
    return batches[index];
  }

  // --- COMPOSITE VIEWS ---

  getProductsWithBatches(): ProductWithBatches[] {
    const products = this.getProducts();
    const batches = this.getBatches();

    return products.map(product => {
      const prodBatches = batches
        .filter(b => b.productId === product.id)
        .sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));

      const totalQuantity = prodBatches.reduce((sum, b) => sum + (Number(b.quantity) || 0), 0);
      const earliestBatch = prodBatches[0];
      const daysRemaining = earliestBatch ? calculateDaysRemaining(earliestBatch.expirationDate) : undefined;
      const status = daysRemaining !== undefined ? getExpirationStatus(daysRemaining) : undefined;

      return {
        ...product,
        batches: prodBatches,
        totalQuantity,
        earliestBatch,
        daysRemaining,
        status,
      };
    });
  }

  getAllBatchesWithProduct(): BatchWithProduct[] {
    const products = this.getProducts();
    const batches = this.getBatches();
    const productMap = new Map(products.map(p => [p.id, p]));

    const list: BatchWithProduct[] = [];

    for (const batch of batches) {
      const product = productMap.get(batch.productId);
      if (product) {
        const daysRemaining = calculateDaysRemaining(batch.expirationDate);
        const status = getExpirationStatus(daysRemaining);

        list.push({
          ...batch,
          product,
          daysRemaining,
          status,
        });
      }
    }

    return list.sort((a, b) => a.expirationDate.localeCompare(b.expirationDate));
  }

  // --- ALERTS ---

  getAlerts(): AppAlert[] {
    if (!this.isBrowser) return [];
    try {
      const keys = this.getKeys();
      const data = localStorage.getItem(keys.ALERTS);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  markAlertRead(id: string): void {
    const keys = this.getKeys();
    const alerts = this.getAlerts().map(a => a.id === id ? { ...a, isRead: true } : a);
    localStorage.setItem(keys.ALERTS, JSON.stringify(alerts));
  }

  markAllAlertsRead(): void {
    const keys = this.getKeys();
    const alerts = this.getAlerts().map(a => ({ ...a, isRead: true }));
    localStorage.setItem(keys.ALERTS, JSON.stringify(alerts));
  }

  dismissAlert(id: string): void {
    const keys = this.getKeys();
    const alerts = this.getAlerts().map(a => a.id === id ? { ...a, isDismissed: true } : a);
    localStorage.setItem(keys.ALERTS, JSON.stringify(alerts));
  }

  recalculateAlerts(): AppAlert[] {
    if (!this.isBrowser) return [];
    const settings = this.getSettings();
    const batchesWithProduct = this.getAllBatchesWithProduct();
    const existingAlerts = this.getAlerts();
    const existingMap = new Map(existingAlerts.map(a => [`${a.batchId}_${a.daysRemaining}`, a]));

    const newAlerts: AppAlert[] = [];

    for (const item of batchesWithProduct) {
      if (item.quantity <= 0) continue; // No stock left

      const days = item.daysRemaining;
      let shouldAlert = false;
      let urgency: AppAlert['urgency'] = 'info';
      let message = '';

      if (days < 0) {
        shouldAlert = true;
        urgency = 'critical';
        message = `¡Atención! Venció hace ${Math.abs(days)} día(s). Retirá las ${item.quantity} ${item.product.unit} de la venta.`;
      } else if (days === 0 && settings.alertThresholds.today) {
        shouldAlert = true;
        urgency = 'critical';
        message = `¡Vence HOY! Priorizá la venta inmediata o liquidación de ${item.quantity} ${item.product.unit}.`;
      } else if (days === 1 && settings.alertThresholds.days1) {
        shouldAlert = true;
        urgency = 'high';
        message = `Vence MAÑANA. Quedan ${item.quantity} ${item.product.unit}. Considerá descuento agresivo.`;
      } else if (days > 1 && days <= 3 && settings.alertThresholds.days3) {
        shouldAlert = true;
        urgency = 'high';
        message = `Vence en ${days} días. Quedan ${item.quantity} ${item.product.unit}. Aplicá promoción.`;
      } else if (days > 3 && days <= 7 && settings.alertThresholds.days7) {
        shouldAlert = true;
        urgency = 'medium';
        message = `Vence en ${days} días. Revisá rotación de ${item.quantity} ${item.product.unit} (Lote: ${item.lotNumber || 'S/N'}).`;
      } else if (days > 7 && days <= 30 && settings.alertThresholds.days30) {
        shouldAlert = true;
        urgency = 'info';
        message = `Vencimiento programado en ${days} días (${item.quantity} ${item.product.unit}).`;
      }

      if (shouldAlert) {
        const alertKey = `${item.id}_${days}`;
        const existing = existingMap.get(alertKey);

        newAlerts.push({
          id: existing?.id || 'alert_' + item.id + '_' + days,
          productId: item.productId,
          batchId: item.id,
          productName: item.product.name,
          expirationDate: item.expirationDate,
          daysRemaining: days,
          urgency,
          message,
          createdAt: existing?.createdAt || new Date().toISOString(),
          isRead: existing?.isRead || false,
          isDismissed: existing?.isDismissed || false,
        });
      }
    }

    const urgencyOrder = { critical: 0, high: 1, medium: 2, info: 3 };
    newAlerts.sort((a, b) => {
      const uDiff = urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
      if (uDiff !== 0) return uDiff;
      return a.daysRemaining - b.daysRemaining;
    });

    const keys = this.getKeys();
    localStorage.setItem(keys.ALERTS, JSON.stringify(newAlerts));
    return newAlerts;
  }

  // --- SUGGESTIONS ---

  getSalesSuggestions(): SalesSuggestion[] {
    const batches = this.getAllBatchesWithProduct();
    const suggestions: SalesSuggestion[] = [];

    for (const item of batches) {
      if (item.quantity <= 0) continue;

      const days = item.daysRemaining;
      const salePrice = item.product.salePrice;
      const costPrice = item.product.costPrice || item.costPrice;

      let discounts: SalesSuggestion['discounts'] = undefined;
      if (salePrice && salePrice > 0) {
        discounts = [10, 15, 20].map(pct => {
          const promoPrice = Math.round(salePrice * (1 - pct / 100));
          const savingsPerUnit = salePrice - promoPrice;
          const totalRecoverable = promoPrice * item.quantity;
          return {
            percentage: pct,
            promoPrice,
            savingsPerUnit,
            totalRecoverable,
          };
        });
      }

      if (days < 0) {
        suggestions.push({
          id: `sugg_exp_${item.id}`,
          productId: item.productId,
          batchId: item.id,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unit: item.product.unit,
          expirationDate: item.expirationDate,
          daysRemaining: days,
          type: 'withdraw_waste',
          title: 'Producto Vencido — Retirar de Góndola',
          description: `Venció hace ${Math.abs(days)} día(s). Por normativas sanitarias y de bromatología, debe retirarse de la venta.`,
          recommendation: `Retirá inmediatamente las ${item.quantity} ${item.product.unit} y registralas como merma o consultá con el proveedor si contempla cambio.`,
          salePrice,
          costPrice,
          discounts: undefined,
        });
      } else if (days === 0 || days === 1) {
        suggestions.push({
          id: `sugg_urg_${item.id}`,
          productId: item.productId,
          batchId: item.id,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unit: item.product.unit,
          expirationDate: item.expirationDate,
          daysRemaining: days,
          type: 'discount_urgent',
          title: days === 0 ? '¡Vence Hoy! Liquidación Relámpago' : 'Vence Mañana — Priorizá Venta Inmediata',
          description: `Tenés ${item.quantity} ${item.product.unit} en riesgo directo de merma. Vender al costo o con 20% OFF recupera capital antes de que venza.`,
          recommendation: `Colocá este lote en el canasto de ofertas junto a la caja registradora o compartí una promo rápida con tus clientes habituales por WhatsApp.`,
          salePrice,
          costPrice,
          discounts,
        });
      } else if (days <= 3) {
        suggestions.push({
          id: `sugg_3d_${item.id}`,
          productId: item.productId,
          batchId: item.id,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unit: item.product.unit,
          expirationDate: item.expirationDate,
          daysRemaining: days,
          type: 'discount_moderate',
          title: `Vence en ${days} días — Considerá Descuento del 15%`,
          description: `Tenés ${item.quantity} ${item.product.unit} próximas a vencer. Un descuento moderado acelerará la salida sin perder margen.`,
          recommendation: `Destacá el producto con cartel visible o combinalo con otros artículos afines de almacén.`,
          salePrice,
          costPrice,
          discounts,
        });
      } else if (days <= 7 && item.quantity >= 10) {
        suggestions.push({
          id: `sugg_pack_${item.id}`,
          productId: item.productId,
          batchId: item.id,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unit: item.product.unit,
          expirationDate: item.expirationDate,
          daysRemaining: days,
          type: 'pack_promo',
          title: `Alto Stock Próximo a Vencer (${item.quantity} ${item.product.unit})`,
          description: `Vence en ${days} días y tenés volumen alto disponible. Si mantenés el ritmo habitual podés llegar al vencimiento con excedente.`,
          recommendation: `Armá una promoción 2x1 o "Llevá 2 con 20% de descuento en la segunda unidad" para duplicar la rotación.`,
          salePrice,
          costPrice,
          discounts,
        });
      } else if (days <= 7) {
        suggestions.push({
          id: `sugg_peps_${item.id}`,
          productId: item.productId,
          batchId: item.id,
          productName: item.product.name,
          category: item.product.category,
          quantity: item.quantity,
          unit: item.product.unit,
          expirationDate: item.expirationDate,
          daysRemaining: days,
          type: 'prioritize_peps',
          title: 'Regla PEPS — Adelantar en góndola',
          description: `Vence en ${days} días. Ubicá este lote al frente y colocá los lotes más nuevos detrás.`,
          recommendation: `Asegurate de que los clientes tomen este lote primero al servirse de la góndola o heladera.`,
          salePrice,
          costPrice,
          discounts,
        });
      }
    }

    return suggestions;
  }

  // --- SETTINGS ---

  getSettings(): StoreSettings {
    if (!this.isBrowser) return DEFAULT_SETTINGS;
    try {
      const keys = this.getKeys();
      const data = localStorage.getItem(keys.SETTINGS);
      return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  saveSettings(settings: StoreSettings): StoreSettings {
    const keys = this.getKeys();
    localStorage.setItem(keys.SETTINGS, JSON.stringify(settings));
    this.recalculateAlerts();
    return settings;
  }

  // --- BACKUP & RESTORE ---

  exportDataJson(): string {
    const data = {
      version: 1,
      appName: 'VenceYa',
      isDemo: this.isDemoMode,
      exportedAt: new Date().toISOString(),
      storeSettings: this.getSettings(),
      products: this.getProducts(),
      batches: this.getBatches(),
    };
    return JSON.stringify(data, null, 2);
  }

  exportDataCsv(): string {
    const batches = this.getAllBatchesWithProduct();
    const headers = [
      'ID Producto',
      'Producto',
      'Categoría',
      'Código de Barras',
      'ID Lote',
      'Número de Lote',
      'Cantidad',
      'Unidad',
      'Fecha Vencimiento',
      'Días Restantes',
      'Estado',
      'Precio Costo',
      'Precio Venta',
    ];

    const rows = batches.map(b => [
      `"${b.product.id}"`,
      `"${b.product.name.replace(/"/g, '""')}"`,
      `"${b.product.category}"`,
      `"${b.product.barcode || ''}"`,
      `"${b.id}"`,
      `"${b.lotNumber || ''}"`,
      b.quantity,
      `"${b.product.unit}"`,
      `"${b.expirationDate}"`,
      b.daysRemaining,
      `"${b.status}"`,
      b.product.costPrice || '',
      b.product.salePrice || '',
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  importDataJson(jsonString: string): { success: boolean; message: string; count?: number } {
    try {
      const data = JSON.parse(jsonString);
      if (!Array.isArray(data.products) || !Array.isArray(data.batches)) {
        return { success: false, message: 'El archivo JSON no tiene el formato válido de VenceYa.' };
      }

      const keys = this.getKeys();
      localStorage.setItem(keys.PRODUCTS, JSON.stringify(data.products));
      localStorage.setItem(keys.BATCHES, JSON.stringify(data.batches));
      if (data.storeSettings) {
        localStorage.setItem(keys.SETTINGS, JSON.stringify(data.storeSettings));
      }
      this.recalculateAlerts();

      return {
        success: true,
        message: `Se importaron ${data.products.length} productos y ${data.batches.length} lotes correctamente.`,
        count: data.products.length,
      };
    } catch {
      return { success: false, message: 'Error al procesar el archivo JSON.' };
    }
  }

  clearAllData(): void {
    const keys = this.getKeys();
    localStorage.setItem(keys.PRODUCTS, JSON.stringify([]));
    localStorage.setItem(keys.BATCHES, JSON.stringify([]));
    localStorage.setItem(keys.ALERTS, JSON.stringify([]));
  }

  setCloudData(products: Product[], batches: Batch[], settings?: StoreSettings): void {
    if (!this.isBrowser || this.isDemoMode) return;
    const keys = this.getKeys();
    localStorage.setItem(keys.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(keys.BATCHES, JSON.stringify(batches));
    if (settings) {
      localStorage.setItem(keys.SETTINGS, JSON.stringify(settings));
    }
    this.recalculateAlerts();
  }
}

export const storageService = new StorageService();
