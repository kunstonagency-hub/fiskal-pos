import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Settings, Package, Users, PlusCircle, Trash2, Minus, Plus, RefreshCw, History, UserCheck, CreditCard, X, FileText, Eye, Clock, AlertCircle, CheckCircle, Play, DollarSign, AlertTriangle, Edit2, QrCode, Lock, Unlock, ShieldAlert, Barcode, Image as ImageIcon, Wifi, WifiOff, UploadCloud, Search, Store, MapPin, Phone, Mail, LogOut, Key, User, MessageCircle, Award, HardDrive, UserPlus, Camera, DollarSign as DollarIcon, Percent, TrendingUp, Activity, PieChart, Check, FileCheck } from 'lucide-react';
import { supabase } from './supabase';
import { initDB, queueOfflineAction, getOfflineActions, clearOfflineAction, getOfflineSales, clearOfflineSale } from './db';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './App.css';
import logoDark from './assets/logo_2.png'; 
import logoLight from './assets/logo.svg'; 

const venezuelaCitiesMap = {
  "caracas": "Distrito Capital",
  "los teques": "Miranda",
  "guarenas": "Miranda",
  "guatire": "Miranda",
  "maracaibo": "Zulia",
  "valencia": "Carabobo",
  "barquisimeto": "Lara",
  "maracay": "Aragua",
  "san cristóbal": "Táchira",
  "san cristobal": "Táchira",
  "puerto la cruz": "Anzoátegui",
  "barcelona": "Anzoátegui",
  "maturín": "Monagas",
  "maturin": "Monagas",
  "barinas": "Barinas",
  "ciudad bolívar": "Bolívar",
  "ciudad bolivar": "Bolívar",
  "puerto ordaz": "Bolívar",
  "porlamar": "Nueva Esparta",
  "margarita": "Nueva Esparta",
  "coro": "Falcón",
  "punto fijo": "Falcón",
  "mérida": "Mérida",
  "merida": "Mérida",
  "san felipe": "Yaracuy",
  "guanare": "Portuguesa",
  "trujillo": "Trujillo",
  "valera": "Trujillo",
  "tucupita": "Delta Amacuro",
  "puerto ayacucho": "Amazonas",
  "san fernando de apure": "Apure",
  "la guaira": "La Guaira",
  "carora": "Lara",
  "carúpano": "Sucre",
  "carupano": "Sucre",
  "cumaná": "Sucre",
  "cumana": "Sucre"
};

const formatWhatsAppNumber = (phoneStr) => {
  if (!phoneStr) return '584120000000';
  let clean = phoneStr.replace(/\D/g, '');
  if (clean.startsWith('0')) {
    clean = '58' + clean.substring(1);
  } else if (!clean.startsWith('58')) {
    clean = '58' + clean;
  }
  return clean;
};

const compressImage = (file, maxWidth = 800, quality = 0.7) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Error al comprimir la imagen'));
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        }, 'image/jpeg', quality);
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

function App() {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const [activeTab, setActiveTab] = useState('pos');
  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);
  const [clients, setClients] = useState([]);
  const [registers, setRegisters] = useState([]); 
  const [bcvRate, setBcvRate] = useState(0);
  const [loadingRate, setLoadingRate] = useState(false);
  const [lastSync, setLastSync] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [processing, setProcessing] = useState(false);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState('cajero');
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [currentStoreName, setCurrentStoreName] = useState('Fiskal Store');
  
  // NUEVOS ESTADOS: Máscaras y Tipos de Comercio
  const [currentStoreType, setCurrentStoreType] = useState('standard'); // 'standard' | 'restaurant'
  const [adminDemoMask, setAdminDemoMask] = useState('standard'); // Para la demo del super_admin
  const [selectedRestaurantCategory, setSelectedRestaurantCategory] = useState(null); 
  
  const [adminStores, setAdminStores] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Variables SaaS / Settings
  const [baseMonthlyPrice, setBaseMonthlyPrice] = useState(30);
  const [globalPromoDiscount, setGlobalPromoDiscount] = useState(0);
  const [savingSettings, setSavingSettings] = useState(false);

  // Configuraciones de Factura SaaS
  const [saasInvoiceHeader, setSaasInvoiceHeader] = useState('');
  const [saasInvoiceFooter, setSaasInvoiceFooter] = useState('');

// ⬇️ NUEVO ESTADO: Notificación global de pedidos listos ⬇️
  const [readyNotification, setReadyNotification] = useState(null);

  // Estados del Modal de Pre-Facturación SaaS
  const [showPreInvoiceModal, setShowPreInvoiceModal] = useState(false);
  const [preInvoiceStore, setPreInvoiceStore] = useState(null);
  const [preInvoiceExtraDesc, setPreInvoiceExtraDesc] = useState('');
  const [preInvoiceExtraAmount, setPreInvoiceExtraAmount] = useState('');
  const [preInvoiceDiscount, setPreInvoiceDiscount] = useState('');

  const [systemVendors, setSystemVendors] = useState([]);
  const [saasTransactions, setSaasTransactions] = useState([]);
  const [newVendorName, setNewVendorName] = useState('');
  const [newVendorEmail, setNewVendorEmail] = useState('');
  const [newVendorPhone, setNewVendorPhone] = useState('');
  const [creatingVendor, setCreatingVendor] = useState(false);
  
  const [showVendorStoreModal, setShowVendorStoreModal] = useState(false);
  const [vendorStoreName, setVendorStoreName] = useState('');
  const [vendorStoreRif, setVendorStoreRif] = useState('');
  const [vendorOwnerName, setVendorOwnerName] = useState('');
  const [vendorOwnerPhone, setVendorOwnerPhone] = useState('');
  const [vendorOwnerEmail, setVendorOwnerEmail] = useState('');
  const [vendorPaidAdvance, setVendorPaidAdvance] = useState(false);
  const [vendorNewStoreType, setVendorNewStoreType] = useState('standard'); // Selector para Vendedores de Sistema

  const [showDailyTrialAlert, setShowDailyTrialAlert] = useState(false);
  const [trialAlertData, setTrialAlertData] = useState({ isTrial: true, daysLeft: 10, expired: false });

  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPass, setNewEmpPass] = useState('');
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  
  const [editingStore, setEditingStore] = useState(null);
  const [storeName, setStoreName] = useState('');
  const [storeRif, setStoreRif] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [ownerDoc, setOwnerDoc] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeCity, setStoreCity] = useState('');
  const [storeState, setStoreState] = useState('');
  const [storePaidAdvance, setStorePaidAdvance] = useState(false);
  const [storeCustomDiscount, setStoreCustomDiscount] = useState(0); 
  const [newStoreType, setNewStoreType] = useState('standard'); // Selector para Super Admin

  const [productModifiers, setProductModifiers] = useState(['Cebolla', 'Papa', 'Queso', 'Salsas']); // Etiquetas base
  const [newModifierText, setNewModifierText] = useState(''); // Texto para agregar nueva etiqueta
  const [showModifierModal, setShowModifierModal] = useState(false);
  const [productForModifiers, setProductForModifiers] = useState(null);
  const [dynamicToggles, setDynamicToggles] = useState({}); // Toggles dinámicos

const confirmAddToCartWithModifiers = () => {
  if (!productForModifiers) return;

  // 1. Definimos primero el identificador único para evitar errores de referencia
  const cartItemId = `${productForModifiers.id}_mod_${Date.now()}`;

  // 2. Verificamos cuáles desmarcó el usuario (los que están en false)
  const excluded = Object.keys(dynamicToggles).filter(k => !dynamicToggles[k]);
  let customizationText = "Con todo";
  
  if (excluded.length > 0) {
    customizationText = excluded.map(item => `Sin ${item}`).join(', ');
  }

  // 3. Creamos el ítem para añadirlo al carrito con todas sus propiedades seguras
  const itemToAdd = {
    ...productForModifiers,
    cartItemId,
    quantity: 1,
    customization: customizationText
  };

  setCart([...cart, itemToAdd]);
  setShowModifierModal(false);
  setProductForModifiers(null);
};

  const handleOpenModifierModal = (prod) => {
    setProductForModifiers(prod);
    
    // Leemos las etiquetas que guardaste en este producto específico
    let modsArray = ['Cebolla', 'Papa', 'Queso', 'Salsas'];
    if (prod.modifiers) {
      modsArray = typeof prod.modifiers === 'string' 
        ? prod.modifiers.split(',').map(s => s.trim()).filter(Boolean) 
        : prod.modifiers;
    }

    // Por defecto todos empiezan marcados ("Con todo")
    const initialToggles = {};
    modsArray.forEach(m => {
      initialToggles[m] = true;
    });

    setDynamicToggles(initialToggles);
    setShowModifierModal(true);
  };

const handleOpenWeightModal = (prod) => {
  setProductForWeight(prod);
  setWeightValue('1');
  setWeightUnit(prod.modifiers && prod.modifiers[0] ? prod.modifiers[0] : 'kg');
  setShowWeightModal(true);
};

const confirmAddToCartWithWeight = () => {
  if (!productForWeight) return;
  const val = parseFloat(weightValue) || 0;
  if (val <= 0) return;

  let finalItemPrice = productForWeight.price;
  let weightLabel = `${val} Kg`;

  if (weightUnit === 'g') {
    finalItemPrice = productForWeight.price * (val / 1000);
    weightLabel = `${val} g`;
  } else {
    finalItemPrice = productForWeight.price * val;
  }

  const weightedItem = {
    ...productForWeight,
    cartId: `${productForWeight.id}_weight_${Date.now()}`,
    price: finalItemPrice,
    quantity: 1,
    customNote: `Peso: ${weightLabel} (Base: $${productForWeight.price.toFixed(2)}/${weightUnit})`
  };

  setCart([...cart, weightedItem]);
  setShowWeightModal(false);
  setProductForWeight(null);
};

  const addProductModifierTag = () => {
    if (!newModifierText.trim()) return;
    if (productModifiers.includes(newModifierText.trim())) return;
    setProductModifiers([...productModifiers, newModifierText.trim()]);
    setNewModifierText('');
  };

  const removeProductModifierTag = (tagToRemove) => {
    setProductModifiers(productModifiers.filter(t => t !== tagToRemove));
  };

  const [showWeightModal, setShowWeightModal] = useState(false);
  const [productForWeight, setProductForWeight] = useState(null);
  const [weightValue, setWeightValue] = useState('1');
  const [weightUnit, setWeightUnit] = useState('kg');

  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [targetStoreForOwner, setTargetStoreForOwner] = useState(null);
  const [ownerModalEmail, setOwnerModalEmail] = useState('');
  const [ownerModalPass, setOwnerModalPass] = useState('');
  const [ownerModalName, setOwnerModalName] = useState('');
  const [creatingOwnerLoading, setCreatingOwnerLoading] = useState(false);

  const [newRegisterName, setNewRegisterName] = useState('');
  const [isMainRegister, setIsMainRegister] = useState(false);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflictState, setConflictState] = useState(null);

  const [selectedClient, setSelectedClient] = useState('Cliente General');
  
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickDocInput, setQuickDocInput] = useState('');

  const [clientFilterTab, setClientFilterTab] = useState('all');
  const [selectedClientDetail, setSelectedClientDetail] = useState(null);
  const [clientNotes, setClientNotes] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('fiskal_client_notes') || '{}');
    } catch (e) {
      return {};
    }
  });
  const [tempClientNote, setTempClientNote] = useState('');

  const [historyFilterType, setHistoryFilterType] = useState('all');
  const [historyCustomDate, setHistoryCustomDate] = useState('');

  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [showPrintCatalog, setShowPrintCatalog] = useState(false);

  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);

  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const [cameraScanError, setCameraScanError] = useState('');
  const html5QrCodeRef = useRef(null);

  const [currentShift, setCurrentShift] = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [openingFloatVes, setOpeningFloatVes] = useState('');
  const [selectedRegisterIdForOpen, setSelectedRegisterIdForOpen] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [actualCashUSD, setActualCashUSD] = useState('');
  const [actualCashBs, setActualCashBs] = useState('');
  const [shiftNotes, setShiftNotes] = useState('');

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payCashUSD, setPayCashUSD] = useState('');
  const [payCashBs, setPayCashBs] = useState('');
  const [payPagoMovil, setPayPagoMovil] = useState('');
  const [payZelle, setPayZelle] = useState('');
  const [payDebit, setPayDebit] = useState('');
  const [paymentRef, setPaymentRef] = useState('');

  const [calcPayments, setCalcPayments] = useState({
    cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0
  });

  const [settlingSale, setSettlingSale] = useState(null);

  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [invoiceHistory, setInvoiceHistory] = useState([]);

  const [showLabelModal, setShowLabelModal] = useState(false);
  const [labelProduct, setLabelProduct] = useState(null);

  const [editingProduct, setEditingProduct] = useState(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [category, setCategory] = useState('General');
  const [barcode, setBarcode] = useState('');
  
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  const [clientName, setClientName] = useState('');
  const [clientDoc, setClientDoc] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [loadingClient, setLoadingClient] = useState(false);

  const [plantillas, setPlantillas] = useState({
    reposicionStock: '¡Hola {cliente}! Te saludamos de {comercio}. Te contamos que el producto {producto} ya está disponible nuevamente en stock. ¿Te guardamos el tuyo?',
    promocionGeneral: '¡Hola {cliente}! Tenemos ofertas especiales hoy en {comercio} con el producto {producto}. ¡Visítanos o escríbenos para más detalles!',
  });
  const [mensajePersonalizadoTemp, setMensajePersonalizadoTemp] = useState('');
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('reposicionStock');
  const [modalProductId, setModalProductId] = useState('');
  const [modalClientName, setModalClientName] = useState('Cliente General');

// ⬇️ BLOQUE CORREGIDO: Escucha en tiempo real global (Sonido y Notificación) ⬇️
  useEffect(() => {
    if (!currentStoreId || !isOnline) return;

    const salesChannel = supabase
      .channel(`kds-live-updates-${currentStoreId}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'sales'
        },
        (payload) => {
          console.log('¡Movimiento detectado en tiempo real!', payload);
          
          const storeIdMatch = 
            (payload.new && String(payload.new.store_id) === String(currentStoreId)) || 
            (payload.old && String(payload.old.store_id) === String(currentStoreId));

          if (storeIdMatch) {
            // DETECCIÓN GLOBAL DE PEDIDO LISTO
            if (
              payload.new && 
              payload.old && 
              payload.new.status === 'ready' && 
              payload.old.status !== 'ready'
            ) {
              // 1. Reproducir sonido en TODOS los dispositivos
              try {
                const bell = new Audio('https://upload.wikimedia.org/wikipedia/commons/3/34/Sound_Effect_-_Door_Bell.ogg');
                bell.play().catch(err => console.log("Audio bloqueado por el navegador:", err));
              } catch(e) {}

              // 2. Mostrar alerta flotante
              const orderIdStr = String(payload.new.id);
              const orderNumber = orderIdStr.startsWith('local') ? 'Pendiente' : orderIdStr.slice(-4);
              setReadyNotification(`¡El pedido #${orderNumber} está listo para entregar!`);

              // 3. Ocultar la alerta tras 6 segundos
              setTimeout(() => {
                setReadyNotification(null);
              }, 6000);
            }

            // Refrescamos la lista de ventas instantáneamente
            fetchSales(currentStoreId);
          }
        }
      )
      .subscribe((status) => {
        console.log("Estatus de suscripción Realtime:", status);
      });

    return () => {
      // CORRECCIÓN: Limpieza limpia de Supabase v2
      supabase.removeChannel(salesChannel);
    };
  }, [currentStoreId, isOnline]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserProfileAndStore(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfileAndStore(session.user);
      } else {
        setCurrentStoreId(null);
        setCurrentStoreName('Fiskal Store');
        setCurrentStoreType('standard');
        setCurrentUserRole('cajero');
        setProducts([]);
        setSales([]);
        setClients([]);
        setRegisters([]);
        setCurrentShift(null);
      }
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPendingSales();
    loadGlobalSaasSettings();

    const savedTemplates = localStorage.getItem('fiskal_whatsapp_templates');
    if (savedTemplates) {
      try {
        setPlantillas(JSON.parse(savedTemplates));
      } catch (e) {
        console.error('Error al cargar plantillas', e);
      }
    }

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline]);

// =================== FIN DEL BLOQUE 1 ===================
const loadGlobalSaasSettings = async () => {
    if(!navigator.onLine) return;
    try {
      const { data: priceData } = await supabase.from('settings').select('value').eq('key', 'base_monthly_price').maybeSingle();
      if(priceData) setBaseMonthlyPrice(parseFloat(priceData.value));
      
      const { data: promoData } = await supabase.from('settings').select('value').eq('key', 'global_discount').maybeSingle();
      if(promoData) setGlobalPromoDiscount(parseFloat(promoData.value));

      const { data: headerData } = await supabase.from('settings').select('value').eq('key', 'saas_invoice_header').maybeSingle();
      if(headerData) setSaasInvoiceHeader(headerData.value);

      const { data: footerData } = await supabase.from('settings').select('value').eq('key', 'saas_invoice_footer').maybeSingle();
      if(footerData) setSaasInvoiceFooter(footerData.value);

    } catch(e) {
      console.warn("Error loading SaaS settings", e);
    }
  };

  const handleSaveSaasSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      await supabase.from('settings').upsert({ key: 'base_monthly_price', value: baseMonthlyPrice, store_id: currentStoreId }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: 'global_discount', value: globalPromoDiscount, store_id: currentStoreId }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: 'saas_invoice_header', value: saasInvoiceHeader, store_id: currentStoreId }, { onConflict: 'key' });
      await supabase.from('settings').upsert({ key: 'saas_invoice_footer', value: saasInvoiceFooter, store_id: currentStoreId }, { onConflict: 'key' });

      alert("¡Configuraciones de la plataforma actualizadas con éxito!");
    } catch(e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const getCalculatedMonthlyPrice = (customDiscount, agreedPrice = null) => {
    if (agreedPrice !== null && agreedPrice !== undefined) {
       const disc = customDiscount || 0;
       return agreedPrice * (1 - (disc / 100));
    }
    const finalDiscountPercent = Math.max(globalPromoDiscount || 0, customDiscount || 0);
    return baseMonthlyPrice * (1 - (finalDiscountPercent / 100));
  };

  const checkStoreTrialAndExpiration = async (storeId) => {
    if (!storeId || storeId === 'null' || storeId === 'undefined') return;
    const sessionKey = `fiskal_trial_shown_${storeId}`;
    if (sessionStorage.getItem(sessionKey)) return;

    try {
      const { data: storeInfo, error } = await supabase.from('stores').select('*').eq('id', storeId).single();
      if (error || !storeInfo) return;

      const now = new Date().getTime();
      if (storeInfo.is_trial) {
        const trialEnd = new Date(storeInfo.trial_end_date || storeInfo.created_at).getTime();
        const timeLeft = trialEnd - now;
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        setTrialAlertData({ isTrial: true, daysLeft: daysLeft > 0 ? daysLeft : 0, expired: daysLeft <= 0 });
        setShowDailyTrialAlert(true);
        sessionStorage.setItem(sessionKey, 'true');
      } else if (storeInfo.subscription_expires_at) {
        const subEnd = new Date(storeInfo.subscription_expires_at).getTime();
        const timeLeft = subEnd - now;
        const daysLeft = Math.ceil(timeLeft / (1000 * 60 * 60 * 24));
        if (daysLeft <= 5) {
          setTrialAlertData({ isTrial: false, daysLeft: daysLeft > 0 ? daysLeft : 0, expired: daysLeft <= 0 });
          setShowDailyTrialAlert(true);
          sessionStorage.setItem(sessionKey, 'true');
        }
      }
    } catch (e) {
      console.warn("Error chequeando prueba o suscripción:", e);
    }
  };

const fetchUserProfileAndStore = async (user) => {
    try {
      let profile;
      if (navigator.onLine) {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (!data) {
          await new Promise(resolve => setTimeout(resolve, 1500));
          const retry = await supabase.from('profiles').select('*').eq('id', user.id).single();
          data = retry.data;
        }
        profile = data;
        if (profile) localStorage.setItem(`fiskal_cache_profile_${user.id}`, JSON.stringify(profile));
      } else {
        const cachedProfile = localStorage.getItem(`fiskal_cache_profile_${user.id}`);
        if (cachedProfile) profile = JSON.parse(cachedProfile);
      }

      if (!profile) {
        console.warn("No se encontró perfil para este usuario.");
        return;
      }

      let activeStoreId = profile.store_id;

      if (profile.role === 'super_admin') {
        if (navigator.onLine) {
          fetchAdminStores();
          fetchSystemVendors();
          fetchSaasTransactions();
          
          // Buscamos prioritariamente un comercio que contenga productos guardados para el super_admin
          const { data: prodStore } = await supabase.from('products').select('store_id').limit(1).maybeSingle();
          if (prodStore && prodStore.store_id) {
            activeStoreId = prodStore.store_id;
          } else if (!activeStoreId) {
            const { data: realStore } = await supabase.from('stores').select('id, name, store_type').order('created_at', { ascending: true }).limit(1).maybeSingle();
            if (realStore) {
              activeStoreId = realStore.id;
            }
          }
        }
      }

      if (activeStoreId && activeStoreId !== 'null' && activeStoreId !== 'undefined') {
        if (navigator.onLine) {
          const { data: storeInfo, error: storeErr } = await supabase.from('stores').select('name, is_active, store_type').eq('id', activeStoreId).single();
          
          if (storeInfo) {
            if (storeInfo.is_active === false) {
              alert("⚠️ Este comercio se encuentra suspendido por la administración. Acceso denegado.");
              await supabase.auth.signOut();
              return;
            }
            if (storeInfo.name) {
              setCurrentStoreName(storeInfo.name);
              setCurrentStoreType(storeInfo.store_type || 'standard');
              localStorage.setItem(`fiskal_cache_store_name_${activeStoreId}`, storeInfo.name);
              localStorage.setItem(`fiskal_cache_store_type_${activeStoreId}`, storeInfo.store_type || 'standard');
            }
          }
          checkStoreTrialAndExpiration(activeStoreId);
        } else {
          const cachedName = localStorage.getItem(`fiskal_cache_store_name_${activeStoreId}`);
          if (cachedName) setCurrentStoreName(cachedName);
          const cachedType = localStorage.getItem(`fiskal_cache_store_type_${activeStoreId}`);
          if (cachedType) setCurrentStoreType(cachedType);
        }
      }

      setCurrentStoreId(activeStoreId);
      setCurrentUserRole(profile.role || 'cajero');

      loadStoreData(activeStoreId, profile.role);

    } catch (error) {
      console.warn('Error en la configuración del perfil:', error.message);
    }
  };

  const loadStoreData = async (storeId, role) => {
    if (!storeId) return;
    await fetchRegisters(storeId);
    await fetchProducts(storeId);
    await fetchSales(storeId);
    await fetchClients(storeId);
    
    if (role === 'owner' || role === 'super_admin' || role === 'system_vendor') {
      await fetchEmployees(storeId);
    }
    
    await syncBcvRate(storeId);
    await checkActiveShift();
  };

  const fetchSaasTransactions = async () => {
    try {
      const { data, error } = await supabase.from('saas_transactions').select('*').order('created_at', { ascending: false });
      if (!error) setSaasTransactions(data || []);
    } catch (e) {
      console.warn("Error cargando transacciones SaaS", e);
    }
  };

  const fetchSystemVendors = async () => {
    try {
      const { data, error } = await supabase.from('system_vendors').select('*').order('created_at', { ascending: false });
      if (!error) setSystemVendors(data || []);
    } catch (e) {
      console.warn("Error cargando vendedores de sistema", e);
    }
  };

  const handleCreateSystemVendor = async (e) => {
    e.preventDefault();
    if (!newVendorName.trim() || !newVendorEmail.trim()) return;

    setCreatingVendor(true);
    try {
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: newVendorEmail.trim(),
        password: 'Password123*',
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (signUpErr) throw signUpErr;

      if (authData.user) {
        const { error: vendorErr } = await supabase.from('system_vendors').insert([{
          user_id: authData.user.id,
          name: newVendorName.trim(),
          email: newVendorEmail.trim(),
          phone: newVendorPhone.trim(),
          pending_balance: 0,
          total_earned: 0
        }]);

        if (vendorErr) throw vendorErr;

        const { error: profErr } = await supabase.from('profiles').upsert([{
          id: authData.user.id,
          role: 'system_vendor',
          full_name: newVendorName.trim()
        }]);

        if (profErr) throw profErr;
      }

      alert("¡Vendedor de Sistema registrado con éxito!\n\nCredenciales de acceso:\nCorreo: " + newVendorEmail + "\nContraseña Temporal: Password123*");
      setNewVendorName('');
      setNewVendorEmail('');
      setNewVendorPhone('');
      fetchSystemVendors();
      fetchAdminStores();
    } catch (err) {
      alert("Error al registrar vendedor: " + err.message);
    } finally {
      setCreatingVendor(false);
    }
  };

  const handlePayVendor = async (vendor) => {
    if(vendor.pending_balance <= 0) {
      alert("Este vendedor no tiene saldo pendiente por cobrar.");
      return;
    }
    if(!window.confirm(`¿Confirmar que ya le pagaste o le vas a liquidar $${vendor.pending_balance.toFixed(2)} al vendedor ${vendor.name}?`)) return;

    try {
      await supabase.from('saas_transactions').insert([{
        type: 'expense',
        amount: vendor.pending_balance,
        description: 'Liquidación de comisiones acumuladas',
        vendor_id: vendor.id
      }]);

      await supabase.from('system_vendors').update({
        pending_balance: 0
      }).eq('id', vendor.id);

      alert(`¡Pago de $${vendor.pending_balance.toFixed(2)} registrado exitosamente a ${vendor.name}!`);
      fetchSystemVendors();
      fetchSaasTransactions();
    } catch(e) {
      alert("Error al liquidar pago al vendedor: " + e.message);
    }
  };

  const handleVendorRegisterStoreSubmit = async (e) => {
    e.preventDefault();
    if (!vendorStoreName.trim()) return;

    try {
      const { data: vendorRec } = await supabase.from('system_vendors').select('*').eq('user_id', session.user.id).single();
      const vendorId = vendorRec ? vendorRec.id : null;

      const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
      let isTrial = !vendorPaidAdvance;
      let subEnd = null;

      if (vendorPaidAdvance) {
        subEnd = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString();
      }
      
      const priceToLock = getCalculatedMonthlyPrice(0, baseMonthlyPrice);

      const { data: newStore, error: storeErr } = await supabase.from('stores').insert([{
        name: vendorStoreName.trim(),
        rif: vendorStoreRif.trim(),
        document: vendorStoreRif.trim(),
        owner_name: vendorOwnerName.trim(),
        phone: vendorOwnerPhone.trim(),
        email: vendorOwnerEmail.trim(),
        is_active: true,
        is_trial: isTrial,
        trial_start_date: new Date().toISOString(),
        trial_end_date: trialEnd,
        subscription_expires_at: subEnd,
        system_vendor_id: vendorId,
        registration_paid: vendorPaidAdvance,
        monthly_price_agreed: priceToLock,
        custom_discount: globalPromoDiscount,
        store_type: vendorNewStoreType
      }]).select().single();

      if (storeErr) throw storeErr;

      if (vendorPaidAdvance && newStore) {
        await supabase.from('saas_transactions').insert([{
          type: 'income',
          amount: priceToLock,
          description: 'Registro Inicial (Adelanto 1er Mes): ' + newStore.name,
          store_id: newStore.id,
          vendor_id: vendorId
        }]);

        if (vendorId && vendorRec) {
          const commissionAmount = priceToLock * 0.50;
          await supabase.from('system_vendors').update({
            pending_balance: parseFloat((vendorRec.pending_balance || 0)) + commissionAmount,
            total_earned: parseFloat((vendorRec.total_earned || 0)) + commissionAmount
          }).eq('id', vendorId);
        }

        alert("¡Comercio registrado exitosamente con 40 DÍAS ACTIVOS!\n\nSe ha generado el 50% de comisión por tu venta inicial.");
      } else {
        alert("¡Comercio registrado exitosamente con 10 días de prueba gratuita y asignado a tu cuenta!");
      }
      
      setVendorStoreName('');
      setVendorStoreRif('');
      setVendorOwnerName('');
      setVendorOwnerPhone('');
      setVendorOwnerEmail('');
      setVendorPaidAdvance(false);
      setVendorNewStoreType('standard');
      setShowVendorStoreModal(false);
      
      if(currentUserRole === 'super_admin') {
         fetchAdminStores();
         fetchSystemVendors();
         fetchSaasTransactions();
      }
    } catch (err) {
      alert("Error al registrar comercio: " + err.message);
    }
  };

  const handleGuardarPlantillas = () => {
    localStorage.setItem('fiskal_whatsapp_templates', JSON.stringify(plantillas));
    alert('¡Plantillas de WhatsApp guardadas con éxito!');
  };

  const actualizarTextoMensaje = (tplKey, pId, cName) => {
    const tpl = plantillas[tplKey] || '';
    const prodObj = products.find(p => p.id.toString() === pId?.toString());
    const prodName = prodObj ? prodObj.name : '[Producto]';
    const clientDisplay = cName || 'Cliente';

    let finalMsg = tpl
      .replace(/{cliente}/g, clientDisplay)
      .replace(/{producto}/g, prodName)
      .replace(/{comercio}/g, currentStoreName);
    
    setMensajePersonalizadoTemp(finalMsg);
  };

  const abrirWhatsAppModal = (producto = null, clienteNombre = '', templateKey = 'reposicionStock') => {
    setSelectedTemplateKey(templateKey);
    const pId = producto ? producto.id : (products[0]?.id || '');
    const cName = clienteNombre || 'Cliente General';
    setModalProductId(pId);
    setModalClientName(cName);
    actualizarTextoMensaje(templateKey, pId, cName);
    setModalWhatsAppOpen(true);
  };

  const enviarMensajeWhatsAppFinal = () => {
    let phone = '584120000000';
    if (modalClientName !== 'Cliente General') {
      const clientData = clients.find(c => c.name === modalClientName);
      if (clientData && clientData.phone) {
        phone = formatWhatsAppNumber(clientData.phone);
      }
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensajePersonalizadoTemp)}`;
    window.open(url, '_blank');
    setModalWhatsAppOpen(false);
  };

  const sendWhatsAppReminder = (sale) => {
    const clientData = clients.find(c => c.name === sale.client_name);
    const phone = clientData?.phone ? formatWhatsAppNumber(clientData.phone) : ''; 

    if (!phone) {
      alert("No se encontró un número de teléfono para este cliente.");
      return;
    }

    const message = `Hola ${sale.client_name}, te saludamos de ${currentStoreName}. Te recordamos que tienes un saldo pendiente por la factura #${sale.id.toString().startsWith('local') ? 'Pendiente' : sale.id} de $${(sale.balance_due_usd || 0).toFixed(2)}. ¡Esperamos tu pago pronto!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendClientGeneralWhatsApp = (client, totalDebt) => {
    const phone = formatWhatsAppNumber(client.phone);
    if (!phone) {
      alert("Este cliente no tiene un número de teléfono registrado.");
      return;
    }

    const message = `Hola ${client.name}, te saludamos de ${currentStoreName}. Te escribimos para recordarte que tienes un saldo pendiente acumulado de $${totalDebt.toFixed(2)} en tus cuentas. ¡Agradecemos tu pronto pago!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendStoreRenewalWhatsApp = (store) => {
    const phone = formatWhatsAppNumber(store.phone);
    if (!phone) {
      alert("Este comercio no tiene teléfono registrado.");
      return;
    }
    const finalPrice = getCalculatedMonthlyPrice(store.custom_discount, store.monthly_price_agreed).toFixed(2);
    const message = `¡Hola ${store.owner_name || store.name}! Te escribimos de la plataforma Fiskal para recordarte que tu periodo de prueba o suscripción está próximo a vencer. Contáctanos para formalizar tu renovación ($${finalPrice}) y seguir disfrutando del sistema sin interrupciones.`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError('');

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            emailRedirectTo: window.location.origin
          }
        });
        if (error) throw error;
        
        if (data.user) {
          const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
          const { data: newStore, error: storeErr } = await supabase.from('stores')
            .insert([{ 
              name: 'Mi Comercio Nuevo', 
              is_active: true, 
              is_trial: true, 
              trial_end_date: trialEnd,
              monthly_price_agreed: baseMonthlyPrice,
              custom_discount: globalPromoDiscount,
              store_type: 'standard'
            }])
            .select().single();
            
          if (!storeErr && newStore) {
            await supabase.from('profiles').upsert([{ 
              id: data.user.id, 
              store_id: newStore.id, 
              role: 'owner', 
              full_name: 'Propietario Principal' 
            }]);
          }
        }

        alert("¡Registro exitoso! Ya puedes iniciar sesión y configurar tu comercio con 10 días de cortesía.");
        setIsRegistering(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: authEmail,
          password: authPassword,
        });
        if (error) throw error;
      }
    } catch (error) {
      setAuthError(error.message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    sessionStorage.clear();
    await supabase.auth.signOut();
  };

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    if (!currentStoreId) return;
    setCreatingEmployee(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmpEmail,
        password: newEmpPass,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (error) throw error;

      if (data.user) {
        const { error: profError } = await supabase.from('profiles').upsert([{
          id: data.user.id,
          store_id: currentStoreId,
          role: 'cajero',
          full_name: newEmpName
        }]);

        if (profError) throw profError;

        alert("¡Empleado registrado exitosamente!\n\nAVISO TÉCNICO: Al registrar un usuario, Supabase inicia sesión automáticamente con la cuenta del nuevo empleado. Por favor, dale a 'Cerrar Sesión' y entra de nuevo con tus credenciales.");
        
        setNewEmpName('');
        setNewEmpEmail('');
        setNewEmpPass('');
        fetchEmployees(currentStoreId);
      }
    } catch (error) {
      alert("Error al registrar empleado: " + error.message);
    } finally {
      setCreatingEmployee(false);
    }
  };

  const fetchEmployees = async (storeId) => {
    if (!storeId) return;
    try {
      const { data, error } = await supabase.from('profiles').select('id, full_name, role').eq('store_id', storeId);
      if (!error && data) setEmployees(data);
    } catch (error) {
      console.warn("Error cargando empleados");
    }
  };

  const fetchAdminStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('*, system_vendors!system_vendor_id(name)').order('created_at', { ascending: false });
      if (error) throw error;
      setAdminStores(data || []);
    } catch (error) {
      console.error('Error cargando comercios para admin:', error.message);
    }
  };

  const handleOpenOwnerModal = (store) => {
    setTargetStoreForOwner(store);
    setOwnerModalName(store.owner_name || store.name || '');
    setOwnerModalEmail(store.email || '');
    setOwnerModalPass('');
    setShowOwnerModal(true);
  };

  const handleCreateStoreOwnerSubmit = async (e) => {
    e.preventDefault();
    if (!targetStoreForOwner) return;

    setCreatingOwnerLoading(true);
    try {
      const { data: { session: adminSession } } = await supabase.auth.getSession();

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: ownerModalEmail.trim(),
        password: ownerModalPass,
        options: {
          emailRedirectTo: window.location.origin
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabase.from('profiles').upsert([{
          id: authData.user.id,
          store_id: targetStoreForOwner.id,
          role: 'owner',
          full_name: ownerModalName.trim()
        }]);

        if (profileError) throw profileError;
      }

      if (adminSession) {
        await supabase.auth.setSession({
          access_token: adminSession.access_token,
          refresh_token: adminSession.refresh_token
        });
      }

      alert(`¡Acceso creado exitosamente para ${ownerModalName}!\n\nCorreo: ${ownerModalEmail}\nContraseña: ${ownerModalPass}`);
      setShowOwnerModal(false);
      setTargetStoreForOwner(null);
      fetchAdminStores();
    } catch (error) {
      alert("Error al crear acceso del dueño: " + error.message);
    } finally {
      setCreatingOwnerLoading(false);
    }
  };

  const fetchRegisters = async (storeId) => {
    if (!storeId) return;
    try {
      let cloudRegs = [];
      if (navigator.onLine) {
        const { data, error } = await supabase.from('cash_registers').select('*').eq('store_id', storeId).order('id', { ascending: true });
        if (error || !data || data.length === 0) {
          const { data: checkExist } = await supabase.from('cash_registers').select('*').eq('store_id', storeId);
          if (!checkExist || checkExist.length === 0) {
            const { data: newReg, error: insErr } = await supabase.from('cash_registers').insert([{ name: 'Caja Principal', is_main: true, store_id: storeId }]).select().single();
            if (!insErr && newReg) {
              cloudRegs = [newReg];
              localStorage.setItem(`fiskal_cache_registers_${storeId}`, JSON.stringify(cloudRegs));
            }
          } else {
            cloudRegs = checkExist;
            localStorage.setItem(`fiskal_cache_registers_${storeId}`, JSON.stringify(cloudRegs));
          }
        } else {
          cloudRegs = data;
          localStorage.setItem(`fiskal_cache_registers_${storeId}`, JSON.stringify(cloudRegs));
        }
      } else {
        const cached = localStorage.getItem(`fiskal_cache_registers_${storeId}`);
        if (cached) cloudRegs = JSON.parse(cached);
      }

      if (cloudRegs.length > 0) {
        setRegisters(cloudRegs);
        const mainReg = cloudRegs.find(r => r.is_main) || cloudRegs[0];
        if (mainReg) setSelectedRegisterIdForOpen(mainReg.id.toString());
      } else {
        setRegisters([]);
      }
    } catch (err) {
      console.warn('Error cargando cajas físicas:', err.message);
    }
  };

  const handleAddRegister = async (e) => {
    e.preventDefault();
    if (!newRegisterName.trim() || !currentStoreId) return;

    try {
      const payload = { name: newRegisterName.trim(), is_main: isMainRegister, store_id: currentStoreId };
      
      if (isMainRegister) {
        await supabase.from('cash_registers').update({ is_main: false }).eq('store_id', currentStoreId);
      }

      const { error } = await supabase.from('cash_registers').insert([payload]);
      if (error) throw error;

      setNewRegisterName('');
      setIsMainRegister(false);
      fetchRegisters(currentStoreId);
      alert("¡Caja física registrada exitosamente!");
    } catch (error) {
      alert("Error al registrar caja: " + error.message);
    }
  };
  
  const handleDeleteRegister = async (regId) => {
    if (registers.length <= 1) {
      alert("Debes tener al menos una caja registrada en tu comercio.");
      return;
    }
    if (!window.confirm("¿Estás seguro de eliminar esta caja física?")) return;

    try {
      const { error } = await supabase.from('cash_registers').delete().eq('id', regId).eq('store_id', currentStoreId);
      if (error) throw error;
      fetchRegisters(currentStoreId);
    } catch (error) {
      alert("Error al eliminar caja: " + error.message);
    }
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    setStoreCity(val);
    const cleanKey = val.trim().toLowerCase();
    if (venezuelaCitiesMap[cleanKey]) {
      setStoreState(venezuelaCitiesMap[cleanKey]);
    }
  };

  const handleToggleStoreStatus = async (storeId, currentStatus) => {
    try {
      const { error } = await supabase.from('stores').update({ is_active: !currentStatus }).eq('id', storeId);
      if (error) throw error;
      fetchAdminStores();
    } catch (error) {
      alert("Error al cambiar estatus del comercio: " + error.message);
    }
  };

  const handleStartEditStore = (store) => {
    setEditingStore(store);
    setStoreName(store.name || '');
    setStoreRif(store.rif || store.document || '');
    setOwnerName(store.owner_name || '');
    setOwnerDoc(store.owner_document || '');
    setStorePhone(store.phone || '');
    setStoreEmail(store.email || '');
    setStoreAddress(store.address || '');
    setStoreCity(store.city || '');
    setStoreState(store.state || '');
    setStorePaidAdvance(false);
    setStoreCustomDiscount(store.custom_discount !== undefined && store.custom_discount !== null ? store.custom_discount : globalPromoDiscount);
    setNewStoreType(store.store_type || 'standard');
  };

  const resetStoreForm = () => {
    setEditingStore(null);
    setStoreName('');
    setStoreRif('');
    setOwnerName('');
    setOwnerDoc('');
    setStorePhone('');
    setStoreEmail('');
    setStoreAddress('');
    setStoreCity('');
    setStoreState('');
    setStorePaidAdvance(false);
    setStoreCustomDiscount(0);
    setNewStoreType('standard');
  };

  const handleSaveStore = async (e) => {
    e.preventDefault();
    if (!storeName.trim()) return;

    const payload = { 
      name: storeName.trim(), 
      rif: storeRif.trim(),
      document: storeRif.trim(),
      owner_name: ownerName.trim(),
      owner_document: ownerDoc.trim(),
      phone: storePhone.trim(),
      email: storeEmail.trim(),
      address: storeAddress.trim(),
      city: storeCity.trim(),
      state: storeState.trim(),
      custom_discount: parseFloat(storeCustomDiscount) || 0
    };

    try {
      if (editingStore) {
        const updatePayload = { ...payload, store_type: newStoreType };
        const { error } = await supabase.from('stores').update(updatePayload).eq('id', editingStore.id);
        if (error) throw error;
        alert("¡Comercio actualizado exitosamente!");
        if (editingStore.id === currentStoreId) {
          setCurrentStoreName(storeName.trim());
          setCurrentStoreType(newStoreType);
        }
      } else {
        const trialEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
        let isTrial = !storePaidAdvance;
        let subEnd = null;

        if (storePaidAdvance) {
          subEnd = new Date(Date.now() + 40 * 24 * 60 * 60 * 1000).toISOString();
        }
        
        const priceToLock = getCalculatedMonthlyPrice(0, baseMonthlyPrice);

        const { data: newStore, error } = await supabase.from('stores').insert([{ 
          ...payload, 
          is_active: true, 
          is_trial: isTrial, 
          trial_end_date: trialEnd,
          subscription_expires_at: subEnd,
          monthly_price_agreed: priceToLock,
          store_type: newStoreType
        }]).select().single();
        
        if (error) throw error;
        
        if (storePaidAdvance && newStore) {
          await supabase.from('saas_transactions').insert([{
            type: 'income',
            amount: priceToLock,
            description: 'Registro inicial Standalone (Suscripción): ' + newStore.name,
            store_id: newStore.id
          }]);
          alert("¡Comercio registrado exitosamente con 40 DÍAS ACTIVOS (30 del mes + 10 de cortesía)!");
        } else {
          alert("¡Comercio registrado exitosamente con 10 días de prueba!");
        }
      }

      resetStoreForm();
      fetchAdminStores();
      fetchSaasTransactions();
    } catch (error) {
      alert("Error al guardar comercio: " + error.message);
    }
  };

  const handleRenewSubscription = async (store) => {
    const finalPrice = getCalculatedMonthlyPrice(store.custom_discount, store.monthly_price_agreed).toFixed(2);
    if (!window.confirm(`¿Confirmar cobro de renovación de $${finalPrice} por 1 mes (30 días) para: ${store.name}?\n\nSi le quedaban días de prueba o de su mes anterior, se le sumarán automáticamente a su nueva fecha de corte.`)) return;

    const now = new Date().getTime();
    let newExpirationDate = new Date();

    if (store.is_trial) {
      let trialDaysLeft = 0;
      if (store.trial_end_date) {
        const trialEnd = new Date(store.trial_end_date).getTime();
        if (trialEnd > now) {
          trialDaysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        }
      }
      newExpirationDate.setDate(newExpirationDate.getDate() + 30 + trialDaysLeft);
    } else {
      let subDaysLeft = 0;
      if (store.subscription_expires_at) {
        const subEnd = new Date(store.subscription_expires_at).getTime();
        if (subEnd > now) {
          subDaysLeft = Math.ceil((subEnd - now) / (1000 * 60 * 60 * 24));
        }
      }
      newExpirationDate.setDate(newExpirationDate.getDate() + 30 + subDaysLeft);
    }

    try {
      const { error } = await supabase.from('stores').update({
        is_trial: false,
        subscription_expires_at: newExpirationDate.toISOString()
      }).eq('id', store.id);

      if (error) throw error;

      await supabase.from('saas_transactions').insert([{
        type: 'income',
        amount: parseFloat(finalPrice),
        description: 'Renovación Mensual: ' + store.name,
        store_id: store.id,
        vendor_id: store.system_vendor_id
      }]);

      if (store.system_vendor_id) {
        const commissionAmount = parseFloat(finalPrice) * 0.20;
        const { data: vData } = await supabase.from('system_vendors').select('pending_balance, total_earned').eq('id', store.system_vendor_id).single();
        if (vData) {
           await supabase.from('system_vendors').update({
             pending_balance: parseFloat((vData.pending_balance || 0)) + commissionAmount,
             total_earned: parseFloat((vData.total_earned || 0)) + commissionAmount
           }).eq('id', store.system_vendor_id);
        }
      }

      alert(`¡Suscripción renovada exitosamente!\n\nNueva fecha de vencimiento: ${newExpirationDate.toLocaleDateString()}\nSe han ajustado los balances financieros.`);
      fetchAdminStores();
      fetchSystemVendors();
      fetchSaasTransactions();
    } catch (error) {
      alert("Error al renovar suscripción: " + error.message);
    }
  };

  const handleOpenPreInvoice = (store) => {
    setPreInvoiceStore(store);
    setPreInvoiceExtraDesc('');
    setPreInvoiceExtraAmount('');
    setPreInvoiceDiscount('');
    setShowPreInvoiceModal(true);
  };

  const generateCustomSaaSInvoice = async () => {
    if (!preInvoiceStore) return;
    
    const doc = new jsPDF();
    const store = preInvoiceStore;
    
    const basePrice = store.monthly_price_agreed !== null && store.monthly_price_agreed !== undefined ? store.monthly_price_agreed : baseMonthlyPrice;
    const sysDiscount = store.custom_discount || 0;
    const finalSubPrice = getCalculatedMonthlyPrice(store.custom_discount, store.monthly_price_agreed);
    
    const extraAmount = parseFloat(preInvoiceExtraAmount) || 0;
    const specificDiscount = parseFloat(preInvoiceDiscount) || 0;
    
    const totalToPay = finalSubPrice + extraAmount - specificDiscount;

    let currentY = 20;

    try {
      const imgWidth = logoDark.width || 1590; 
      const imgHeight = logoDark.height || 461; 
      
      const pdfImageWidth = 35;
      const pdfImageHeight = (imgHeight * pdfImageWidth) / imgWidth;

      doc.addImage(logoDark, 'PNG', 14, currentY, pdfImageWidth, pdfImageHeight);
      currentY += pdfImageHeight + 6; 
    } catch (e) {
      console.warn("No se pudo renderizar el logo en el PDF.", e);
      currentY += 10;
    }

    doc.setFontSize(10);
    doc.setTextColor(100);

    if (saasInvoiceHeader) {
      const splitHeader = doc.splitTextToSize(saasInvoiceHeader, 180);
      doc.text(splitHeader, 14, currentY);
      currentY += (splitHeader.length * 5) + 5;
    } else {
      doc.text("Recibo de Servicios SaaS", 14, currentY);
      currentY += 10;
    }
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text(`Comercio: ${store.name}`, 14, currentY);
    doc.text(`Propietario: ${store.owner_name || 'N/A'}`, 14, currentY + 6);
    doc.text(`RIF/Documento: ${store.rif || 'N/A'}`, 14, currentY + 12);
    doc.text(`Fecha de Emisión: ${new Date().toLocaleDateString()}`, 14, currentY + 18);
    currentY += 28;
    
    const tableColumn = ["Descripción", "Precio Base", "Descuentos", "Subtotal"];
    const tableRows = [];
    
    const discountText = sysDiscount > 0 ? `${sysDiscount}%` : "0%";
    tableRows.push([
      "Suscripción Mensual Sistema Fiskal",
      `$${basePrice.toFixed(2)}`,
      discountText,
      `$${finalSubPrice.toFixed(2)}`
    ]);

    if (extraAmount > 0) {
      tableRows.push([
        preInvoiceExtraDesc || "Cargo Adicional",
        `$${extraAmount.toFixed(2)}`,
        "0%",
        `$${extraAmount.toFixed(2)}`
      ]);
    }

    if (specificDiscount > 0) {
      tableRows.push([
        "Descuento Especial Aplicado",
        `-$${specificDiscount.toFixed(2)}`,
        "N/A",
        `-$${specificDiscount.toFixed(2)}`
      ]);
    }
    
    autoTable(doc, {
      startY: currentY,
      head: [tableColumn],
      body: tableRows,
      theme: 'striped',
      headStyles: { fillColor: [43, 138, 62] } 
    });
    
    const finalY = doc.lastAutoTable.finalY || currentY;
    
    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text(`Total Facturado: $${totalToPay.toFixed(2)}`, 14, finalY + 15);
    
    if (saasInvoiceFooter) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      const splitFooter = doc.splitTextToSize(saasInvoiceFooter, 180);
      doc.text(splitFooter, 14, finalY + 30);
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text("¡Gracias por confiar en Fiskal para la gestión de su negocio!", 14, finalY + 30);
    }
    
    const fileName = `Recibo_Fiskal_${store.name.replace(/\s+/g, '_')}.pdf`;
    doc.save(fileName);
    setShowPreInvoiceModal(false);
    
    if(window.confirm(`El archivo ${fileName} se ha descargado.\n\n¿Deseas abrir WhatsApp Web ahora para enviar un mensaje al cliente?`)) {
       const phone = formatWhatsAppNumber(store.phone);
       if (!phone) {
         alert("El comercio no tiene un teléfono registrado para abrir WhatsApp.");
         return;
       }
       const msg = `¡Hola ${store.owner_name || store.name}! Te escribimos del equipo de Fiskal. Hemos generado el recibo en PDF de tu factura por un total de $${totalToPay.toFixed(2)}. ¡Gracias por confiar en nosotros!`;
       window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, '_blank');
    }
  };

  const checkPendingSales = async () => {
    const actions = await getOfflineActions();
    const legacySales = await getOfflineSales();
    setPendingSalesCount(actions.length + legacySales.length);
  };

  const syncOfflineData = async () => {
    const oldOfflineSales = await getOfflineSales();
    if (oldOfflineSales && oldOfflineSales.length > 0) {
      for (const record of oldOfflineSales) {
        try {
          const { data: newSale, error } = await supabase.from('sales').insert([record.saleData]).select().single();
          if (error) throw error;
          if (newSale && record.historyData) {
            const { error: histErr } = await supabase.from('payment_history').insert([{
              sale_id: newSale.id, amount_usd: record.historyData.amount_usd, payment_details: record.historyData.payment_details, store_id: currentStoreId
            }]);
            if (histErr) throw histErr;
          }

          if (record.saleData.status !== 'pending' && record.saleData.items && record.saleData.items.length > 0) {
            for (const item of record.saleData.items) {
              const { data: prodDb } = await supabase.from('products').select('stock').eq('id', item.id).eq('store_id', currentStoreId).single();
              if (prodDb) {
                const newStock = Math.max(0, (prodDb.stock || 0) - item.quantity);
                await supabase.from('products').update({ stock: newStock }).eq('id', item.id).eq('store_id', currentStoreId);
              }
            }
          }

          await clearOfflineSale(record.id);
        } catch (e) {
          console.error("Error legacy sale:", e);
        }
      }
    }

    const actions = await getOfflineActions();
    if (actions.length === 0 && oldOfflineSales.length === 0) return;

    setIsSyncing(true);
    let generalErrorOccurred = false;
    const idMap = {}; 

    try {
      actions.sort((a, b) => a.timestamp - b.timestamp);

      for (const action of actions) {
        let syncFailed = false;
        let errorMessage = '';

        try {
          if (action.type === 'INSERT_PRODUCT') {
            const { data: newProd, error } = await supabase.from('products').insert([{...action.productData, store_id: currentStoreId}]).select().single();
            if (error) throw error;
            if (newProd && action.tempId) {
              idMap[action.tempId] = newProd.id;
            }
          }
          else if (action.type === 'INSERT_SALE') {
            if (action.saleData.items) {
               action.saleData.items = action.saleData.items.map(item => ({
                  ...item,
                  id: idMap[item.id] || item.id
               }));
            }

            const { data: newSale, error } = await supabase.from('sales').insert([{...action.saleData, store_id: currentStoreId}]).select().single();
            if (error) throw error;

            if (newSale && action.tempId) {
               idMap[action.tempId] = newSale.id;
            }

            if (newSale && action.historyData) {
              const { error: histErr } = await supabase.from('payment_history').insert([{
                sale_id: newSale.id, amount_usd: action.historyData.amount_usd, payment_details: action.historyData.payment_details, store_id: currentStoreId
              }]);
              if (histErr) throw histErr;
            }

            if (action.saleData.status !== 'pending' && action.saleData.items && action.saleData.items.length > 0) {
              for (const item of action.saleData.items) {
                const { data: prodDb } = await supabase.from('products').select('stock').eq('id', item.id).eq('store_id', currentStoreId).single();
                if (prodDb) {
                  const newStock = Math.max(0, (prodDb.stock || 0) - item.quantity);
                  await supabase.from('products').update({ stock: newStock }).eq('id', item.id).eq('store_id', currentStoreId);
                }
              }
            }
          }
          else if (action.type === 'UPDATE_SALE') {
            const actualSaleId = idMap[action.saleId] || action.saleId;
            if (actualSaleId && String(actualSaleId) !== 'null' && !String(actualSaleId).startsWith('local_')) {
              const { error } = await supabase.from('sales').update({
                status: action.updatedStatus, balance_due_usd: action.newBalanceDue, payment_details: action.paymentDetails
              }).eq('id', actualSaleId).eq('store_id', currentStoreId);
              if (error) throw error;

              const { error: histErr2 } = await supabase.from('payment_history').insert([{
                sale_id: actualSaleId, amount_usd: action.historyData.amount_usd, payment_details: action.historyData.payment_details, store_id: currentStoreId
              }]);
              if (histErr2) throw histErr2;
            }
          }
          else if (action.type === 'DELETE_SALE') {
            const actualSaleId = idMap[action.saleId] || action.saleId;
            if (actualSaleId && String(actualSaleId) !== 'null' && !String(actualSaleId).startsWith('local_')) {
              const { error } = await supabase.from('sales').delete().eq('id', actualSaleId).eq('store_id', currentStoreId);
              if (error) throw error;
            }
          }
          else if (action.type === 'UPDATE_PRODUCT') {
            const actualProdId = idMap[action.productId] || action.productId;
            if (actualProdId && String(actualProdId) !== 'null' && !String(actualProdId).startsWith('local_')) {
              const { error } = await supabase.from('products').update(action.productData).eq('id', actualProdId).eq('store_id', currentStoreId);
              if (error) throw error;
            }
          }
          else if (action.type === 'DELETE_PRODUCT') {
            const actualProdId = idMap[action.productId] || action.productId;
            if (actualProdId && String(actualProdId) !== 'null' && !String(actualProdId).startsWith('local_')) {
              const { error } = await supabase.from('products').delete().eq('id', actualProdId).eq('store_id', currentStoreId);
              if (error) throw error;
            }
          }
          else if (action.type === 'INSERT_CLIENT') {
            let conflictResolved = false;
            if (action.clientData && action.clientData.document) {
              const { data: existing } = await supabase.from('clients').select('*').eq('document', action.clientData.document).eq('store_id', currentStoreId).single();
              if (existing) {
                const choice = await new Promise(resolve => {
                  setConflictState({
                    title: 'Conflicto de Cliente Detectado',
                    message: `La Cédula/RIF ${action.clientData.document} ya está registrada en la nube. ¿Qué datos deseas conservar?`,
                    local: action.clientData,
                    cloud: existing,
                    resolvePromise: resolve
                  });
                });
                
                setConflictState(null);

                if (choice === 'local') {
                  const { error: updErr } = await supabase.from('clients').update({
                    name: action.clientData.name,
                    phone: action.clientData.phone,
                    email: action.clientData.email
                  }).eq('id', existing.id).eq('store_id', currentStoreId);
                  if (updErr) throw updErr;
                }
                conflictResolved = true;
                if (action.tempId) idMap[action.tempId] = existing.id;
              }
            }
            if (!conflictResolved) {
              const { data: newClient, error: insErr } = await supabase.from('clients').insert([{...action.clientData, store_id: currentStoreId}]).select().single();
              if (insErr) throw insErr;
              if (newClient && action.tempId) {
                idMap[action.tempId] = newClient.id;
              }
            }
          }
          else if (action.type === 'DELETE_CLIENT') {
            const actualClientId = idMap[action.clientId] || action.clientId;
            if (actualClientId && String(actualClientId) !== 'null' && !String(actualClientId).startsWith('local_')) {
              const { error } = await supabase.from('clients').delete().eq('id', actualClientId).eq('store_id', currentStoreId);
              if (error) throw error;
            }
          }

        } catch (err) {
          syncFailed = true;
          errorMessage = err.message;
          console.error("Error sincronizando accion individual:", action, err);

          if (
            errorMessage.includes('invalid input syntax') ||
            errorMessage.includes('uuid: "null"') ||
            errorMessage.includes('uuid: null') ||
            errorMessage.includes('not a valid UUID')
          ) {
            syncFailed = false; 
            console.warn("⚠️ Acción corrupta detectada y descartada automáticamente para liberar la cola.");
          }
        }

        if (!syncFailed) {
          await clearOfflineAction(action.local_id);
        } else {
          generalErrorOccurred = true;
          alert(`Fallo al sincronizar hacia la nube (Tipo: ${action.type}). Motivo principal: ${errorMessage}. El registro se mantendrá localmente para evitar pérdidas.`);
        }
      }
      
      await fetchClients(currentStoreId);
      await fetchSales(currentStoreId);
      await fetchProducts(currentStoreId); 
      checkPendingSales();
      if (!generalErrorOccurred) {
        alert("¡Sincronización completada y cola limpia!");
      }
    } catch (error) {
      console.error("Error crítico procesando la cola de sincronización:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchProducts = async (storeId) => {
    if (!storeId) return;
    try {
      let cloudProducts = [];
      if (navigator.onLine) {
        const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId).order('id', { ascending: false });
        if (!error) {
          cloudProducts = data || [];
          localStorage.setItem(`fiskal_cache_products_${storeId}`, JSON.stringify(cloudProducts));
        }
      } else {
        const cached = localStorage.getItem(`fiskal_cache_products_${storeId}`);
        if (cached) cloudProducts = JSON.parse(cached);
      }
      
      const actions = await getOfflineActions();
      const localProducts = [];
      actions.forEach(action => {
        if (action.type === 'INSERT_PRODUCT' && action.productData) {
          localProducts.push({ ...action.productData, id: action.tempId });
        }
      });

      const deletedIds = actions.filter(a => a.type === 'DELETE_PRODUCT').map(a => a.productId);
      let finalCloudProducts = cloudProducts.filter(p => !deletedIds.includes(p.id));

      const updateActions = actions.filter(a => a.type === 'UPDATE_SALE');
      // Corrección del bug: se filtran las actualizaciones de producto correctamente
      const productUpdateActions = actions.filter(a => a.type === 'UPDATE_PRODUCT');
      finalCloudProducts = finalCloudProducts.map(p => {
        const update = productUpdateActions.find(a => a.productId === p.id);
        return update ? { ...p, ...update.productData } : p;
      });

      setProducts([...localProducts, ...finalCloudProducts]);
    } catch (error) {
      console.error('Error cargando productos:', error.message);
    }
  };

  const fetchSales = async (storeId) => {
    if (!storeId) return;
    try {
      let cloudSales = [];
      if (navigator.onLine) {
        const { data, error } = await supabase.from('sales').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
        if (!error) {
          cloudSales = data || [];
          localStorage.setItem(`fiskal_cache_sales_${storeId}`, JSON.stringify(cloudSales));
        }
      } else {
        const cached = localStorage.getItem(`fiskal_cache_sales_${storeId}`);
        if (cached) cloudSales = JSON.parse(cached);
      }

      const actions = await getOfflineActions();
      const localSales = [];
      actions.forEach(action => {
        if (action.type === 'INSERT_SALE' && action.saleData) {
          localSales.push({ ...action.saleData, id: action.tempId, created_at: new Date().toISOString() });
        }
      });

      const deletedIds = actions.filter(a => a.type === 'DELETE_SALE').map(a => a.saleId);
      let finalCloudSales = cloudSales.filter(s => !deletedIds.includes(s.id));

      const updateActions = actions.filter(a => a.type === 'UPDATE_SALE');
      finalCloudSales = finalCloudSales.map(s => {
        const update = updateActions.find(a => a.saleId === s.id);
        return update ? { ...s, status: update.updatedStatus, balance_due_usd: update.newBalanceDue, payment_details: update.paymentDetails } : s;
      });

      setSales([...localSales, ...finalCloudSales]);
    } catch (error) {
      console.error('Error cargando historial de ventas:', error.message);
    }
  };

  const fetchClients = async (storeId) => {
    if (!storeId) return;
    try {
      let cloudClients = [];
      if (navigator.onLine) {
        const { data, error } = await supabase.from('clients').select('*').eq('store_id', storeId).order('id', { ascending: false });
        if (!error) {
          cloudClients = data || [];
          localStorage.setItem(`fiskal_cache_clients_${storeId}`, JSON.stringify(cloudClients));
        }
      } else {
        const cached = localStorage.getItem(`fiskal_cache_clients_${storeId}`);
        if (cached) cloudClients = JSON.parse(cached);
      }

      const actions = await getOfflineActions();
      const localClients = [];
      actions.forEach(action => {
        if (action.type === 'INSERT_CLIENT' && action.clientData) {
          localClients.push({ ...action.clientData, id: action.tempId });
        }
      });
      
      const deletedIds = actions.filter(a => a.type === 'DELETE_CLIENT').map(a => a.clientId);
      const finalCloudClients = cloudClients.filter(c => !deletedIds.includes(c.id));

      setClients([...localClients, ...finalCloudClients]);
    } catch (error) {
      console.error('Error cargando clientes:', error.message);
    }
  };
  // =================== FIN DEL BLOQUE 2 ===================
  const checkActiveShift = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userId = currentSession?.user?.id;
      if (!userId) return;

      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('shifts')
          .select('*')
          .eq('status', 'open')
          .eq('user_id', userId)
          .order('id', { ascending: false })
          .limit(1);

        if (error) throw error;
        if (data && data.length > 0) {
          setCurrentShift(data[0]);
          localStorage.setItem(`fiskal_cache_shift_${userId}`, JSON.stringify(data[0]));
        } else {
          setCurrentShift(null);
          localStorage.removeItem(`fiskal_cache_shift_${userId}`);
        }
      } else {
        const cached = localStorage.getItem(`fiskal_cache_shift_${userId}`);
        if (cached) {
          setCurrentShift(JSON.parse(cached));
        } else {
          setCurrentShift(null);
        }
      }
    } catch (error) {
      console.error('Error verificando turno activo:', error.message);
    }
  };

  const handleOpenShift = async (e) => {
    e.preventDefault();
    if (!isOnline) {
      alert("Debes tener conexión a internet para Aperturar la Caja por seguridad de la base de datos.");
      return;
    }
    const floatValUSD = parseFloat(openingFloat) || 0;
    const floatValVES = parseFloat(openingFloatVes) || 0;
    const totalFloatUSD = floatValUSD + (floatValVES / (bcvRate || 1));
    
    let regId = parseInt(selectedRegisterIdForOpen);
    if (isNaN(regId)) {
      if (registers && registers.length > 0) {
        const mainReg = registers.find(r => r.is_main) || registers[0];
        regId = mainReg.id;
      } else {
        alert("Error: No tienes ninguna caja física configurada en tu local. Ve a 'Configuración' para registrar una.");
        return;
      }
    }

    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userId = currentSession?.user?.id;

      if (!userId || !currentStoreId) {
          alert("Error de autenticación o falta de ID de comercio.");
          return;
      }

      const { data: checkReg } = await supabase.from('shifts').select('id').eq('status', 'open').eq('register_id', regId).maybeSingle();

      if (checkReg) {
          alert("¡Atención! Esta caja física ya se encuentra abierta y siendo operada por otro usuario.");
          return;
      }

      const { data, error } = await supabase.from('shifts').insert([{
          status: 'open',
          register_id: regId,
          opening_float_usd: totalFloatUSD,
          total_sales_usd: 0,
          expected_cash_usd: totalFloatUSD,
          user_id: userId,
          store_id: currentStoreId
        }]).select().single();

      if (error) throw error;
      setCurrentShift(data);
      setShowOpenShiftModal(false);
      setOpeningFloat('');
      setOpeningFloatVes('');
      alert("¡Turno de caja abierto exitosamente!");
    } catch (error) {
      alert("Error al abrir caja: " + error.message);
    }
  };

  const handleCloseShift = async () => {
    if (!currentShift) return;
    if (!isOnline || pendingSalesCount > 0) {
      alert("No puedes cerrar la caja estando Offline o si tienes transacciones pendientes.");
      return;
    }

    const cashUSDCounted = parseFloat(actualCashUSD) || 0;
    const cashBsCounted = parseFloat(actualCashBs) || 0;
    const totalActualCashUSD = cashUSDCounted + (cashBsCounted / (bcvRate || 1));

    const shiftSales = sales.filter(s => s.shift_id === currentShift.id && s.status === 'completed');
    const cashCollectedUSD = shiftSales.reduce((sum, s) => sum + (s.payment_details?.cash_usd || 0), 0);
    const cashCollectedBs = shiftSales.reduce((sum, s) => sum + (s.payment_details?.cash_bs || 0), 0);
    const cashCollectedBsInUSD = cashCollectedBs / (bcvRate || 1);

    const expectedCash = currentShift.opening_float_usd + cashCollectedUSD + cashCollectedBsInUSD;
    const difference = parseFloat((totalActualCashUSD - expectedCash).toFixed(2));

    try {
      const { error } = await supabase.from('shifts').update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          expected_cash_usd: expectedCash,
          actual_cash_usd: totalActualCashUSD,
          difference_usd: difference,
          notes: shiftNotes ? `${shiftNotes} | Contado: $${cashUSDCounted.toFixed(2)} + Bs. ${cashBsCounted.toFixed(2)}` : `Contado: $${cashUSDCounted.toFixed(2)} + Bs. ${cashBsCounted.toFixed(2)}`
        }).eq('id', currentShift.id);

      if (error) throw error;

      alert(`Corte de caja realizado.\nDiferencia: $${difference >= 0 ? '+' : ''}${difference}`);
      setShowCloseShiftModal(false);
      setActualCashUSD('');
      setActualCashBs('');
      setShiftNotes('');
      setCurrentShift(null);
      setActiveTab('history');
    } catch (error) {
      alert("Error al cerrar caja: " + error.message);
    }
  };

  const syncBcvRate = async (storeId) => {
    setLoadingRate(true);
    try {
      if (navigator.onLine) {
        const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
        if (!response.ok) throw new Error('Error al conectar con el servicio de tasa BCV');
        
        const data = await response.json();
        const liveRate = parseFloat(data.promedio || data.price);

        if (liveRate && !isNaN(liveRate)) {
          setBcvRate(liveRate);
          setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          localStorage.setItem('fiskal_cache_bcv_rate', liveRate.toString());

          if (storeId) {
            await supabase.from('settings').upsert({ key: 'bcv_rate', value: liveRate, store_id: storeId }, { onConflict: 'key' });
          }
          setLoadingRate(false);
          return;
        }
      } else {
        const cachedRate = localStorage.getItem('fiskal_cache_bcv_rate');
        if (cachedRate) {
           setBcvRate(parseFloat(cachedRate));
           setLastSync('Caché Local');
        }
      }
    } catch (error) {
      console.warn('Error obteniendo tasa en vivo:', error.message);
      const cachedRate = localStorage.getItem('fiskal_cache_bcv_rate');
      if (cachedRate) {
         setBcvRate(parseFloat(cachedRate));
         setLastSync('Caché Local');
      }
    }
    setLoadingRate(false);
  };

  const handleImageSelect = async (e) => {
    const file = e.target.files[0];
    if (file) {
      try {
        const compressedFile = await compressImage(file, 800, 0.7);
        setImageFile(compressedFile);
        setImagePreview(URL.createObjectURL(compressedFile));
      } catch (error) {
        console.error("Error comprimiendo imagen, usando original:", error);
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
      }
    }
  };

  const uploadImageToSupabase = async () => {
    if (!imageFile) return null;
    const fileExt = imageFile.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, imageFile);
    if (uploadError) throw uploadError;
    
    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
    return urlData.publicUrl;
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    if (!name || !price || !currentStoreId) return;

    setLoading(true);
    try {
      let imageUrl = null;
      if (imageFile) {
        if (isOnline) {
          imageUrl = await uploadImageToSupabase();
        } else {
          alert("Aviso: Como estás Offline, la imagen no se subirá temporalmente.");
        }
      }

      const newProduct = { 
        name, 
        price: parseFloat(price), 
        cost: parseFloat(cost) || 0, 
        stock: parseInt(stock) || 0, 
        category: category || 'General',
        barcode: barcode.trim() || null,
        image_url: imageUrl,
        modifiers: productModifiers.join(', '),
        store_id: currentStoreId
      };

      if (!isOnline) {
        const tempId = `local_prod_${Date.now()}`;
        await queueOfflineAction({ type: 'INSERT_PRODUCT', productData: newProduct, tempId });
        setProducts([{ ...newProduct, id: tempId }, ...products]);
        resetProductForm();
        setLoading(false);
        checkPendingSales();
        alert("¡Estás Offline! Producto guardado localmente.");
        return;
      }

      const { error } = await supabase.from('products').insert([newProduct]);
      if (error) throw error;

      resetProductForm();
      fetchProducts(currentStoreId);
    } catch (error) {
      console.error('Error al guardar producto:', error.message);
      alert("Error al guardar producto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !name || !price || !currentStoreId) return;

    setLoading(true);
    try {
      let imageUrl = editingProduct.image_url;
      if (imageFile) {
        if (isOnline) {
          imageUrl = await uploadImageToSupabase();
        } else {
          alert("Aviso: Como estás Offline, la nueva imagen no se subirá.");
        }
      }

      const updatedProductData = { 
        name, 
        price: parseFloat(price), 
        cost: parseFloat(cost) || 0, 
        stock: parseInt(stock) || 0, 
        category: category || 'General',
        barcode: barcode.trim() || null,
        image_url: imageUrl,
        modifiers: productModifiers.join(', ')
      };

      if (!isOnline) {
        await queueOfflineAction({ type: 'UPDATE_PRODUCT', productId: editingProduct.id, productData: updatedProductData });
        const currentProducts = products.map(p => p.id === editingProduct.id ? { ...p, ...updatedProductData } : p);
        setProducts(currentProducts);
        resetProductForm();
        setLoading(false);
        checkPendingSales();
        alert("¡Estás Offline! Producto actualizado localmente.");
        return;
      }

      const { error } = await supabase.from('products').update(updatedProductData).eq('id', editingProduct.id).eq('store_id', currentStoreId);
      if (error) throw error;

      resetProductForm();
      fetchProducts(currentStoreId);
    } catch (error) {
      console.error('Error al actualizar producto:', error.message);
      alert("Error al actualizar producto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStartEditProduct = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price.toString());
    setCost(prod.cost !== undefined ? prod.cost.toString() : '');
    setStock(prod.stock !== undefined ? prod.stock.toString() : '');
    setCategory(prod.category || 'General');
    setBarcode(prod.barcode || '');
    setImagePreview(prod.image_url || null);
    setImageFile(null);

    // NUEVO: Cargar las etiquetas de este platillo específico al editar
    if (prod.modifiers) {
      const arr = typeof prod.modifiers === 'string' 
        ? prod.modifiers.split(',').map(s => s.trim()).filter(Boolean) 
        : prod.modifiers;
      setProductModifiers(arr);
    } else {
      setProductModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']);
    }
  };

  const resetProductForm = () => {
    setEditingProduct(null);
    setName('');
    setPrice('');
    setCost('');
    setStock('');
    setCategory('General');
    setBarcode('');
    setImageFile(null);
    setImagePreview(null);
    setProductModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']); // <--- Añade esta línea
    setNewModifierText(''); // <--- Añade esta línea
  };

  const handleDeleteProduct = async (id) => {
    if (!isOnline) {
      if (id.toString().startsWith('local_')) {
        const actions = await getOfflineActions();
        const action = actions.find(a => a.type === 'INSERT_PRODUCT' && a.tempId === id);
        if (action) await clearOfflineAction(action.local_id);
      } else {
        await queueOfflineAction({ type: 'DELETE_PRODUCT', productId: id });
      }
      setProducts(products.filter(p => p.id !== id));
      checkPendingSales();
      alert("¡Estás Offline! Producto eliminado localmente.");
      return;
    }

    try {
      const { error } = await supabase.from('products').delete().eq('id', id).eq('store_id', currentStoreId);
      if (error) throw error;
      fetchProducts(currentStoreId);
    } catch (error) {
      console.error('Error al eliminar producto:', error.message);
    }
  };

  const handleOpenLabel = (prod) => {
    setLabelProduct(prod);
    setShowLabelModal(true);
  };

  const handleScannedCodeResult = (code) => {
    let cleanCode = code.trim();

    if (cleanCode.includes('ID:') && cleanCode.includes('|')) {
      const parts = cleanCode.split('|');
      const idPart = parts.find(p => p.startsWith('ID:'));
      if (idPart) {
        cleanCode = idPart.replace('ID:', '').trim();
      }
    }

    const foundProduct = products.find(p => p.barcode === cleanCode || p.id.toString() === cleanCode);

    if (foundProduct) {
      addToCart(foundProduct);
    } else {
      alert(`Código escaneado: "${cleanCode}", pero no se encontró ningún producto asociado.`);
    }
  };

  const handleScannedCodeResultRef = useRef(handleScannedCodeResult);
  useEffect(() => {
    handleScannedCodeResultRef.current = handleScannedCodeResult;
  });

  useEffect(() => {
    if (showCameraScannerModal) {
      const timer = setTimeout(() => {
        const html5QrCode = new Html5Qrcode("fiskal-qr-reader");
        html5QrCodeRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            if (html5QrCodeRef.current) {
              html5QrCodeRef.current.stop().then(() => {
                html5QrCodeRef.current.clear();
                setShowCameraScannerModal(false);
                if (handleScannedCodeResultRef.current) handleScannedCodeResultRef.current(decodedText);
              }).catch(() => {
                setShowCameraScannerModal(false);
                if (handleScannedCodeResultRef.current) handleScannedCodeResultRef.current(decodedText);
              });
            }
          },
          (errorMessage) => {}
        ).catch((err) => {
          setCameraScanError("Error al iniciar cámara: " + err.message);
        });
      }, 150);

      return () => clearTimeout(timer);
    } else {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().then(() => html5QrCodeRef.current.clear()).catch(() => {});
          } else {
            html5QrCodeRef.current.clear();
          }
        } catch (e) {}
        html5QrCodeRef.current = null;
      }
    }
  }, [showCameraScannerModal]);

  const startCameraScanner = () => {
    setCameraScanError('');
    setShowCameraScannerModal(true);
  };

  const stopCameraScanner = () => {
    setShowCameraScannerModal(false);
  };

  const handleCapturePhotoScan = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      if (!window.BarcodeDetector) {
        alert("Tu navegador no soporta la lectura automática de códigos desde imagen. Usa el buscador manual por SKU.");
        stopCameraScanner();
        return;
      }

      const barcodeDetector = new window.BarcodeDetector();
      const imageBitmap = await createImageBitmap(file);
      const barcodes = await barcodeDetector.detect(imageBitmap);

      if (barcodes.length > 0) {
        stopCameraScanner();
        handleScannedCodeResult(barcodes[0].rawValue);
      } else {
        alert("No se detectó ningún código QR o de barras nítido en la foto. Intenta de nuevo acercando más.");
      }
    } catch (err) {
      console.error("Error al procesar foto capturada:", err);
      alert("Error al procesar la imagen de la cámara.");
    }
  };

  const handleAddClient = async (e, isQuick = false) => {
    if (e) e.preventDefault();
    if (!clientName || !clientDoc || !currentStoreId) return;

    const normalizedDoc = clientDoc.trim().toLowerCase();
    const existingDup = clients.find(c => c.document && c.document.trim().toLowerCase() === normalizedDoc);
    if (existingDup) {
      alert(`⚠️ Cédula Duplicada: La cédula "${clientDoc}" ya está registrada en el sistema a nombre de ${existingDup.name}.`);
      return;
    }

    setLoadingClient(true);
    const newClientData = { 
      name: clientName, 
      document: clientDoc.trim() || null, 
      phone: clientPhone.trim() || null, 
      email: clientEmail.trim() || null, 
      store_id: currentStoreId 
    };

    if (!isOnline) {
      const tempId = `local_client_${Date.now()}`;
      await queueOfflineAction({ type: 'INSERT_CLIENT', clientData: newClientData, tempId });
      
      const updatedClients = [ { ...newClientData, id: tempId }, ...clients ];
      setClients(updatedClients);

      if (isQuick) {
        setSelectedClient(clientName);
        setClientSearchQuery('');
        setShowQuickClientModal(false);
      }
      setClientName('');
      setClientDoc('');
      setClientPhone('');
      setClientEmail('');
      setLoadingClient(false);
      checkPendingSales();
      alert("¡Estás Offline! Cliente guardado localmente.");
      return;
    }

    try {
      const { data: checkDb } = await supabase.from('clients').select('*').eq('document', clientDoc.trim()).eq('store_id', currentStoreId).single();
      if (checkDb) {
        alert(`⚠️ Ya existe un cliente con la cédula ${clientDoc} (${checkDb.name}).`);
        setLoadingClient(false);
        return;
      }

      const { error } = await supabase.from('clients').insert([newClientData]);
      if (error) throw error;

      await fetchClients(currentStoreId);
      if (isQuick) {
        setSelectedClient(clientName);
        setClientSearchQuery('');
        setShowQuickClientModal(false);
      }
      setClientName('');
      setClientDoc('');
      setClientPhone('');
      setClientEmail('');
    } catch (error) {
      console.error('Error al guardar cliente:', error.message);
    } finally {
      setLoadingClient(false);
    }
  };

  const handleDeleteClient = async (id) => {
    if (!isOnline) {
      if (id && String(id).startsWith('local_')) {
        const actions = await getOfflineActions();
        const action = actions.find(a => a.type === 'INSERT_CLIENT' && a.tempId === id);
        if (action) await clearOfflineAction(action.local_id);
      } else {
        await queueOfflineAction({ type: 'DELETE_CLIENT', clientId: id });
      }
      setClients(clients.filter(c => c.id !== id));
      checkPendingSales();
      alert("¡Estás Offline! Cliente eliminado localmente.");
      return;
    }

    try {
      const { error } = await supabase.from('clients').delete().eq('id', id).eq('store_id', currentStoreId);
      if (error) throw error;
      fetchClients(currentStoreId);
    } catch (error) {
      console.error('Error al eliminar cliente:', error.message);
    }
  };

  const addToCart = (product) => {
    if (!currentShift) {
      alert("Debes abrir la caja / turno antes de procesar ventas.");
      setActiveTab('cash');
      return;
    }

    const currentInCart = cart.find(item => item.id === product.id)?.quantity || 0;
    if (product.stock !== undefined && currentInCart >= product.stock) {
      alert(`No hay suficiente stock disponible para ${product.name}. Stock actual: ${product.stock}`);
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const code = barcodeInput.trim();
    const foundProduct = products.find(p => p.barcode === code || p.id.toString() === code);

    if (foundProduct) {
      addToCart(foundProduct);
      setBarcodeInput('');
    } else {
      alert(`No se encontró ningún producto con el código o SKU: "${code}"`);
      setBarcodeInput('');
    }
  };

  const removeFromCart = (targetKey) => {
  setCart(cart.filter(item => {
    const uniqueKey = item.cartItemId || item.id;
    return uniqueKey !== targetKey;
  }));
  };

  const updateQuantity = (targetKey, delta) => {
    setCart(prevCart => prevCart.map(item => {
      // Validamos si es un platillo con modificadores (cartItemId) o un producto normal (id)
      const uniqueKey = item.cartItemId || item.id;
      
      if (uniqueKey === targetKey) {
        // Buscamos el producto original para verificar el stock correctamente
        const productInfo = products.find(p => p.id === item.id);
        const newQty = item.quantity + delta;
        
        if (delta > 0 && productInfo && newQty > productInfo.stock) {
          alert(`Stock máximo alcanzado (${productInfo.stock} unidades).`);
          return item;
        }
        return newQty > 0 ? { ...item, quantity: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const updateCalculations = () => {
    setCalcPayments({
      cashUSD: parseFloat(payCashUSD) || 0,
      cashBs: parseFloat(payCashBs) || 0,
      pagoMovil: parseFloat(payPagoMovil) || 0,
      zelle: parseFloat(payZelle) || 0,
      debit: parseFloat(payDebit) || 0
    });
  };

  const totalUSD = settlingSale ? (settlingSale.balance_due_usd || settlingSale.total_usd) : cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalBs = totalUSD * bcvRate;

  const paidUSDFromCashUSD = calcPayments.cashUSD;
  const paidUSDFromCashBs = calcPayments.cashBs / (bcvRate || 1);
  const paidUSDFromPagoMovil = calcPayments.pagoMovil / (bcvRate || 1);
  const paidUSDFromZelle = calcPayments.zelle;
  const paidUSDFromDebit = calcPayments.debit / (bcvRate || 1);

  const totalPaidUSD = paidUSDFromCashUSD + paidUSDFromCashBs + paidUSDFromPagoMovil + paidUSDFromZelle + paidUSDFromDebit;
  const remainingUSD = Math.max(0, parseFloat((totalUSD - totalPaidUSD).toFixed(2)));
  const remainingBs = remainingUSD * bcvRate; 
  const changeUSD = Math.max(0, parseFloat((totalPaidUSD - totalUSD).toFixed(2)));
  const changeBs = changeUSD * bcvRate;

  const deductInventory = async (itemsToDeduct) => {
    for (const item of itemsToDeduct) {
      const currentProd = products.find(p => p.id === item.id);
      if (currentProd) {
        const newStock = Math.max(0, (currentProd.stock || 0) - item.quantity);
        await supabase.from('products').update({ stock: newStock }).eq('id', item.id).eq('store_id', currentStoreId);
      }
    }
    await fetchProducts(currentStoreId);
  };

const handleHoldOrder = async () => {
    if (cart.length === 0 || !currentShift || !currentStoreId) return;

    setProcessing(true);
    const clientData = clients.find(c => c.name === selectedClient);
    const clientDocToSave = clientData ? clientData.document : '';

    const saleData = {
      total_usd: totalUSD,
      total_bs: totalBs,
      items: cart,
      client_name: selectedClient,
      status: 'pending',
      balance_due_usd: totalUSD,
      shift_id: currentShift.id,
      store_id: currentStoreId,
      payment_details: {
        applied_bcv_rate: bcvRate,
        client_document: clientDocToSave
      }
    };

    if (!isOnline) {
      const tempId = `local_${Date.now()}`;
      await queueOfflineAction({ type: 'INSERT_SALE', saleData, historyData: null, tempId });
      
      const localSale = { ...saleData, id: tempId, created_at: new Date().toISOString() };
      setSales([localSale, ...sales]);
      
      setCart([]);
      setSelectedClient('Cliente General');
      checkPendingSales();
      
      // ⬇️ ALERTA DINÁMICA OFFLINE ⬇️
      alert(currentStoreType === 'restaurant' 
        ? "¡Estás Offline! Comanda guardada localmente y en cola para cocina." 
        : "¡Estás Offline! Cuenta guardada en espera localmente."
      );
      
      setProcessing(false);
      return;
    }

    const { error } = await supabase.from('sales').insert([saleData]);
    if (error) {
      alert("Error al dejar en espera: " + error.message);
    } else {
      setCart([]);
      setSelectedClient('Cliente General');
      fetchSales(currentStoreId);
      
      // ⬇️ ALERTA DINÁMICA ONLINE ⬇️
      alert(currentStoreType === 'restaurant' 
        ? "¡Comanda enviada a la cocina exitosamente!" 
        : "¡Venta guardada en espera exitosamente!"
      );
    }
    setProcessing(false);
  };

  const handleResumeOrder = async (sale) => {
    if (cart.length > 0) {
      if (!window.confirm("Tienes productos en el carrito actual. ¿Deseas reemplazarlos?")) {
        return;
      }
    }

    setCart(sale.items);
    setSelectedClient(sale.client_name || 'Cliente General');

    if (!isOnline) {
      if (sale.id.toString().startsWith('local_')) {
        const actions = await getOfflineActions();
        const insertAction = actions.find(a => a.type === 'INSERT_SALE' && a.tempId === sale.id);
        if (insertAction) await clearOfflineAction(insertAction.local_id);
      } else {
        await queueOfflineAction({ type: 'DELETE_SALE', saleId: sale.id });
      }
      setSales(sales.filter(s => s.id !== sale.id));
      checkPendingSales();
    } else {
      if (!String(sale.id).startsWith('local_')) {
        await supabase.from('sales').delete().eq('id', sale.id).eq('store_id', currentStoreId);
      }
      fetchSales(currentStoreId);
    }

    setActiveTab('pos');
  };

  const handleStartSettleCredit = (sale) => {
    setSettlingSale(sale);
    setShowInvoiceModal(false);
    setShowPaymentModal(true);
  };

  const handleCreditCheckout = async () => {
    if (!currentShift || !currentStoreId) {
      alert("La caja está cerrada.");
      return;
    }

    if (selectedClient === 'Cliente General') {
      alert("Para registrar una venta a crédito debes asociar un cliente específico.");
      return;
    }

    if (!window.confirm(`¿Registrar venta a CRÉDITO para ${selectedClient} por $${totalUSD.toFixed(2)}?`)) {
      return;
    }

    setProcessing(true);
    const clientData = clients.find(c => c.name === selectedClient);
    const clientDocToSave = clientData ? clientData.document : '';

    const paymentDetails = {
      cash_usd: 0, cash_bs: 0, pago_movil: 0, zelle: 0, debit: 0,
      reference: 'VENTA A CRÉDITO',
      applied_bcv_rate: bcvRate,
      client_document: clientDocToSave
    };

    const saleData = {
      total_usd: totalUSD, total_bs: totalBs, items: cart,
      client_name: selectedClient, status: 'credit', balance_due_usd: totalUSD,
      shift_id: currentShift.id, store_id: currentStoreId, payment_details: paymentDetails
    };

    const historyData = { amount_usd: 0, payment_details: paymentDetails, store_id: currentStoreId };

    if (!isOnline) {
      const tempId = `local_${Date.now()}`;
      await queueOfflineAction({ type: 'INSERT_SALE', saleData, historyData, tempId });
      
      const currentProducts = [...products];
      for (const item of cart) {
        const idx = currentProducts.findIndex(p => p.id === item.id);
        if (idx !== -1) {
          currentProducts[idx].stock = Math.max(0, (currentProducts[idx].stock || 0) - item.quantity);
        }
      }
      setProducts(currentProducts);
      setSales([{ ...saleData, id: tempId, created_at: new Date().toISOString() }, ...sales]);

      setCart([]);
      setSelectedClient('Cliente General');
      setShowPaymentModal(false);
      setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
      setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
      checkPendingSales();
      alert("¡Estás Offline! Crédito guardado localmente.");
    } else {
      const { error, data: newSale } = await supabase.from('sales').insert([saleData]).select().single();
      if (error) {
        alert("Error al registrar crédito: " + error.message);
      } else {
        if (newSale) {
          await supabase.from('payment_history').insert([{
            sale_id: newSale.id, amount_usd: 0, payment_details: paymentDetails, store_id: currentStoreId
          }]);
        }
        await deductInventory(cart);
        setCart([]);
        setSelectedClient('Cliente General');
        setShowPaymentModal(false);
        setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
        setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
        fetchSales(currentStoreId);
        alert("¡Venta a crédito registrada con éxito!");
      }
    }
    setProcessing(false);
  };

  const handleCheckoutSubmit = async () => {
    if (!currentShift || !currentStoreId) {
      alert("La caja está cerrada.");
      return;
    }

    const finalCashUSD = parseFloat(payCashUSD) || 0;
    const finalCashBs = parseFloat(payCashBs) || 0;
    const finalPagoMovil = parseFloat(payPagoMovil) || 0;
    const finalZelle = parseFloat(payZelle) || 0;
    const finalDebit = parseFloat(payDebit) || 0;

    const currentTotalPaidUSD = finalCashUSD + finalZelle + ((finalCashBs + finalPagoMovil + finalDebit) / (bcvRate || 1));

    if (currentTotalPaidUSD <= 0) {
      alert("Debes ingresar un monto a pagar válido.");
      return;
    }

    setProcessing(true);
    
    const clientData = clients.find(c => c.name === selectedClient);
    const clientDocToSave = clientData ? clientData.document : (settlingSale?.payment_details?.client_document || '');

    const paymentDetails = {
      cash_usd: finalCashUSD,
      cash_bs: finalCashBs,
      pago_movil: finalPagoMovil,
      zelle: finalZelle,
      debit: finalDebit,
      reference: paymentRef,
      change_usd: parseFloat((Math.max(0, currentTotalPaidUSD - totalUSD)).toFixed(2)),
      change_bs: parseFloat((Math.max(0, currentTotalPaidUSD - totalUSD) * bcvRate).toFixed(2)),
      applied_bcv_rate: bcvRate,
      client_document: clientDocToSave
    };

    if (settlingSale) {
      const currentDebt = settlingSale.balance_due_usd || settlingSale.total_usd;
      const netPaidForDebt = Math.min(currentTotalPaidUSD, currentDebt);
      const newBalanceDue = parseFloat((currentDebt - netPaidForDebt).toFixed(2));
      const isFullyPaid = newBalanceDue <= 0.01;
      const updatedStatus = isFullyPaid ? 'completed' : 'credit';

      if (!isOnline) {
        if (String(settlingSale.id).startsWith('local_')) {
          const actions = await getOfflineActions();
          const insertAction = actions.find(a => a.type === 'INSERT_SALE' && (a.tempId === settlingSale.id || (a.saleData && a.saleData.id === settlingSale.id)));
          if (insertAction) {
            await clearOfflineAction(insertAction.local_id);
            await queueOfflineAction({
              type: 'INSERT_SALE',
              saleData: { ...insertAction.saleData, status: updatedStatus, balance_due_usd: newBalanceDue, payment_details: paymentDetails, store_id: currentStoreId },
              historyData: { amount_usd: netPaidForDebt, payment_details: paymentDetails, store_id: currentStoreId },
              tempId: settlingSale.id
            });
          }
        } else {
          await queueOfflineAction({
            type: 'UPDATE_SALE',
            saleId: settlingSale.id,
            updatedStatus,
            newBalanceDue,
            paymentDetails,
            historyData: { amount_usd: netPaidForDebt, payment_details: paymentDetails, store_id: currentStoreId }
          });
        }

        const updatedSales = sales.map(s => {
          if (s.id === settlingSale.id) {
            return { ...s, status: updatedStatus, balance_due_usd: newBalanceDue, payment_details: paymentDetails };
          }
          return s;
        });
        setSales(updatedSales);

        alert(isFullyPaid ? "¡Estás Offline! Factura pagada localmente." : `¡Estás Offline! Abono registrado. Saldo pendiente: $${newBalanceDue.toFixed(2)}`);
        setSettlingSale(null);
        setShowPaymentModal(false);
        setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
        setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
        checkPendingSales();
        setProcessing(false);
        return;
      } else {
        await supabase.from('payment_history').insert([{
          sale_id: settlingSale.id,
          amount_usd: netPaidForDebt,
          payment_details: paymentDetails,
          store_id: currentStoreId
        }]);

        const { error } = await supabase
          .from('sales')
          .update({
            status: updatedStatus,
            balance_due_usd: newBalanceDue,
            payment_details: paymentDetails
          })
          .eq('id', settlingSale.id)
          .eq('store_id', currentStoreId);

        if (error) {
          alert("Error al procesar el abono: " + error.message);
        } else {
          alert(isFullyPaid ? "¡Crédito pagado por completo!" : `¡Abono registrado! Saldo pendiente: $${newBalanceDue.toFixed(2)}`);
          setSettlingSale(null);
          setShowPaymentModal(false);
          setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
          setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
          fetchSales(currentStoreId);
        }
      }
    } else {
      const newBalanceDue = parseFloat((Math.max(0, totalUSD - currentTotalPaidUSD)).toFixed(2));
      const finalStatus = newBalanceDue > 0 ? 'credit' : 'completed';
      const actualPaidToRecord = Math.min(currentTotalPaidUSD, totalUSD);

      if (newBalanceDue > 0 && selectedClient === 'Cliente General') {
        alert("Para dejar un saldo pendiente / crédito debes asociar un cliente específico.");
        setProcessing(false);
        return;
      }

      const saleData = {
        total_usd: totalUSD, total_bs: totalBs, items: cart,
        client_name: selectedClient, status: finalStatus, balance_due_usd: newBalanceDue,
        shift_id: currentShift.id, store_id: currentStoreId, payment_details: paymentDetails
      };

      const historyData = { amount_usd: actualPaidToRecord, payment_details: paymentDetails, store_id: currentStoreId };

      if (!isOnline) {
        const tempId = `local_${Date.now()}`;
        await queueOfflineAction({ type: 'INSERT_SALE', saleData, historyData, tempId });

        const currentProducts = [...products];
        for (const item of cart) {
          const idx = currentProducts.findIndex(p => p.id === item.id);
          if (idx !== -1) {
            currentProducts[idx].stock = Math.max(0, (currentProducts[idx].stock || 0) - item.quantity);
          }
        }
        setProducts(currentProducts);
        setSales([{ ...saleData, id: tempId, created_at: new Date().toISOString() }, ...sales]);

        setCart([]);
        setSelectedClient('Cliente General');
        setShowPaymentModal(false);
        setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
        setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
        checkPendingSales();
        alert("¡Estás Offline! Venta guardada localmente.");
      } else {
        const { data: newSale, error } = await supabase.from('sales').insert([saleData]).select().single();
        if (error) {
          alert("Error al procesar el pago: " + error.message);
        } else {
          if (newSale && actualPaidToRecord > 0) {
            await supabase.from('payment_history').insert([{
              sale_id: newSale.id, amount_usd: actualPaidToRecord, payment_details: paymentDetails, store_id: currentStoreId
            }]);
          }
          await deductInventory(cart);
          setCart([]);
          setSelectedClient('Cliente General');
          setShowPaymentModal(false);
          setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
          setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
          fetchSales(currentStoreId);
          alert(newBalanceDue > 0 ? `¡Venta registrada con saldo pendiente de $${newBalanceDue.toFixed(2)}!` : "¡Venta procesada con éxito!");
        }
      }
    }
    setProcessing(false);
  };

  const handleViewInvoice = async (sale) => {
    setSelectedInvoice(sale);
    if (!isOnline) {
      setInvoiceHistory([]);
      setShowInvoiceModal(true);
      return;
    }
    
    const { data, error } = await supabase.from('payment_history').select('*').eq('sale_id', sale.id).eq('store_id', currentStoreId).order('created_at', { ascending: true });
    
    if (!error) {
      setInvoiceHistory(data || []);
    } else {
      setInvoiceHistory([]);
    }
    setShowInvoiceModal(true);
  };

  const getInvoiceClientDocument = () => {
    if (!selectedInvoice) return '';
    if (selectedInvoice.payment_details?.client_document) {
      return selectedInvoice.payment_details.client_document;
    }
    const currentClientData = clients.find(c => c.name === selectedInvoice.client_name);
    return currentClientData ? currentClientData.document : 'No registrado';
  };

  const filteredClientsForPOS = clients.filter(c => {
    const query = clientSearchQuery.toLowerCase();
    const nameMatch = c.name && c.name.toLowerCase().includes(query);
    const docMatch = c.document && c.document.toLowerCase().includes(query);
    return nameMatch || docMatch;
  });

  const handleClientSearchChange = (e) => {
    const val = e.target.value;
    setClientSearchQuery(val);

    const exactMatch = clients.find(c => 
      (c.document && c.document.toLowerCase() === val.toLowerCase()) || 
      (c.name && c.name.toLowerCase() === val.toLowerCase())
    );

    if (exactMatch) {
      setSelectedClient(exactMatch.name);
    }
  };

const fastFoodCategories = ['hamburguesas', 'perros calientes', 'perros', 'pizzas', 'comida', 'comida rápida', 'bebidas', 'postres', 'salchipapas', 'pepitos'];

  const filteredProductsForCatalog = (products || []).filter(p => {
    if (!p) return false;
    
    // Validamos de forma segura la consulta de búsqueda
    const searchQuery = (typeof productSearchQuery !== 'undefined' && productSearchQuery) ? String(productSearchQuery).toLowerCase() : '';
    const productName = (p.name || '').toLowerCase();
    const productBarcode = (p.barcode || '').toLowerCase();

    const matchesQuery = !searchQuery || productName.includes(searchQuery) || (productBarcode && productBarcode.includes(searchQuery));

    if (!matchesQuery) return false;

    const cat = (p.category || '').trim().toLowerCase();

    // ERROR CORREGIDO: Eliminamos la dependencia de 'activeStore' (que no existía) 
    // y usamos directamente tu estado global currentStoreType.
    if (currentStoreType === 'restaurant') {
      // En modo restaurante: ocultamos solo la categoría 'general' de bodega pura
      return cat !== 'general';
    } else {
      // En tienda normal/retail: ocultamos estrictamente cualquier categoría de comida rápida
      return !fastFoodCategories.includes(cat);
    }
  });

  const currentShiftSales = currentShift ? sales.filter(s => s.shift_id === currentShift.id && s.status === 'completed') : [];
  const shiftTotalUSD = currentShiftSales.reduce((sum, s) => sum + s.total_usd, 0);
  const shiftCashUSD = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.cash_usd || 0), 0);
  const shiftZelle = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.zelle || 0), 0);
  const shiftPagoMovilBs = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.pago_movil || 0), 0);
  const shiftDebitBs = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.debit || 0), 0);
  const shiftCashBs = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.cash_bs || 0), 0);

  const getCurrentRegisterName = () => {
    if (!currentShift) return '---';
    const reg = registers.find(r => r.id === currentShift.register_id);
    return reg ? reg.name : 'Caja Principal';
  };

  const clientsWithMetrics = clients.map(cli => {
    const clientSales = sales.filter(s => s.client_name === cli.name && s.status !== 'pending');
    const totalBilled = clientSales.reduce((sum, s) => sum + s.total_usd, 0);
    const totalPending = clientSales.reduce((sum, s) => sum + (s.balance_due_usd !== undefined ? s.balance_due_usd : (s.status === 'credit' ? s.total_usd : 0)), 0);
    const totalPaid = totalBilled - totalPending;
    return { ...cli, totalBilled, totalPending, totalPaid, salesCount: clientSales.length };
  }).sort((a, b) => b.totalBilled - a.totalBilled);

  const getFilteredClientsByTab = () => {
    if (clientFilterTab === 'best') {
      return [...clientsWithMetrics].sort((a, b) => b.totalBilled - a.totalBilled);
    } else if (clientFilterTab === 'debtors') {
      return clientsWithMetrics.filter(c => c.totalPending > 0);
    } else if (clientFilterTab === 'frequent') {
      return [...clientsWithMetrics].sort((a, b) => b.salesCount - a.salesCount);
    }
    return clientsWithMetrics;
  };

  const handleOpenClientDetail = (cli) => {
    setSelectedClientDetail(cli);
    setTempClientNote(clientNotes[cli.id] || '');
  };

  const handleSaveClientNote = (cliId) => {
    const updatedNotes = { ...clientNotes, [cliId]: tempClientNote };
    setClientNotes(updatedNotes);
    localStorage.setItem('fiskal_client_notes', JSON.stringify(updatedNotes));
    alert('¡Nota personalizada guardada con éxito!');
  };

  const getClientHistoryAndTopProducts = (clientName) => {
    const cliSales = sales.filter(s => s.client_name === clientName && s.status !== 'pending');
    const prodCounts = {};
    cliSales.forEach(sale => {
      sale.items?.forEach(item => {
        if (!prodCounts[item.name]) {
          prodCounts[item.name] = { name: item.name, qty: 0, total: 0 };
        }
        prodCounts[item.name].qty += item.quantity;
        prodCounts[item.name].total += item.price * item.quantity;
      });
    });
    const topProducts = Object.values(prodCounts).sort((a, b) => b.qty - a.qty);
    return { cliSales, topProducts };
  };

  const obtenerProductosMasVendidos = () => {
    const conteo = {};
    sales.forEach(venta => {
      if (venta.status === 'pending') return;
      venta.items?.forEach(item => {
        if (!conteo[item.id]) {
          conteo[item.id] = { id: item.id, name: item.name, cantidad: 0, totalVendido: 0, compradores: {} };
        }
        conteo[item.id].cantidad += item.quantity;
        conteo[item.id].totalVendido += item.price * item.quantity;
        const clienteNombre = venta.client_name || 'Cliente General';
        conteo[item.id].compradores[clienteNombre] = (conteo[item.id].compradores[clienteNombre] || 0) + item.quantity;
      });
    });
    return Object.values(conteo).sort((a, b) => b.cantidad - a.cantidad);
  };

  const productosTop = obtenerProductosMasVendidos();

  const filteredSales = sales.filter(sale => {
    if (!sale.created_at) return true;
    const saleDate = new Date(sale.created_at);
    const saleDateStr = saleDate.toISOString().split('T')[0];

    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(today.getDate() - 7);

    if (historyFilterType === 'yesterday') {
      return saleDateStr === yesterdayStr;
    } else if (historyFilterType === 'last_week') {
      return saleDate >= sevenDaysAgo && saleDate <= today;
    } else if (historyFilterType === 'custom' && historyCustomDate) {
      return saleDateStr === historyCustomDate;
    }
    return true;
  });

  const getSystemFinancials = () => {
    const totalIncome = saasTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const totalExpenses = saasTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
    const netProfit = totalIncome - totalExpenses;
    const totalPendingComm = systemVendors.reduce((sum, v) => sum + (parseFloat(v.pending_balance) || 0), 0);
    return { totalIncome, totalExpenses, netProfit, totalPendingComm };
  };

// =================== FIN DEL BLOQUE 3 ===================
if (!session) {
    return (
      <div className="fiskal-login-container">
        <div className="product-form-card" style={{ width: '400px', maxWidth: '100%', padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={logoDark} alt="Fiskal Logo" style={{ height: '38px', objectFit: 'contain', marginBottom: '4px' }} />
            <p style={{ fontSize: '13px', color: '#6c757d' }}>Sistema de Gestión Comercial y POS</p>
          </div>

          {authError && (
            <div style={{ background: '#ffe3e3', color: '#c92a2a', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="fiskal-form">
            <div className="form-group">
              <label>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#adb5bd' }} />
                <input 
                  type="email" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  placeholder="tu@correo.com" 
                  style={{ paddingLeft: '34px', width: '100%' }}
                  required 
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#adb5bd' }} />
                <input 
                  type="password" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ paddingLeft: '34px', width: '100%' }}
                  required 
                />
              </div>
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px' }} disabled={authLoading}>
              {authLoading ? 'Procesando...' : (isRegistering ? 'Registrar Mi Nuevo Comercio' : 'Iniciar Sesión')}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <button 
              type="button" 
              onClick={() => setIsRegistering(!isRegistering)} 
              style={{ background: 'none', border: 'none', color: '#1c7ed6', fontSize: '13px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿Eres dueño de un negocio? Regístrate aquí'}
            </button>
          </div>
        </div>
      </div>
    );
  }

return (
    <div className="fiskal-container">
      
      {/* ⬇️ BLOQUE NUEVO: Alerta flotante global ⬇️ */}
      {readyNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: '#2b8a3e',
          color: '#fff',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          fontWeight: 'bold',
          fontSize: '15px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <span style={{ fontSize: '20px' }}>🔔</span>
          {readyNotification}
          <button 
            onClick={() => setReadyNotification(null)}
            style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', marginLeft: '8px', fontSize: '20px' }}
          >
            ×
          </button>
        </div>
      )}
      
      {isSidebarExpanded && (
        <div 
          onClick={() => setIsSidebarExpanded(false)} 
          style={{ position: 'fixed', inset: 0, background: 'transparent', zIndex: 999 }}
        />
      )}

      <aside 
        className={`fiskal-sidebar ${isSidebarExpanded ? 'expanded' : ''}`} 
        onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
      >
        <div className="brand-logo">
          <img src={logoDark} alt="Fiskal" style={{ height: '32px', objectFit: 'contain', marginBottom: '2px', display: 'block' }} />
          <span>Sistema de Gestión</span>
        </div>
        <nav className="nav-menu">
          <button className={activeTab === 'pos' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('pos'); setSelectedRestaurantCategory(null); setSettlingSale(null); setIsSidebarExpanded(false); }}>
            <ShoppingCart size={20} /> <span>{currentStoreType === 'restaurant' ? 'Comandas (POS)' : 'Terminal (POS)'}</span>
          </button>
          <button className={activeTab === 'cash' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('cash'); setIsSidebarExpanded(false); }}>
            <Lock size={20} /> <span>Caja / Turnos</span>
          </button>
          <button className={activeTab === 'products' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('products'); resetProductForm(); setIsSidebarExpanded(false); }}>
            <Package size={20} /> <span>{currentStoreType === 'restaurant' ? 'Menú & Stock' : 'Productos & Stock'}</span>
          </button>
          <button className={activeTab === 'history' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('history'); setIsSidebarExpanded(false); }}>
            <History size={20} /> <span>Historial</span>
          </button>
          <button className={activeTab === 'clients' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('clients'); setIsSidebarExpanded(false); }}>
            <Users size={20} /> <span>Clientes</span>
          </button>
          
          {currentStoreType === 'restaurant' && (
           <button 
           className={activeTab === 'kds' ? 'nav-btn active' : 'nav-btn'} 
           onClick={(e) => { e.stopPropagation(); setActiveTab('kds'); }}
           >
          <span style={{ fontSize: '18px', display: 'flex', alignItems: 'center', width: '20px', justifyContent: 'center' }}>🍳</span> 
          <span>KDS Cocina</span>
          </button>
        )}

          {currentUserRole === 'system_vendor' && (
            <button className={activeTab === 'vendor_portal' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('vendor_portal'); setIsSidebarExpanded(false); }} style={{ color: '#2b8a3e', fontWeight: 'bold' }}>
              <UserPlus size={20} /> <span>Registrar Comercios</span>
            </button>
          )}

          {(currentUserRole === 'owner' || currentUserRole === 'super_admin' || currentUserRole === 'system_vendor') && (
            <button className={activeTab === 'settings' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('settings'); setIsSidebarExpanded(false); }}>
              <Settings size={20} /> <span>Configuración</span>
            </button>
          )}

          {currentUserRole === 'super_admin' && (
            <button className={activeTab === 'admin' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('admin'); setIsSidebarExpanded(false); }} style={{ borderTop: '1px solid #dee2e6', marginTop: '10px', paddingTop: '10px', color: '#d9480f' }}>
              <ShieldAlert size={20} /> <span>Panel Maestro</span>
            </button>
          )}

          <button className="nav-btn" onClick={(e) => { e.stopPropagation(); handleLogout(); }} style={{ borderTop: '1px solid #dee2e6', marginTop: 'auto', color: '#fa5252' }}>
            <LogOut size={20} /> <span>Cerrar Sesión</span>
          </button>
        </nav>
      </aside>

      <main className="fiskal-main">
        <header className="main-header">
          <h1>
            {activeTab === 'pos' ? (currentStoreType === 'restaurant' ? 'Punto de Venta (Comandas)' : 'Terminal de Venta') : 
             activeTab === 'cash' ? 'Arqueo y Control de Caja' :
             activeTab === 'products' ? (currentStoreType === 'restaurant' ? 'Gestión de Menú e Inventario' : 'Gestión de Productos e Inventario') : 
             activeTab === 'history' ? 'Historial de Ventas' : 
             activeTab === 'clients' ? 'Gestión de Clientes y Rendimiento' : 
             activeTab === 'vendor_portal' ? 'Portal de Vendedor de Sistema (Alta de Comercios)' :
             activeTab === 'admin' ? 'Panel Maestro SaaS (Administración)' :
             activeTab === 'settings' ? 'Configuración del Sistema y Empleados' :
             activeTab.toUpperCase()}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            
            <div className={`shift-status-pill ${isOnline ? 'open' : 'closed'}`} style={{ background: isOnline ? '#eebefa' : '#ffe3e3', color: isOnline ? '#862e9c' : '#c92a2a' }}>
              {isOnline ? <Wifi size={14} /> : <WifiOff size={14} />}
              <span>{isOnline ? 'Online' : 'Offline'}</span>
            </div>

            {pendingSalesCount > 0 && (
              <button 
                className="btn-sync" 
                onClick={syncOfflineData} 
                disabled={!isOnline || isSyncing} 
                style={{ background: '#fff3bf', color: '#e67700', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', border: 'none', cursor: isOnline ? 'pointer' : 'not-allowed' }}
              >
                <UploadCloud size={14} className={isSyncing ? 'spinning' : ''} />
                {pendingSalesCount} pendientes
              </button>
            )}

            <div className={`shift-status-pill ${currentShift ? 'open' : 'closed'}`}>
              {currentShift ? <Unlock size={14} /> : <Lock size={14} />}
              <span>{currentShift ? `Abierta (${getCurrentRegisterName()})` : 'Caja Cerrada'}</span>
            </div>
            
            <div className="exchange-rate-badge">
              <span>Tasa BCV: <strong>Bs. {bcvRate ? bcvRate.toFixed(2) : '---'}</strong></span>
              <button className={`btn-sync ${loadingRate ? 'spinning' : ''}`} onClick={() => syncBcvRate(currentStoreId)} title="Sincronizar Tasa">
                <RefreshCw size={14} />
              </button>
              {lastSync && <span className="sync-time">{lastSync}</span>}
            </div>

            {currentUserRole === 'system_vendor' && (
              <div style={{ display: 'flex', alignItems: 'center', background: '#e9ecef', padding: '3px', borderRadius: '6px', gap: '2px', marginLeft: 'auto' }}>
                <button
                  onClick={() => setCurrentStoreType('general')}
                  style={{
                    background: currentStoreType === 'general' ? '#fff' : 'transparent',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    color: currentStoreType === 'general' ? '#212529' : '#6c757d',
                    boxShadow: currentStoreType === 'general' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Tienda Estándar
                </button>
                <button
                  onClick={() => setCurrentStoreType('restaurant')}
                  style={{
                    background: currentStoreType === 'restaurant' ? '#d9480f' : 'transparent',
                    border: 'none',
                    padding: '4px 10px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    color: currentStoreType === 'restaurant' ? '#fff' : '#6c757d',
                    boxShadow: currentStoreType === 'restaurant' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  Comida Rápida
                </button>
              </div>
            )}
            
          </div>
        </header>

<section className="content-area">
           {activeTab === 'pos' && (
            <div className="pos-grid">
              <div className="products-catalog">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3>{currentStoreType === 'restaurant' ? 'Menú de Platillos' : 'Catálogo Rápido'}</h3>
                  <form onSubmit={handleBarcodeSubmit} style={{ display: 'flex', gap: '6px', width: '300px' }}>
                    <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
                      <Barcode size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#6c757d', zIndex: 2 }} />
                      <input 
                        ref={barcodeInputRef}
                        type="text" 
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Escanear código o SKU..."
                        style={{ width: '100%', padding: '8px 38px 8px 34px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none' }}
                        autoFocus
                      />
                      <button 
                        type="button" 
                        onClick={startCameraScanner}
                        title="Escanear con Cámara"
                        style={{ position: 'absolute', right: '4px', background: '#212529', color: '#fff', border: 'none', borderRadius: '4px', padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Camera size={15} />
                      </button>
                    </div>
                  </form>
                </div>

                <div style={{ marginBottom: '16px', position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: '#6c757d', zIndex: 2 }} />
                  <input
                    type="text"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                    placeholder={currentStoreType === 'restaurant' ? "Buscar platillo, bebida o combo..." : "Buscar producto por nombre o SKU manualmente..."}
                    style={{ width: '100%', padding: '8px 8px 8px 34px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none', background: '#fff' }}
                  />
                </div>

                {!currentShift && (
                  <div className="alert-banner-warning">
                    <ShieldAlert size={20} />
                    <span>La caja se encuentra cerrada. Debes abrir un turno en la pestaña <strong>Caja / Turnos</strong> para poder facturar.</span>
                  </div>
                )}

                {currentStoreType === 'restaurant' && !selectedRestaurantCategory ? (
                  /* VISTA DE CATEGORÍAS DE RESTAURANTE */
                  <div>
                    {(() => {
                      const restaurantProducts = products.filter(p => {
                        const cat = (p.category || '').trim().toLowerCase();
                        return cat !== 'general' && cat !== 'por peso';
                      });
                      const uniqueCategories = [...new Set(restaurantProducts.map(p => (p.category || 'General').trim()))];

                      if (uniqueCategories.length === 0) {
                        return (
                          <div style={{ textAlign: 'center', padding: '40px', background: '#f8f9fa', borderRadius: '8px', border: '1px dashed #ced4da' }}>
                            <Package size={40} color="#adb5bd" style={{ marginBottom: '12px' }} />
                            <h4>No hay categorías ni platillos creados</h4>
                            <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>Ve a la pestaña <strong>Menú & Stock</strong> para registrar tus platillos y asignarles categorías (ej. Hamburguesas, Perros, Bebidas).</p>
                          </div>
                        );
                      }

                      return (
                        <div className="catalog-grid">
                          {uniqueCategories
                            .filter(cat => currentStoreType !== 'restaurant' || cat.toLowerCase() !== 'por peso')
                            .map((cat, idx) => {
                            const count = restaurantProducts.filter(p => (p.category || '').trim().toLowerCase() === cat.toLowerCase()).length;
                            return (
                              <div 
                                key={idx} 
                                className="product-card" 
                                onClick={() => setSelectedRestaurantCategory(cat)}
                                style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', border: '2px solid #dee2e6' }}
                              >
                                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                                  <Store size={28} color="#2b8a3e" />
                                </div>
                                <h4 style={{ fontSize: '16px', fontWeight: 'bold', color: '#212529', marginBottom: '4px', textAlign: 'center' }}>{cat}</h4>
                                <span style={{ fontSize: '12px', color: '#6c757d', background: '#fff', padding: '2px 8px', borderRadius: '10px' }}>{count} platillo{count === 1 ? '' : 's'}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  /* VISTA DE PLATILLOS (O TIENDA ESTÁNDAR) */
                  <div>
                    {currentStoreType === 'restaurant' && (
                      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button 
                          onClick={() => setSelectedRestaurantCategory(null)} 
                          style={{ background: '#e9ecef', border: 'none', padding: '6px 12px', borderRadius: '6px', fontSize: '13px', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px', color: '#495057' }}
                        >
                          ← Volver a Categorías ({selectedRestaurantCategory})
                        </button>
                      </div>
                    )}

                    <div className="catalog-grid">
                      {(() => {
                        let displayProducts = filteredProductsForCatalog;
                        
                        // FILTRO ESTRICTO DE AISLAMIENTO ENTRE MODOS
                        const fastFoodCats = ['hamburguesas', 'perros calientes', 'perros', 'pizzas', 'comida', 'comida rápida', 'bebidas', 'postres', 'salchipapas', 'pepitos'];
                        displayProducts = displayProducts.filter(p => {
                          const cat = (p.category || '').trim().toLowerCase();
                          if (currentStoreType === 'restaurant') {
                            return cat !== 'general' && cat !== 'por peso';
                          } else {
                            return !fastFoodCats.includes(cat) && cat !== 'restaurante';
                          }
                        });

                        if (currentStoreType === 'restaurant' && selectedRestaurantCategory) {
          const targetCat = selectedRestaurantCategory.trim().toLowerCase();
          displayProducts = displayProducts.filter(p => {
            const pCat = (p.category || '').trim().toLowerCase();
            return pCat === targetCat || pCat.includes(targetCat) || targetCat.includes(pCat);
          });
        }

                        return displayProducts.length === 0 ? (
                          <p className="empty-text">No se encontraron platillos o productos en esta vista.</p>
                        ) : (
                            displayProducts.map((prod) => (
                            <div 
                              key={prod.id} 
                              className={`product-card ${prod.stock <= 0 ? 'out-of-stock' : ''}`} 
                              onClick={() => {
                                 if (currentStoreType === 'restaurant') {
                                 handleOpenModifierModal(prod);
                                 } else if (prod.category === 'Por Peso') {
                                     handleOpenWeightModal(prod);
                                     } else {
                                    addToCart(prod);
                                }
                              }}
                            >
                              <div className="img-container">
                                {prod.image_url ? (
                                  <img src={prod.image_url} alt={prod.name} />
                                ) : (
                                  <Package size={36} strokeWidth={1.5} color="#adb5bd" />
                                )}
                              </div>
                              <div className="product-card-content">
                                <h4>{prod.name}</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto' }}>
                                  <span className="product-price">${prod.price.toFixed(2)}</span>
                                  <span style={{ fontSize: '11px', background: prod.stock <= 2 ? '#ffe3e3' : '#f8f9fa', color: prod.stock <= 2 ? '#fa5252' : '#495057', padding: '4px 8px', borderRadius: '12px', fontWeight: 'bold', border: '1px solid #e9ecef' }}>
                                    {prod.stock !== undefined ? prod.stock : 0} ud.
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              <div className="cart-summary">
                <div>
                  <h3>Resumen de Venta</h3>
                  <div className="form-group" style={{ marginTop: '12px', position: 'relative' }}>
                    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><UserCheck size={14} /> Cliente Asociado</span>
                      <span style={{ fontSize: '11px', color: '#2b8a3e', fontWeight: '600' }}>Activo: {selectedClient}</span>
                    </label>

                    <div style={{ position: 'relative', marginTop: '4px' }}>
                      <Search size={15} style={{ position: 'absolute', left: '10px', top: '10px', color: '#adb5bd' }} />
                      <input 
                        type="text"
                        value={clientSearchQuery}
                        onChange={handleClientSearchChange}
                        placeholder="Escribe cédula o nombre a buscar..."
                        style={{ width: '100%', padding: '8px 8px 8px 32px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none', background: '#fff' }}
                      />
                    </div>

                    {clientSearchQuery.trim().length > 0 && (
                      <div style={{ position: 'absolute', top: 'calc(100% + 2px)', left: 0, right: 0, background: '#fff', border: '1px solid #ced4da', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '180px', overflowY: 'auto' }}>
                        <div 
                          onClick={() => { setSelectedClient('Cliente General'); setClientSearchQuery(''); }}
                          style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', background: '#f8f9fa' }}
                        >
                          👤 <strong>Cliente General (Anónimo)</strong>
                        </div>
                        {filteredClientsForPOS.length > 0 ? (
                          filteredClientsForPOS.map(cli => (
                            <div 
                              key={cli.id} 
                              onClick={() => { setSelectedClient(cli.name); setClientSearchQuery(''); }}
                              style={{ padding: '8px 12px', fontSize: '12px', borderBottom: '1px solid #f1f3f5', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                            >
                              <span><strong>{cli.name}</strong></span>
                              <span style={{ color: '#6c757d' }}>{cli.document || 'Sin Cédula'}</span>
                            </div>
                          ))
                        ) : (
                          <div style={{ padding: '12px', textAlign: 'center' }}>
                            <p style={{ fontSize: '12px', color: '#fa5252', marginBottom: '8px' }}>No se encontró ningún cliente</p>
                            <button 
                              type="button" 
                              onClick={() => {
                                setQuickDocInput(clientSearchQuery);
                                setClientDoc(clientSearchQuery);
                                setClientSearchQuery('');
                                setShowQuickClientModal(true);
                              }}
                              style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                              + Registrar nuevo cliente
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="cart-items-list">
                  {cart.length === 0 ? (
                    <p className="empty-text">El carrito está vacío.</p>
                  ) : (
                    cart.map(item => (
                      <div key={item.cartItemId || item.id} className="cart-item">
                        <div className="cart-item-info">
                          <strong>{item.name}</strong>
                          {(item.customization || item.customNote) ? (
                          <span style={{ fontSize: '11px', color: '#fa5252', display: 'block', fontWeight: 'bold' }}>
                            {item.customization || item.customNote}
                          </span>
                        ) : currentStoreType === 'restaurant' ? (
                          <span style={{ fontSize: '11px', color: '#1c7ed6', display: 'block', fontWeight: 'bold' }}>
                            Con todo
                          </span>
                        
                        ) : null}

                          <span>${item.price.toFixed(2)} c/u</span>
                        </div>
                        <div className="cart-item-controls">
                          <button onClick={() => updateQuantity(item.cartItemId || item.id, -1)}><Minus size={14}/></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.cartItemId || item.id, 1)}><Plus size={14}/></button>
                          <button className="btn-delete" onClick={() => removeFromCart(item.cartItemId || item.id)}>
                          <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="cart-totals-container">
                  <div className="cart-total-row">
                    <span>Total USD:</span>
                    <h2>${totalUSD.toFixed(2)}</h2>
                  </div>
                  <div className="cart-total-row-bs">
                    <span>Total Bolívares (BCV):</span>
                    <h3>Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h3>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn-secondary" onClick={handleHoldOrder} disabled={cart.length === 0 || processing || !currentShift} style={{ flex: 1, fontSize: '13px' }}>
                      <Clock size={14} /> {currentStoreType === 'restaurant' ? 'A Cocina / Espera' : 'En Espera'}
                    </button>
                    <button className="btn-primary checkout-btn" onClick={() => { setSettlingSale(null); setShowPaymentModal(true); }} disabled={cart.length === 0 || !currentShift} style={{ flex: 2 }}>
                      <CreditCard size={16} /> Cobrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vendor_portal' && currentUserRole === 'system_vendor' && (
            <div className="product-form-card" style={{ maxWidth: '700px', margin: '0 auto' }}>
              <h3>Registrar Nuevo Comercio en Vivo (Demostración)</h3>
              <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '20px' }}>
                Como vendedor de sistema, al registrar un comercio aquí, el negocio quedará vinculado a tu ID para el cálculo automático de tus comisiones (50% registro y 20% mensualidad).
              </p>
              
              {globalPromoDiscount > 0 && (
                <div style={{ background: '#fff3bf', padding: '10px', borderRadius: '6px', marginBottom: '16px', fontSize: '13px', color: '#e67700', border: '1px solid #ffe066' }}>
                  <strong>¡Promo Activa!</strong> Tienes un <strong>{globalPromoDiscount}% de descuento</strong> disponible para ofrecer a nuevos registros hoy.
                </div>
              )}

              <form onSubmit={handleVendorRegisterStoreSubmit} className="fiskal-form">
                <div className="form-group">
                  <label>Nombre del Comercio / Negocio</label>
                  <input type="text" value={vendorStoreName} onChange={e => setVendorStoreName(e.target.value)} placeholder="Ej. Minimarket El Triunfo" required />
                </div>
                <div className="form-group">
                  <label>RIF / Cédula del Comercio</label>
                  <input type="text" value={vendorStoreRif} onChange={e => setVendorStoreRif(e.target.value)} placeholder="Ej. J-12345678-9" />
                </div>
                
                <div className="form-group" style={{ marginBottom: '16px' }}>
                  <label>Tipo de Interfaz (Máscara) del Cliente</label>
                  <select value={vendorNewStoreType} onChange={e => setVendorNewStoreType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}>
                    <option value="standard">Minimarket / Tienda Estándar</option>
                    <option value="restaurant">Restaurante / Comida Rápida</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label>Nombre del Dueño</label>
                    <input type="text" value={vendorOwnerName} onChange={e => setVendorOwnerName(e.target.value)} placeholder="Ej. Pedro Gómez" />
                  </div>
                  <div className="form-group">
                    <label>Teléfono (WhatsApp)</label>
                    <input type="text" value={vendorOwnerPhone} onChange={e => setVendorOwnerPhone(e.target.value)} placeholder="Ej. 04141234567" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Correo Electrónico</label>
                  <input type="email" value={vendorOwnerEmail} onChange={e => setVendorOwnerEmail(e.target.value)} placeholder="dueño@comercio.com" />
                </div>
                <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input type="checkbox" id="vendorPaidAdvance" checked={vendorPaidAdvance} onChange={(e) => setVendorPaidAdvance(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                  <label htmlFor="vendorPaidAdvance" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#2b8a3e' }}>
                    ¿El comercio pagó el mes por adelantado? (Activa 40 días: 30 de mes + 10 cortesía)
                  </label>
                </div>
                <button type="submit" className="btn-primary" style={{ background: '#2b8a3e', marginTop: '10px' }}>
                  <Store size={18} /> Registrar Comercio (${getCalculatedMonthlyPrice(0, baseMonthlyPrice).toFixed(2)}/mes)
                </button>
              </form>
            </div>
          )}

          {activeTab === 'admin' && currentUserRole === 'super_admin' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Selector de Demo para el Super Admin */}
              <div style={{ background: '#e7f5ff', padding: '16px', borderRadius: '6px', border: '1px solid #74c0fc', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Eye size={20} color="#1c7ed6" />
                  <div>
                    <h4 style={{ margin: 0, color: '#1971c2' }}>Modo Demostración (Super Admin)</h4>
                    <span style={{ fontSize: '12px', color: '#495057' }}>Cambia la interfaz para mostrarle a un cliente cómo se ve el sistema.</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={() => setCurrentStoreType('standard')} 
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: currentStoreType === 'standard' ? 'none' : '1px solid #ced4da', background: currentStoreType === 'standard' ? '#1c7ed6' : '#fff', color: currentStoreType === 'standard' ? '#fff' : '#495057', cursor: 'pointer', fontWeight: 'bold' }}>
                    Tienda Estándar
                  </button>
                  <button 
                    onClick={() => setCurrentStoreType('restaurant')} 
                    style={{ padding: '6px 12px', fontSize: '12px', borderRadius: '4px', border: currentStoreType === 'restaurant' ? 'none' : '1px solid #ced4da', background: currentStoreType === 'restaurant' ? '#d9480f' : '#fff', color: currentStoreType === 'restaurant' ? '#fff' : '#495057', cursor: 'pointer', fontWeight: 'bold' }}>
                    Comida Rápida
                  </button>
                </div>
              </div>
              
              {/* TARJETAS FINANCIERAS RESUMEN */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
                <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #1c7ed6' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Ingresos Totales (Suscripciones)</span>
                    <Activity size={18} color="#1c7ed6" />
                  </div>
                  <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#212529' }}>${getSystemFinancials().totalIncome.toFixed(2)}</h2>
                </div>
                <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #fa5252' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Comisiones Pagadas a Vendedores</span>
                    <PieChart size={18} color="#fa5252" />
                  </div>
                  <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#212529' }}>${getSystemFinancials().totalExpenses.toFixed(2)}</h2>
                </div>
                <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #f59f00' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: 'bold' }}>Comisiones por Liquidar (Pendiente)</span>
                    <Clock size={18} color="#f59f00" />
                  </div>
                  <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#212529' }}>${getSystemFinancials().totalPendingComm.toFixed(2)}</h2>
                </div>
                <div className="product-form-card" style={{ padding: '20px', borderLeft: '4px solid #2b8a3e', background: '#f8fff9' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '13px', color: '#2b8a3e', fontWeight: 'bold' }}>Beneficio Neto del Sistema</span>
                    <TrendingUp size={18} color="#2b8a3e" />
                  </div>
                  <h2 style={{ fontSize: '28px', marginTop: '12px', color: '#2b8a3e' }}>${getSystemFinancials().netProfit.toFixed(2)}</h2>
                </div>
              </div>

              {/* TARJETAS DE FINANZAS Y COMISIONES */}
              <div className="products-layout" style={{ gridTemplateColumns: '1fr 2fr' }}>
                <div className="product-form-card" style={{ background: '#f8f9fa' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1c7ed6' }}>
                    <DollarIcon size={18} /> Precios y Promociones
                  </h3>
                  <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '16px' }}>
                    Ajusta la tarifa base del sistema. Quienes se registren hoy quedarán atados permanentemente a esta tarifa, incluso si la subes en el futuro.
                  </p>
                  <form onSubmit={handleSaveSaasSettings} className="fiskal-form">
                    <div className="form-group">
                      <label>Precio Base Mensual ($ USD)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={baseMonthlyPrice} 
                        onChange={e => setBaseMonthlyPrice(e.target.value)} 
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>Promoción Global Actual (%)</label>
                      <div style={{ position: 'relative' }}>
                        <Percent size={14} style={{ position: 'absolute', left: '10px', top: '12px', color: '#6c757d' }} />
                        <input 
                          type="number" 
                          step="1" 
                          max="100" 
                          min="0"
                          value={globalPromoDiscount} 
                          onChange={e => setGlobalPromoDiscount(e.target.value)} 
                          style={{ paddingLeft: '32px' }}
                        />
                      </div>
                      <span style={{ fontSize: '11px', color: '#fa5252' }}>
                        {globalPromoDiscount > 0 ? `Un nuevo registro hoy pagará $${getCalculatedMonthlyPrice(0, baseMonthlyPrice).toFixed(2)} /mes de por vida.` : 'Sin promoción activa.'}
                      </span>
                    </div>
                    <button type="submit" className="btn-primary" disabled={savingSettings} style={{ width: '100%', marginTop: '8px' }}>
                      {savingSettings ? 'Guardando...' : 'Aplicar Precios a Nuevos Registros'}
                    </button>
                  </form>
                </div>

                <div className="product-list-card">
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d9480f' }}>
                    <Award size={18} /> Rendimiento de Vendedores y Pago de Comisiones
                  </h3>
                  <div className="table-responsive">
                    <table className="fiskal-table" style={{ fontSize: '13px' }}>
                      <thead>
                        <tr>
                          <th>Vendedor</th>
                          <th style={{ textAlign: 'center' }}>Comercios Activos</th>
                          <th>Ganancia Histórica</th>
                          <th style={{ color: '#d9480f' }}>Saldo Pendiente</th>
                          <th style={{ textAlign: 'center' }}>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {systemVendors.length === 0 ? (
                          <tr><td colSpan="5" className="empty-text">No hay vendedores registrados.</td></tr>
                        ) : (
                          systemVendors.map(v => {
                            const vendorStores = adminStores.filter(s => s.system_vendor_id === v.id);
                            const activeCount = vendorStores.filter(s => s.is_active).length;
                            return (
                              <tr key={v.id}>
                                <td><strong>{v.name}</strong><br/><span style={{ fontSize: '11px', color: '#6c757d' }}>{v.email}</span></td>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="badge-completed">{activeCount} / {vendorStores.length}</span>
                                </td>
                                <td><strong>${(parseFloat(v.total_earned) || 0).toFixed(2)}</strong></td>
                                <td><strong style={{ color: (parseFloat(v.pending_balance) || 0) > 0 ? '#d9480f' : '#2b8a3e', fontSize: '14px' }}>${(parseFloat(v.pending_balance) || 0).toFixed(2)}</strong></td>
                                <td style={{ textAlign: 'center' }}>
                                  <button 
                                    className="btn-primary" 
                                    onClick={() => handlePayVendor(v)} 
                                    disabled={(parseFloat(v.pending_balance) || 0) <= 0}
                                    style={{ fontSize: '11px', padding: '6px 12px', background: (parseFloat(v.pending_balance) || 0) > 0 ? '#1c7ed6' : '#ced4da', cursor: (parseFloat(v.pending_balance) || 0) > 0 ? 'pointer' : 'not-allowed' }}
                                  >
                                    <Check size={14} style={{ marginRight: '4px' }} /> Liquidar
                                  </button>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ fontSize: '11px', color: '#6c757d', marginTop: '12px' }}>* El saldo pendiente suma automáticamente el 50% de la cuota de nuevos registros y el 20% recurrente de sus renovaciones mensuales.</p>
                </div>
              </div>

              <div className="products-layout">
                <div className="product-form-card">
                  <h3>{editingStore ? `Editando: ${editingStore.name}` : 'Registrar Nuevo Comercio SaaS'}</h3>
                  <form onSubmit={handleSaveStore} className="fiskal-form">
                    <div className="form-group">
                      <label>Nombre del Negocio / Comercio</label>
                      <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)} placeholder="Ej. Inversiones La Esquina C.A." required />
                    </div>
                    <div className="form-group">
                      <label>RIF del Negocio</label>
                      <input type="text" value={storeRif} onChange={(e) => setStoreRif(e.target.value)} placeholder="Ej. J-12345678-9" />
                    </div>
                    
                    <div className="form-group" style={{ marginBottom: '16px' }}>
                      <label>Tipo de Interfaz (Máscara)</label>
                      <select value={newStoreType} onChange={(e) => setNewStoreType(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}>
                        <option value="standard">Minimarket / Tienda Estándar</option>
                        <option value="restaurant">Restaurante / Comida Rápida</option>
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group">
                        <label>Nombre del Propietario</label>
                        <input type="text" value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ej. Carlos Pérez" />
                      </div>
                      <div className="form-group">
                        <label>Cédula del Propietario</label>
                        <input type="text" value={ownerDoc} onChange={(e) => setOwnerDoc(e.target.value)} placeholder="Ej. V-12345678" />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group">
                        <label>Teléfono de Contacto</label>
                        <input type="text" value={storePhone} onChange={(e) => setStorePhone(e.target.value)} placeholder="Ej. 0414-1234567" />
                      </div>
                      <div className="form-group">
                        <label>Correo Electrónico</label>
                        <input type="email" value={storeEmail} onChange={(e) => setStoreEmail(e.target.value)} placeholder="correo@negocio.com" />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Dirección Física</label>
                      <input type="text" value={storeAddress} onChange={(e) => setStoreAddress(e.target.value)} placeholder="Ej. Av. Principal, Local 4" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div className="form-group">
                        <label>Ciudad</label>
                        <input type="text" value={storeCity} onChange={handleCityChange} placeholder="Ej. Los Teques" />
                      </div>
                      <div className="form-group">
                        <label>Estado (Auto-detectado)</label>
                        <input type="text" value={storeState} onChange={(e) => setStoreState(e.target.value)} placeholder="Ej. Miranda" />
                      </div>
                    </div>

                    {editingStore && (
                      <div className="form-group" style={{ background: '#e7f5ff', padding: '12px', borderRadius: '6px', border: '1px solid #74c0fc' }}>
                        <label style={{ color: '#1971c2', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Award size={14}/> Descuento Especial a este Comercio (%)
                        </label>
                        <input type="number" step="1" max="100" min="0" value={storeCustomDiscount} onChange={(e) => setStoreCustomDiscount(e.target.value)} />
                        <span style={{ fontSize: '11px', color: '#495057', display: 'block', marginTop: '4px' }}>
                          Este comercio tiene un precio base congelado de <strong>${editingStore.monthly_price_agreed || baseMonthlyPrice}</strong>. Con el {storeCustomDiscount}% de descuento pasará a pagar <strong>${getCalculatedMonthlyPrice(storeCustomDiscount, editingStore.monthly_price_agreed).toFixed(2)}</strong> mensuales.
                        </span>
                      </div>
                    )}
                    
                    {!editingStore && (
                      <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <input type="checkbox" id="storePaidAdvance" checked={storePaidAdvance} onChange={(e) => setStorePaidAdvance(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                        <label htmlFor="storePaidAdvance" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold', margin: 0, color: '#2b8a3e' }}>
                          ¿El comercio pagó el mes por adelantado? (Activa 40 días: 30 de mes + 10 de cortesía)
                        </label>
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                      {editingStore && (
                        <button type="button" className="btn-secondary" onClick={resetStoreForm} style={{ flex: 1 }}>Cancelar</button>
                      )}
                      <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                        <Store size={18} /> {editingStore ? 'Actualizar Comercio' : 'Registrar Comercio'}
                      </button>
                    </div>
                  </form>
                </div>

                <div className="product-form-card">
                  <h3>Registrar Vendedor de Sistema</h3>
                  <form onSubmit={handleCreateSystemVendor} className="fiskal-form">
                    <div className="form-group">
                      <label>Nombre del Vendedor</label>
                      <input type="text" value={newVendorName} onChange={e => setNewVendorName(e.target.value)} placeholder="Ej. Marcos Silva" required />
                    </div>
                    <div className="form-group">
                      <label>Correo (Acceso al Portal)</label>
                      <input type="email" value={newVendorEmail} onChange={e => setNewVendorEmail(e.target.value)} placeholder="vendedor@fiskal.com" required />
                    </div>
                    <div className="form-group">
                      <label>Teléfono</label>
                      <input type="text" value={newVendorPhone} onChange={e => setNewVendorPhone(e.target.value)} placeholder="Ej. 04121234567" />
                    </div>
                    <button type="submit" className="btn-primary" disabled={creatingVendor} style={{ background: '#d9480f' }}>
                      <UserPlus size={18} /> {creatingVendor ? 'Creando...' : 'Crear Vendedor de Sistema'}
                    </button>
                  </form>

                  <div style={{ marginTop: '20px' }}>
                    <h4 style={{ fontSize: '13px', color: '#6c757d', marginBottom: '8px' }}>Vendedores Activos ({systemVendors.length})</h4>
                    <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
                      {systemVendors.map(v => (
                        <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', background: '#f8f9fa', borderRadius: '4px', marginBottom: '4px', fontSize: '12px' }}>
                          <span><strong>{v.name}</strong> ({v.email})</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="product-list-card">
                <h3>Comercios Registrados ({adminStores.length})</h3>
                <div className="table-responsive">
                  <table className="fiskal-table">
                    <thead>
                      <tr>
                        <th>Negocio & Vendedor</th>
                        <th>Tarifa Mensual ($)</th>
                        <th>Prueba / Vencimiento</th>
                        <th>Estatus</th>
                        <th style={{ textAlign: 'center' }}>Acciones & WhatsApp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStores.length === 0 ? (
                        <tr><td colSpan="5" className="empty-text">No hay comercios registrados.</td></tr>
                      ) : (
                        adminStores.map((store) => {
                          const now = new Date().getTime();
                          let daysText = '---';
                          let isExpiringSoon = false;
                          if (store.is_trial && store.trial_end_date) {
                            const diff = new Date(store.trial_end_date).getTime() - now;
                            const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            daysText = d > 0 ? `${d} días de prueba` : 'Prueba expirada';
                            isExpiringSoon = d <= 3;
                          } else if (store.subscription_expires_at) {
                            const diff = new Date(store.subscription_expires_at).getTime() - now;
                            const d = Math.ceil(diff / (1000 * 60 * 60 * 24));
                            daysText = d > 0 ? `${d} días de mes activo` : 'Suscripción vencida';
                            isExpiringSoon = d <= 5;
                          }
                          
                          const basePriceDisplay = store.monthly_price_agreed !== null && store.monthly_price_agreed !== undefined ? store.monthly_price_agreed : baseMonthlyPrice;
                          const hasCustomDisc = store.custom_discount > 0;
                          const finalDisplayPrice = getCalculatedMonthlyPrice(store.custom_discount, store.monthly_price_agreed);

                          return (
                            <tr key={store.id}>
                              <td>
                                <strong>{store.name}</strong><br/>
                                <span style={{ fontSize: '11px', color: '#d9480f' }}>Vendedor: <strong>{store.system_vendors?.name || 'Admin Central'}</strong></span><br/>
                                <span style={{ fontSize: '10px', background: store.store_type === 'restaurant' ? '#ffe8cc' : '#e7f5ff', color: store.store_type === 'restaurant' ? '#d9480f' : '#1971c2', padding: '2px 4px', borderRadius: '4px' }}>
                                  {store.store_type === 'restaurant' ? 'Restaurante' : 'Estándar'}
                                </span>
                              </td>
                              <td>
                                <strong>${finalDisplayPrice.toFixed(2)}</strong><br/>
                                {hasCustomDisc && <span style={{ fontSize: '10px', background: '#ffe3e3', color: '#c92a2a', padding: '2px 4px', borderRadius: '4px' }}>-{store.custom_discount}% aplicado</span>}
                              </td>
                              <td>
                                <span style={{ fontSize: '12px', fontWeight: 'bold', color: isExpiringSoon ? '#fa5252' : '#2b8a3e' }}>{daysText}</span>
                              </td>
                              <td>
                                {store.is_active ? (
                                  <span className="badge-completed"><CheckCircle size={12}/> Activo</span>
                                ) : (
                                  <span className="badge-credit" style={{ background: '#ffe3e3', color: '#c92a2a' }}><AlertCircle size={12}/> Suspendido</span>
                                )}
                              </td>
                              <td className="action-cell">
                                <div className="action-buttons" style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', justifyContent: 'center' }}>
                                  <button className="btn-icon-whatsapp" onClick={() => sendStoreRenewalWhatsApp(store)} title="Enviar WhatsApp de Renovación / Cobro">
                                    <MessageCircle size={16} />
                                  </button>
                                  <button className="btn-icon-success" onClick={() => handleRenewSubscription(store)} title="Renovar Suscripción (Suma 30 días al tiempo restante)" style={{ background: '#1c7ed6', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Award size={13} /> Renovar
                                  </button>
                                  <button className="btn-icon-primary" onClick={() => handleOpenPreInvoice(store)} title="Generar Recibo / Factura SaaS" style={{ background: '#4c6ef5', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <FileText size={13} /> Recibo
                                  </button>
                                  <button className="btn-icon-success" onClick={() => handleOpenOwnerModal(store)} title="Acceso" style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Key size={13} /> Acceso
                                  </button>
                                  <button className="btn-icon-edit" onClick={() => handleStartEditStore(store)} title="Editar Datos y Promociones"><Edit2 size={16} /></button>
                                  <button className="btn-secondary" onClick={() => handleToggleStoreStatus(store.id, store.is_active)} style={{ borderColor: store.is_active ? '#fa5252' : '#2b8a3e', color: store.is_active ? '#fa5252' : '#2b8a3e', fontSize: '11px', padding: '4px 8px' }}>
                                    {store.is_active ? 'Suspender' : 'Activar'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'cash' && (
            <div className="product-form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h3>Gestión de Turno y Arqueo de Caja</h3>
              
              {currentShift ? (
                <div style={{ marginTop: '20px' }}>
                  <div className="shift-active-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <span className="badge-completed">CAJA ABIERTA: {getCurrentRegisterName()}</span>
                        <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>Iniciado el: {new Date(currentShift.opened_at).toLocaleString()}</p>
                      </div>
                      <button className="btn-primary" onClick={() => setShowCloseShiftModal(true)} style={{ background: '#fa5252' }}>
                        Cerrar Turno (Reporte Z)
                      </button>
                    </div>

                    <div className="payment-summary-box" style={{ marginTop: '16px' }}>
                      <div><span>Fondo Inicial:</span><h2>${currentShift.opening_float_usd.toFixed(2)}</h2></div>
                      <div><span>Ventas del Turno:</span><h2 style={{ color: '#2b8a3e' }}>${shiftTotalUSD.toFixed(2)}</h2></div>
                      <div style={{ textAlign: 'right' }}><span>Efectivo Esperado en Gaveta:</span><h3>${(currentShift.opening_float_usd + shiftCashUSD + (shiftCashBs / (bcvRate || 1))).toFixed(2)}</h3></div>
                    </div>

                    <div className="invoice-payment-breakdown" style={{ marginTop: '20px' }}>
                      <h4>Desglose de Ingresos en Turno Actual</h4>
                      <p><span>Efectivo USD:</span> <strong>${shiftCashUSD.toFixed(2)}</strong></p>
                      <p><span>Efectivo Bs:</span> <strong>Bs. {shiftCashBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                      <p><span>Zelle:</span> <strong>${shiftZelle.toFixed(2)}</strong></p>
                      <p><span>Pago Móvil:</span> <strong>Bs. {shiftPagoMovilBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                      <p><span>Punto / Débito:</span> <strong>Bs. {shiftDebitBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Lock size={48} color="#6c757d" style={{ marginBottom: '16px' }} />
                  <h4>No hay ningún turno de caja abierto</h4>
                  <p style={{ color: '#6c757d', fontSize: '14px', margin: '8px 0 24px 0' }}>Selecciona una de tu cajas físicas registradas para iniciar operaciones.</p>
                  <button className="btn-primary" onClick={() => setShowOpenShiftModal(true)} style={{ margin: '0 auto' }}>Abrir Nueva Caja / Turno</button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="product-list-card" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>Registro de Ventas y Cuentas ({filteredSales.length})</h3>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <button 
                    onClick={() => { setHistoryFilterType('all'); setHistoryCustomDate(''); }} 
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: historyFilterType === 'all' ? '#1c7ed6' : '#fff', color: historyFilterType === 'all' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Todos
                  </button>
                  <button 
                    onClick={() => { setHistoryFilterType('yesterday'); setHistoryCustomDate(''); }} 
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: historyFilterType === 'yesterday' ? '#1c7ed6' : '#fff', color: historyFilterType === 'yesterday' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Ayer
                  </button>
                  <button 
                    onClick={() => { setHistoryFilterType('last_week'); setHistoryCustomDate(''); }} 
                    style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: historyFilterType === 'last_week' ? '#1c7ed6' : '#fff', color: historyFilterType === 'last_week' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Semana Pasada
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', padding: '2px 6px' }}>
                    <span style={{ fontSize: '11px', color: '#6c757d' }}>Fecha:</span>
                    <input 
                      type="date" 
                      value={historyCustomDate} 
                      onChange={(e) => { setHistoryCustomDate(e.target.value); setHistoryFilterType('custom'); }} 
                      style={{ border: 'none', fontSize: '12px', outline: 'none', background: 'transparent' }}
                    />
                  </div>
                </div>
              </div>

              <div className="table-responsive">
                <table className="fiskal-table">
                  <thead>
                    <tr>
                      <th>Factura #</th>
                      <th>Fecha y Hora</th>
                      <th>Cliente</th>
                      <th>Total USD</th>
                      <th>Saldo Pendiente</th>
                      <th>Estatus</th>
                      <th style={{ textAlign: 'center' }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSales.length === 0 ? (
                      <tr><td colSpan="7" className="empty-text">No hay ventas registradas para este filtro.</td></tr>
                    ) : (
                      filteredSales.map((sale) => (
                        <tr key={sale.id}>
                          <td><strong>#{String(sale.id).startsWith('local') ? 'Pendiente' : sale.id}</strong></td>
                          <td>{new Date(sale.created_at).toLocaleString()}</td>
                          <td>{sale.client_name || 'Cliente General'}</td>
                          <td><strong>${sale.total_usd.toFixed(2)}</strong></td>
                          <td>
  {sale.status === 'credit' ? (
    <span className="badge-credit"><AlertCircle size={12}/> Crédito</span>
  ) : ['pending', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago'].includes(String(sale.status).toLowerCase()) ? (
    <span className="badge-pending"><Clock size={12}/> En Espera</span>
  ) : (
    <span className="badge-completed"><CheckCircle size={12}/> Pagada</span>
  )}
</td>
<td className="action-cell">
  <div className="action-buttons">
    {/* ACTUALIZADO: Permitir retomar la cuenta si está pendiente, preparando o lista */}
    {['pending', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago'].includes(String(sale.status).toLowerCase()) && (
      <button className="btn-icon-success" onClick={() => handleResumeOrder(sale)} title="Retomar cuenta"><Play size={16} /></button>
    )}
    {sale.status === 'credit' && (
      <button className="btn-icon-success" onClick={() => handleStartSettleCredit(sale)} title="Abonar"><DollarSign size={16} /></button>
    )}
    {sale.status === 'credit' && (
      <button className="btn-icon-whatsapp" onClick={() => sendWhatsAppReminder(sale)} title="WhatsApp"><MessageCircle size={16} /></button>
    )}
    <button className="btn-icon-primary" onClick={() => handleViewInvoice(sale)} title="Ver Factura"><Eye size={18} /></button>

    {/* Botón de Eliminar (Solo para Dueños/Admins) */}
    {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
      <button 
        style={{ background: '#fa5252', color: 'white', border: 'none', borderRadius: '4px', padding: '6px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        onClick={async (e) => {
          e.stopPropagation(); 
          const confirmDelete = window.confirm(`⚠️ ¿ESTÁS SEGURO? Estás a punto de ELIMINAR permanentemente la Factura/Pedido #${String(sale.id).startsWith('local') ? 'Pendiente' : sale.id}. Esta acción no se puede deshacer.`);
          if (confirmDelete) {
            try {
              if (typeof supabase !== 'undefined') {
                const { error: pErr } = await supabase.from('payment_history').delete().eq('sale_id', sale.id);
                if (pErr) throw pErr;
                const { error: sErr } = await supabase.from('sales').delete().eq('id', sale.id);
                if (sErr) throw sErr;
              }
              if (typeof setSales === 'function') {
                setSales(prevSales => prevSales.filter(s => s.id !== sale.id));
              }
            } catch (err) {
              console.error("Error al eliminar la factura:", err);
              alert("Hubo un error al eliminar el pedido: " + err.message);
            }
          }
        }} 
        title="Eliminar Pedido (Solo Dueño)"
      >
        <Trash2 size={16} /> 
      </button>
    )}
  </div>
</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'clients' && (
            <div className="products-layout">
              <div className="product-form-card">
                <h3>Registrar Nuevo Cliente</h3>
                <form onSubmit={(e) => handleAddClient(e, false)} className="fiskal-form">
                  <div className="form-group">
                    <label>Nombre y Apellido / Razón Social</label>
                    <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="Ej. Inversiones C.A." />
                  </div>
                  <div className="form-group">
                    <label>Cédula / RIF</label>
                    <input type="text" value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} required placeholder="Ej. V-12345678" />
                  </div>
                  <div className="form-group">
                    <label>Teléfono</label>
                    <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Ej. 0414-1234567" />
                  </div>
                  <div className="form-group">
                    <label>Correo Electrónico</label>
                    <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                  </div>
                  <button type="submit" className="btn-primary" disabled={loadingClient}>
                    <PlusCircle size={18} /> {loadingClient ? 'Guardando...' : 'Guardar Cliente'}
                  </button>
                </form>
              </div>

              <div className="product-list-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3 style={{ margin: 0 }}>Directorio y Filtrado de Clientes</h3>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button 
                      onClick={() => setClientFilterTab('all')} 
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'all' ? '#1c7ed6' : '#fff', color: clientFilterTab === 'all' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Todos ({clientsWithMetrics.length})
                    </button>
                    <button 
                      onClick={() => setClientFilterTab('best')} 
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'best' ? '#2b8a3e' : '#fff', color: clientFilterTab === 'best' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ⭐ Mejor Cliente
                    </button>
                    <button 
                      onClick={() => setClientFilterTab('debtors')} 
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'debtors' ? '#fa5252' : '#fff', color: clientFilterTab === 'debtors' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      ⚠️ Morosos ({clientsWithMetrics.filter(c => c.totalPending > 0).length})
                    </button>
                    <button 
                      onClick={() => setClientFilterTab('frequent')} 
                      style={{ padding: '6px 12px', borderRadius: '4px', border: '1px solid #ced4da', background: clientFilterTab === 'frequent' ? '#ae3ec9' : '#fff', color: clientFilterTab === 'frequent' ? '#fff' : '#495057', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      🔥 Más Frecuentes
                    </button>
                  </div>
                </div>

                <div className="table-responsive">
                  <table className="fiskal-table">
                    <thead>
                      <tr>
                        <th>Cliente & Cédula</th>
                        <th>Total Facturado</th>
                        <th>Saldo Pendiente</th>
                        <th>Compras</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredClientsByTab().length === 0 ? (
                        <tr><td colSpan="5" className="empty-text">No hay clientes que coincidan con este filtro.</td></tr>
                      ) : (
                        getFilteredClientsByTab().map((cli, index) => (
                          <tr key={cli.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenClientDetail(cli)} title="Haz clic para ver historial y notas">
                            <td>
                              <strong>{cli.name}</strong><br/>
                              <span style={{ fontSize: '11px', color: '#6c757d' }}>{cli.document || 'Sin Cédula'} | {cli.phone || 'Sin Telf'}</span>
                            </td>
                            <td><strong>${cli.totalBilled.toFixed(2)}</strong></td>
                            <td>
                              {cli.totalPending > 0 ? (
                                <span style={{ color: '#fa5252', fontWeight: 'bold' }}>${cli.totalPending.toFixed(2)}</span>
                              ) : (<span style={{ color: '#2b8a3e' }}>$0.00</span>)}
                            </td>
                            <td><span style={{ background: '#f1f3f5', padding: '2px 8px', borderRadius: '10px', fontSize: '12px', fontWeight: 'bold' }}>{cli.salesCount}</span></td>
                            <td className="action-cell" onClick={(e) => e.stopPropagation()}>
                              <div className="action-buttons">
                                {cli.totalPending > 0 && cli.phone && (
                                  <button className="btn-icon-whatsapp" onClick={() => sendClientGeneralWhatsApp(cli, cli.totalPending)} title="Cobro por WhatsApp">
                                    <MessageCircle size={16} />
                                  </button>
                                )}
                                <button className="btn-icon-primary" onClick={() => handleOpenClientDetail(cli)} title="Ver Historial y Notas">
                                  <Eye size={16} />
                                </button>
                                <button className="btn-icon-danger" onClick={() => handleDeleteClient(cli.id)} title="Eliminar">
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="products-layout">
              <div className="product-form-card">
                <h3>{editingProduct ? `Editando: ${editingProduct.name}` : `Agregar Nuevo ${currentStoreType === 'restaurant' ? 'Platillo / Ítem' : 'Producto'}`}</h3>
                <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="fiskal-form">
                  <div className="form-group">
                    <label>Fotografía {currentStoreType === 'restaurant' ? 'del Platillo' : 'del Producto'}</label>
                    <div style={{ border: '2px dashed #ced4da', padding: '16px', textAlign: 'center', borderRadius: '6px', background: '#f8f9fa' }}>
                      {imagePreview ? (
                        <div style={{ marginBottom: '10px' }}>
                          <img src={imagePreview} alt="Vista previa" style={{ maxHeight: '100px', objectFit: 'cover', borderRadius: '4px' }} />
                        </div>
                      ) : (
                        <div style={{ marginBottom: '10px', color: '#6c757d' }}>
                          <ImageIcon size={32} style={{ margin: '0 auto 6px auto', display: 'block' }} />
                          <span style={{ fontSize: '12px' }}>Sube una foto</span>
                        </div>
                      )}
                      <input type="file" accept="image/*" capture="environment" onChange={handleImageSelect} style={{ fontSize: '12px', width: '100%' }} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Nombre {currentStoreType === 'restaurant' ? 'del Platillo' : 'del Producto'}</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder={currentStoreType === 'restaurant' ? "Ej. Hamburguesa Doble" : "Ej. Harina PAN"} />
                  </div>
                  <div className="form-group">
                    <label>Código de Barras / SKU</label>
                    <input type="text" value={barcode} onChange={(e) => setBarcode(e.target.value)} placeholder="SKU-001" />
                  </div>
                  <div className="form-group">
                    <label>Precio de Venta ($ USD)</label>
                    <input type="number" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required placeholder="0.00" />
                  </div>
                  <div className="form-group">

                    <label>Stock (Unidades)</label>
                    <input type="number" value={stock} onChange={(e) => setStock(e.target.value)} required placeholder="0" />
                  </div>
                  <div className="form-group">
                    <label>Categoría</label>
                    <select 
                      value={
                        ['General', 'Por Peso', ...products.map(p => (p.category || '').trim())].includes(category) 
                          ? category 
                          : 'OTRA'
                      } 
                      onChange={(e) => {
                        if (e.target.value === 'OTRA') {
                          setCategory(''); 
                        } else {
                          setCategory(e.target.value);
                          if(e.target.value === 'Por Peso') setProductModifiers(['kg']); 
                        }
                      }} 
                      style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', marginBottom: category === 'Por Peso' || !['General', 'Por Peso', ...products.map(p => (p.category || '').trim())].includes(category) ? '8px' : '0' }}
                    >
                      <option value="General">General</option>
                      {currentStoreType !== 'restaurant' && <option value="Por Peso">Por Peso (Balanza)</option>}
                      
                      {[...new Set(products.map(p => (p.category || '').trim()).filter(c => c && c !== 'General' && c !== 'Por Peso'))].map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      
                      <option value="OTRA" style={{ fontWeight: 'bold', color: '#1c7ed6' }}>+ Crear nueva categoría...</option>
                    </select>

                    {!['General', 'Por Peso', ...products.map(p => (p.category || '').trim())].includes(category) && (
                      <input 
                        type="text" 
                        value={category} 
                        onChange={(e) => setCategory(e.target.value)} 
                        placeholder="Escribe el nombre de la nueva categoría..." 
                        style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #1c7ed6', fontSize: '13px', background: '#e7f5ff', marginTop: '8px' }}
                        autoFocus
                      />
                    )}
                  </div>

                  {category === 'Por Peso' && currentStoreType !== 'restaurant' && (
                    <div className="form-group" style={{ background: '#e7f5ff', padding: '12px', borderRadius: '6px', border: '1px solid #74c0fc', marginBottom: '16px', marginTop: '12px' }}>
                      <label style={{ color: '#1971c2', fontWeight: 'bold' }}>Unidad de Medida Base</label>
                      <select 
                        value={productModifiers[0] || 'kg'} 
                        onChange={(e) => setProductModifiers([e.target.value])}
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px' }}
                      >
                        <option value="kg">Kilogramos (Kg)</option>
                        <option value="g">Gramos (g)</option>
                      </select>
                      <span style={{ fontSize: '11px', color: '#495057', display: 'block', marginTop: '6px' }}>
                        El precio de venta que colocaste arriba será el costo por cada 1 {productModifiers[0] || 'kg'} exacto de este producto.
                      </span>
                    </div>
                  )}

                  {/* SECCIÓN DE ETIQUETAS DINÁMICAS (SÓLO MODO RESTAURANTE) */}
                  {currentStoreType === 'restaurant' && (
                    <div className="form-group" style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', border: '1px solid #ced4da', marginBottom: '16px' }}>
                      <label style={{ fontWeight: 'bold', color: '#2b8a3e', marginBottom: '6px', display: 'block', fontSize: '13px' }}>
                        Etiquetas de Modificación (Ingredientes)
                      </label>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        <input 
                          type="text" 
                          value={newModifierText} 
                          onChange={(e) => setNewModifierText(e.target.value)} 
                          placeholder="Ej. Cebolla, Queso, Salsas..." 
                          style={{ flex: 1, padding: '6px', fontSize: '12px', borderRadius: '4px', border: '1px solid #ced4da' }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProductModifierTag(); } }}
                        />
                        <button 
                          type="button" 
                          onClick={addProductModifierTag} 
                          style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                        >
                          + Añadir etiqueta
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {productModifiers.map((mod, idx) => (
                          <span key={idx} style={{ background: '#e9ecef', padding: '4px 8px', borderRadius: '12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid #dee2e6' }}>
                            {mod}
                            <button 
                              type="button" 
                              onClick={() => removeProductModifierTag(mod)} 
                              style={{ background: 'none', border: 'none', color: '#fa5252', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', padding: 0, lineHeight: 1 }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px' }}>
                    {editingProduct && (
                      <button type="button" className="btn-secondary" onClick={resetProductForm} style={{ flex: 1 }}>Cancelar</button>
                    )}
                    <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 2 }}>
                      <PlusCircle size={18} /> {loading ? 'Guardando...' : (editingProduct ? 'Actualizar' : 'Guardar')}
                    </button>
                  </div>
                </form>
              </div>

<div className="product-list-card">
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
    <h3 style={{ margin: 0 }}>
      Inventario Actual ({products.filter(p => {
        const fastFoodCats = ['hamburguesas', 'perros calientes', 'perros', 'pizzas', 'comida', 'comida rápida', 'bebidas', 'postres', 'salchipapas', 'pepitos'];
        const cat = (p.category || '').trim().toLowerCase();
        if (currentStoreType === 'restaurant') {
          return cat !== 'general' && cat !== 'por peso';
        } else {
          return !fastFoodCats.includes(cat);
        }
      }).length})
    </h3>
    <button className="btn-secondary" onClick={() => setShowPrintCatalog(true)} style={{ fontSize: '12px', padding: '6px 12px', display: 'flex', alignItems: 'center' }}>
      <QrCode size={14} style={{ marginRight: '6px' }}/> Imprimir Códigos QR (Carta)
    </button>
  </div>
  
  <div className="table-responsive">
    <table className="fiskal-table">
      <thead>
        <tr>
          <th>Foto</th>
          <th>Nombre</th>
          <th>SKU</th>
          <th>Precio</th>
          <th>Stock</th>
          <th style={{ textAlign: 'center' }}>Acciones</th>
        </tr>
      </thead>
      <tbody>
        {products.filter(p => {
          const fastFoodCats = ['hamburguesas', 'perros calientes', 'perros', 'pizzas', 'comida', 'comida rápida', 'bebidas', 'postres', 'salchipapas', 'pepitos'];
          const cat = (p.category || '').trim().toLowerCase();
          if (currentStoreType === 'restaurant') {
            return cat !== 'general' && cat !== 'por peso';
          } else {
            return !fastFoodCats.includes(cat);
          }
        }).map((prod) => (
          <tr key={prod.id}>
            <td>
              {prod.image_url ? (
                <img src={prod.image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
              ) : (
                <div style={{ width: '40px', height: '40px', background: '#f1f3f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd' }}>
                  <Package size={20} strokeWidth={1.5} />
                </div>
              )}
            </td>
            <td><strong>{prod.name}</strong></td>
            <td>{prod.barcode || '---'}</td>
            <td>${prod.price.toFixed(2)}</td>
            <td><strong>{prod.stock}</strong></td>
            <td className="action-cell">
              <div className="action-buttons">
                <button className="btn-icon-primary" onClick={() => handleOpenLabel(prod)} title="QR"><QrCode size={16} /></button>
                <button className="btn-icon-edit" onClick={() => handleStartEditProduct(prod)} title="Editar"><Edit2 size={16} /></button>
                <button className="btn-icon-danger" onClick={() => handleDeleteProduct(prod.id)} title="Eliminar"><Trash2 size={16} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>
</div>
          )}

{activeTab === 'kds' && (
  <div 
    id="kds-panel"
    style={{ padding: '24px', background: '#f8f9fa', minHeight: '100vh', width: '100%', boxSizing: 'border-box', overflowY: 'auto' }}
  >
    

    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h2 style={{ margin: 0, color: '#212529', letterSpacing: '-0.5px' }}>Panel de Cocina (KDS)</h2>
        <p style={{ fontSize: '13px', color: '#868e96', margin: '4px 0 0 0' }}>Gestión de comandas en tiempo real</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <button 
          onClick={() => {
            const panel = document.getElementById('kds-panel');
            if (!document.fullscreenElement) {
              if (panel && panel.requestFullscreen) {
                panel.requestFullscreen().catch(err => console.error("Error fullscreen:", err));
              }
            } else {
              if (document.exitFullscreen) document.exitFullscreen();
            }
          }}
          style={{ background: '#212529', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          🖥️ Pantalla Completa
        </button>

        <span style={{ background: '#2b8a3e', color: '#fff', padding: '8px 16px', borderRadius: '4px', fontSize: '13px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '8px', height: '8px', background: '#51cf66', borderRadius: '50%', display: 'inline-block' }}></span> En Vivo
        </span>
      </div>
    </div>

    {(() => {
      try {
        const rawOrders = (typeof sales !== 'undefined' && Array.isArray(sales)) ? sales : [];
        
        const getItems = (s) => {
          if (!s) return [];
          if (Array.isArray(s.items)) return s.items;
          if (typeof s.items === 'string') { try { return JSON.parse(s.items); } catch(e){} }
          if (Array.isArray(s.cart)) return s.cart;
          if (typeof s.cart === 'string') { try { return JSON.parse(s.cart); } catch(e){} }
          return [];
        };

        const generalKeywords = ['toddy', 'harina', 'azucar', 'galletas', 'citrato', 'disco duro', 'cronch', 'palitos', 'pepsi', 'coca cola', 'refresco', 'agua', 'cerveza'];

        const waitingOrders = rawOrders.filter(s => {
          if (!s) return false;
          const status = String(s.status || s.estatus || s.state || '').trim().toLowerCase();
          
          if (['completed', 'pagada', 'paid', 'credit', 'crédito'].includes(status)) return false;
          
          const validKitchenStates = ['pending', 'en espera', 'pendiente', 'preparando', 'en preparación', 'ready', 'listo', 'espera_pago'];
          if (!validKitchenStates.includes(status)) return false;

          const itemsList = getItems(s);
          if (itemsList.length === 0) return false;

          const kitchenItems = itemsList.filter(item => {
            const name = String(item.name || '').toLowerCase();
            return !generalKeywords.some(gk => name.includes(gk));
          });

          return kitchenItems.length > 0;
        });

        if (waitingOrders.length === 0) {
          return (
            <div style={{ textAlign: 'center', padding: '60px', background: '#fff', borderRadius: '4px', border: '1px solid #dee2e6' }}>
              <p style={{ color: '#868e96', fontSize: '15px', margin: 0 }}>
                No hay comandas pendientes en este momento.
              </p>
            </div>
          );
        }

        return (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
            {waitingOrders.map((order, index) => {
              const orderId = order && order.id ? order.id.toString() : String(index + 1);
              
              const itemsList = getItems(order).filter(item => {
                const name = String(item.name || '').toLowerCase();
                return !generalKeywords.some(gk => name.includes(gk));
              });
              
              const currentStatus = String(order.status || order.estatus || 'pending').trim().toLowerCase();
              const isPreparing = currentStatus === 'preparando' || currentStatus === 'en preparación';
              const isReady = currentStatus === 'ready' || currentStatus === 'listo' || currentStatus === 'espera_pago';

              let headerBg = '#e03131'; 
              let headerColor = '#fff';
              let borderColor = '#e03131';
              let statusText = 'PENDIENTE';

              if (isPreparing) {
                headerBg = '#fab005'; 
                headerColor = '#212529';
                borderColor = '#fab005';
                statusText = 'PREPARANDO';
              } else if (isReady) {
                headerBg = '#2b8a3e'; 
                headerColor = '#fff';
                borderColor = '#2b8a3e';
                statusText = 'LISTO PARA ENTREGAR';
              }

              const timeStr = order.created_at ? new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : '--:--';

              return (
                <div key={order && order.id ? order.id : index} style={{ background: '#fff', borderRadius: '4px', border: `1px solid ${borderColor}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
                  
                  <div style={{ background: headerBg, color: headerColor, padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      <strong style={{ fontSize: '18px', lineHeight: 1 }}>#{orderId.slice(-4)}</strong>
                      <span style={{ fontSize: '11px', opacity: 0.9 }}>{timeStr}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px' }}>{statusText}</span>
                  </div>

                  <div style={{ padding: '16px', flex: 1 }}>
                    {itemsList.map((item, i) => {
                      const itemName = item && item.name ? item.name : 'Producto';
                      const itemQty = item && item.quantity ? item.quantity : 1;
                      
                      // Leemos exactamente lo que el cajero marcó en el POS
                      const customizationText = item.customization || item.customNote || '';

                      return (
                        <div key={i} style={{ paddingBottom: '12px', marginBottom: '12px', borderBottom: i === itemsList.length - 1 ? 'none' : '1px dashed #e9ecef' }}>
                          <div style={{ fontWeight: '600', fontSize: '16px', color: '#212529' }}>{itemQty} x {itemName}</div>
                          
                          {customizationText && (
                            <div style={{ 
                              fontSize: '14px', 
                              color: customizationText === 'Con todo' ? '#1c7ed6' : '#e03131', 
                              marginTop: '4px', 
                              display: 'flex', 
                              flexDirection: 'column', 
                              gap: '2px', 
                              paddingLeft: '8px', 
                              borderLeft: `2px solid ${customizationText === 'Con todo' ? '#a5d8ff' : '#ffc9c9'}` 
                            }}>
                              <span style={{ fontWeight: 'bold' }}>• {customizationText}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ display: 'flex', borderTop: `1px solid ${borderColor}` }}>
                    {!isPreparing && !isReady && (
                      <button 
                        onClick={async (e) => {
                          e.currentTarget.blur();
                          if (typeof setSales === 'function') {
                            setSales(sales.map(s => s.id === order.id ? { ...s, status: 'preparando' } : s));
                          }
                          try {
                            if (typeof supabase !== 'undefined') {
                              await supabase.from('sales').update({ status: 'preparando' }).eq('id', order.id);
                            }
                          } catch (err) { console.error("Error al actualizar estatus:", err); }
                        }}
                        style={{ flex: 1, background: '#fff', color: '#e03131', border: 'none', padding: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px', transition: 'background 0.2s' }}
                        onMouseOver={e => e.currentTarget.style.background = '#fff5f5'}
                        onMouseOut={e => e.currentTarget.style.background = '#fff'}
                      >
                        Preparar
                      </button>
                    )}

                    {!isReady && (
                      <button 
                        onClick={async (e) => {
                          e.currentTarget.blur();

                          if (typeof setSales === 'function') {
                            setSales(sales.map(s => s.id === order.id ? { ...s, status: 'ready' } : s));
                          }
                          try {
                            if (typeof supabase !== 'undefined') {
                              await supabase.from('sales').update({ status: 'ready' }).eq('id', order.id);
                            }
                          } catch (err) { console.error("Error al actualizar estatus:", err); }
                        }}
                        style={{ flex: 1, background: isPreparing ? '#fab005' : '#f8f9fa', color: isPreparing ? '#212529' : '#868e96', border: 'none', borderLeft: isPreparing ? 'none' : '1px solid #dee2e6', padding: '14px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '0.5px' }}
                      >
                        Despachar
                      </button>
                    )}

                    {isReady && (
                      <div style={{ width: '100%', textAlign: 'center', padding: '14px', background: '#2b8a3e', color: '#fff', fontSize: '13px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Esperando Mesonero
                      </div>
                    )}
                  </div>
                  
                </div>
              );
            })}
          </div>
        );
      } catch (err) {
        return (
          <div style={{ padding: '20px', background: '#ffe3e3', color: '#c92a2a', borderRadius: '4px', border: '1px solid #ffc9c9' }}>
            <strong>Error:</strong> {err.message}
          </div>
        );
      }
    })()}
  </div>
)}
          {activeTab === 'settings' && (currentUserRole === 'owner' || currentUserRole === 'super_admin' || currentUserRole === 'system_vendor') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
              
              {currentUserRole === 'super_admin' && (
                <div className="product-form-card" style={{ maxWidth: '100%' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4c6ef5' }}>
                    <FileCheck size={20} /> Configuración de Facturación SaaS
                  </h3>
                  <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px' }}>Personaliza la apariencia de los recibos en PDF que generas para tus comercios afiliados.</p>
                  
                  <form onSubmit={handleSaveSaasSettings} className="fiskal-form">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Encabezado Personalizado</label>
                        <textarea 
                          rows="2" 
                          value={saasInvoiceHeader} 
                          onChange={e => setSaasInvoiceHeader(e.target.value)} 
                          placeholder="Ej. Inversiones Fiskal C.A. / RIF: J-000000 / Dirección..." 
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }} 
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label>Pie de Página / Términos</label>
                        <textarea 
                          rows="2" 
                          value={saasInvoiceFooter} 
                          onChange={e => setSaasInvoiceFooter(e.target.value)} 
                          placeholder="Ej. Los pagos de mensualidad no son reembolsables. Gracias por su confianza." 
                          style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }} 
                        />
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', marginTop: '16px' }}>
                      <button type="submit" className="btn-primary" disabled={savingSettings} style={{ background: '#4c6ef5' }}>
                        {savingSettings ? 'Guardando...' : 'Guardar Diseño de Factura'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="products-layout" style={{ gap: '20px' }}>
                <div className="product-form-card">
                  <div style={{ marginBottom: '16px' }}>
                    <h3><UserPlus size={18} style={{ display: 'inline', marginRight: '6px' }}/> Registrar Cajero</h3>
                  </div>
                  <form onSubmit={handleCreateEmployee} className="fiskal-form">
                    <div className="form-group">
                      <label>Nombre del Vendedor</label>
                      <input type="text" value={newEmpName} onChange={e => setNewEmpName(e.target.value)} required placeholder="Ej. Juan Pérez" />
                    </div>
                    <div className="form-group">
                      <label>Correo Electrónico</label>
                      <input type="email" value={newEmpEmail} onChange={e => setNewEmpEmail(e.target.value)} required placeholder="cajero@local.com" />
                    </div>
                    <div className="form-group">
                      <label>Contraseña</label>
                      <input type="password" value={newEmpPass} onChange={e => setNewEmpPass(e.target.value)} required placeholder="••••••••" minLength={6} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={creatingEmployee}>
                      {creatingEmployee ? 'Registrando...' : 'Crear Empleado'}
                    </button>
                  </form>
                </div>

                <div className="product-list-card">
                  <h3>Mis Empleados Registrados</h3>
                  <div className="table-responsive">
                    <table className="fiskal-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Rol</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.length === 0 ? (
                          <tr><td colSpan="2" className="empty-text">No hay empleados registrados.</td></tr>
                        ) : (
                          employees.map(emp => (
                            <tr key={emp.id}>
                              <td><strong>{emp.full_name}</strong></td>
                              <td>
                                <span className="badge-completed">
                                  {emp.role === 'owner' || emp.role === 'super_admin' ? 'Administrador' : 'Cajero'}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="product-form-card" style={{ maxWidth: '100%' }}>
                <div style={{ marginBottom: '16px' }}>
                  <h3>Gestión de Cajas Físicas (Puntos de Cobro)</h3>
                </div>
                <form onSubmit={handleAddRegister} className="fiskal-form" style={{ marginBottom: '20px' }}>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <div className="form-group" style={{ flex: '1', minWidth: '200px', marginBottom: 0 }}>
                      <label>Nombre de la Caja / Punto</label>
                      <input type="text" value={newRegisterName} onChange={(e) => setNewRegisterName(e.target.value)} placeholder="Ej. Caja 2" required />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '8px', height: '42px' }}>
                      <input type="checkbox" id="isMainReg" checked={isMainRegister} onChange={(e) => setIsMainRegister(e.target.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
                      <label htmlFor="isMainReg" style={{ cursor: 'pointer', fontSize: '13px', fontWeight: 'bold' }}>¿Es Principal?</label>
                    </div>
                    <button type="submit" className="btn-primary" style={{ height: '42px', padding: '0 16px' }}>
                      <Plus size={16} /> Agregar Caja
                    </button>
                  </div>
                </form>

                <div className="table-responsive">
                  <table className="fiskal-table">
                    <thead>
                      <tr>
                        <th>Nombre de Caja</th>
                        <th>Tipo / Rol</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registers.map((reg) => (
                        <tr key={reg.id}>
                          <td><strong>{reg.name}</strong></td>
                          <td>
                            {reg.is_main ? (
                              <span className="badge-completed" style={{ background: '#e7f5ff', color: '#1971c2' }}>Caja Principal</span>
                            ) : (
                              <span style={{ fontSize: '12px', color: '#495057' }}>Caja Secundaria</span>
                            )}
                          </td>
                          <td className="action-cell" style={{ textAlign: 'center' }}>
                            <button className="btn-icon-danger" onClick={() => handleDeleteRegister(reg.id)} title="Eliminar">
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      {showPreInvoiceModal && preInvoiceStore && (
        <div className="modal-overlay" style={{ zIndex: 10005 }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><FileText size={20} /> Preparar Factura SaaS</h3>
              <button className="btn-close-modal" onClick={() => setShowPreInvoiceModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body fiskal-form">
              <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px' }}>
                Generando recibo para <strong>{preInvoiceStore.name}</strong>. Puedes añadir cargos adicionales o descuentos puntuales antes de crear el PDF.
              </p>
              
              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Suscripción Mensual Base:</span>
                <span style={{ fontSize: '15px', color: '#2b8a3e', fontWeight: 'bold' }}>
                  ${getCalculatedMonthlyPrice(preInvoiceStore.custom_discount, preInvoiceStore.monthly_price_agreed).toFixed(2)}
                </span>
              </div>

              <div className="form-group">
                <label style={{ color: '#1c7ed6' }}>Concepto Adicional (Opcional)</label>
                <input 
                  type="text" 
                  value={preInvoiceExtraDesc} 
                  onChange={(e) => setPreInvoiceExtraDesc(e.target.value)} 
                  placeholder="Ej. Servicio de Capacitación de Empleados" 
                />
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label style={{ color: '#1c7ed6' }}>Monto Adicional ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={preInvoiceExtraAmount} 
                    onChange={(e) => setPreInvoiceExtraAmount(e.target.value)} 
                    placeholder="0.00" 
                  />
                </div>
                <div className="form-group">
                  <label style={{ color: '#fa5252' }}>Descuento Especial ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={preInvoiceDiscount} 
                    onChange={(e) => setPreInvoiceDiscount(e.target.value)} 
                    placeholder="0.00" 
                  />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowPreInvoiceModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={generateCustomSaaSInvoice} style={{ background: '#4c6ef5' }}>Generar PDF Final</button>
            </div>
          </div>
        </div>
      )}

      {showDailyTrialAlert && (
        <div className="modal-overlay" style={{ zIndex: 10005 }}>
          <div className="modal-content" style={{ width: '420px', textAlign: 'center', padding: '10px' }}>
            <div className="modal-header" style={{ borderBottom: 'none' }}>
              <h3>{trialAlertData.isTrial ? '🎁 ¡Periodo de Cortesía Activo!' : '⚠️ Aviso de Renovación'}</h3>
            </div>
            <div className="modal-body" style={{ padding: '10px 20px' }}>
              {trialAlertData.isTrial ? (
                <p style={{ fontSize: '14px', color: '#495057', lineHeight: '1.5' }}>
                  Tu comercio cuenta con <strong>{trialAlertData.daysLeft} días restantes</strong> de prueba gratuita. Tienes acceso completo a todas las funciones y productos del sistema.
                </p>
              ) : (
                <p style={{ fontSize: '14px', color: '#495057', lineHeight: '1.5' }}>
                  {trialAlertData.expired 
                    ? 'Tu suscripción mensual ha expirado. Comunícate con el soporte o administración para renovar.' 
                    : `A tu suscripción mensual le quedan ${trialAlertData.daysLeft} días para vencer. Evita interrupciones renovando a tiempo.`}
                </p>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center', paddingBottom: '20px' }}>
              <button className="btn-primary" onClick={() => setShowDailyTrialAlert(false)} style={{ width: '100%' }}>
                Entendido, entrar al sistema
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedClientDetail && (
        <div className="modal-overlay" style={{ zIndex: 10002 }}>
          <div className="modal-content" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Detalle de Cliente: {selectedClientDetail.name}</h3>
              <button className="btn-close-modal" onClick={() => setSelectedClientDetail(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body fiskal-form" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', background: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
                <div><span>Cédula / RIF:</span><br/><strong>{selectedClientDetail.document || 'No registrada'}</strong></div>
                <div><span>Teléfono:</span><br/><strong>{selectedClientDetail.phone || 'No registrado'}</strong></div>
                <div><span>Total Facturado:</span><br/><strong style={{ color: '#2b8a3e' }}>${selectedClientDetail.totalBilled.toFixed(2)}</strong></div>
                <div><span>Saldo Pendiente:</span><br/><strong style={{ color: selectedClientDetail.totalPending > 0 ? '#fa5252' : '#2b8a3e' }}>${selectedClientDetail.totalPending.toFixed(2)}</strong></div>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}><Edit2 size={14}/> Comentario / Nota Personalizada</label>
                <textarea 
                  rows="3" 
                  value={tempClientNote} 
                  onChange={(e) => setTempClientNote(e.target.value)} 
                  placeholder="Escribe notas sobre este cliente..."
                  style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px' }}
                />
                <button 
                  type="button" 
                  onClick={() => handleSaveClientNote(selectedClientDetail.id)}
                  style={{ marginTop: '6px', background: '#1c7ed6', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Guardar Nota
                </button>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#212529' }}>Productos Más Comprados</h4>
                <div className="table-responsive" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                  <table className="fiskal-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr><th>Producto</th><th>Cant. Total</th><th>Total USD</th></tr>
                    </thead>
                    <tbody>
                      {getClientHistoryAndTopProducts(selectedClientDetail.name).topProducts.length === 0 ? (
                        <tr><td colSpan="3" className="empty-text">Sin compras registradas aún.</td></tr>
                      ) : (
                        getClientHistoryAndTopProducts(selectedClientDetail.name).topProducts.map((p, idx) => (
                          <tr key={idx}>
                            <td><strong>{p.name}</strong></td>
                            <td>{p.qty} ud.</td>
                            <td>${p.total.toFixed(2)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#212529' }}>Historial de Facturas del Cliente</h4>
                <div className="table-responsive" style={{ maxHeight: '180px', overflowY: 'auto' }}>
                  <table className="fiskal-table" style={{ fontSize: '12px' }}>
                    <thead>
                      <tr><th>Factura</th><th>Fecha</th><th>Total</th><th>Estatus</th></tr>
                    </thead>
                    <tbody>
                      {getClientHistoryAndTopProducts(selectedClientDetail.name).cliSales.length === 0 ? (
                        <tr><td colSpan="4" className="empty-text">No hay facturas asociadas.</td></tr>
                      ) : (
                        getClientHistoryAndTopProducts(selectedClientDetail.name).cliSales.map(s => (
                          <tr key={s.id}>
                            <td>#{s.id}</td>
                            <td>{new Date(s.created_at).toLocaleDateString()}</td>
                            <td><strong>${s.total_usd.toFixed(2)}</strong></td>
                            <td>{s.status.toUpperCase()}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setSelectedClientDetail(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {showPrintCatalog && (
        <div className="modal-overlay" style={{ zIndex: 10001 }}>
          <div className="modal-content letter-print" style={{ width: '800px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <h3>Catálogo de Etiquetas QR para Impresión (Carta / A4)</h3>
              <button className="btn-close-modal" onClick={() => setShowPrintCatalog(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ background: '#f8f9fa' }}>
              <div className="catalog-print-grid">
                {products.length === 0 ? (
                  <p style={{ gridColumn: 'span 2', textAlign: 'center', padding: '20px' }}>No hay productos registrados para imprimir.</p>
                ) : (
                  products.map(prod => (
                    <div key={prod.id} className="print-label-item">
                      <div className="store-tag-header">{currentStoreName.toUpperCase()}</div>
                      <h4 style={{ fontSize: '14px', margin: '4px 0', color: '#212529', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                        {prod.name}
                      </h4>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(`ID:${prod.id}|PROD:${prod.name}|PRECIO:$${prod.price.toFixed(2)}`)}`}
                        alt="QR"
                        style={{ width: '100px', height: '100px', margin: '8px auto' }}
                      />
                      <div className="tag-price-box" style={{ padding: '4px 12px', marginTop: '4px' }}>
                        <span className="tag-currency" style={{ fontSize: '10px' }}>USD</span>
                        <span className="tag-price-value" style={{ fontSize: '16px' }}>${prod.price.toFixed(2)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowPrintCatalog(false)}>Cerrar</button>
              <button className="btn-primary" onClick={() => window.print()} disabled={products.length === 0}>
                Imprimir (Tamaño Carta / A4)
              </button>
            </div>
          </div>
        </div>
      )}

      {showCameraScannerModal && (
        <div className="modal-overlay" style={{ zIndex: 10005 }}>
          <div className="modal-content" style={{ width: '380px', textAlign: 'center', padding: '20px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <h3>Escáner en Vivo</h3>
              <button className="btn-close-modal" onClick={stopCameraScanner}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ padding: '12px 0' }}>
              <div id="fiskal-qr-reader" style={{ width: '100%', minHeight: '250px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}></div>
              {cameraScanError ? (
                <p style={{ color: '#fa5252', fontSize: '12px', marginTop: '8px' }}>{cameraScanError}</p>
              ) : (
                <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '8px' }}>Apunta al código para escanear automáticamente</p>
              )}
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center' }}>
              <button type="button" className="btn-secondary" onClick={stopCameraScanner} style={{ width: '100%' }}>Cancelar Escáner</button>
            </div>
          </div>
        </div>
      )}

      {showOwnerModal && targetStoreForOwner && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '440px' }}>
            <div className="modal-header">
              <h3>Crear Acceso de Dueño</h3>
              <button className="btn-close-modal" onClick={() => setShowOwnerModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleCreateStoreOwnerSubmit}>
              <div className="modal-body fiskal-form">
                <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>Comercio: <strong>{targetStoreForOwner.name}</strong></p>
                <div className="form-group">
                  <label>Nombre del Dueño</label>
                  <input type="text" value={ownerModalName} onChange={(e) => setOwnerModalName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico (Acceso)</label>
                  <input type="email" value={ownerModalEmail} onChange={(e) => setOwnerModalEmail(e.target.value)} required placeholder="dueno@comercio.com" />
                </div>
                <div className="form-group">
                  <label>Contraseña Temporal</label>
                  <input type="text" value={ownerModalPass} onChange={(e) => setOwnerModalPass(e.target.value)} required minLength={6} placeholder="Mínimo 6 caracteres" />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowOwnerModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={creatingOwnerLoading}>
                  {creatingOwnerLoading ? 'Creando...' : 'Crear Cuenta y Asignar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQuickClientModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>Registro Rápido de Cliente</h3>
              <button className="btn-close-modal" onClick={() => { setShowQuickClientModal(false); setClientDoc(''); setClientName(''); }}><X size={20} /></button>
            </div>
            <form onSubmit={(e) => handleAddClient(e, true)}>
              <div className="modal-body fiskal-form">
                <div className="form-group">
                  <label>Nombre y Apellido / Razón Social</label>
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} required placeholder="Ej. Inversiones C.A." autoFocus />
                </div>
                <div className="form-group">
                  <label>Cédula / RIF</label>
                  <input type="text" value={clientDoc} onChange={(e) => setClientDoc(e.target.value)} required placeholder="Ej. V-12345678" />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input type="text" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="Ej. 0414-1234567" />
                </div>
                <div className="form-group">
                  <label>Correo Electrónico (Opcional)</label>
                  <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>
              </div>
              <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => { setShowQuickClientModal(false); setClientDoc(''); setClientName(''); }}>Cancelar</button>
                <button type="submit" className="btn-primary" disabled={loadingClient}>
                  {loadingClient ? 'Guardando...' : 'Guardar y Asociar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInvoiceModal && selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>Factura #{String(selectedInvoice.id).startsWith('local') ? 'Pendiente' : selectedInvoice.id}</h3>
              <button className="btn-close-modal" onClick={() => setShowInvoiceModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body fiskal-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#495057' }}>
                <span><strong>Cliente:</strong> {selectedInvoice.client_name || 'Cliente General'}</span>
                <span><strong>Cédula:</strong> {getInvoiceClientDocument()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: '#495057' }}>
                <span><strong>Fecha:</strong> {new Date(selectedInvoice.created_at).toLocaleString()}</span>
                <span><strong>Estatus:</strong> {selectedInvoice.status.toUpperCase()}</span>
              </div>

              <hr style={{ border: '0', borderTop: '1px solid #dee2e6', margin: '12px 0' }} />

              <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#212529' }}>Artículos Facturados</h4>
              <div className="table-responsive" style={{ marginBottom: '16px' }}>
                <table className="receipt-table">
                  <thead>
                    <tr><th>Cant</th><th>Producto</th><th>Precio Unit</th><th>Subtotal</th></tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items?.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.quantity}</td>
                        <td>{item.name}</td>
                        <td>${item.price.toFixed(2)}</td>
                        <td><strong>${(item.price * item.quantity).toFixed(2)}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '6px' }}>
                  <span>Total Facturado:</span><strong>${selectedInvoice.total_usd.toFixed(2)}</strong>
                </div>
                {selectedInvoice.balance_due_usd > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fa5252' }}>
                    <span>Saldo Pendiente:</span><strong>${selectedInvoice.balance_due_usd.toFixed(2)}</strong>
                  </div>
                )}
              </div>

              {invoiceHistory.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#212529' }}>Historial de Abonos / Pagos</h4>
                  {invoiceHistory.map((h, i) => (
                    <div key={i} style={{ fontSize: '12px', padding: '6px', background: '#e7f5ff', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(h.created_at).toLocaleString()}</span>
                      <strong>Abono: ${h.amount_usd.toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Cerrar</button>
              <button type="button" className="btn-primary" onClick={() => window.print()}>Imprimir Recibo</button>
            </div>
          </div>
        </div>
      )}

      {showOpenShiftModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '460px' }}>
            <div className="modal-header">
              <h3>Apertura de Caja / Turno</h3>
              <button className="btn-close-modal" onClick={() => setShowOpenShiftModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleOpenShift}>
              <div className="modal-body fiskal-form">
                <div className="form-group">
                  <label>Seleccionar Caja Física</label>
                  <select value={selectedRegisterIdForOpen} onChange={(e) => setSelectedRegisterIdForOpen(e.target.value)} style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', background: '#fff' }} required>
                    {registers.length === 0 && <option value="">-- No hay cajas configuradas --</option>}
                    {registers.map(reg => (<option key={reg.id} value={reg.id}>{reg.name} {reg.is_main ? '⭐ (Caja Principal)' : ''}</option>))}
                  </select>
                </div>
                <div className="payment-inputs-grid">
                  <div className="form-group">
                    <label>Efectivo Inicial ($ USD)</label>
                    <input type="number" step="0.01" value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="0.00" required />
                  </div>
                  <div className="form-group">
                    <label>Efectivo Inicial (Bs VES)</label>
                    <input type="number" step="0.01" value={openingFloatVes} onChange={(e) => setOpeningFloatVes(e.target.value)} placeholder="0.00" required />
                  </div>
                </div>
                <span style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>Dinero físico disponible en caja para ambas denominaciones al arrancar el turno.</span>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowOpenShiftModal(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Abrir Turno</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCloseShiftModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '460px' }}>
            <div className="modal-header">
              <h3>Cierre de Turno ({getCurrentRegisterName()})</h3>
              <button className="btn-close-modal" onClick={() => setShowCloseShiftModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="payment-summary-box">
                <div><span>Efectivo Esperado (USD):</span><h2>${(currentShift ? currentShift.opening_float_usd + shiftCashUSD + (shiftCashBs / (bcvRate || 1)) : 0).toFixed(2)}</h2></div>
              </div>
              <div className="payment-inputs-grid" style={{ marginBottom: '16px' }}>
                <div className="form-group">
                  <label>Efectivo Físico Contado ($ USD)</label>
                  <input type="number" step="0.01" value={actualCashUSD} onChange={(e) => setActualCashUSD(e.target.value)} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Efectivo Físico Contado (Bs VES)</label>
                  <input type="number" step="0.01" value={actualCashBs} onChange={(e) => setActualCashBs(e.target.value)} placeholder="0.00" required />
                </div>
              </div>
              <span style={{ fontSize: '11px', color: '#6c757d', display: 'block', marginBottom: '16px' }}>Cuenta los billetes reales en gaveta de ambas monedas para un arqueo exacto.</span>
              <div className="form-group">
                <label>Notas u Observaciones (Opcional)</label>
                <input type="text" value={shiftNotes} onChange={(e) => setShiftNotes(e.target.value)} placeholder="Ej. Sin novedad / Retiro de $20" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCloseShiftModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={handleCloseShift} style={{ background: '#fa5252' }}>Confirmar Cierre de Turno</button>
            </div>
          </div>
        </div>
      )}

      {showLabelModal && labelProduct && (
        <div className="modal-overlay">
          <div className="modal-content label-modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><QrCode size={18} /> Etiqueta de Producto</h3>
              <button className="btn-close-modal" onClick={() => setShowLabelModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body label-print-area" style={{ textAlign: 'center', padding: '24px' }}>
              <div className="store-tag-header">{currentStoreName.toUpperCase()}</div>
              <h2 className="tag-product-name">{labelProduct.name}</h2>
              <div className="tag-qr-container">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`ID:${labelProduct.id}|PROD:${labelProduct.name}|PRECIO:$${labelProduct.price.toFixed(2)}`)}`} 
                  alt="QR Producto" style={{ width: '160px', height: '160px', margin: '12px auto', display: 'block' }}
                />
              </div>
              <div className="tag-price-box">
                <span className="tag-currency">USD</span>
                <span className="tag-price-value">${labelProduct.price.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '6px' }}>Escanea para consultar o pagar referencialmente</div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowLabelModal(false)}>Cerrar</button>
              <button className="btn-primary" onClick={() => window.print()}>Imprimir Etiqueta</button>
            </div>
          </div>
        </div>
      )}

      {modalWhatsAppOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '560px' }}>
            <div className="modal-header">
              <h3>Envío de Mensaje por WhatsApp</h3>
              <button className="btn-close-modal" onClick={() => setModalWhatsAppOpen(false)}><X size={20} /></button>
            </div>
            <div className="modal-body fiskal-form" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Mensaje Personalizado</label>
                <textarea rows="4" value={mensajePersonalizadoTemp} onChange={(e) => setMensajePersonalizadoTemp(e.target.value)} style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da' }} />
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setModalWhatsAppOpen(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={enviarMensajeWhatsAppFinal} style={{ background: '#2b8a3e' }}>Abrir WhatsApp</button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{settlingSale ? 'Abonar / Pagar Crédito' : 'Pasarela de Pagos'}</h3>
              <button className="btn-close-modal" onClick={() => { setShowPaymentModal(false); setSettlingSale(null); }}><X size={20} /></button>
            </div>
            <div className="modal-body">
              <div className="payment-summary-box">
                <div>
                  <span>Total a Pagar:</span>
                  <h2>${totalUSD.toFixed(2)}</h2>
                  <span style={{ fontSize: '13px', color: '#6c757d', fontWeight: '600' }}>Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <div className="payment-status-box" style={{ marginBottom: '16px' }}>
                <div className="status-row">
                  <span>Total Pagado:</span>
                  <strong>${totalPaidUSD.toFixed(2)} (Bs. {(totalPaidUSD * bcvRate).toFixed(2)})</strong>
                </div>
                <div className="status-row">
                  <span>Restante / Falta:</span>
                  <strong style={{ color: remainingUSD > 0 ? '#fa5252' : '#2b8a3e' }}>
                    ${remainingUSD.toFixed(2)} (Bs. {remainingBs.toFixed(2)})
                  </strong>
                </div>
                {changeUSD > 0 && (
                  <div className="status-row highlight" style={{ color: '#2b8a3e' }}>
                    <span>Cambio / Vuelto:</span>
                    <strong>${changeUSD.toFixed(2)} (Bs. {changeBs.toFixed(2)})</strong>
                  </div>
                )}
              </div>

              <div className="payment-inputs-grid">
                <div className="form-group">
                  <label>Efectivo ($ USD)</label>
                  <input type="number" step="0.01" value={payCashUSD} onChange={(e) => setPayCashUSD(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Zelle ($)</label>
                  <input type="number" step="0.01" value={payZelle} onChange={(e) => setPayZelle(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Efectivo (Bs)</label>
                  <input type="number" step="0.01" value={payCashBs} onChange={(e) => setPayCashBs(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Pago Móvil / Transf. (Bs)</label>
                  <input type="number" step="0.01" value={payPagoMovil} onChange={(e) => setPayPagoMovil(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Punto de Venta / Débito (Bs)</label>
                  <input type="number" step="0.01" value={payDebit} onChange={(e) => setPayDebit(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Referencia Bancaria (Opcional)</label>
                  <input type="text" value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} placeholder="Últimos 4 dígitos o ref" />
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {!settlingSale && (
                <button className="btn-secondary" onClick={handleCreditCheckout} style={{ borderColor: '#fa5252', color: '#fa5252' }}>Pasar a Crédito</button>
              )}
              <div style={{ display: 'flex', gap: '8px', marginLeft: settlingSale ? 'auto' : '0' }}>
                <button className="btn-secondary" onClick={() => { setShowPaymentModal(false); setSettlingSale(null); }}>Cancelar</button>
                <button className="btn-primary" onClick={handleCheckoutSubmit} disabled={totalPaidUSD <= 0 || processing}>
                  {processing ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
{showModifierModal && productForModifiers && (
        <div className="modal-overlay" style={{ zIndex: 10006 }}>
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>Personalizar: {productForModifiers.name}</h3>
              <button className="btn-close-modal" onClick={() => setShowModifierModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body fiskal-form">
              <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px' }}>
                Por defecto se incluye <strong>"Con todo"</strong>. Desmarca los ingredientes que el cliente NO desee.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', background: '#f8f9fa', padding: '16px', borderRadius: '6px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', fontWeight: 'bold', color: '#2b8a3e' }}>
                  <input type="checkbox" checked={true} disabled style={{ width: '18px', height: '18px' }} />
                  Con todo (Base)
                </label>
                <hr style={{ border: '0', borderTop: '1px solid #dee2e6', margin: '2px 0' }} />
                
                {Object.keys(dynamicToggles).length === 0 ? (
                  <p style={{ fontSize: '12px', color: '#6c757d', fontStyle: 'italic' }}>Este platillo no tiene modificadores configurados.</p>
                ) : (
                  Object.keys(dynamicToggles).map((modName, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px' }}>
                      <input 
                        type="checkbox" 
                        checked={dynamicToggles[modName]} 
                        onChange={(e) => setDynamicToggles({ ...dynamicToggles, [modName]: e.target.checked })} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }} 
                      />
                      {modName}
                    </label>
                  ))
                )}
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModifierModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={confirmAddToCartWithModifiers} style={{ background: '#2b8a3e' }}>
                Añadir a la Comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {showWeightModal && productForWeight && (
        <div className="modal-overlay" style={{ zIndex: 10007 }}>
          <div className="modal-content" style={{ width: '380px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>⚖️ Balanza: {productForWeight.name}</h3>
              <button className="btn-close-modal" onClick={() => setShowWeightModal(false)}><X size={20} /></button>
            </div>
            <div className="modal-body fiskal-form" style={{ textAlign: 'left' }}>
              <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '16px' }}>
                Precio base: <strong>${productForWeight.price.toFixed(2)} USD</strong> por cada 1 {productForWeight.modifiers && productForWeight.modifiers[0] ? productForWeight.modifiers[0] : 'kg'}.
              </p>

              <div className="form-group">
                <label>Cantidad en la Balanza ({weightUnit === 'kg' ? 'Kilogramos' : 'Gramos'})</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="number" 
                    step="0.001" 
                    value={weightValue} 
                    onChange={(e) => setWeightValue(e.target.value)} 
                    placeholder="Ej. 0.500" 
                    style={{ flex: 2, padding: '10px', fontSize: '16px', fontWeight: 'bold' }} 
                    autoFocus
                  />
                  <select 
                    value={weightUnit} 
                    onChange={(e) => setWeightUnit(e.target.value)}
                    style={{ flex: 1, padding: '10px', fontSize: '14px', borderRadius: '6px', border: '1px solid #ced4da' }}
                  >
                    <option value="kg">Kg</option>
                    <option value="g">Gramos</option>
                  </select>
                </div>
              </div>

              <div style={{ background: '#e7f5ff', padding: '12px', borderRadius: '6px', marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#1971c2' }}>Total a cobrar:</span>
                <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#2b8a3e' }}>
                  ${((parseFloat(weightValue) || 0) * (weightUnit === 'g' ? productForWeight.price / 1000 : productForWeight.price)).toFixed(2)} USD
                </span>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowWeightModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={confirmAddToCartWithWeight} style={{ background: '#2b8a3e' }}>
                Añadir al Carrito
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default App;