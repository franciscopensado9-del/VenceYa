import React, { useState, useEffect, useCallback } from 'react';
import { 
  ActiveTab, 
  ProductWithBatches, 
  BatchWithProduct, 
  AppAlert, 
  SalesSuggestion, 
  StoreSettings, 
  Product, 
  Batch 
} from './types';
import { storageService } from './services/storage';
import { firestoreSyncService } from './services/firestoreSync';
import { BarcodeLookupResult } from './services/barcode';
import { useAuth } from './contexts/AuthContext';
import { Sidebar } from './components/common/Sidebar';
import { TopBar } from './components/common/TopBar';
import { BottomNav } from './components/common/BottomNav';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { DemoConfirmModal } from './components/common/DemoConfirmModal';
import { DemoExitModal } from './components/common/DemoExitModal';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { ExpirationsView } from './components/expirations/ExpirationsView';
import { AlertsView } from './components/alerts/AlertsView';
import { SuggestionsView } from './components/suggestions/SuggestionsView';
import { ResultsView } from './components/results/ResultsView';
import { SettingsView } from './components/settings/SettingsView';
import { LoginView } from './components/auth/LoginView';
import { RegisterView } from './components/auth/RegisterView';
import { WelcomeOnboardingModal } from './components/auth/WelcomeOnboardingModal';
import { BarcodeScannerModal } from './components/scanner/BarcodeScannerModal';
import { ProductFormModal } from './components/products/ProductFormModal';
import { ProductDetailModal } from './components/products/ProductDetailModal';
import { Sprout, RotateCcw, LogOut } from 'lucide-react';

export default function App() {
  const { user, userProfile, loading: authLoading, isNewUser } = useAuth();
  const [authView, setAuthView] = useState<'login' | 'register'>('login');
  const [isGuest, setIsGuest] = useState(false);

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Demo Mode States
  const [isDemoMode, setIsDemoMode] = useState<boolean>(storageService.isDemoActive());
  const [isConfirmDemoOpen, setIsConfirmDemoOpen] = useState(false);
  const [isExitDemoOpen, setIsExitDemoOpen] = useState(false);

  // Application Data States
  const [productsWithBatches, setProductsWithBatches] = useState<ProductWithBatches[]>([]);
  const [batchesWithProduct, setBatchesWithProduct] = useState<BatchWithProduct[]>([]);
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [suggestions, setSuggestions] = useState<SalesSuggestion[]>([]);
  const [settings, setSettings] = useState<StoreSettings>(storageService.getSettings());

  // Modal Control States
  const [isScanOpen, setIsScanOpen] = useState(false);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [productToEdit, setProductToEdit] = useState<Product | null>(null);
  const [initialBarcode, setInitialBarcode] = useState<string>('');
  const [lookupData, setLookupData] = useState<BarcodeLookupResult | undefined>(undefined);
  const [selectedProductForDetail, setSelectedProductForDetail] = useState<ProductWithBatches | null>(null);

  // Load and refresh all datasets
  const loadData = useCallback(() => {
    const pwb = storageService.getProductsWithBatches();
    const bwp = storageService.getAllBatchesWithProduct();
    const alts = storageService.getAlerts();
    const suggs = storageService.getSalesSuggestions();
    const stts = storageService.getSettings();

    setProductsWithBatches(pwb);
    setBatchesWithProduct(bwp);
    setAlerts(alts);
    setSuggestions(suggs);
    setSettings(stts);

    // Keep selected product in sync if detail modal is open
    setSelectedProductForDetail(current => {
      if (!current) return null;
      return pwb.find(p => p.id === current.id) || null;
    });
  }, []);

  // Update store context when user profile changes
  useEffect(() => {
    if (!storageService.isDemoActive()) {
      storageService.setStoreContext(userProfile?.storeId || (user ? user.uid : 'guest'));
      loadData();
    }
  }, [user, userProfile?.storeId, loadData]);

  // Initial load & storage sync
  useEffect(() => {
    loadData();

    // Listen to changes in other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key?.startsWith('venceya_')) {
        loadData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [loadData]);

  // Firestore Real-Time Cloud Synchronization
  // STRICT DATA ISOLATION: Cloud data only applies to real user session; NEVER mixes with demo mode.
  useEffect(() => {
    if (!user || !userProfile?.storeId) return;

    const storeId = userProfile.storeId;

    // Listen to cloud store changes
    const unsubscribers = firestoreSyncService.subscribeToStore(storeId, {
      onProducts: (cloudProducts) => {
        // Only update local store if not exploring in demo mode
        if (!storageService.isDemoActive()) {
          const currentBatches = storageService.getBatches();
          storageService.setCloudData(cloudProducts, currentBatches);
          loadData();
        }
      },
      onBatches: (cloudBatches) => {
        if (!storageService.isDemoActive()) {
          const currentProducts = storageService.getProducts();
          storageService.setCloudData(currentProducts, cloudBatches);
          loadData();
        }
      },
      onSettings: (cloudSettings) => {
        if (!storageService.isDemoActive()) {
          storageService.saveSettings(cloudSettings);
          setSettings(cloudSettings);
          loadData();
        }
      },
      onError: (err) => {
        console.warn('Firestore subscription warning:', err);
      }
    });

    return () => {
      unsubscribers.unsubStore();
      unsubscribers.unsubProducts();
      unsubscribers.unsubBatches();
      unsubscribers.unsubAlerts();
    };
  }, [user, userProfile?.storeId, loadData]);

  // --- DEMO MODE HANDLERS ---
  const handleOpenDemoModal = () => {
    setIsConfirmDemoOpen(true);
  };

  const handleConfirmStartDemo = () => {
    storageService.enableDemoMode();
    setIsDemoMode(true);
    loadData();
  };

  const handleRequestExitDemo = () => {
    if (storageService.hasDemoChanges()) {
      setIsExitDemoOpen(true);
    } else {
      handleDirectExitDemo();
    }
  };

  const handleDirectExitDemo = () => {
    storageService.disableDemoMode();
    setIsDemoMode(false);
    // Reload user's real store data
    storageService.setStoreContext(userProfile?.storeId || (user ? user.uid : 'guest'));
    loadData();
  };

  const handleResetDemoData = () => {
    storageService.resetDemoData();
    loadData();
  };

  // Handle barcode scanned from camera or image
  const handleBarcodeDetected = (
    barcode: string, 
    lookup?: BarcodeLookupResult, 
    existingProduct?: Product
  ) => {
    setIsScanOpen(false);

    if (existingProduct) {
      const full = productsWithBatches.find(p => p.id === existingProduct.id);
      if (full) {
        setSelectedProductForDetail(full);
        return;
      }
    }

    // New product flow
    setProductToEdit(null);
    setInitialBarcode(barcode);
    setLookupData(lookup);
    setIsProductFormOpen(true);
  };

  const handleOpenManualAdd = () => {
    setProductToEdit(null);
    setInitialBarcode('');
    setLookupData(undefined);
    setIsProductFormOpen(true);
  };

  const handleOpenScan = () => {
    setIsScanOpen(true);
  };

  const handleEditProduct = (product: Product) => {
    setProductToEdit(product);
    setInitialBarcode(product.barcode || '');
    setLookupData(undefined);
    setIsProductFormOpen(true);
  };

  // Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#F8F9F6] flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-14 h-14 rounded-3xl bg-[#EAF3EC] text-[#246B4D] flex items-center justify-center mb-4 shadow-xs animate-bounce">
          <Sprout className="w-8 h-8 stroke-[2.2]" />
        </div>
        <h1 className="text-2xl font-extrabold text-[#174A36] lowercase tracking-tight">venceya</h1>
        <p className="text-xs text-[#78847C] mt-1 font-medium">Iniciando aplicación...</p>
      </div>
    );
  }

  // Not logged in and not guest: Show Login / Register
  if (!user && !isGuest) {
    if (authView === 'register') {
      return <RegisterView onSwitchToLogin={() => setAuthView('login')} />;
    }
    return (
      <LoginView 
        onSwitchToRegister={() => setAuthView('register')} 
        onContinueAsGuest={() => setIsGuest(true)}
      />
    );
  }

  const unreadAlertsCount = alerts.filter(a => !a.isRead && !a.isDismissed).length;
  const criticalAlertsCount = alerts.filter(a => !a.isRead && !a.isDismissed && a.urgency === 'critical').length;

  return (
    <div className="min-h-screen bg-[#F8F9F6] text-[#24372F] flex flex-col font-sans selection:bg-[#246B4D] selection:text-white">
      {/* Desktop Persistent Fixed Left Sidebar & Mobile Drawer */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadAlertsCount={unreadAlertsCount}
        settings={settings}
        onOpenAddProduct={handleOpenManualAdd}
        onOpenScan={handleOpenScan}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isDemoMode={isDemoMode}
        onOpenDemo={handleOpenDemoModal}
        onExitDemo={handleRequestExitDemo}
      />

      {/* Main Workspace Column */}
      <div className="lg:pl-[270px] flex-1 flex flex-col min-w-0">
        {/* Top Bar Navigation */}
        <TopBar
          onToggleMobileMenu={() => setIsMobileSidebarOpen(true)}
          unreadAlertsCount={unreadAlertsCount}
          criticalAlertsCount={criticalAlertsCount}
          settings={settings}
          setActiveTab={setActiveTab}
          isDemoMode={isDemoMode}
          onOpenDemo={handleOpenDemoModal}
          onExitDemo={handleRequestExitDemo}
        />

        {/* Permanent Banner: MODO DEMO */}
        {isDemoMode && (
          <div className="bg-[#FFF3D9] border-b border-[#FBEAC4] text-[#A66B16] px-4 sm:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-[#A66B16] text-white shrink-0 shadow-2xs">
                MODO DEMO
              </span>
              <span className="text-xs sm:text-sm font-medium">
                Estás viendo datos de ejemplo para explorar las funciones de VenceYa. Tus datos reales están separados y protegidos.
              </span>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
              <button
                type="button"
                onClick={handleResetDemoData}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8F9F6] border border-[#FBEAC4] text-xs font-semibold text-[#A66B16] transition flex items-center gap-1.5 shadow-2xs"
                title="Recuperar conjunto inicial de ejemplos"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer demo</span>
              </button>
              <button
                type="button"
                onClick={handleRequestExitDemo}
                className="px-3 py-1.5 rounded-xl bg-[#246B4D] hover:bg-[#174A36] text-white text-xs font-semibold transition flex items-center gap-1.5 shadow-xs"
                title="Salir y volver a mis datos reales"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Salir de demo</span>
              </button>
            </div>
          </div>
        )}

        {/* Guest Mode Notice banner if exploring demo without login */}
        {isGuest && !user && !isDemoMode && (
          <div className="bg-[#EAF3EC] border-b border-[#D5E8D7] px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs text-[#174A36] font-medium">
            <div className="flex items-center gap-2">
              <span className="font-bold px-2 py-0.5 rounded-full bg-white text-[#246B4D] border border-[#D5E8D7]">Modo Local</span>
              <span>Iniciá sesión o registrate para guardar y sincronizar tu comercio en la nube de Firebase.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsGuest(false)}
              className="px-3 py-1 bg-[#246B4D] hover:bg-[#174A36] text-white font-semibold rounded-xl text-xs transition shrink-0 ml-3 shadow-2xs"
            >
              Iniciar sesión
            </button>
          </div>
        )}

        {/* Viewport Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-8 pb-28 lg:pb-12">
          {activeTab === 'dashboard' && (
            <DashboardView
              productsWithBatches={productsWithBatches}
              batchesWithProduct={batchesWithProduct}
              suggestions={suggestions}
              settings={settings}
              setActiveTab={setActiveTab}
              onOpenScan={handleOpenScan}
              onOpenManualAdd={handleOpenManualAdd}
              onSelectProduct={p => setSelectedProductForDetail(p)}
              onRefresh={loadData}
              isDemoMode={isDemoMode}
              onOpenDemo={handleOpenDemoModal}
              onExitDemo={handleRequestExitDemo}
            />
          )}

          {activeTab === 'products' && (
            <ProductsView
              productsWithBatches={productsWithBatches}
              onRefresh={loadData}
              onOpenManualAdd={handleOpenManualAdd}
              onOpenScan={handleOpenScan}
              onSelectProduct={p => setSelectedProductForDetail(p)}
              onEditProduct={p => handleEditProduct(p)}
              isDemoMode={isDemoMode}
              onOpenDemo={handleOpenDemoModal}
            />
          )}

          {activeTab === 'expirations' && (
            <ExpirationsView
              batchesWithProduct={batchesWithProduct}
              productsWithBatches={productsWithBatches}
              onRefresh={loadData}
              onSelectProduct={p => setSelectedProductForDetail(p)}
            />
          )}

          {activeTab === 'alerts' && (
            <AlertsView
              alerts={alerts}
              settings={settings}
              productsWithBatches={productsWithBatches}
              onRefresh={loadData}
              onUpdateSettings={s => {
                if (userProfile?.storeId && !isDemoMode) {
                  firestoreSyncService.updateStoreSettings(userProfile.storeId, s)
                    .catch(err => console.warn('Cloud update settings err:', err));
                }
                storageService.saveSettings(s);
                loadData();
              }}
              onSelectProduct={p => setSelectedProductForDetail(p)}
            />
          )}

          {activeTab === 'suggestions' && (
            <SuggestionsView
              suggestions={suggestions}
              productsWithBatches={productsWithBatches}
              settings={settings}
              onSelectProduct={p => setSelectedProductForDetail(p)}
            />
          )}

          {activeTab === 'results' && (
            <ResultsView
              productsWithBatches={productsWithBatches}
              batchesWithProduct={batchesWithProduct}
              settings={settings}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              settings={settings}
              onUpdateSettings={s => {
                if (userProfile?.storeId && !isDemoMode) {
                  firestoreSyncService.updateStoreSettings(userProfile.storeId, s)
                    .catch(err => console.warn('Cloud update settings err:', err));
                }
                storageService.saveSettings(s);
                loadData();
              }}
              onRefreshData={loadData}
              isDemoMode={isDemoMode}
              onOpenDemo={handleOpenDemoModal}
              onExitDemo={handleRequestExitDemo}
            />
          )}
        </main>
      </div>

      {/* Mobile Ergonomic Bottom Tab Navigation */}
      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadAlertsCount={unreadAlertsCount}
      />

      {/* Non-intrusive Offline Toast */}
      <OfflineIndicator />

      {/* First-time User Welcome Modal */}
      <WelcomeOnboardingModal
        isOpen={isNewUser}
        onOpenAddProduct={handleOpenManualAdd}
        onExplore={() => {}}
      />

      {/* Demo Confirmation Modal */}
      <DemoConfirmModal
        isOpen={isConfirmDemoOpen}
        onClose={() => setIsConfirmDemoOpen(false)}
        onConfirm={handleConfirmStartDemo}
      />

      {/* Demo Exit Modal */}
      <DemoExitModal
        isOpen={isExitDemoOpen}
        hasChanges={storageService.hasDemoChanges()}
        onClose={() => setIsExitDemoOpen(false)}
        onConfirm={handleDirectExitDemo}
      />

      {/* Modals */}
      {isScanOpen && (
        <BarcodeScannerModal
          isOpen={isScanOpen}
          onClose={() => setIsScanOpen(false)}
          onBarcodeDetected={handleBarcodeDetected}
          onSwitchToManual={() => {
            setIsScanOpen(false);
            handleOpenManualAdd();
          }}
        />
      )}

      {isProductFormOpen && (
        <ProductFormModal
          isOpen={isProductFormOpen}
          onClose={() => {
            setIsProductFormOpen(false);
            setProductToEdit(null);
          }}
          onSuccess={() => {
            loadData();
          }}
          productToEdit={productToEdit}
          initialBarcode={initialBarcode}
          lookupData={lookupData}
        />
      )}

      {selectedProductForDetail && (
        <ProductDetailModal
          isOpen={!!selectedProductForDetail}
          onClose={() => setSelectedProductForDetail(null)}
          productWithBatches={selectedProductForDetail}
          onRefresh={loadData}
          onEditProduct={() => {
            const p = selectedProductForDetail;
            setSelectedProductForDetail(null);
            handleEditProduct(p);
          }}
          onDeleteProduct={() => {
            if (userProfile?.storeId && !isDemoMode) {
              firestoreSyncService.deleteProduct(userProfile.storeId, selectedProductForDetail.id)
                .catch(err => console.warn('Cloud delete product err:', err));
            }
            storageService.deleteProduct(selectedProductForDetail.id);
            setSelectedProductForDetail(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
