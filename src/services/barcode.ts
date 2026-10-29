import { ProductCategory } from '../types';

export interface BarcodeLookupResult {
  found: boolean;
  barcode: string;
  name?: string;
  brand?: string;
  category?: ProductCategory;
  imageUrl?: string;
  rawCategories?: string;
  source: 'local' | 'openfoodfacts' | 'none';
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
 */
export async function lookupBarcodeInOpenFoodFacts(barcode: string): Promise<BarcodeLookupResult> {
  const cleanBarcode = barcode.trim();
  if (!cleanBarcode) {
    return { found: false, barcode: cleanBarcode, source: 'none' };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s timeout

    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(cleanBarcode)}.json`;
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return { found: false, barcode: cleanBarcode, source: 'none' };
    }

    const data = await response.json();

    if (data.status === 1 && data.product) {
      const p = data.product;
      const brand = p.brands || p.brand_owner || '';
      const name = p.product_name_es || p.product_name || p.generic_name_es || p.generic_name || '';
      const fullName = brand && !name.toLowerCase().includes(brand.toLowerCase())
        ? `${name} ${brand}`.trim()
        : name.trim();

      const categoriesTags = Array.isArray(p.categories_tags) ? p.categories_tags : [];
      const mappedCategory = mapToStoreCategory(categoriesTags, fullName);

      return {
        found: true,
        barcode: cleanBarcode,
        name: fullName || undefined,
        brand: brand || undefined,
        category: mappedCategory,
        imageUrl: p.image_front_small_url || p.image_front_url || undefined,
        rawCategories: p.categories || undefined,
        source: 'openfoodfacts',
      };
    }

    return { found: false, barcode: cleanBarcode, source: 'none' };
  } catch {
    // Offline or network error
    return { found: false, barcode: cleanBarcode, source: 'none' };
  }
}
