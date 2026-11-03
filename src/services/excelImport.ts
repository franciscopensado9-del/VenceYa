import * as XLSX from 'xlsx';
import { Product, Batch, ProductCategory, ProductUnit } from '../types';
import { formatDate } from './storage';

export type StandardField = 
  | 'product_name'
  | 'brand'
  | 'barcode'
  | 'category'
  | 'quantity'
  | 'expiration_date'
  | 'lot_number'
  | 'cost_price'
  | 'sale_price'
  | 'notes'
  | 'unit';

export interface FieldDefinition {
  id: StandardField;
  label: string;
  required: boolean;
  description: string;
}

export const STANDARD_FIELDS: FieldDefinition[] = [
  { id: 'product_name', label: 'Nombre del Producto', required: true, description: 'Descripción o nombre comercial' },
  { id: 'quantity', label: 'Cantidad / Stock', required: true, description: 'Unidades o cantidad disponible del lote' },
  { id: 'expiration_date', label: 'Fecha de Vencimiento', required: true, description: 'Formato DD/MM/AAAA o AAAA-MM-DD' },
  { id: 'brand', label: 'Marca', required: false, description: 'Marca o fabricante' },
  { id: 'barcode', label: 'Código de Barras', required: false, description: 'Código EAN-13, UPC o identificador' },
  { id: 'category', label: 'Categoría', required: false, description: 'Rubro del comercio (Lácteos, Almacén, etc.)' },
  { id: 'unit', label: 'Unidad de Medida', required: false, description: 'unidades, kg, litros, paquetes, etc.' },
  { id: 'lot_number', label: 'Número de Lote', required: false, description: 'Código de lote o partida del fabricante' },
  { id: 'cost_price', label: 'Precio de Costo', required: false, description: 'Valor de costo o compra' },
  { id: 'sale_price', label: 'Precio de Venta', required: false, description: 'Precio al público regular' },
  { id: 'notes', label: 'Observaciones / Ubicación', required: false, description: 'Góndola, depósito o notas' },
];

/**
 * Normalized dictionary of common Argentine & Spanish Excel column names
 */
const COLUMN_SYNONYMS: Record<string, StandardField> = {
  // Product Name
  'producto': 'product_name',
  'artículo': 'product_name',
  'articulo': 'product_name',
  'articulos': 'product_name',
  'descripción': 'product_name',
  'descripcion': 'product_name',
  'nombre': 'product_name',
  'nombre del producto': 'product_name',
  'nombre producto': 'product_name',
  'detalle': 'product_name',
  'item': 'product_name',
  'items': 'product_name',
  'mercadería': 'product_name',
  'mercaderia': 'product_name',
  'product': 'product_name',
  'description': 'product_name',

  // Brand
  'marca': 'brand',
  'fabricante': 'brand',
  'laboratorio': 'brand',
  'brand': 'brand',

  // Barcode
  'código de barras': 'barcode',
  'codigo de barras': 'barcode',
  'código': 'barcode',
  'codigo': 'barcode',
  'cod de barra': 'barcode',
  'cod barra': 'barcode',
  'cod. barra': 'barcode',
  'cod. barras': 'barcode',
  'barcode': 'barcode',
  'ean': 'barcode',
  'ean13': 'barcode',
  'ean-13': 'barcode',
  'ean 13': 'barcode',
  'upc': 'barcode',
  'gtin': 'barcode',

  // Category
  'categoría': 'category',
  'categoria': 'category',
  'rubro': 'category',
  'familia': 'category',
  'sección': 'category',
  'seccion': 'category',
  'tipo': 'category',
  'departamento': 'category',
  'category': 'category',

  // Quantity
  'cantidad': 'quantity',
  'stock': 'quantity',
  'unidades': 'quantity',
  'cant': 'quantity',
  'cant.': 'quantity',
  'existencias': 'quantity',
  'saldo': 'quantity',
  'unid': 'quantity',
  'qty': 'quantity',
  'quantity': 'quantity',

  // Expiration Date
  'fecha de vencimiento': 'expiration_date',
  'fecha vencimiento': 'expiration_date',
  'vencimiento': 'expiration_date',
  'vto': 'expiration_date',
  'vto.': 'expiration_date',
  'f. vto': 'expiration_date',
  'f.vto': 'expiration_date',
  'f vto': 'expiration_date',
  'fecha vto': 'expiration_date',
  'fecha de caducidad': 'expiration_date',
  'caducidad': 'expiration_date',
  'expiración': 'expiration_date',
  'expiracion': 'expiration_date',
  'fecha de expiración': 'expiration_date',
  'expiration': 'expiration_date',
  'expiry': 'expiration_date',
  'exp date': 'expiration_date',
  'f. vencimiento': 'expiration_date',

  // Lot Number
  'lote': 'lot_number',
  'nro lote': 'lot_number',
  'n° lote': 'lot_number',
  'nº lote': 'lot_number',
  'numero lote': 'lot_number',
  'número de lote': 'lot_number',
  'nro. lote': 'lot_number',
  'batch': 'lot_number',
  'partida': 'lot_number',
  'lot': 'lot_number',

  // Cost Price
  'costo': 'cost_price',
  'precio costo': 'cost_price',
  'precio de costo': 'cost_price',
  'precio compra': 'cost_price',
  'p. costo': 'cost_price',
  'p.costo': 'cost_price',
  'pcosto': 'cost_price',
  'cost': 'cost_price',
  'cost price': 'cost_price',

  // Sale Price
  'venta': 'sale_price',
  'precio venta': 'sale_price',
  'precio de venta': 'sale_price',
  'precio': 'sale_price',
  'p. venta': 'sale_price',
  'p.venta': 'sale_price',
  'pventa': 'sale_price',
  'precio final': 'sale_price',
  'pvp': 'sale_price',
  'price': 'sale_price',
  'sale price': 'sale_price',

  // Notes / Location
  'observaciones': 'notes',
  'observación': 'notes',
  'observacion': 'notes',
  'ubicación': 'notes',
  'ubicacion': 'notes',
  'notas': 'notes',
  'comentarios': 'notes',
  'notes': 'notes',

  // Unit
  'unidad': 'unit',
  'unidad de medida': 'unit',
  'medida': 'unit',
  'u.m.': 'unit',
  'unit': 'unit',
};

export interface RawParsedSheet {
  headers: string[];
  rows: Record<string, any>[];
  totalRows: number;
}

export interface ColumnMappingState {
  [excelHeader: string]: StandardField | 'ignore';
}

export interface ParsedRowResult {
  rowNumber: number;
  originalRow: Record<string, any>;
  productName: string;
  brand?: string;
  barcode?: string;
  category: ProductCategory;
  unit: ProductUnit;
  quantity: number;
  expirationDate: string; // YYYY-MM-DD
  lotNumber?: string;
  costPrice?: number;
  salePrice?: number;
  notes?: string;
  
  // Validation status
  status: 'valid' | 'incomplete' | 'invalid_date' | 'invalid_quantity';
  errors: string[];
  warnings: string[];
  isExcluded: boolean;
  
  // Existing product match
  matchedExistingProductId?: string;
  matchedExistingProductName?: string;
}

export interface ConsolidationResult {
  totalRowsProcessed: number;
  validRowsCount: number;
  errorRowsCount: number;
  uniqueProductsCount: number;
  totalBatchesCount: number;
  productsToSave: Product[];
  batchesToSave: Batch[];
  previewRows: ParsedRowResult[];
}

/**
 * Normalizes text for header matching
 */
export function normalizeHeader(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents for comparison
    .replace(/[_\-]/g, ' ')
    .replace(/\s+/g, ' ');
}

/**
 * Detects standard field for an Excel header
 */
export function autoDetectField(header: string): StandardField | 'ignore' {
  const norm = normalizeHeader(header);
  
  // Direct match
  if (COLUMN_SYNONYMS[norm]) {
    return COLUMN_SYNONYMS[norm];
  }

  // Substring match
  for (const [synonym, field] of Object.entries(COLUMN_SYNONYMS)) {
    const normSynonym = normalizeHeader(synonym);
    if (norm === normSynonym || norm.startsWith(normSynonym) || norm.includes(normSynonym)) {
      return field;
    }
  }

  return 'ignore';
}

/**
 * Parses diverse date formats into canonical YYYY-MM-DD
 * Supports:
 * - Date object from XLSX
 * - Excel serial numbers (e.g., 45598)
 * - DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY
 * - YYYY-MM-DD, YYYY/MM/DD
 */
export function parseExcelDate(raw: any): { dateStr: string; isValid: boolean; error?: string } {
  if (raw === null || raw === undefined || raw === '') {
    return { dateStr: '', isValid: false, error: 'Fecha vacía' };
  }

  // 1. Date object
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return { dateStr: formatDate(raw), isValid: true };
  }

  // 2. Numeric Excel serial date (days since 1899-12-30)
  if (typeof raw === 'number' && raw > 1000 && raw < 100000) {
    const excelEpoch = new Date(1899, 11, 30);
    const dateObj = new Date(excelEpoch.getTime() + raw * 86400000);
    if (!isNaN(dateObj.getTime())) {
      return { dateStr: formatDate(dateObj), isValid: true };
    }
  }

  // 3. String representation
  const str = raw.toString().trim();

  // Try extracting just date part if it has timestamp (e.g. "2026-11-20 00:00:00" or "20/11/2026T00:00")
  const datePart = str.split(/[T\s]/)[0];

  // Try DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = datePart.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})$/);
  if (dmyMatch) {
    let day = parseInt(dmyMatch[1], 10);
    let month = parseInt(dmyMatch[2], 10);
    let year = parseInt(dmyMatch[3], 10);

    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const padM = String(month).padStart(2, '0');
      const padD = String(day).padStart(2, '0');
      return { dateStr: `${year}-${padM}-${padD}`, isValid: true };
    }
  }

  // Try YYYY-MM-DD or YYYY/MM/DD
  const ymdMatch = datePart.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (ymdMatch) {
    const year = parseInt(ymdMatch[1], 10);
    const month = parseInt(ymdMatch[2], 10);
    const day = parseInt(ymdMatch[3], 10);

    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const padM = String(month).padStart(2, '0');
      const padD = String(day).padStart(2, '0');
      return { dateStr: `${year}-${padM}-${padD}`, isValid: true };
    }
  }

  // Attempt JS standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 2000 && parsed.getFullYear() < 2100) {
    return { dateStr: formatDate(parsed), isValid: true };
  }

  return { dateStr: '', isValid: false, error: `Formato de fecha irreconocible: "${str}". Use DD/MM/AAAA.` };
}

/**
 * Parses numeric currency or quantity value
 */
export function parseExcelNumber(val: any): number | undefined {
  if (val === null || val === undefined || val === '') return undefined;
  if (typeof val === 'number') {
    return isNaN(val) ? undefined : val;
  }
  const clean = val
    .toString()
    .replace(/[$€\s]/g, '')
    .trim();

  // If format is 1.250,50 (Argentine)
  if (clean.includes(',') && clean.includes('.')) {
    const normalized = clean.replace(/\./g, '').replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? undefined : n;
  }

  // If format is 1250,50
  if (clean.includes(',')) {
    const normalized = clean.replace(',', '.');
    const n = parseFloat(normalized);
    return isNaN(n) ? undefined : n;
  }

  const n = parseFloat(clean);
  return isNaN(n) ? undefined : n;
}

/**
 * Normalizes text to closest ProductCategory
 */
export function normalizeCategory(raw: any): ProductCategory {
  if (!raw) return 'Almacén y Secos';
  const str = raw.toString().toLowerCase().trim();

  if (str.includes('lact') || str.includes('queso') || str.includes('yogur') || str.includes('leche') || str.includes('crema') || str.includes('manteca')) {
    return 'Lácteos y Quesos';
  }
  if (str.includes('fiambr') || str.includes('embutid') || str.includes('jamon') || str.includes('salame') || str.includes('paleta')) {
    return 'Fiambrería y Embutidos';
  }
  if (str.includes('pan') || str.includes('factur') || str.includes('bizcoch') || str.includes('torta') || str.includes('medialun')) {
    return 'Panadería y Facturas';
  }
  if (str.includes('gallet') || str.includes('snack') || str.includes('papas') || str.includes('chito') || str.includes('mani')) {
    return 'Galletitas y Snacks';
  }
  if (str.includes('bebid') || str.includes('jugo') || str.includes('gaseosa') || str.includes('agua') || str.includes('cerveza') || str.includes('vino')) {
    return 'Bebidas y Jugos';
  }
  if (str.includes('pasta') || str.includes('fideo fresco') || str.includes('raviol') || str.includes('ñoqui')) {
    return 'Pastas Frescas';
  }
  if (str.includes('golosina') || str.includes('chocolat') || str.includes('caramelo') || str.includes('alfajor') || str.includes('chicle')) {
    return 'Golosinas y Chocolates';
  }
  if (str.includes('carn') || str.includes('pollo') || str.includes('asado') || str.includes('milanesa') || str.includes('vaca')) {
    return 'Carnicería y Pollería';
  }
  if (str.includes('fruta') || str.includes('verdur') || str.includes('hortaliz')) {
    return 'Frutas y Verduras';
  }
  if (str.includes('limpieza') || str.includes('perfum') || str.includes('jabon') || str.includes('shampoo') || str.includes('lavandina')) {
    return 'Limpieza y Perfumería';
  }
  if (str.includes('almacen') || str.includes('seco') || str.includes('arroz') || str.includes('harina') || str.includes('aceite') || str.includes('fideo')) {
    return 'Almacén y Secos';
  }

  return 'Otros';
}

/**
 * Normalizes text to ProductUnit
 */
export function normalizeUnit(raw: any): ProductUnit {
  if (!raw) return 'unidades';
  const str = raw.toString().toLowerCase().trim();

  if (str.startsWith('kg') || str.includes('kilo')) return 'kg';
  if (str === 'g' || str.includes('gramo')) return 'g';
  if (str.startsWith('l') || str.includes('litro')) return 'litros';
  if (str.includes('ml') || str.includes('cc')) return 'ml';
  if (str.includes('paq') || str.includes('pack')) return 'paquetes';
  if (str.includes('caj')) return 'cajas';
  if (str.includes('lata')) return 'latas';
  return 'unidades';
}

/**
 * Reads file buffer securely and returns headers and rows
 */
export async function readExcelFile(file: File): Promise<RawParsedSheet> {
  // Validate size (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('El archivo supera el tamaño máximo permitido de 10 MB.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!['xlsx', 'xls', 'csv'].includes(extension || '')) {
    throw new Error('Formato no compatible. Por favor subí un archivo en formato .xlsx, .xls o .csv.');
  }

  const arrayBuffer = await file.arrayBuffer();

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(arrayBuffer, {
      type: 'array',
      cellDates: true,
      raw: false,
    });
  } catch (err) {
    throw new Error('No se pudo leer el archivo. Verificá que no esté protegido con contraseña o dañado.');
  }

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas de cálculo con datos.');
  }

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) {
    throw new Error('La primera hoja del archivo está vacía.');
  }

  // Convert to JSON with raw header row
  const rawJson: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawJson || rawJson.length < 2) {
    throw new Error('El archivo debe contener al menos una fila de encabezados y una fila de productos.');
  }

  // Find header row (first row with at least 2 non-empty string cells)
  let headerRowIndex = -1;
  for (let i = 0; i < Math.min(rawJson.length, 10); i++) {
    const row = rawJson[i];
    const stringCells = row.filter(c => typeof c === 'string' && c.trim().length > 0);
    if (stringCells.length >= 2) {
      headerRowIndex = i;
      break;
    }
  }

  if (headerRowIndex === -1) {
    throw new Error('No se detectaron columnas con encabezados claros en el archivo.');
  }

  const rawHeaders = rawJson[headerRowIndex].map(h => (h !== undefined && h !== null ? String(h).trim() : ''));
  const validHeaders = rawHeaders.filter(h => h.length > 0);

  if (validHeaders.length === 0) {
    throw new Error('No se encontraron encabezados válidos en la hoja.');
  }

  // Parse remaining rows into records
  const rows: Record<string, any>[] = [];
  for (let i = headerRowIndex + 1; i < rawJson.length; i++) {
    const row = rawJson[i];
    // Check if row is completely empty
    const hasData = row.some(cell => cell !== null && cell !== undefined && String(cell).trim() !== '');
    if (!hasData) continue;

    const rowObj: Record<string, any> = {};
    rawHeaders.forEach((header, colIdx) => {
      if (header) {
        rowObj[header] = row[colIdx] !== undefined ? row[colIdx] : '';
      }
    });
    rows.push(rowObj);
  }

  if (rows.length === 0) {
    throw new Error('No se encontraron filas con productos para importar en el archivo.');
  }

  return {
    headers: validHeaders,
    rows,
    totalRows: rows.length,
  };
}

/**
 * Consolidates parsed Excel rows into Products and Batches.
 * CRUCIAL REQUIREMENT #5:
 * If a product appears multiple times with different expiration dates or batches,
 * they are grouped under ONE product with multiple distinct batches.
 * Expiration dates and quantities are NEVER merged or summed into a single date!
 */
export function processAndConsolidateRows(
  rows: Record<string, any>[],
  columnMapping: ColumnMappingState,
  existingProducts: Product[]
): ConsolidationResult {
  const previewRows: ParsedRowResult[] = [];

  // Inverted mapping: standardField -> excelHeader
  const fieldToHeader: Partial<Record<StandardField, string>> = {};
  for (const [header, field] of Object.entries(columnMapping)) {
    if (field !== 'ignore') {
      fieldToHeader[field] = header;
    }
  }

  // 1. Process each row into a structured record
  rows.forEach((row, idx) => {
    const rowNumber = idx + 2; // human row number (accounting for 1-based header)
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract values according to mapped columns
    const rawName = fieldToHeader.product_name ? row[fieldToHeader.product_name] : '';
    const rawQty = fieldToHeader.quantity ? row[fieldToHeader.quantity] : '';
    const rawExp = fieldToHeader.expiration_date ? row[fieldToHeader.expiration_date] : '';
    const rawBrand = fieldToHeader.brand ? row[fieldToHeader.brand] : '';
    const rawBarcode = fieldToHeader.barcode ? row[fieldToHeader.barcode] : '';
    const rawCat = fieldToHeader.category ? row[fieldToHeader.category] : '';
    const rawUnit = fieldToHeader.unit ? row[fieldToHeader.unit] : '';
    const rawLot = fieldToHeader.lot_number ? row[fieldToHeader.lot_number] : '';
    const rawCost = fieldToHeader.cost_price ? row[fieldToHeader.cost_price] : '';
    const rawSale = fieldToHeader.sale_price ? row[fieldToHeader.sale_price] : '';
    const rawNotes = fieldToHeader.notes ? row[fieldToHeader.notes] : '';

    const productName = rawName ? rawName.toString().trim() : '';
    if (!productName) {
      errors.push('Falta el nombre del producto (obligatorio)');
    }

    const quantityNum = parseExcelNumber(rawQty);
    if (quantityNum === undefined || isNaN(quantityNum)) {
      errors.push('Cantidad inválida o vacía (obligatorio)');
    } else if (quantityNum <= 0) {
      errors.push('La cantidad debe ser mayor a 0');
    }

    const dateResult = parseExcelDate(rawExp);
    if (!dateResult.isValid) {
      errors.push(dateResult.error || 'Fecha de vencimiento inválida');
    }

    const costPrice = parseExcelNumber(rawCost);
    const salePrice = parseExcelNumber(rawSale);
    if (costPrice !== undefined && costPrice < 0) {
      errors.push('El precio de costo no puede ser negativo');
    }
    if (salePrice !== undefined && salePrice < 0) {
      errors.push('El precio de venta no puede ser negativo');
    }

    // Clean barcode
    const barcode = rawBarcode ? rawBarcode.toString().replace(/[^a-zA-Z0-9]/g, '').trim() : undefined;
    const brand = rawBrand ? rawBrand.toString().trim() : undefined;
    const lotNumber = rawLot ? rawLot.toString().trim() : undefined;
    const notes = rawNotes ? rawNotes.toString().trim() : undefined;
    const category = normalizeCategory(rawCat);
    const unit = normalizeUnit(rawUnit);

    // Check if matches existing inventory product
    let matchedExistingProductId: string | undefined = undefined;
    let matchedExistingProductName: string | undefined = undefined;

    if (barcode) {
      const match = existingProducts.find(p => p.barcode && p.barcode.trim() === barcode);
      if (match) {
        matchedExistingProductId = match.id;
        matchedExistingProductName = match.name;
        warnings.push(`Se asociará al producto existente "${match.name}" (por código de barras)`);
      }
    }

    if (!matchedExistingProductId && productName) {
      const normInput = productName.toLowerCase();
      const match = existingProducts.find(p => p.name.trim().toLowerCase() === normInput);
      if (match) {
        matchedExistingProductId = match.id;
        matchedExistingProductName = match.name;
        warnings.push(`Coincide con producto existente "${match.name}". Se creará un nuevo lote vinculado.`);
      }
    }

    let status: ParsedRowResult['status'] = 'valid';
    if (errors.length > 0) {
      if (errors.some(e => e.includes('Fecha'))) {
        status = 'invalid_date';
      } else if (errors.some(e => e.includes('Cantidad') || e.includes('cantidad'))) {
        status = 'invalid_quantity';
      } else {
        status = 'incomplete';
      }
    }

    previewRows.push({
      rowNumber,
      originalRow: row,
      productName,
      brand,
      barcode,
      category,
      unit,
      quantity: quantityNum && quantityNum > 0 ? quantityNum : 0,
      expirationDate: dateResult.dateStr,
      lotNumber,
      costPrice,
      salePrice,
      notes,
      status,
      errors,
      warnings,
      isExcluded: status !== 'valid', // Exclude invalid rows by default until corrected
      matchedExistingProductId,
      matchedExistingProductName,
    });
  });

  // 2. Consolidate into Products and Batches
  // Filter only rows that are NOT excluded and are valid
  const validRows = previewRows.filter(r => !r.isExcluded && r.status === 'valid');

  // Group by Product Key:
  // - If barcode exists: `barcode:${barcode}`
  // - Else: `name:${name.toLowerCase()}__brand:${brand?.toLowerCase() || ''}`
  const productGroupMap = new Map<string, { product: Product; batches: Batch[] }>();

  validRows.forEach((r, idx) => {
    let groupKey: string;
    if (r.matchedExistingProductId) {
      groupKey = `existing:${r.matchedExistingProductId}`;
    } else if (r.barcode) {
      groupKey = `barcode:${r.barcode.toLowerCase()}`;
    } else {
      groupKey = `name:${r.productName.toLowerCase()}__brand:${(r.brand || '').toLowerCase()}`;
    }

    let group = productGroupMap.get(groupKey);

    if (!group) {
      const existing = r.matchedExistingProductId 
        ? existingProducts.find(p => p.id === r.matchedExistingProductId)
        : undefined;

      const productId = existing ? existing.id : `prod_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();

      const product: Product = existing ? {
        ...existing,
        salePrice: r.salePrice !== undefined ? r.salePrice : existing.salePrice,
        costPrice: r.costPrice !== undefined ? r.costPrice : existing.costPrice,
        updatedAt: now,
      } : {
        id: productId,
        name: r.productName,
        brand: r.brand,
        barcode: r.barcode,
        category: r.category,
        unit: r.unit,
        costPrice: r.costPrice,
        salePrice: r.salePrice,
        notes: r.notes,
        createdAt: now,
        updatedAt: now,
      };

      group = { product, batches: [] };
      productGroupMap.set(groupKey, group);
    } else {
      // Update existing group with missing attributes if this row has them
      if (!group.product.barcode && r.barcode) group.product.barcode = r.barcode;
      if (!group.product.brand && r.brand) group.product.brand = r.brand;
      if (!group.product.salePrice && r.salePrice) group.product.salePrice = r.salePrice;
      if (!group.product.costPrice && r.costPrice) group.product.costPrice = r.costPrice;
    }

    // CREATE DISTINCT BATCH FOR EACH ROW / DATE
    // Never sum quantities of different expiration dates!
    const batchId = `batch_imp_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const batch: Batch = {
      id: batchId,
      productId: group.product.id,
      lotNumber: r.lotNumber || `LOTE-${r.expirationDate.replace(/-/g, '')}-${idx + 1}`,
      quantity: r.quantity,
      expirationDate: r.expirationDate,
      costPrice: r.costPrice,
      createdAt: new Date().toISOString(),
    };

    group.batches.push(batch);
  });

  const productsToSave: Product[] = [];
  const batchesToSave: Batch[] = [];

  for (const group of productGroupMap.values()) {
    productsToSave.push(group.product);
    batchesToSave.push(...group.batches);
  }

  return {
    totalRowsProcessed: previewRows.length,
    validRowsCount: previewRows.filter(r => r.status === 'valid').length,
    errorRowsCount: previewRows.filter(r => r.status !== 'valid').length,
    uniqueProductsCount: productsToSave.length,
    totalBatchesCount: batchesToSave.length,
    productsToSave,
    batchesToSave,
    previewRows,
  };
}

/**
 * Generates and downloads a clean, professional Argentine grocery Excel template (.xlsx)
 * Sheet 1: Template with formatted headers & realistic sample products (including multi-batch example)
 * Sheet 2: Clear user instructions with supported date formats
 */
export function downloadExcelTemplate(): void {
  const wb = XLSX.utils.book_new();

  // 1. Data template sheet
  const headers = [
    'Producto',
    'Marca',
    'Código de barras',
    'Categoría',
    'Cantidad',
    'Fecha de vencimiento',
    'Lote',
    'Precio de costo',
    'Precio de venta',
    'Observaciones'
  ];

  const sampleRows = [
    [
      'Leche Entera Larga Vida 1L',
      'La Serenísima',
      '7790010001111',
      'Lácteos y Quesos',
      24,
      '20/11/2026',
      'L-LEC-01',
      850,
      1200,
      'Góndola lácteos - Lote 1'
    ],
    [
      'Leche Entera Larga Vida 1L',
      'La Serenísima',
      '7790010001111',
      'Lácteos y Quesos',
      12,
      '05/12/2026',
      'L-LEC-02',
      850,
      1200,
      'Depósito - Lote 2 con vencimiento posterior'
    ],
    [
      'Galletitas Chocolinas 250g',
      'Bagley',
      '7790010002222',
      'Galletitas y Snacks',
      30,
      '15/01/2027',
      'L-CHO-99',
      950,
      1550,
      'En estantería de galletitas'
    ],
    [
      'Yogur Firme Vainilla 120g',
      'Ilolay',
      '7790010003333',
      'Lácteos y Quesos',
      18,
      '10/11/2026',
      'L-YOG-44',
      600,
      1100,
      'Heladera lácteos - Mantener a 4°C'
    ],
    [
      'Fideos Tallarines 500g',
      'Matarazzo',
      '7790010004444',
      'Almacén y Secos',
      40,
      '25/08/2027',
      'L-FID-08',
      1100,
      1800,
      'Pasillo pastas y secos'
    ]
  ];

  const wsData = [headers, ...sampleRows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 32 }, // Producto
    { wch: 18 }, // Marca
    { wch: 18 }, // Codigo barras
    { wch: 22 }, // Categoria
    { wch: 12 }, // Cantidad
    { wch: 22 }, // Fecha vencimiento
    { wch: 15 }, // Lote
    { wch: 16 }, // Precio costo
    { wch: 16 }, // Precio venta
    { wch: 35 }, // Observaciones
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Plantilla Inventario');

  // 2. Instructions sheet
  const instructions = [
    ['INSTRUCCIONES DE IMPORTACIÓN - VENCEYA'],
    [''],
    ['1. CAMPOS OBLIGATORIOS PARA CADA FILA:'],
    ['   • Producto: Nombre del artículo que vendés.'],
    ['   • Cantidad: Cantidad de unidades de ese lote específico (número mayor a cero).'],
    ['   • Fecha de vencimiento: La fecha de caducidad del lote (formato recomendado: DD/MM/AAAA, ej: 15/11/2026).'],
    [''],
    ['2. CAMPOS OPCIONALES (RECOMENDADOS):'],
    ['   • Marca: Fabricante del producto.'],
    ['   • Código de barras: Código EAN-13 o UPC (facilita escanear con la cámara del celular).'],
    ['   • Categoría: Lácteos y Quesos, Almacén, Galletitas, Bebidas, Limpieza, etc.'],
    ['   • Lote: Código de partida del fabricante (si no tenés, VenceYa lo genera automáticamente).'],
    ['   • Precios: Costo y Precio de venta para calcular tus ganancias y oportunidades de liquidación.'],
    ['   • Observaciones: Notas sobre depósito, heladera o góndola.'],
    [''],
    ['3. ¿CÓMO CARGAR UN MISMO PRODUCTO CON DIFERENTES FECHAS DE VENCIMIENTO?'],
    ['   Simplemente escribí el mismo producto en varias filas con su respectiva fecha y cantidad.'],
    ['   Ejemplo:'],
    ['   Fila 1: Leche Entera | 24 unidades | 20/11/2026'],
    ['   Fila 2: Leche Entera | 12 unidades | 05/12/2026'],
    ['   VenceYa reconocerá que es el mismo producto y creará los 2 lotes separados,'],
    ['   alertándote primero cuando esté por vencer el lote del 20 de noviembre.'],
    [''],
    ['4. FORMATOS COMPATIBLES:'],
    ['   Podés guardar y subir este archivo en formato .xlsx, .xls o .csv.'],
  ];

  const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);
  wsInstructions['!cols'] = [{ wch: 90 }];
  XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instrucciones');

  // Write and trigger download
  XLSX.writeFile(wb, 'Plantilla_Inventario_VenceYa.xlsx');
}
