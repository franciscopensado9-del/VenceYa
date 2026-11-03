import { createWorker } from 'tesseract.js';

export interface DateOcrResult {
  detected: boolean;
  rawText: string;
  formattedDate?: string; // YYYY-MM-DD
  displayDate?: string;   // DD/MM/YYYY
  confidence: 'high' | 'medium' | 'low';
  source: 'ocr' | 'gs1' | 'manual';
  detectedSnippet?: string;
}

// Spanish and English month abbreviations
const MONTH_MAP: Record<string, string> = {
  ene: '01', enero: '01', jan: '01', january: '01',
  feb: '02', febrero: '02', february: '02',
  mar: '03', marzo: '03', march: '03',
  abr: '04', abril: '04', apr: '04', april: '04',
  may: '05', mayo: '05',
  jun: '06', junio: '06', june: '06',
  jul: '07', julio: '07', july: '07',
  ago: '08', agosto: '08', aug: '08', august: '08',
  sep: '09', set: '09', septiembre: '09', sept: '09', september: '09',
  oct: '10', octubre: '10', october: '10',
  nov: '11', noviembre: '11', november: '11',
  dic: '12', diciembre: '12', dec: '12', december: '12',
};

/**
 * Normalizes year to 4 digits (e.g. 26 -> 2026, 2026 -> 2026)
 */
function normalizeYear(yearStr: string): number {
  const y = parseInt(yearStr, 10);
  if (yearStr.length === 2) {
    return 2000 + y;
  }
  return y;
}

/**
 * Validates whether date components are plausible for an expiration date
 */
function isValidDateComponents(day: number, month: number, year: number): boolean {
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  const currentYear = new Date().getFullYear();
  // Expiry dates are typically between last year and +10 years
  if (year < currentYear - 1 || year > currentYear + 10) return false;
  return true;
}

/**
 * Formats day, month, year into YYYY-MM-DD
 */
function formatIsoDate(day: number, month: number, year: number): string {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Formats day, month, year into Spanish display format: DD/MM/YYYY
 */
function formatDisplayDate(day: number, month: number, year: number): string {
  const d = String(day).padStart(2, '0');
  const m = String(month).padStart(2, '0');
  return `${d}/${m}/${year}`;
}

/**
 * Parses OCR raw text into a valid expiration date
 * Prioritizes lines containing VTO, EXP, VENCE, VAL, CAD over manufacturing dates (FAB, ELAB)
 */
export function extractExpirationDateFromText(text: string): DateOcrResult {
  const clean = text.toUpperCase();
  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);

  // Line candidates: filter out lines that clearly indicate manufacturing/elaboration date only
  const vtoLines: string[] = [];
  const genericLines: string[] = [];

  for (const line of lines) {
    const isElab = line.includes('FAB') || line.includes('ELAB') || line.includes('ENV') || line.includes('PROD');
    const isVto = line.includes('VTO') || line.includes('VENC') || line.includes('EXP') || line.includes('VAL') || line.includes('CAD') || line.includes('BB');

    if (isVto && !isElab) {
      vtoLines.push(line);
    } else if (isVto && isElab) {
      // Line contains both (e.g. "ELAB: 10/01/26 VTO: 10/04/26")
      // Extract segment after VTO
      const vtoIdx = Math.max(
        line.indexOf('VTO'),
        line.indexOf('VENC'),
        line.indexOf('EXP'),
        line.indexOf('VAL')
      );
      vtoLines.push(line.slice(vtoIdx));
    } else if (!isElab) {
      genericLines.push(line);
    }
  }

  // Check vtoLines first (High confidence), then genericLines (Medium confidence)
  const candidatePool = [
    ...vtoLines.map(l => ({ line: l, confidence: 'high' as const })),
    ...genericLines.map(l => ({ line: l, confidence: 'medium' as const })),
  ];

  for (const { line, confidence } of candidatePool) {
    // 1. Pattern: Month Name (e.g., "15 NOV 2026", "24-OCT-26", "OCT 2026")
    const monthRegex = /(\d{1,2})?[\s\-\/.]*(ENE|FEB|MAR|ABR|MAY|JUN|JUL|AGO|SEP|SET|OCT|NOV|DIC|JAN|APR|AUG|DEC|ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)[\s\-\/.]*(\d{2,4})/i;
    const monthMatch = line.match(monthRegex);
    if (monthMatch) {
      const rawDay = monthMatch[1] ? parseInt(monthMatch[1], 10) : 1;
      const rawMonthStr = monthMatch[2].toLowerCase();
      const rawYear = normalizeYear(monthMatch[3]);
      const monthNum = parseInt(MONTH_MAP[rawMonthStr] || '1', 10);

      if (isValidDateComponents(rawDay, monthNum, rawYear)) {
        return {
          detected: true,
          rawText: text,
          formattedDate: formatIsoDate(rawDay, monthNum, rawYear),
          displayDate: formatDisplayDate(rawDay, monthNum, rawYear),
          confidence,
          source: 'ocr',
          detectedSnippet: monthMatch[0],
        };
      }
    }

    // 2. Pattern: Standard numeric DD/MM/YYYY or DD/MM/YY
    const dateRegex = /(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/;
    const dateMatch = line.match(dateRegex);
    if (dateMatch) {
      const day = parseInt(dateMatch[1], 10);
      const month = parseInt(dateMatch[2], 10);
      const year = normalizeYear(dateMatch[3]);

      if (isValidDateComponents(day, month, year)) {
        return {
          detected: true,
          rawText: text,
          formattedDate: formatIsoDate(day, month, year),
          displayDate: formatDisplayDate(day, month, year),
          confidence,
          source: 'ocr',
          detectedSnippet: dateMatch[0],
        };
      }
    }

    // 3. Pattern: ISO YYYY/MM/DD
    const isoRegex = /(20\d{2})[\/.\-](\d{1,2})[\/.\-](\d{1,2})/;
    const isoMatch = line.match(isoRegex);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      const month = parseInt(isoMatch[2], 10);
      const day = parseInt(isoMatch[3], 10);

      if (isValidDateComponents(day, month, year)) {
        return {
          detected: true,
          rawText: text,
          formattedDate: formatIsoDate(day, month, year),
          displayDate: formatDisplayDate(day, month, year),
          confidence,
          source: 'ocr',
          detectedSnippet: isoMatch[0],
        };
      }
    }

    // 4. Pattern: Month/Year only (e.g. MM/YY or MM/YYYY like "11/26")
    const mmYyRegex = /(?:VTO|EXP|VENCE)?[:\s.]*(\d{2})[\/.\-](\d{2,4})/;
    const mmYyMatch = line.match(mmYyRegex);
    if (mmYyMatch) {
      const month = parseInt(mmYyMatch[1], 10);
      const year = normalizeYear(mmYyMatch[2]);
      if (month >= 1 && month <= 12) {
        // Last day of that month as default expiration
        const lastDay = new Date(year, month, 0).getDate();
        if (isValidDateComponents(lastDay, month, year)) {
          return {
            detected: true,
            rawText: text,
            formattedDate: formatIsoDate(lastDay, month, year),
            displayDate: formatDisplayDate(lastDay, month, year),
            confidence: 'low',
            source: 'ocr',
            detectedSnippet: mmYyMatch[0],
          };
        }
      }
    }
  }

  return {
    detected: false,
    rawText: text,
    confidence: 'low',
    source: 'ocr',
  };
}

/**
 * Checks if a barcode string follows GS1 format containing AI (17) or (15) expiration date
 */
export function parseGS1Barcode(barcode: string): { hasExpiry: boolean; expirationDate?: string; lotNumber?: string } {
  if (!barcode || barcode.length < 14) return { hasExpiry: false };

  const clean = barcode.replace(/[()]/g, '');

  // GS1 AI 17: Expiration date (YYMMDD)
  // GS1 AI 15: Best before date (YYMMDD)
  const ai17Match = clean.match(/(?:17)(\d{2})(\d{2})(\d{2})/);
  const ai15Match = clean.match(/(?:15)(\d{2})(\d{2})(\d{2})/);
  const dateMatch = ai17Match || ai15Match;

  let lotNumber: string | undefined = undefined;
  const lotMatch = clean.match(/(?:10)([a-zA-Z0-9]{3,20})/);
  if (lotMatch) {
    lotNumber = lotMatch[1];
  }

  if (dateMatch) {
    const year = normalizeYear(dateMatch[1]);
    const month = parseInt(dateMatch[2], 10);
    const day = parseInt(dateMatch[3], 10);

    if (isValidDateComponents(day, month, year)) {
      return {
        hasExpiry: true,
        expirationDate: formatIsoDate(day, month, year),
        lotNumber,
      };
    }
  }

  return { hasExpiry: false, lotNumber };
}

let ocrWorkerInstance: any = null;

/**
 * Gets or initializes the singleton Tesseract OCR worker
 */
async function getOcrWorker() {
  if (!ocrWorkerInstance) {
    const worker = await createWorker('spa+eng');
    ocrWorkerInstance = worker;
  }
  return ocrWorkerInstance;
}

/**
 * Performs OCR recognition on a canvas or image blob
 */
export async function recognizeDateFromCanvas(canvas: HTMLCanvasElement): Promise<DateOcrResult> {
  try {
    const worker = await getOcrWorker();
    const ret = await worker.recognize(canvas);
    const text = ret.data.text || '';
    return extractExpirationDateFromText(text);
  } catch (err) {
    console.warn('Date OCR failed:', err);
    return {
      detected: false,
      rawText: '',
      confidence: 'low',
      source: 'ocr',
    };
  }
}
