export type ProductUnit = 'unidades' | 'kg' | 'g' | 'litros' | 'ml' | 'paquetes' | 'cajas' | 'latas';

export type ProductCategory = 
  | 'Lácteos y Quesos'
  | 'Fiambrería y Embutidos'
  | 'Panadería y Facturas'
  | 'Galletitas y Snacks'
  | 'Bebidas y Jugos'
  | 'Almacén y Secos'
  | 'Pastas Frescas'
  | 'Golosinas y Chocolates'
  | 'Carnicería y Pollería'
  | 'Frutas y Verduras'
  | 'Limpieza y Perfumería'
  | 'Otros';

export type ExpirationStatus = 
  | 'expired'      // < 0 days (Vencido)
  | 'today'        // 0 days (Vence hoy)
  | 'warning_3d'   // 1 to 3 days (Urgente)
  | 'warning_7d'   // 4 to 7 days (Próximo)
  | 'warning_30d'  // 8 to 30 days (Atención)
  | 'good';        // > 30 days (En fecha)

export interface Batch {
  id: string;
  productId: string;
  lotNumber?: string;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD
  costPrice?: number;
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  barcode?: string;
  costPrice?: number;
  salePrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BatchWithProduct extends Batch {
  product: Product;
  daysRemaining: number;
  status: ExpirationStatus;
}

export interface ProductWithBatches extends Product {
  batches: Batch[];
  totalQuantity: number;
  earliestBatch?: Batch;
  daysRemaining?: number;
  status?: ExpirationStatus;
}

export interface StoreSettings {
  storeName: string;
  businessType: string;
  currencySymbol: string;
  alertThresholds: {
    today: boolean;
    days1: boolean;
    days3: boolean;
    days7: boolean;
    days30: boolean;
  };
  soundAlerts: boolean;
}

export interface AppAlert {
  id: string;
  productId: string;
  batchId: string;
  productName: string;
  expirationDate: string;
  daysRemaining: number;
  urgency: 'critical' | 'high' | 'medium' | 'info';
  message: string;
  createdAt: string;
  isRead: boolean;
  isDismissed: boolean;
}

export interface SalesSuggestion {
  id: string;
  productId: string;
  batchId: string;
  productName: string;
  category: string;
  quantity: number;
  unit: string;
  expirationDate: string;
  daysRemaining: number;
  type: 'withdraw_waste' | 'discount_urgent' | 'discount_moderate' | 'pack_promo' | 'prioritize_peps';
  title: string;
  description: string;
  recommendation: string;
  salePrice?: number;
  costPrice?: number;
  discounts?: {
    percentage: number;
    promoPrice: number;
    savingsPerUnit: number;
    totalRecoverable: number;
  }[];
}

export type ActiveTab = 'dashboard' | 'products' | 'expirations' | 'alerts' | 'suggestions' | 'results' | 'settings';
