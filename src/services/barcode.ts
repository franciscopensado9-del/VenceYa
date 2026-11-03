import { ProductCategory } from '../types';
import { parseGS1Barcode } from './dateOcr';

export interface BarcodeLookupResult {
  found: boolean;
  status: 'found' | 'not_found' | 'network_error' | 'partial';
  barcode: string;
  name?: string;
  brand?: string;
  category?: ProductCategory;
  quantityPresentation?: string;
  imageUrl?: string;
  rawCategories?: string;
  source: 'local' | 'openfoodfacts' | 'gs1' | 'none';
  gs1ExpiryDate?: string;
  gs1LotNumber?: string;
}

/**
 * Maps raw OpenFoodFacts categories or keywords to our store's category list
 */
function mapToStoreCategory(tags: string[] = [], productName: string = ''): ProductCategory {
  const combined = (tags.join(' ') + ' ' + productName).toLowerCase();

  if (combined.includes('lacteo') || combined.includes('dairy') || combined.includes('leche') || combined.includes('yogur') || combined.includes('queso') || combined.includes('crema') || combined.includes('manteca')) {
    return 'Lácteos y Quesos';
  }
  if (combined.includes('jamon') || combined.includes('salame') || combined.includes('fiambre') || combined.includes('salchicha') || combined.includes('embutido') || combined.includes('mortadela')) {
    return 'Fiambrería y Embutidos';
  }
  if (combined.includes('pan') || combined.includes('factura') || combined.includes('medialuna') || combined.includes('tostada') || combined.includes('bakery')) {
    return 'Panadería y Facturas';
  }
  if (combined.includes('galletita') || combined.includes('galleta') || combined.includes('biscuit') || combined.includes('snack') || combined.includes('papa frita') || combined.includes('mani')) {
    return 'Galletitas y Snacks';
  }
  if (combined.includes('bebida') || combined.includes('jugo') || combined.includes('gaseosa') || combined.includes('cerveza') || combined.includes('agua') || combined.includes('beverage') || combined.includes('soda')) {
    return 'Bebidas y Jugos';
  }
  if (combined.includes('pasta') || combined.includes('fideo') || combined.includes('raviol') || combined.includes('ñoqui') || combined.includes('capelet')) {
    return 'Pastas Frescas';
  }
  if (combined.includes('carne') || combined.includes('pollo') || combined.includes('cerdo') || combined.includes('beef') || combined.includes('meat') || combined.includes('pescado')) {
    return 'Carnicería y Pollería';
  }
  if (combined.includes('fruta') || combined.includes('verdura') || combined.includes('tomate') || combined.includes('manzana') || combined.includes('banana')) {
    return 'Frutas y Verduras';
  }
  if (combined.includes('chocolate') || combined.includes('caramelo') || combined.includes('alfajor') || combined.includes('chupetin') || combined.includes('turron') || combined.includes('dulce')) {
    return 'Golosinas y Chocolates';
  }
  if (combined.includes('limpieza') || combined.includes('jabon') || combined.includes('detergente') || combined.includes('lavandina') || combined.includes('shampoo') || combined.includes('perfumeria')) {
    return 'Limpieza y Perfumería';
  }
  if (combined.includes('arroz') || combined.includes('fideo seco') || combined.includes('harina') || combined.includes('aceite') || combined.includes('vinagre') || combined.includes('conserva') || combined.includes('mayonesa') || combined.includes('aderezo')) {
    return 'Almacén y Secos';
  }

  return 'Almacén y Secos';
}

/**
 * Searches Open Food Facts API for real product information
 * Adheres strictly to OpenFoodFacts User-Agent and query guidelines
 */
export async function lookupBarcodeInOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) {
    return { found: false, status: 'not_found', barcode: cleanBarcode, source: 'none' };
  }

  // 1. Check if barcode contains GS1 Application Identifiers for Expiration Date / Lot
  const gs1Data = parseGS1Barcode(cleanBarcode);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6500); // 6.5s timeout

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json?fields=product_name,product_name_es,brands,categories,categories_tags,quantity,image_front_small_url,image_front_url`;
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'VenceYa - Web/App - Version 1.0 - www.venceya.com',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { 
        found: false, 
        status: 'not_found', 
        barcode: cleanBarcode, 
        source: 'none',
        gs1ExpiryDate: gs1Data.expirationDate,
        gs1LotNumber: gs1Data.lotNumber,
      };
    }

    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const brand = p.brands || p.brand_owner || '';
      const name = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '';
      const quantityPres = p.quantity || undefined;
      
      let fullName = name.trim();
      if (brand && !fullName.toLowerCase().includes(brand.toLowerCase())) {
        fullName = `${fullName} ${brand}`.trim();
      }
      if (quantityPres && !fullName.toLowerCase().includes(quantityPres.toLowerCase())) {
        fullName = `${fullName} ${quantityPres}`.trim();
      }

      const categoriesTags = Array.isArray(p.categories_tags) ? p.categories_tags : [];
      const mappedCategory = mapToStoreCategory(categoriesTags, fullName);
      const imageUrl = p.image_front_small_url || p.image_front_url || undefined;

      const isPartial = !fullName;

      return {
        found: !isPartial,
        status: isPartial ? 'partial' : 'found',
        barcode: cleanBarcode,
        name: fullName || undefined,
        brand: brand || undefined,
        category: mappedCategory,
        quantityPresentation: quantityPres,
        imageUrl,
        rawCategories: p.categories || undefined,
        source: 'openfoodfacts',
        gs1ExpiryDate: gs1Data.expirationDate,
        gs1LotNumber: gs1Data.lotNumber,
      };
    }

    return { 
      found: false, 
      status: 'not_found', 
      barcode: cleanBarcode, 
      source: 'none',
      gs1ExpiryDate: gs1Data.expirationDate,
      gs1LotNumber: gs1Data.lotNumber,
    };
  } catch (err: unknown) {
    // Network / offline error
    return { 
      found: false, 
      status: 'network_error', 
      barcode: cleanBarcode, 
      source: 'none',
      gs1ExpiryDate: gs1Data.expirationDate,
      gs1LotNumber: gs1Data.lotNumber,
    };
  }
}
