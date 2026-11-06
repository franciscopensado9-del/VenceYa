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

export type RecommendationStatus = 
  | 'pending'           // Pendiente
  | 'in_review'         // En revisión
  | 'reviewed'          // Revisado
  | 'promotion_created' // Promoción creada
  | 'resolved'          // Resuelto
  | 'dismissed';        // Descartado

export type ResolutionOptionType = 
  | 'sold'              // Vendido: Se vendió antes de vencer
  | 'discarded'         // Descartado: Se retiró del stock
  | 'discount_applied'  // Descuento aplicado: Le aplicaste una promo
  | 'other'             // Otro: Otra solución
  | 'verified_ok';      // Verificado en góndola

export type StockMovementType = 'sale' | 'discard' | 'adjustment' | 'other';

export interface StockMovement {
  id: string;
  storeId: string;
  userId?: string;
  productId: string;
  productName: string;
  batchId?: string;
  batchExpirationDate?: string;
  type: StockMovementType;
  quantity: number;
  previousQuantity?: number;
  newQuantity?: number;
  unit?: string;
  reason?: string;
  notes?: string;
  alertId?: string;
  recommendationId?: string;
  promotionId?: string;
  createdAt: string; // ISO 8601
}

export interface ProductReviewRecord {
  id: string;
  storeId?: string;
  userId?: string;
  productId: string;
  batchId?: string;
  reviewedAt: string;
  status: RecommendationStatus;
  resolution?: ResolutionOptionType | string;
  resolutionType?: ResolutionOptionType;
  quantityResolved?: number;
  notes?: string;
  promotionId?: string;
  batchExpirationDate?: string;
  batchQuantityAtReview?: number;
  stockMovementId?: string;
}

export interface Batch {
  id: string;
  productId: string;
  lotNumber?: string;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD
  costPrice?: number;
  createdAt: string;
  lastReviewedAt?: string;
  lastReviewedStatus?: RecommendationStatus;
}

export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  unit: ProductUnit;
  barcode?: string;
  brand?: string;
  imageUrl?: string;
  costPrice?: number;
  salePrice?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastReviewedAt?: string;
  lastReviewedStatus?: RecommendationStatus;
  lastReviewedNotes?: string;
  lastReviewedBatchId?: string;
  lastReviewedExpirationDate?: string;
  lastReviewedQuantity?: number;
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
  city?: string;
  address?: string;
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

export type PromotionType = 
  | 'discount'                 // Direct discount percentage (10, 15, 20, 25, 30, 40, 50, custom 1-90%)
  | '2x1'                      // 2x1 (Pay 1 get 2)
  | '3x2'                      // 3x2 (Pay 2 get 3)
  | 'second_unit_discount'     // 2nd unit with discount (e.g., 50% or 70% off)
  | 'special_price'            // Direct custom unit promotional price
  | 'combo'                    // Combined bundle with other inventory items
  | 'bulk_discount';           // Tier quantity discount (take 3+, pay $X each)

export type PromotionStatus = 'active' | 'draft' | 'ended';

export interface PromotionComboItem {
  productId: string;
  productName: string;
  quantity: number;
  regularPrice: number;
  unit: string;
}

export interface Promotion {
  id: string;
  storeId?: string;
  title: string;
  type: PromotionType;
  status: PromotionStatus;

  // Primary product & batch
  productId: string;
  productName: string;
  productCategory?: string;
  productBarcode?: string;
  productImageUrl?: string;
  unit: string;
  batchId?: string;
  batchExpirationDate?: string;
  batchDaysRemaining?: number;
  availableStock?: number;

  // Financial calculations
  regularPrice: number;
  costPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  promoPrice: number; // Unit promo price, or total bundle price if combo
  secondUnitDiscountPercentage?: number;
  bulkMinQuantity?: number;
  bulkPricePerUnit?: number;
  comboItems?: PromotionComboItem[];

  // Urgency & Smart Engine calculations
  urgencyLevel?: 'critical' | 'high' | 'medium' | 'normal';
  profitMarginPercent?: number;
  isBelowCost?: boolean;
  totalRecoverableRevenue?: number;

  // Commercial copy & metadata
  message: string;
  storeName: string;
  validUntilText?: string;
  notes?: string;

  createdAt: string;
  updatedAt: string;
}

export interface SmartPromotionOpportunity {
  productId: string;
  productName: string;
  category: string;
  unit: string;
  imageUrl?: string;
  batchId: string;
  expirationDate: string;
  daysRemaining: number;
  quantity: number;
  regularPrice: number;
  costPrice?: number;
  suggestedType: PromotionType;
  suggestedDiscountPercent: number;
  suggestedPromoPrice: number;
  estimatedSaving: number;
  profitMarginPercent?: number;
  reason: string;
  urgency: 'critical' | 'high' | 'medium';
}

export type ActiveTab = 'dashboard' | 'products' | 'expirations' | 'alerts' | 'suggestions' | 'results' | 'settings';

