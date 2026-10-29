import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Camera, X, Flashlight, RefreshCw, AlertCircle, Search, Keyboard, Check, Loader2, Image as ImageIcon, ArrowRight } from 'lucide-react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { soundService } from '../../services/sound';
import { lookupBarcodeInOpenFoodFacts, BarcodeLookupResult } from '../../services/barcode';
import { storageService } from '../../services/storage';
import { Product } from '../../types';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string, lookupInfo?: BarcodeLookupResult, existingProduct?: Product) => void;
  onSwitchToManual: () => void;
}

export const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({
  isOpen,
  onClose,
  onBarcodeDetected,
  onSwitchToManual,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const zxingReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [detectedCode, setDetectedCode] = useState<string | null>(null);
  const [lookupStatusText, setLookupStatusText] = useState<string>('Buscando información...');
  const [manualBarcode, setManualBarcode] = useState<string>('');
  const [showManualInput, setShowManualInput] = useState<boolean>(false);
  const [imageDecodingError, setImageDecodingError] = useState<string | null>(null);

  // Stop camera tracks cleanly
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (zxingReaderRef.current) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (zxingReaderRef.current as any).reset?.();
      } catch {
        // Ignore
      }
      zxingReaderRef.current = null;
    }
  }, []);

  const handleSuccessfulScan = useCallback(async (code: string) => {
    if (isProcessing) return;
    setIsProcessing(true);
    setDetectedCode(code);
    soundService.playScanSuccess();
    stopCamera();

    setLookupStatusText('Consultando inventario local y Open Food Facts...');

    // 1. Check local inventory
    const existingProduct = storageService.findProductByBarcode(code);

    // 2. Query Open Food Facts if not locally present or to complement
    let lookupInfo: BarcodeLookupResult | undefined = undefined;
    try {
      lookupInfo = await lookupBarcodeInOpenFoodFacts(code);
      if (lookupInfo.found && lookupInfo.name) {
        setLookupStatusText(`Producto encontrado: ${lookupInfo.name}`);
      } else if (existingProduct) {
        setLookupStatusText(`Encontrado en tu inventario: ${existingProduct.name}`);
      } else {
        setLookupStatusText('Código reconocido. Completá los datos del producto.');
      }
    } catch {
      setLookupStatusText('Código reconocido. Podés completar manualmente.');
    }

    // Small delay to let user see success visual feedback
    setTimeout(() => {
      onBarcodeDetected(code, lookupInfo, existingProduct);
    }, 650);
  }, [isProcessing, onBarcodeDetected, stopCamera]);

  // Start real camera stream
  const startCamera = useCallback(async (deviceId?: string) => {
    stopCamera();
    setErrorMessage(null);
    setImageDecodingError(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setHasPermission(false);
      setErrorMessage('La cámara no es soportada por este navegador o contexto.');
      return;
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: deviceId 
          ? { deviceId: { exact: deviceId } } 
          : { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      setHasPermission(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Check torch support
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

      // Launch ZXing multi format reader
      const reader = new BrowserMultiFormatReader();
      zxingReaderRef.current = reader;

      if (videoRef.current) {
        reader.decodeFromVideoElement(videoRef.current, (result) => {
          if (result && result.getText()) {
            handleSuccessfulScan(result.getText());
          }
        });
      }
    } catch (err: unknown) {
      setHasPermission(false);
      const error = err as { name?: string; message?: string };
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setErrorMessage('Permiso de cámara denegado. Habilitá el acceso a la cámara en el navegador o usá la carga manual.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setErrorMessage('No se encontró ninguna cámara conectada en este dispositivo.');
      } else {
        setErrorMessage('No se pudo inicializar la cámara: ' + (error.message || 'Error desconocido'));
      }
    }
  }, [handleSuccessfulScan, selectedDeviceId, stopCamera]);

  useEffect(() => {
    if (isOpen) {
      setIsProcessing(false);
      setDetectedCode(null);
      setShowManualInput(false);
      setImageDecodingError(null);
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, startCamera, stopCamera]);

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

  const switchCamera = () => {
    if (availableDevices.length <= 1) return;
    const currentIndex = availableDevices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % availableDevices.length;
    const nextDevice = availableDevices[nextIndex];
    setSelectedDeviceId(nextDevice.deviceId);
    startCamera(nextDevice.deviceId);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    handleSuccessfulScan(manualBarcode.trim());
  };

  // Decode barcode from an uploaded image file
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageDecodingError(null);
    try {
      const imageUrl = URL.createObjectURL(file);
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imageUrl);
      URL.revokeObjectURL(imageUrl);

      if (result && result.getText()) {
        handleSuccessfulScan(result.getText());
      } else {
        setImageDecodingError('No se pudo detectar un código nítido en la imagen. Probá con otra foto o ingresá el código manualmente.');
      }
    } catch {
      setImageDecodingError('No se encontró un código de barras legible en la imagen. Asegurate de que esté enfocado y bien iluminado.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white border border-[#E7EBE5] rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E7EBE5] bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center shrink-0">
              <Camera className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#174A36]">Escanear Código de Barras</h2>
              <p className="text-xs text-[#78847C]">Cámara en vivo o captura de código EAN / UPC</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-[#78847C] hover:text-[#174A36] hover:bg-[#F8F9F6] transition"
            aria-label="Cerrar escáner"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport / Video Area */}
        <div className="relative flex-1 bg-black min-h-[300px] sm:min-h-[360px] flex items-center justify-center overflow-hidden">
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
                  onClick={() => startCamera()}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition"
                >
                  Reintentar permiso de cámara
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-xl transition flex items-center justify-center gap-2"
                >
                  <ImageIcon className="w-4 h-4 text-[#246B4D]" />
                  <span>Subir foto con código de barras</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualInput(true)}
                  className="w-full px-4 py-2 bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold rounded-xl transition"
                >
                  Ingresar código manualmente
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Camera Video Stream */}
              <video
                ref={videoRef}
                playsInline
                autoPlay
                muted
                className="w-full h-full object-cover"
              />

              {/* Viewfinder Target Reticle */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-6">
                <div className="relative w-64 h-44 sm:w-72 sm:h-48 border-2 border-emerald-400/80 rounded-2xl overflow-hidden shadow-2xl backdrop-contrast-125">
                  {/* Scanning Laser Beam */}
                  <div className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-pulse transition-all" 
                       style={{ top: '50%' }} />

                  {/* Corner brackets */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-emerald-300" />
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-emerald-300" />
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-emerald-300" />
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-emerald-300" />
                </div>
                <span className="mt-4 px-3.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-xs text-white font-medium tracking-wide">
                  {isProcessing ? 'Procesando código...' : 'Centrá las barras en el recuadro'}
                </span>
              </div>

              {/* Success scan overlay */}
              {detectedCode && (
                <div className="absolute inset-0 bg-[#174A36]/90 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 z-20">
                  <div className="w-14 h-14 rounded-full bg-[#246B4D] text-white flex items-center justify-center mb-3 shadow-lg">
                    <Check className="w-8 h-8 stroke-[3]" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-1">¡Código Detectado!</h3>
                  <p className="font-mono text-emerald-200 text-base font-bold tracking-wider">{detectedCode}</p>
                  <p className="text-xs text-emerald-100/90 mt-2 flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                    <span>{lookupStatusText}</span>
                  </p>
                </div>
              )}

              {/* Live camera controls (Torch, Switch Camera, Photo Upload) */}
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
                <div className="flex items-center gap-2">
                  {torchSupported && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2.5 rounded-xl backdrop-blur-md border transition ${
                        torchOn 
                          ? 'bg-amber-500 text-white border-amber-400' 
                          : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                      }`}
                      aria-label="Encender linterna"
                      title="Linterna"
                    >
                      <Flashlight className="w-4 h-4" />
                    </button>
                  )}
                  {availableDevices.length > 1 && (
                    <button
                      type="button"
                      onClick={switchCamera}
                      className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition"
                      aria-label="Cambiar cámara"
                      title="Cambiar cámara"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-white hover:bg-black/80 transition"
                    aria-label="Cargar foto de código"
                    title="Subir foto de código"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setShowManualInput(!showManualInput)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/60 backdrop-blur-md border border-white/20 text-xs font-medium text-white hover:bg-black/80 transition"
                >
                  <Keyboard className="w-3.5 h-3.5" />
                  <span>Teclado / Lector USB</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Hidden File Input for Image Scanning */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        {/* Image decoding error alert */}
        {imageDecodingError && (
          <div className="p-3 bg-[#FCEBE5] border-t border-[#F5C2B6] text-[#C6533A] text-xs flex items-center justify-between gap-2 font-medium">
            <span>{imageDecodingError}</span>
            <button
              onClick={() => setImageDecodingError(null)}
              className="text-[#C6533A] hover:opacity-70 p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Manual Barcode Input drawer */}
        {showManualInput && (
          <form onSubmit={handleManualSubmit} className="p-4 bg-[#F8F9F6] border-t border-[#E7EBE5]">
            <label htmlFor="manual-barcode-input" className="block text-xs font-semibold text-[#174A36] mb-1.5">
              Ingresar código de barras manualmente o con lector USB:
            </label>
            <div className="flex gap-2">
              <input
                id="manual-barcode-input"
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Ej. 7790010001234"
                className="flex-1 px-3.5 py-2 bg-white border border-[#E7EBE5] rounded-2xl text-sm text-[#24372F] placeholder-[#78847C]/60 focus:outline-none focus:border-[#246B4D] font-mono"
                autoFocus
              />
              <button
                type="submit"
                disabled={!manualBarcode.trim()}
                className="px-4 py-2 bg-[#246B4D] hover:bg-[#174A36] disabled:opacity-50 text-white text-xs font-semibold rounded-2xl transition flex items-center gap-1.5 shadow-xs"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Buscar</span>
              </button>
            </div>
          </form>
        )}

        {/* Bottom Actions */}
        <div className="p-4 bg-white border-t border-[#E7EBE5] flex items-center justify-between gap-3">
          <p className="text-xs text-[#78847C]">
            ¿Preferís cargar todos los datos sin escáner?
          </p>
          <button
            type="button"
            onClick={() => {
              stopCamera();
              onSwitchToManual();
            }}
            className="px-3.5 py-2 text-xs font-semibold text-[#246B4D] hover:text-[#174A36] hover:bg-[#EAF3EC] rounded-2xl transition whitespace-nowrap flex items-center gap-1"
          >
            <span>Ir a carga manual</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
