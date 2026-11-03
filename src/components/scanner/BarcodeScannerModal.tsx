import React, { useEffect, useRef, useState, useCallback } from 'react';
import { 
  Camera, 
  X, 
  Flashlight, 
  RefreshCw, 
  AlertCircle, 
  Keyboard, 
  Check, 
  Loader2, 
  Image as ImageIcon, 
  ArrowRight, 
  ArrowLeft, 
  Calendar, 
  Sparkles, 
  Package, 
  Plus, 
  Minus, 
  Barcode, 
  CheckCircle2, 
  Scan, 
  Clock, 
  ChevronRight, 
  Info,
  DollarSign
} from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { soundService } from '../../services/sound';
import { lookupBarcodeInOpenFoodFacts, BarcodeLookupResult } from '../../services/barcode';
import { recognizeDateFromCanvas, DateOcrResult } from '../../services/dateOcr';
import { storageService, formatDate, calculateDaysRemaining, getExpirationStatus, getStatusLabel } from '../../services/storage';
import { firestoreSyncService } from '../../services/firestoreSync';
import { useAuth } from '../../contexts/AuthContext';
import { Product, ProductCategory, ProductUnit, Batch } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected?: (barcode: string, lookupInfo?: BarcodeLookupResult, existingProduct?: Product) => void;
  onSwitchToManual: () => void;
  onItemSaved?: () => void;
}

type AssistantStep = 'scan_barcode' | 'product_info' | 'date_ocr' | 'saved_success';

const STORE_CATEGORIES: ProductCategory[] = [
  'Almacén y Secos',
  'Lácteos y Quesos',
  'Fiambrería y Embutidos',
  'Panadería y Facturas',
  'Galletitas y Snacks',
  'Bebidas y Jugos',
  'Pastas Frescas',
  'Golosinas y Chocolates',
  'Carnicería y Pollería',
  'Frutas y Verduras',
  'Limpieza y Perfumería',
  'Otros',
];

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  onSwitchToManual,
  onItemSaved,
}) => {
  const { userProfile, user } = useAuth();

  // Assistant Flow Step
  const [step, setStep] = useState<AssistantStep>('scan_barcode');

  // Video and Camera Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const ocrFileInputRef = useRef<HTMLInputElement | null>(null);
  const isDecodingRef = useRef<boolean>(false);

  // Camera State
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isProcessingBarcode, setIsProcessingBarcode] = useState<boolean>(false);
  const [showManualBarcodeInput, setShowManualBarcodeInput] = useState<boolean>(false);
  const [manualBarcodeText, setManualBarcodeText] = useState<string>('');
  const [barcodeImageError, setBarcodeImageError] = useState<string | null>(null);

  // Step 1 & 2: Barcode & Product Data
  const [currentBarcode, setCurrentBarcode] = useState<string>('');
  const [lookupResult, setLookupResult] = useState<BarcodeLookupResult | null>(null);
  const [existingStoreProduct, setExistingStoreProduct] = useState<Product | null>(null);
  const [isSearchingProduct, setIsSearchingProduct] = useState<boolean>(false);

  // Editable Product Fields
  const [productName, setProductName] = useState<string>('');
  const [productCategory, setProductCategory] = useState<ProductCategory>('Almacén y Secos');
  const [productBrand, setProductBrand] = useState<string>('');
  const [productImageUrl, setProductImageUrl] = useState<string>('');
  const [productUnit, setProductUnit] = useState<ProductUnit>('unidades');
  const [productCostPrice, setProductCostPrice] = useState<string>('');
  const [productSalePrice, setProductSalePrice] = useState<string>('');

  // Step 3: Date OCR & Batch Data
  const [expirationDate, setExpirationDate] = useState<string>('');
  const [batchQuantity, setBatchQuantity] = useState<number>(1);
  const [lotNumber, setLotNumber] = useState<string>('');
  const [isOcrProcessing, setIsOcrProcessing] = useState<boolean>(false);
  const [ocrDetectedResult, setOcrDetectedResult] = useState<DateOcrResult | null>(null);
  const [ocrCameraActive, setOcrCameraActive] = useState<boolean>(false);
  const [ocrErrorMessage, setOcrErrorMessage] = useState<string | null>(null);

  // Step 4: Saved Result
  const [savedProduct, setSavedProduct] = useState<Product | null>(null);
  const [savedBatch, setSavedBatch] = useState<Batch | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // -------------------------------------------------------------
  // CAMERA MANAGEMENT
  // -------------------------------------------------------------
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {
          // ignore
        }
      });
      streamRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (zxingReaderRef.current as any).reset?.();
      } catch {
        // ignore
      }
      zxingReaderRef.current = null;
    }
    setTorchOn(false);
  }, []);

  // Start Camera for Barcode Scanning
  const startBarcodeCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    setErrorMessage(null);
    setBarcodeImageError(null);
    isDecodingRef.current = false;

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('La cámara no es soportada por este dispositivo o navegador.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 }
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Check flashlight/torch support
      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
        setTorchSupported(!!capabilities.torch);
      }

      // Enumerate camera devices
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      setAvailableDevices(videoDevices);
      if (!selectedDeviceId && videoDevices.length > 0) {
        const activeTrack = stream.getVideoTracks()[0];
        const activeDeviceId = activeTrack?.getSettings()?.deviceId;
        if (activeDeviceId) setSelectedDeviceId(activeDeviceId);
      }

      // ZXing scanner with debouncing to prevent multiple reads
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;

      if (videoRef.current) {
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && result.getText() && !isDecodingRef.current) {
            isDecodingRef.current = true;
            handleBarcodeSuccess(result.getText());
          }
        });
      }
    } catch (err: unknown) {
      setHasPermission(false);
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso de cámara denegado. Habilitá el acceso a la cámara en los ajustes del navegador o ingresá el código manualmente.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara conectada en este equipo.');
      } else {
        setErrorMessage('No se pudo iniciar la cámara: ' + (error.message || 'Error desconocido'));
      }
    }
  }, [selectedDeviceId, stopCamera]);

  // Start Camera for Expiration Date OCR
  const startDateOcrCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    setOcrErrorMessage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setOcrErrorMessage('Cámara no disponible para OCR.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : { 
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 }
            },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setOcrCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      const track = stream.getVideoTracks()[0];
      if (track) {
        const capabilities = track.getCapabilities ? (track.getCapabilities() as { torch?: boolean }) : {};
        setTorchSupported(!!capabilities.torch);
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setOcrErrorMessage('No se pudo abrir la cámara para leer el vencimiento: ' + (error.message || ''));
      setOcrCameraActive(false);
    }
  }, [stopCamera]);

  // Toggle Torch
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track) {
      try {
        const nextState = !torchOn;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ torch: nextState }]
        });
        setTorchOn(nextState);
      } catch {
        // Torch toggle failed
      }
    }
  };

  // Switch Camera Lens
  const switchCamera = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    if (step === 'scan_barcode') {
      startBarcodeCamera(nextDevice.deviceId);
    } else if (step === 'date_ocr') {
      startDateOcrCamera(nextDevice.deviceId);
    }
  };

  // -------------------------------------------------------------
  // STEP 1 -> STEP 2: BARCODE SUCCESS & PRODUCT LOOKUP
  // -------------------------------------------------------------
  const handleBarcodeSuccess = useCallback(async (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    soundService.playScanSuccess();
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try { navigator.vibrate(40); } catch {}
    }

    stopCamera();
    setIsProcessingBarcode(true);
    setCurrentBarcode(cleanCode);

    // 1. Check local inventory first
    const existing = storageService.findProductByBarcode(cleanCode);
    setExistingStoreProduct(existing || null);

    // 2. Fetch external product information from Open Food Facts API
    setIsSearchingProduct(true);
    let offData: BarcodeLookupResult | null = null;
    try {
      offData = await lookupBarcodeInOpenFoodFacts(cleanCode);
      setLookupResult(offData);
    } catch {
      offData = {
        found: false,
        status: 'network_error',
        barcode: cleanCode,
        source: 'none'
      };
      setLookupResult(offData);
    } finally {
      setIsSearchingProduct(false);
      setIsProcessingBarcode(false);
    }

    // Populate default product fields
    if (existing) {
      setProductName(existing.name);
      setProductCategory(existing.category);
      setProductBrand(existing.brand || '');
      setProductImageUrl(existing.imageUrl || offData?.imageUrl || '');
      setProductUnit(existing.unit || 'unidades');
      setProductCostPrice(existing.costPrice ? String(existing.costPrice) : '');
      setProductSalePrice(existing.salePrice ? String(existing.salePrice) : '');
    } else if (offData && offData.found) {
      setProductName(offData.name || '');
      setProductCategory(offData.category || 'Almacén y Secos');
      setProductBrand(offData.brand || '');
      setProductImageUrl(offData.imageUrl || '');
      setProductUnit('unidades');
      setProductCostPrice('');
      setProductSalePrice('');
    } else {
      setProductName('');
      setProductCategory('Almacén y Secos');
      setProductBrand('');
      setProductImageUrl('');
      setProductUnit('unidades');
      setProductCostPrice('');
      setProductSalePrice('');
    }

    // Check if barcode already includes GS1 expiration date
    if (offData?.gs1ExpiryDate) {
      setExpirationDate(offData.gs1ExpiryDate);
      if (offData.gs1LotNumber) {
        setLotNumber(offData.gs1LotNumber);
      }
    } else {
      // Default suggested lot code: L-YYYYMMDD
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      setLotNumber(`L-${yy}${mm}${dd}`);
      setExpirationDate('');
    }

    // Advance to Step 2
    setStep('product_info');
  }, [stopCamera]);

  // Handle image upload with barcode
  const handleBarcodeImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBarcodeImageError(null);
    try {
      const imageUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result && result.getText()) {
        handleBarcodeSuccess(result.getText());
      } else {
        setBarcodeImageError('No se pudo detectar un código nítido en la imagen. Probá con otra foto o ingresá el código manualmente.');
      }
    } catch {
      setBarcodeImageError('No se encontró un código de barras legible en la foto. Verificá que las líneas estén nítidas y bien iluminadas.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // -------------------------------------------------------------
  // STEP 3: DATE OCR CAPTURE & RECOGNITION
  // -------------------------------------------------------------
  const captureAndRecognizeDate = async () => {
    if (!videoRef.current) return;
    setIsOcrProcessing(true);
    setOcrErrorMessage(null);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No se pudo inicializar canvas');
      }

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Enhance contrast and crop center target area where packaging date usually resides
      const cropWidth = Math.round(canvas.width * 0.75);
      const cropHeight = Math.round(canvas.height * 0.45);
      const cropX = Math.round((canvas.width - cropWidth) / 2);
      const cropY = Math.round((canvas.height - cropHeight) / 2);

      const targetCanvas = document.createElement('canvas');
      targetCanvas.width = cropWidth;
      targetCanvas.height = cropHeight;
      const targetCtx = targetCanvas.getContext('2d');
      if (targetCtx) {
        targetCtx.drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
        
        // Simple binarization/contrast boost for dot-matrix packaging prints
        const imgData = targetCtx.getImageData(0, 0, cropWidth, cropHeight);
        const d = imgData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          // Contrast stretch
          const contrast = (gray - 128) * 1.4 + 128;
          const finalVal = Math.min(255, Math.max(0, contrast));
          d[i] = finalVal;
          d[i + 1] = finalVal;
          d[i + 2] = finalVal;
        }
        targetCtx.putImageData(imgData, 0, 0);
      }

      // Run OCR with our optimized date parser
      const result = await recognizeDateFromCanvas(targetCanvas);
      setOcrDetectedResult(result);

      if (result.detected && result.formattedDate) {
        setExpirationDate(result.formattedDate);
        soundService.playScanSuccess();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try { navigator.vibrate(50); } catch {}
        }
        stopCamera();
        setOcrCameraActive(false);
      } else {
        setOcrErrorMessage('No se distinguió una fecha clara en el encuadre. Acercá la cámara al texto "VTO" o seleccioná la fecha abajo.');
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      setOcrErrorMessage('Error al leer fecha: ' + (error.message || 'Error'));
    } finally {
      setIsOcrProcessing(false);
    }
  };

  // Handle uploaded date photo
  const handleDatePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsOcrProcessing(true);
    setOcrErrorMessage(null);

    try {
      const img = new Image();
      const imageUrl = URL.createObjectURL(file);
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = imageUrl;
      });

      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const result = await recognizeDateFromCanvas(canvas);
        setOcrDetectedResult(result);

        if (result.detected && result.formattedDate) {
          setExpirationDate(result.formattedDate);
          soundService.playScanSuccess();
          stopCamera();
          setOcrCameraActive(false);
        } else {
          setOcrErrorMessage('No se encontró una fecha nítida en la foto subida. Podés elegirla directamente en el calendario.');
        }
      }
      URL.revokeObjectURL(imageUrl);
    } catch {
      setOcrErrorMessage('No se pudo procesar la imagen seleccionada.');
    } finally {
      setIsOcrProcessing(false);
      if (ocrFileInputRef.current) ocrFileInputRef.current.value = '';
    }
  };

  // Quick Date Presets
  const applyDatePreset = (daysToAdd: number) => {
    const target = new Date();
    target.setDate(target.getDate() + daysToAdd);
    setExpirationDate(formatDate(target));
  };

  // -------------------------------------------------------------
  // STEP 3 -> STEP 4: SAVE PRODUCT & BATCH
  // -------------------------------------------------------------
  const handleConfirmAndSave = async () => {
    if (!productName.trim()) {
      alert('Por favor indicá el nombre del producto.');
      return;
    }
    if (!expirationDate) {
      alert('Por favor seleccioná o escaneá la fecha de vencimiento.');
      return;
    }
    if (batchQuantity < 1) {
      alert('La cantidad debe ser al menos 1 unidad.');
      return;
    }

    setIsSaving(true);
    try {
      const parsedCost = productCostPrice.trim() !== '' ? Number(productCostPrice) : undefined;
      const parsedSale = productSalePrice.trim() !== '' ? Number(productSalePrice) : undefined;

      let targetProduct: Product;

      if (existingStoreProduct) {
        // Update existing product if name, category, or prices changed
        targetProduct = storageService.saveProduct({
          name: productName.trim(),
          category: productCategory,
          unit: productUnit,
          barcode: currentBarcode || existingStoreProduct.barcode,
          brand: productBrand.trim() || existingStoreProduct.brand,
          imageUrl: productImageUrl || existingStoreProduct.imageUrl,
          costPrice: parsedCost,
          salePrice: parsedSale,
          notes: existingStoreProduct.notes,
        }, existingStoreProduct.id);

        if (userProfile?.storeId && !storageService.isDemoActive()) {
          firestoreSyncService.saveProduct(userProfile.storeId, {
            name: targetProduct.name,
            category: targetProduct.category,
            unit: targetProduct.unit,
            barcode: targetProduct.barcode,
            brand: targetProduct.brand,
            imageUrl: targetProduct.imageUrl,
            costPrice: targetProduct.costPrice,
            salePrice: targetProduct.salePrice,
            notes: targetProduct.notes,
          }, targetProduct.id).catch(err => console.warn('Cloud sync error:', err));
        }
      } else {
        // Create brand new product
        targetProduct = storageService.saveProduct({
          name: productName.trim(),
          category: productCategory,
          unit: productUnit,
          barcode: currentBarcode || undefined,
          brand: productBrand.trim() || undefined,
          imageUrl: productImageUrl || undefined,
          costPrice: parsedCost,
          salePrice: parsedSale,
        });

        if (userProfile?.storeId && !storageService.isDemoActive()) {
          firestoreSyncService.saveProduct(userProfile.storeId, {
            name: targetProduct.name,
            category: targetProduct.category,
            unit: targetProduct.unit,
            barcode: targetProduct.barcode,
            brand: targetProduct.brand,
            imageUrl: targetProduct.imageUrl,
            costPrice: targetProduct.costPrice,
            salePrice: targetProduct.salePrice,
            notes: targetProduct.notes,
          }, targetProduct.id).catch(err => console.warn('Cloud sync error:', err));
        }
      }

      // Create new batch for this product
      const newBatch = storageService.saveBatch({
        productId: targetProduct.id,
        lotNumber: lotNumber.trim() || undefined,
        quantity: batchQuantity,
        expirationDate: expirationDate,
        costPrice: parsedCost,
      });

      if (userProfile?.storeId && !storageService.isDemoActive()) {
        firestoreSyncService.saveBatch(userProfile.storeId, {
          productId: newBatch.productId,
          lotNumber: newBatch.lotNumber,
          quantity: newBatch.quantity,
          expirationDate: newBatch.expirationDate,
          costPrice: newBatch.costPrice,
        }, newBatch.id).catch(err => console.warn('Cloud batch sync error:', err));
      }

      // Success audio & tactile feedback
      soundService.playSuccessChime();
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate([60, 50, 60]); } catch {}
      }

      setSavedProduct(targetProduct);
      setSavedBatch(newBatch);

      if (onItemSaved) {
        onItemSaved();
      }

      setStep('saved_success');
    } catch (err) {
      console.error('Error saving scanned product:', err);
      alert('Ocurrió un error al guardar el producto. Intentá nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset assistant to scan another item
  const handleScanAnother = () => {
    setStep('scan_barcode');
    setCurrentBarcode('');
    setLookupResult(null);
    setExistingStoreProduct(null);
    setProductName('');
    setProductBrand('');
    setProductImageUrl('');
    setExpirationDate('');
    setBatchQuantity(1);
    setLotNumber('');
    setOcrDetectedResult(null);
    setOcrCameraActive(false);
    setSavedProduct(null);
    setSavedBatch(null);
    startBarcodeCamera();
  };

  // -------------------------------------------------------------
  // LIFECYCLE
  // -------------------------------------------------------------
  useEffect(() => {
    if (isOpen) {
      setStep('scan_barcode');
      setShowManualBarcodeInput(false);
      startBarcodeCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startBarcodeCamera, stopCamera]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full h-full sm:h-auto sm:max-h-[94vh] sm:max-w-lg bg-[#F8F9F6] border-0 sm:border border-[#E7EBE5] sm:rounded-3xl rounded-none overflow-hidden shadow-2xl flex flex-col">
        
        {/* Wizard Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-white border-b border-[#E7EBE5] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0 shadow-2xs">
              <Scan className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#174A36]">Asistente de Escaneo</h2>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`w-2 h-2 rounded-full ${step === 'scan_barcode' ? 'bg-[#246B4D] animate-ping' : 'bg-emerald-500'}`} />
                <span className="text-xs text-[#78847C] font-medium">
                  {step === 'scan_barcode' && 'Paso 1: Leer código de barras'}
                  {step === 'product_info' && 'Paso 2: Confirmar datos del producto'}
                  {step === 'date_ocr' && 'Paso 3: Leer fecha de vencimiento'}
                  {step === 'saved_success' && '¡Guardado con éxito!'}
                </span>
              </div>
            </div>
          </div>
          
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Progress Pills */}
        <div className="grid grid-cols-4 gap-1 px-4 py-2 bg-[#F1F4EE] border-b border-[#E7EBE5] text-[10px] sm:text-xs font-semibold text-center select-none">
          <div className={`py-1 rounded-lg transition-colors ${step === 'scan_barcode' ? 'bg-[#246B4D] text-white shadow-2xs' : 'text-[#78847C]'}`}>
            1. Código
          </div>
          <div className={`py-1 rounded-lg transition-colors ${step === 'product_info' ? 'bg-[#246B4D] text-white shadow-2xs' : 'text-[#78847C]'}`}>
            2. Producto
          </div>
          <div className={`py-1 rounded-lg transition-colors ${step === 'date_ocr' ? 'bg-[#246B4D] text-white shadow-2xs' : 'text-[#78847C]'}`}>
            3. Vencimiento
          </div>
          <div className={`py-1 rounded-lg transition-colors ${step === 'saved_success' ? 'bg-[#246B4D] text-white shadow-2xs' : 'text-[#78847C]'}`}>
            4. Listo
          </div>
        </div>

        {/* Dynamic Wizard Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ========================================================= */}
          {/* STEP 1: SCAN BARCODE                                      */}
          {/* ========================================================= */}
          {step === 'scan_barcode' && (
            <div className="flex flex-col h-full">
              {/* Camera Area */}
              <div className="relative bg-black min-h-[300px] sm:min-h-[340px] flex items-center justify-center overflow-hidden">
                {errorMessage ? (
                  <div className="p-6 text-center max-w-sm">
                    <div className="mx-auto w-12 h-12 rounded-2xl bg-[#FCEBE5] text-[#C6533A] flex items-center justify-center mb-3">
                      <AlertCircle className="w-6 h-6" />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1.5">No se pudo acceder a la cámara</h3>
                    <p className="text-xs text-slate-300 mb-4 leading-relaxed">{errorMessage}</p>
                    <div className="flex flex-col gap-2">
                      <button
                        type="button"
                        onClick={() => startBarcodeCamera()}
                        className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
                      >
                        Reintentar cámara
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                      >
                        <ImageIcon className="w-4 h-4 text-[#246B4D]" />
                        <span>Subir foto con código</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowManualBarcodeInput(true)}
                        className="w-full px-4 py-2 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold rounded-xl transition"
                      >
                        Ingresar número de código
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <video
                      ref={videoRef}
                      playsInline
                      autoPlay
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder Target Reticle */}
                    <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                      <div className="relative w-64 h-40 sm:w-72 sm:h-44 border-2 border-emerald-400/90 rounded-2xl overflow-hidden shadow-2xl backdrop-contrast-125">
                        {/* Scanning Laser Beam */}
                        <div 
                          className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse" 
                          style={{ top: '50%' }} 
                        />
                        {/* Corner markers */}
                        <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                        <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                        <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                        <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
                      </div>
                      <span className="mt-4 px-3.5 py-1 rounded-full bg-black/75 backdrop-blur-md text-xs text-white font-medium">
                        {isProcessingBarcode ? 'Leyendo código...' : 'Centrá las barras EAN / UPC en el marco'}
                      </span>
                    </div>

                    {/* Camera Quick Controls */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10 pointer-events-auto">
                      <div className="flex items-center gap-2">
                        {torchSupported && (
                          <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2.5 rounded-xl backdrop-blur-md border transition min-h-[44px] min-w-[44px] flex items-center justify-center ${
                              torchOn 
                                ? 'bg-amber-500 text-white border-amber-400' 
                                : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                            }`}
                            aria-label="Linterna"
                            title="Linterna"
                          >
                            <Flashlight className="w-5 h-5" />
                          </button>
                        )}
                        {availableDevices.length > 1 && (
                          <button
                            type="button"
                            onClick={switchCamera}
                            className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Cambiar cámara"
                            title="Cambiar cámara"
                          >
                            <RefreshCw className="w-5 h-5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition min-h-[44px] min-w-[44px] flex items-center justify-center"
                          aria-label="Cargar foto"
                          title="Subir foto de código"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowManualBarcodeInput(!showManualBarcodeInput)}
                        className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-xs font-semibold text-white hover:bg-black/80 transition min-h-[44px]"
                      >
                        <Keyboard className="w-4 h-4" />
                        <span>Teclado / USB</span>
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBarcodeImageUpload}
              />

              {/* Image error */}
              {barcodeImageError && (
                <div className="p-3 bg-[#FCEBE5] border-t border-[#F5C2B6] text-[#C6533A] text-xs flex items-center justify-between gap-2 font-medium">
                  <span>{barcodeImageError}</span>
                  <button onClick={() => setBarcodeImageError(null)} className="p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Manual Barcode Input drawer */}
              {showManualBarcodeInput && (
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (manualBarcodeText.trim()) {
                      handleBarcodeSuccess(manualBarcodeText.trim());
                    }
                  }} 
                  className="p-4 bg-white border-t border-[#E7EBE5] animate-in slide-in-from-bottom-2"
                >
                  <label htmlFor="manual-bar-input" className="block text-xs font-semibold text-[#174A36] mb-1.5">
                    Ingresar código de barras numérico:
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="manual-bar-input"
                      type="text"
                      value={manualBarcodeText}
                      onChange={(e) => setManualBarcodeText(e.target.value)}
                      placeholder="Ej. 7790010001234"
                      className="flex-1 px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-sm font-mono text-[#24372F] focus:outline-none focus:border-[#246B4D]"
                      autoFocus
                    />
                    <button
                      type="submit"
                      disabled={!manualBarcodeText.trim()}
                      className="px-4 py-2.5 bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs font-bold rounded-xl transition"
                    >
                      Continuar
                    </button>
                  </div>
                </form>
              )}

              {/* Switch to fully manual */}
              <div className="p-4 bg-white border-t border-[#E7EBE5] flex items-center justify-between text-xs text-[#78847C] mt-auto">
                <span>¿No tiene código de barras?</span>
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onSwitchToManual();
                  }}
                  className="font-bold text-[#246B4D] hover:text-[#174A36] flex items-center gap-1"
                >
                  <span>Carga manual completa</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 2: PRODUCT INFORMATION & MATCH                       */}
          {/* ========================================================= */}
          {step === 'product_info' && (
            <div className="p-5 space-y-4">
              {/* Product Match Status Banner */}
              {existingStoreProduct ? (
                <div className="p-4 rounded-2xl bg-[#EAF3EC] border border-[#CDE3D2] flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#246B4D] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-[#174A36]">¡Producto ya registrado!</span>
                    </div>
                    <p className="text-xs text-[#246B4D] mt-0.5">
                      Este producto ya forma parte de tu comercio. Podés registrar directamente un nuevo lote con su vencimiento sin duplicar el producto.
                    </p>
                  </div>
                </div>
              ) : lookupResult?.found ? (
                <div className="p-3.5 rounded-2xl bg-[#E8F3E9] border border-[#D5E8D7] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#246B4D] text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#174A36]">Producto encontrado en catálogo</span>
                    <p className="text-[11px] text-[#78847C] truncate">Open Food Facts • {currentBarcode}</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-[#FFF3D9] border border-[#FBEAC4] flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#A66B16] text-white flex items-center justify-center shrink-0">
                    <Info className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-bold text-[#A66B16]">Código nuevo para tu inventario</span>
                    <p className="text-[11px] text-[#A66B16]/80 truncate">Código: {currentBarcode}. Completá el nombre.</p>
                  </div>
                </div>
              )}

              {/* Product Card Details */}
              <div className="p-4 bg-white rounded-2xl border border-[#E7EBE5] shadow-xs space-y-3.5">
                <div className="flex items-start gap-3.5">
                  {productImageUrl ? (
                    <img 
                      src={productImageUrl} 
                      alt={productName} 
                      className="w-16 h-16 object-cover rounded-xl border border-[#E7EBE5] shrink-0 bg-[#F8F9F6]" 
                      onError={() => setProductImageUrl('')}
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-xl bg-[#F1F4EE] border border-[#E7EBE5] flex items-center justify-center shrink-0 text-[#246B4D]">
                      <Package className="w-7 h-7" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <label className="block text-[11px] font-bold text-[#78847C] uppercase tracking-wider mb-1">
                      Nombre del producto *
                    </label>
                    <input
                      type="text"
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="Ej. Leche Entera La Serenísima 1L"
                      className="w-full px-3 py-2 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-sm font-semibold text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                      autoFocus={!productName}
                    />
                  </div>
                </div>

                {/* Category & Unit */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-[#78847C] uppercase tracking-wider mb-1">
                      Categoría
                    </label>
                    <select
                      value={productCategory}
                      onChange={(e) => setProductCategory(e.target.value as ProductCategory)}
                      className="w-full px-3 py-2 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs font-medium text-[#24372F] focus:outline-none focus:border-[#246B4D]"
                    >
                      {STORE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#78847C] uppercase tracking-wider mb-1">
                      Código de barras
                    </label>
                    <div className="px-3 py-2 bg-[#F1F4EE] rounded-xl text-xs font-mono text-[#78847C] flex items-center justify-between border border-[#E7EBE5]">
                      <span>{currentBarcode || 'Sin código'}</span>
                      <Barcode className="w-4 h-4 text-[#78847C]" />
                    </div>
                  </div>
                </div>

                {/* Optional Prices */}
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#F1F4EE]">
                  <div>
                    <label className="block text-[11px] font-bold text-[#78847C] uppercase tracking-wider mb-1">
                      Costo (opcional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-[#78847C] font-semibold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={productCostPrice}
                        onChange={(e) => setProductCostPrice(e.target.value)}
                        placeholder="0"
                        className="w-full pl-6 pr-3 py-1.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs text-[#24372F] focus:outline-none focus:border-[#246B4D]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-[#78847C] uppercase tracking-wider mb-1">
                      Precio Venta (opcional)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-xs text-[#78847C] font-semibold">$</span>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        value={productSalePrice}
                        onChange={(e) => setProductSalePrice(e.target.value)}
                        placeholder="0"
                        className="w-full pl-6 pr-3 py-1.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs text-[#24372F] focus:outline-none focus:border-[#246B4D]"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2 Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setStep('scan_barcode');
                    startBarcodeCamera();
                  }}
                  className="px-4 py-3 rounded-2xl bg-white border border-[#E7EBE5] text-xs font-semibold text-[#78847C] hover:text-[#174A36] transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Re-escanear</span>
                </button>

                <button
                  type="button"
                  disabled={!productName.trim()}
                  onClick={() => {
                    setStep('date_ocr');
                  }}
                  className="flex-1 py-3 px-4 bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <span>Continuar a Vencimiento</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 3: EXPIRATION DATE OCR & BATCH                       */}
          {/* ========================================================= */}
          {step === 'date_ocr' && (
            <div className="p-5 space-y-4">
              
              {/* GS1 Pre-filled notice if applicable */}
              {lookupResult?.gs1ExpiryDate && (
                <div className="p-3 bg-[#EAF3EC] border border-[#CDE3D2] rounded-2xl text-xs text-[#174A36] flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-[#246B4D] shrink-0" />
                  <span>Fecha de vencimiento extraída automáticamente del código de barras GS1.</span>
                </div>
              )}

              {/* OCR Camera Viewport (Conditional) */}
              {ocrCameraActive ? (
                <div className="relative bg-black rounded-2xl overflow-hidden min-h-[260px] flex items-center justify-center border border-[#E7EBE5]">
                  <video
                    ref={videoRef}
                    playsInline
                    autoPlay
                    muted
                    className="w-full h-full object-cover"
                  />
                  {/* OCR Date Reticle */}
                  <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                    <div className="w-64 h-28 border-2 border-amber-400 rounded-xl shadow-2xl relative">
                      <div className="absolute top-1 left-2 text-[10px] font-bold text-amber-300 uppercase tracking-widest bg-black/60 px-1.5 py-0.5 rounded">
                        VTO / EXP / VENCE
                      </div>
                      <div className="absolute left-0 right-0 h-0.5 bg-amber-400 animate-pulse" style={{ top: '50%' }} />
                    </div>
                    <span className="mt-3 px-3 py-1 rounded-full bg-black/75 text-xs text-white font-medium text-center">
                      Apuntá directo a la fecha impresa en el envase
                    </span>
                  </div>

                  {/* OCR Camera Controls */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
                    <button
                      type="button"
                      onClick={() => {
                        stopCamera();
                        setOcrCameraActive(false);
                      }}
                      className="px-3 py-1.5 rounded-xl bg-black/60 text-white text-xs font-medium border border-white/20"
                    >
                      Cancelar cámara
                    </button>

                    <button
                      type="button"
                      disabled={isOcrProcessing}
                      onClick={captureAndRecognizeDate}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 transition"
                    >
                      {isOcrProcessing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Leyendo...</span>
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          <span>Capturar Fecha</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* OCR Trigger Card */
                <div className="p-4 bg-white rounded-2xl border border-[#E7EBE5] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-100">
                      <Camera className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-[#174A36]">Lectura inteligente con cámara</h4>
                      <p className="text-[11px] text-[#78847C]">Detecta "VTO", "EXP", DD/MM/AAAA o meses en texto</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => ocrFileInputRef.current?.click()}
                      className="px-3 py-2 rounded-xl bg-[#F8F9F6] hover:bg-[#F1F4EE] border border-[#E7EBE5] text-xs font-semibold text-[#174A36] transition flex items-center gap-1.5"
                      title="Subir foto del vencimiento"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-[#246B4D]" />
                      <span>Foto</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => startDateOcrCamera()}
                      className="px-3.5 py-2 rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-bold shadow-xs transition flex items-center gap-1.5"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Apuntar cámara</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Hidden file input for OCR photo */}
              <input
                ref={ocrFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleDatePhotoUpload}
              />

              {/* OCR Error notification */}
              {ocrErrorMessage && (
                <div className="p-3 bg-[#FFF3D9] border border-[#FBEAC4] rounded-2xl text-xs text-[#A66B16] flex items-center justify-between gap-2">
                  <span>{ocrErrorMessage}</span>
                  <button onClick={() => setOcrErrorMessage(null)} className="p-1">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* OCR Detected success badge */}
              {ocrDetectedResult?.detected && (
                <div className="p-3 bg-[#EAF3EC] border border-[#CDE3D2] rounded-2xl flex items-center justify-between text-xs text-[#174A36]">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#246B4D]" />
                    <span className="font-semibold">Fecha detectada en envase: <strong>{ocrDetectedResult.displayDate}</strong></span>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-white text-[#246B4D] border border-[#CDE3D2] font-bold uppercase">
                    {ocrDetectedResult.confidence === 'high' ? 'Alta precisión' : 'Verificada'}
                  </span>
                </div>
              )}

              {/* Date Input & Quick Presets */}
              <div className="p-4 bg-white rounded-2xl border border-[#E7EBE5] shadow-xs space-y-3">
                <label className="block text-xs font-bold text-[#174A36]">
                  Fecha de vencimiento *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={expirationDate}
                    onChange={(e) => setExpirationDate(e.target.value)}
                    className="w-full px-4 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-sm font-semibold text-[#174A36] focus:outline-none focus:border-[#246B4D]"
                  />
                  {expirationDate && (
                    <div className="mt-1.5 flex items-center gap-1.5">
                      {(() => {
                        const days = calculateDaysRemaining(expirationDate);
                        const status = getExpirationStatus(days);
                        const badge = getStatusLabel(status, days);
                        return (
                          <span className={`text-[11px] px-2 py-0.5 rounded-md font-semibold ${badge.badgeClass}`}>
                            {badge.label}
                          </span>
                        );
                      })()}
                    </div>
                  )}
                </div>

                {/* Quick Presets Buttons */}
                <div>
                  <span className="block text-[11px] font-semibold text-[#78847C] mb-1.5">
                    O elegir plazo estimado rápido:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => applyDatePreset(7)}
                      className="px-2.5 py-1 bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] rounded-lg text-xs font-medium text-[#174A36] transition"
                    >
                      +7 días
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(15)}
                      className="px-2.5 py-1 bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] rounded-lg text-xs font-medium text-[#174A36] transition"
                    >
                      +15 días
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(30)}
                      className="px-2.5 py-1 bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] rounded-lg text-xs font-medium text-[#174A36] transition"
                    >
                      +1 mes
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(90)}
                      className="px-2.5 py-1 bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] rounded-lg text-xs font-medium text-[#174A36] transition"
                    >
                      +3 meses
                    </button>
                    <button
                      type="button"
                      onClick={() => applyDatePreset(180)}
                      className="px-2.5 py-1 bg-[#F8F9F6] hover:bg-[#EAF3EC] border border-[#E7EBE5] rounded-lg text-xs font-medium text-[#174A36] transition"
                    >
                      +6 meses
                    </button>
                  </div>
                </div>
              </div>

              {/* Quantity Stepper & Optional Lot Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quantity */}
                <div className="p-4 bg-white rounded-2xl border border-[#E7EBE5] shadow-xs">
                  <label className="block text-xs font-bold text-[#174A36] mb-2">
                    Cantidad a registrar
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setBatchQuantity(Math.max(1, batchQuantity - 1))}
                      className="w-10 h-10 rounded-xl bg-[#F1F4EE] hover:bg-[#E7EBE5] text-[#174A36] flex items-center justify-center font-bold transition active:scale-95"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={batchQuantity}
                      onChange={(e) => setBatchQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="flex-1 text-center font-extrabold text-lg text-[#174A36] bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl py-2 focus:outline-none focus:border-[#246B4D]"
                    />
                    <button
                      type="button"
                      onClick={() => setBatchQuantity(batchQuantity + 1)}
                      className="w-10 h-10 rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white flex items-center justify-center font-bold transition active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lot Number */}
                <div className="p-4 bg-white rounded-2xl border border-[#E7EBE5] shadow-xs">
                  <label className="block text-xs font-bold text-[#174A36] mb-2">
                    N° de Lote (opcional)
                  </label>
                  <input
                    type="text"
                    value={lotNumber}
                    onChange={(e) => setLotNumber(e.target.value)}
                    placeholder="Ej. L-241029"
                    className="w-full px-3.5 py-2.5 bg-[#F8F9F6] border border-[#E7EBE5] rounded-xl text-xs font-mono text-[#24372F] focus:outline-none focus:border-[#246B4D]"
                  />
                  <span className="block text-[10px] text-[#78847C] mt-1">Generado automáticamente si no tenés uno específico.</span>
                </div>
              </div>

              {/* Step 3 Actions */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setOcrCameraActive(false);
                    setStep('product_info');
                  }}
                  className="px-4 py-3 rounded-2xl bg-white border border-[#E7EBE5] text-xs font-semibold text-[#78847C] hover:text-[#174A36] transition flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Atrás</span>
                </button>

                <button
                  type="button"
                  disabled={!expirationDate || isSaving}
                  onClick={handleConfirmAndSave}
                  className="flex-1 py-3 px-4 bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Guardando en inventario...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>Guardar producto y lote</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* STEP 4: SUCCESS SUMMARY                                   */}
          {/* ========================================================= */}
          {step === 'saved_success' && savedProduct && savedBatch && (
            <div className="p-6 text-center space-y-4 animate-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-[#EAF3EC] text-[#246B4D] border-2 border-[#CDE3D2] mx-auto flex items-center justify-center shadow-md">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>

              <div>
                <h3 className="text-lg font-extrabold text-[#174A36]">¡Producto y lote agregados!</h3>
                <p className="text-xs text-[#78847C] mt-1">El stock y los vencimientos se actualizaron en tiempo real.</p>
              </div>

              {/* Summary Card */}
              <div className="p-4 bg-white rounded-2xl border border-[#E7EBE5] text-left shadow-xs space-y-2.5 max-w-sm mx-auto">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#174A36] truncate">{savedProduct.name}</span>
                  <span className="text-xs font-extrabold text-[#246B4D] bg-[#EAF3EC] px-2 py-0.5 rounded-lg">
                    +{savedBatch.quantity} {savedProduct.unit}
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-[#78847C] pt-2 border-t border-[#F1F4EE]">
                  <span>Vencimiento:</span>
                  <span className="font-semibold text-[#174A36]">{savedBatch.expirationDate}</span>
                </div>

                {savedBatch.lotNumber && (
                  <div className="flex items-center justify-between text-xs text-[#78847C]">
                    <span>Lote:</span>
                    <span className="font-mono text-[11px] text-[#24372F]">{savedBatch.lotNumber}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs text-[#78847C]">
                  <span>Estado:</span>
                  {(() => {
                    const days = calculateDaysRemaining(savedBatch.expirationDate);
                    const status = getExpirationStatus(days);
                    const badge = getStatusLabel(status, days);
                    return (
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold ${badge.badgeClass}`}>
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Success Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row gap-2 max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={handleScanAnother}
                  className="flex-1 py-3 px-4 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs sm:text-sm font-bold rounded-2xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <Scan className="w-4 h-4" />
                  <span>Escanear otro producto</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    onClose();
                  }}
                  className="px-4 py-3 bg-white hover:bg-[#F8F9F6] border border-[#E7EBE5] text-xs sm:text-sm font-bold text-[#174A36] rounded-2xl transition"
                >
                  Ver inventario
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
