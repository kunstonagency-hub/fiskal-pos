import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Settings, Package, Users, PlusCircle, Trash2, Minus, Plus, RefreshCw, History, UserCheck, CreditCard, X, FileText, Eye, Clock, AlertCircle, CheckCircle, Play, DollarSign, AlertTriangle, Edit2, QrCode, Lock, Unlock, ShieldAlert, Barcode, Image as ImageIcon, Wifi, WifiOff, UploadCloud, Search, Store, MapPin, Phone, Mail, LogOut, Key, User, MessageCircle, Award, HardDrive, UserPlus, Camera, DollarSign as DollarIcon, Percent, TrendingUp, Activity, PieChart, Check, FileCheck, ChefHat } from 'lucide-react';
import { supabase } from './supabase';
import { initDB, queueOfflineAction, getOfflineActions, clearOfflineAction, getOfflineSales, clearOfflineSale } from './db';
import { Html5Qrcode } from 'html5-qrcode';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './App.css';
import logoDark from './assets/logo_2.png'; 
import logoLight from './assets/logo.svg'; 
import DeliveryDashboard from './components/DeliveryDashboard';
import KitchenDashboard from './components/KitchenDashboard';
import ClientsView from './components/ClientsView';
import ProductsView from './components/ProductsView';
import CashShiftsView from './components/CashShiftsView';
import SalesHistoryView from './components/SalesHistoryView';
import VendorPortalView from './components/VendorPortalView';
import AdminMasterView from './components/AdminMasterView';
import SettingsView from './components/SettingsView';
import PosTerminalView from './components/PosTerminalView';
import RecipesCostView from './components/RecipesCostView';



const customIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom()); }, [center, map]);
  return null;
}

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
  const [rateType, setRateType] = useState(() => localStorage.getItem('fiskal_rate_type') || 'BCV');
  const [customRateInput, setCustomRateInput] = useState(() => localStorage.getItem('fiskal_custom_rate') || '');
  const [showRateDropdown, setShowRateDropdown] = useState(false);
  const [tempRateType, setTempRateType] = useState('BCV');
  const [tempCustomRate, setTempCustomRate] = useState('');
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [processing, setProcessing] = useState(false);

  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  const [currentUserRole, setCurrentUserRole] = useState('cajero');
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [currentStoreName, setCurrentStoreName] = useState('Fiskal Store');

  const [currentStoreCountry, setCurrentStoreCountry] = useState('venezuela'); // 'venezuela' | 'panama' | 'el_salvador'
  const isVzla = (currentStoreCountry || 'venezuela').trim().toLowerCase().includes('venezuela'); // Detección unificada y blindada de Venezuela para todo el sistema
  const [storeCountry, setStoreCountry] = useState('venezuela'); // Para formularios de configuración/admin
  const [vendorStoreCountry, setVendorStoreCountry] = useState('venezuela');

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState('');

  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [updatingPassword, setUpdatingPassword] = useState(false);

  const handleUpdatePassword = async (e) => {
  e.preventDefault();
  if (!newPassword || newPassword.length < 6) {
    alert("La contraseña debe tener al menos 6 caracteres.");
    return;
  }
  setUpdatingPassword(true);
  try {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
    alert("¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva clave.");
    setIsRecoveringPassword(false);
    setNewPassword('');
    await supabase.auth.signOut(); // Cierra sesión para forzar login limpio
  } catch (err) {
    alert("Error actualizando contraseña: " + err.message);
  } finally {
    setUpdatingPassword(false);
  }
};
  
  // NUEVOS ESTADOS: Máscaras y Tipos de Comercio
  const [currentStoreType, setCurrentStoreType] = useState('standard'); // 'standard' | 'restaurant'
  // NUEVO: Imágenes publicitarias de pantalla de clientes (1920x1080)
  const [currentStoreKdsBanners, setCurrentStoreKdsBanners] = useState([]);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleUploadKdsBanner = async (file) => {
    if (!file || !currentStoreId) return;
    setUploadingBanner(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `kds_banner_${currentStoreId}_${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('product-images').upload(fileName, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const newUrl = urlData.publicUrl;

      const updatedBanners = [...currentStoreKdsBanners, newUrl];
      const { error: dbErr } = await supabase.from('stores').update({ kds_banners: updatedBanners }).eq('id', currentStoreId);
      if (dbErr) throw dbErr;

      setCurrentStoreKdsBanners(updatedBanners);
      alert("¡Imagen de pantalla agregada con éxito!");
    } catch (err) {
      alert("Error al subir imagen: " + err.message);
    } finally {
      setUploadingBanner(false);
    }
  };

  const handleDeleteKdsBanner = async (bannerUrl) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta imagen de la pantalla de clientes?")) return;
    try {
      const updatedBanners = currentStoreKdsBanners.filter(url => url !== bannerUrl);
      const { error: dbErr } = await supabase.from('stores').update({ kds_banners: updatedBanners }).eq('id', currentStoreId);
      if (dbErr) throw dbErr;

      setCurrentStoreKdsBanners(updatedBanners);
      alert("Imagen eliminada de la cartelera.");
    } catch (err) {
      alert("Error al eliminar imagen: " + err.message);
    }
  };
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

  // NUEVOS ESTADOS: Datos Fiscales del Comercio
  const [currentStoreRif, setCurrentStoreRif] = useState('');
  const [currentStoreAddress, setCurrentStoreAddress] = useState('');
  const [currentStoreTaxEnabled, setCurrentStoreTaxEnabled] = useState(false);
  const [currentStoreTaxRate, setCurrentStoreTaxRate] = useState(16);
  const [currentStoreTaxInclusive, setCurrentStoreTaxInclusive] = useState(false);
  const [savingFiscal, setSavingFiscal] = useState(false);
  const [currentStoreLat, setCurrentStoreLat] = useState(10.3755);
  const [currentStoreLng, setCurrentStoreLng] = useState(-66.9587);

  // NUEVO: Estado de permiso de Krono
  const [currentStoreKronoEnabled, setCurrentStoreKronoEnabled] = useState(false);

  // NUEVO: Función para encender/apagar Krono desde el Panel Maestro
  const handleToggleKrono = async (storeId, currentStatus) => {
    try {
      const { error } = await supabase.from('stores').update({ krono_enabled: !currentStatus }).eq('id', storeId);
      if (error) throw error;
      fetchAdminStores(); 
    } catch (error) {
      alert("Error al cambiar permisos de Krono: " + error.message);
    }
  };

  const handleGetLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentStoreLat(position.coords.latitude);
          setCurrentStoreLng(position.coords.longitude);
        },
        (error) => {
          alert("Error obteniendo ubicación: " + error.message);
        },
        { enableHighAccuracy: true }
      );
    } else {
      alert("Tu navegador no soporta geolocalización.");
    }
  };

  const handleSaveFiscalSettings = async (e) => {
    e.preventDefault();
    setSavingFiscal(true);
    try {
      const { error } = await supabase.from('stores').update({
        rif: currentStoreRif,
        address: currentStoreAddress,
        tax_enabled: currentStoreTaxEnabled,
        tax_rate: currentStoreTaxRate,
        tax_inclusive: currentStoreTaxInclusive,
        lat: currentStoreLat,
        lng: currentStoreLng
      }).eq('id', currentStoreId);
      if (error) throw error;
      alert("¡Datos del comercio y configuración de impuestos guardados con éxito!");
    } catch(e) {
      alert("Error al guardar: " + e.message);
    } finally {
      setSavingFiscal(false);
    }
  };

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
  const [isParaLlevar, setIsParaLlevar] = useState(false);
  // NUEVO: Estados para Extras con Precio en Restaurante
  const [productExtras, setProductExtras] = useState([]); // [{ name: 'Huevo', price: 1.0 }]
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');
  const [selectedExtrasToggles, setSelectedExtrasToggles] = useState({});

const confirmAddToCartWithModifiers = () => {
    if (!productForModifiers) return;

    const cartItemId = `${productForModifiers.id}_mod_${Date.now()}`;

    // 1. Ingredientes base excluidos
    const excluded = Object.keys(dynamicToggles).filter(k => !dynamicToggles[k]);
    let customizationText = excluded.length > 0 ? excluded.map(item => `Sin ${item}`).join(', ') : "Con todo";

    // 2. Sumar el costo de los extras seleccionados
    let availableExtras = [];
    if (productForModifiers.extras) {
      availableExtras = typeof productForModifiers.extras === 'string' 
        ? JSON.parse(productForModifiers.extras) 
        : productForModifiers.extras;
    }

    let extrasTotalCost = 0;
    const chosenExtrasText = [];

    availableExtras.forEach(ex => {
      if (selectedExtrasToggles[ex.name]) {
        const p = parseFloat(ex.price) || 0;
        extrasTotalCost += p;
        chosenExtrasText.push(`+ ${ex.name} (+$${p.toFixed(2)})`);
      }
    });

    if (chosenExtrasText.length > 0) {
      customizationText += ` | ${chosenExtrasText.join(', ')}`;
    }

    // 3. Para llevar
    if (isParaLlevar) {
      customizationText += " | Para Llevar";
    }

    const finalItemPrice = parseFloat((productForModifiers.price + extrasTotalCost).toFixed(2));

    const itemToAdd = {
      ...productForModifiers,
      cartItemId,
      price: finalItemPrice,
      basePrice: productForModifiers.price,
      quantity: 1,
      customization: customizationText
    };

    setCart([...cart, itemToAdd]);
    setShowModifierModal(false);
    setProductForModifiers(null);
    setIsParaLlevar(false);
    setSelectedExtrasToggles({});
  };

  const handleOpenModifierModal = (prod) => {
    setProductForModifiers(prod);
    setIsParaLlevar(false);

    // Cargar ingredientes base (todos marcados por defecto)
    let modsArray = ['Cebolla', 'Papa', 'Queso', 'Salsas'];
    if (prod.modifiers) {
      modsArray = typeof prod.modifiers === 'string' 
        ? prod.modifiers.split(',').map(s => s.trim()).filter(Boolean) 
        : prod.modifiers;
    }
    const initialToggles = {};
    modsArray.forEach(m => { initialToggles[m] = true; });
    setDynamicToggles(initialToggles);

    // Cargar extras con precio (todos DESMARCADOS por defecto)
    let availableExtras = [];
    if (prod.extras) {
      try {
        availableExtras = typeof prod.extras === 'string' ? JSON.parse(prod.extras) : prod.extras;
      } catch(e) { availableExtras = []; }
    }
    const initialExtrasToggles = {};
    availableExtras.forEach(ex => { initialExtrasToggles[ex.name] = false; });
    setSelectedExtrasToggles(initialExtrasToggles);

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
      cartItemId: `${productForWeight.id}_weight_${Date.now()}`,
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

  // Estados para Plantillas de WhatsApp y Selectores
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [clienteSeleccionado, setClienteSeleccionado] = useState('');
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [plantillaActiva, setPlantillaActiva] = useState('reposicionStock');
  // 2. Cargar clientes y productos desde Supabase al abrir la pantalla
  useEffect(() => {
    const cargarDatosParaWhatsApp = async () => {
      // Cargar Clientes (solo necesitamos id, name y phone)
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, phone');
      
      if (clientsData) setClientes(clientsData);

      // Cargar Productos (solo necesitamos id y name)
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name');
      
      if (productsData) setProductos(productsData);
    };

    cargarDatosParaWhatsApp();
  }, []); // Se ejecuta una sola vez al cargar

  // 3. Función para enviar el mensaje por WhatsApp
  const handleEnviarWhatsApp = () => {
    if (!clienteSeleccionado) {
      alert("Por favor selecciona un cliente destino.");
      return;
    }

    // Buscar el objeto completo del cliente seleccionado
    const cliente = clientes.find(c => c.id == clienteSeleccionado);
    
    if (!cliente || !cliente.phone || cliente.phone === 'EMPTY') {
      alert("El cliente seleccionado no tiene un número de teléfono válido registrado.");
      return;
    }

    // Buscar el producto seleccionado (si aplica)
    const producto = productos.find(p => p.id == productoSeleccionado);
    const nombreProducto = producto ? producto.name : "[Producto]";

    // Obtener la plantilla actual
    let mensaje = plantillas[plantillaActiva] || '';

    // Reemplazar las variables dinámicas en el texto
    mensaje = mensaje.replace(/{cliente}/g, cliente.name);
    mensaje = mensaje.replace(/{producto}/g, nombreProducto);
    mensaje = mensaje.replace(/{comercio}/g, "nuestra tienda"); // Puedes cambiar esto por el nombre real de tu negocio

    // Formatear número para WhatsApp (adaptado para Venezuela)
    let phoneLimpio = cliente.phone.replace(/\D/g, ''); // Elimina guiones o espacios
    if (phoneLimpio.startsWith('0')) {
      phoneLimpio = '58' + phoneLimpio.substring(1); // Cambia el 0 inicial por 58
    } else if (!phoneLimpio.startsWith('58')) {
      phoneLimpio = '58' + phoneLimpio; // Agrega 58 si no lo tiene
    }

    // Abrir WhatsApp Web/App con el mensaje pre-llenado
    const url = `https://wa.me/${phoneLimpio}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
  };
  // 1. Nuevos estados y Referencia (agrégalos junto a tus otros useState)
  const [mostrarNuevaPlantilla, setMostrarNuevaPlantilla] = useState(false);
  const [nombreNuevaPlantilla, setNombreNuevaPlantilla] = useState('');
  const textareaRef = useRef(null);

  // 2. Función para crear una nueva plantilla
  const handleCrearPlantilla = () => {
    if (!nombreNuevaPlantilla.trim()) return;
    
    // Convertir el nombre a un formato de clave (ej. "Feliz Cumpleaños" -> "feliz_cumpleaños")
    const clave = nombreNuevaPlantilla.toLowerCase().replace(/\s+/g, '_');
    
    setPlantillas(prev => ({
      ...prev,
      [clave]: ''
    }));
    setPlantillaActiva(clave);
    setNombreNuevaPlantilla('');
    setMostrarNuevaPlantilla(false);
  };

  // 3. Función para insertar la variable exactamente donde esté el cursor
  const insertarVariable = (variable) => {
    const textarea = textareaRef.current;
    const textoActual = plantillas[plantillaActiva] || '';
    
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nuevoTexto = textoActual.substring(0, start) + variable + textoActual.substring(end);
      
      setPlantillas({ ...plantillas, [plantillaActiva]: nuevoTexto });
      
      // Regresar el foco al textarea y poner el cursor después de la variable insertada
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + variable.length, start + variable.length);
      }, 0);
    } else {
      // Respaldo por si el ref falla: lo agrega al final
      setPlantillas({ ...plantillas, [plantillaActiva]: textoActual + variable });
    }
  };

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
  const [pastShifts, setPastShifts] = useState([]);

  // NUEVOS ESTADOS: Modal de Detalles de Reporte Z
  const [showShiftReportModal, setShowShiftReportModal] = useState(false);
  const [selectedShiftReport, setSelectedShiftReport] = useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payCashUSD, setPayCashUSD] = useState('');
  const [payCashBs, setPayCashBs] = useState('');
  const [payPagoMovil, setPayPagoMovil] = useState('');
  const [payZelle, setPayZelle] = useState('');
  const [payDebit, setPayDebit] = useState('');
  const [paymentRef, setPaymentRef] = useState('');
  const [changeCurrencyType, setChangeCurrencyType] = useState('USD'); // 'USD', 'BS' o 'PAGO_MOVIL'
  const [pagoMovilRateMode, setPagoMovilRateMode] = useState('actual'); // 'actual' o 'personalizada'
  const [pagoMovilCustomRate, setPagoMovilCustomRate] = useState('');

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

  // Asegúrate de que esta función exista en el archivo donde manejas el modal o la vista de la factura
  const getInvoiceClientDocument = (sale) => {
  if (!sale) return 'N/A';
  if (sale.client_document) return sale.client_document;
  if (sale.client_id && typeof clients !== 'undefined') {
    const foundClient = clients.find(c => c.id === sale.client_id);
    if (foundClient && (foundClient.document || foundClient.rif)) {
      return foundClient.document || foundClient.rif;
    }
  }
  return 'N/A';
};

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // 1. Detectar si el usuario viene del enlace del correo de recuperación
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveringPassword(true);
      }

      setSession(session);
      
      // 2. Solo cargar la tienda si no está en proceso de cambiar contraseña
      if (session && event !== 'PASSWORD_RECOVERY') {
        fetchUserProfileAndStore(session.user);
      } else if (!session) {
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
    let timeout;
    if (isOnline) {
      timeout = setTimeout(() => {
        syncOfflineData();
      }, 2500);
    }
    return () => clearTimeout(timeout);
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
     // Asignamos tu tienda exclusiva de pruebas para que puedas ver tu menú y POS
     activeStoreId = '505a583d-8fd8-4265-af3e-aa836f177af0'; 
     
     if (navigator.onLine) {
       fetchAdminStores();
       fetchSystemVendors();
       fetchSaasTransactions();
     }
   }

      if (activeStoreId && activeStoreId !== 'null' && activeStoreId !== 'undefined') {
        if (navigator.onLine) {
          const { data: storeInfo, error: storeErr } = await supabase.from('stores').select('name, is_active, store_type, country, rif, document, address, tax_enabled, tax_rate, tax_inclusive, krono_enabled, lat, lng, is_trial, trial_end_date, subscription_expires_at, kds_banners').eq('id', activeStoreId).single();
          
          if (storeInfo) {
            console.log("🚨 DATOS CRUDOS DE SUPABASE PARA ESTA TIENDA:", storeInfo); 

            // SEGURIDAD SAAS: Si no es Super Admin, verificar estado y fechas de corte
            if (profile.role !== 'super_admin') {
              const now = new Date().getTime();

              // 1. Bloqueo si fue suspendido manualmente
              if (storeInfo.is_active === false) {
                alert("⚠️ Este comercio se encuentra suspendido por la administración. Acceso denegado.");
                await supabase.auth.signOut();
                return;
              }

              // 2. Bloqueo automático si el periodo de prueba gratuita expiró
              if (storeInfo.is_trial) {
                const trialEnd = new Date(storeInfo.trial_end_date || storeInfo.created_at).getTime();
                if (now > trialEnd) {
                  alert("⚠️ El periodo de prueba gratuita de 10 días para este comercio ha finalizado.\n\nPor favor, comunícate con la administración de Fiskal para activar tu suscripción formal.");
                  await supabase.auth.signOut();
                  return;
                }
              }

              // 3. Bloqueo automático si la suscripción mensual venció
              if (!storeInfo.is_trial && storeInfo.subscription_expires_at) {
                const subEnd = new Date(storeInfo.subscription_expires_at).getTime();
                if (now > subEnd) {
                  alert("⚠️ La suscripción mensual de este comercio ha vencido.\n\nPor favor, contacta a soporte para realizar tu pago de renovación y reactivar el servicio.");
                  await supabase.auth.signOut();
                  return;
                }
              }
            }
            if (storeInfo.name) {
              let rawType = storeInfo.store_type ? String(storeInfo.store_type).trim().toLowerCase() : 'standard';
              const safeType = rawType === 'restaurant' ? 'restaurant' : 'standard';
              
              // Normalización unificada de país (evita discrepancias entre mayúsculas o espacios)
              const rawCountry = (storeInfo.country || 'venezuela').trim().toLowerCase();
              const safeCountry = rawCountry.includes('panama') ? 'panama' : rawCountry.includes('salvador') ? 'el_salvador' : 'venezuela';
              
              setCurrentStoreName(storeInfo.name);
              setCurrentStoreType(safeType);
              setCurrentStoreCountry(safeCountry);
              setCurrentStoreRif(storeInfo.rif || storeInfo.document || '');
              setCurrentStoreAddress(storeInfo.address || '');
              setCurrentStoreTaxEnabled(storeInfo.tax_enabled || false);
              setCurrentStoreTaxRate(storeInfo.tax_rate !== null && storeInfo.tax_rate !== undefined ? storeInfo.tax_rate : (safeCountry === 'panama' ? 7 : safeCountry === 'el_salvador' ? 13 : 16));
              setCurrentStoreTaxInclusive(storeInfo.tax_inclusive || false);
              setCurrentStoreKronoEnabled(storeInfo.krono_enabled || false);
              setCurrentStoreLat(parseFloat(storeInfo.lat) || 10.4806);
              setCurrentStoreLng(parseFloat(storeInfo.lng) || -66.9036);
              setCurrentStoreKdsBanners(storeInfo.kds_banners || []);
              
              localStorage.setItem(`fiskal_cache_store_name_${activeStoreId}`, storeInfo.name);
              localStorage.setItem(`fiskal_cache_store_type_${activeStoreId}`, safeType);
              localStorage.setItem(`fiskal_cache_store_country_${activeStoreId}`, safeCountry);
              localStorage.setItem(`fiskal_cache_krono_enabled_${activeStoreId}`, storeInfo.krono_enabled || false);
            }
          }
        } else {
          const cachedName = localStorage.getItem(`fiskal_cache_store_name_${activeStoreId}`);
          if (cachedName) setCurrentStoreName(cachedName);
          const cachedType = localStorage.getItem(`fiskal_cache_store_type_${activeStoreId}`);
          if (cachedType) setCurrentStoreType(cachedType);
          const cachedCountry = localStorage.getItem(`fiskal_cache_store_country_${activeStoreId}`);
          if (cachedCountry) setCurrentStoreCountry(cachedCountry);
          const cachedKrono = localStorage.getItem(`fiskal_cache_krono_enabled_${activeStoreId}`);
          if (cachedKrono) setCurrentStoreKronoEnabled(cachedKrono === 'true');
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

    // Genera una contraseña aleatoria única y segura (Ej. Fk8#m2Px!)
    const tempPassword = 'Fk*' + Math.random().toString(36).slice(-6) + '!9';

    setCreatingVendor(true);
    try {
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: newVendorEmail.trim(),
        password: tempPassword,
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

      alert(`¡Vendedor de Sistema registrado con éxito!\n\nCredenciales de acceso generadas:\nCorreo: ${newVendorEmail}\nContraseña Temporal Única: ${tempPassword}\n\n(Copia esta contraseña y compártela con el vendedor)`);
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
        store_type: vendorNewStoreType,
        country: vendorStoreCountry 
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
      setVendorStoreCountry('venezuela'); 
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

  const handleForgotPasswordSubmit = async (e) => {
  e.preventDefault();
  if (!resetEmail.trim()) return;
  setResetLoading(true);
  setResetMessage('');

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: window.location.origin,
    });
    if (error) throw error;
    setResetMessage('¡Correo enviado con éxito! Revisa tu bandeja de entrada y spam para restablecer tu contraseña.');
  } catch (err) {
    setResetMessage('Error: ' + err.message);
  } finally {
    setResetLoading(false);
  }
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

  const [showInKrono, setShowInKrono] = useState(false);
  const [kronoPrice, setKronoPrice] = useState('');

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

const handleDeleteStore = async (storeId, storeName) => {
    if (currentUserRole !== 'super_admin') {
      alert("Acceso denegado: Solo el Administrador Principal puede eliminar comercios.");
      return;
    }

    const confirmText = `⚠️ ADVERTENCIA CRÍTICA ⚠️\n\n¿Estás absolutamente seguro de que deseas ELIMINAR permanentemente el comercio "${storeName}"?\n\nEsta acción borrará todo su historial y NO se puede deshacer.`;
    
    if (!window.confirm(confirmText)) return;

    try {
      // Usamos .select() para confirmar que Supabase realmente eliminó la fila
      const { data, error } = await supabase.from('stores').delete().eq('id', storeId).select();
      
      if (error) {
        if (error.message.includes('foreign key constraint') || error.code === '23503') {
           throw new Error("No puedes eliminar este comercio porque tiene productos, cajas o ventas registradas. Debes eliminar primero sus registros o activar borrado en cascada (Cascade) en Supabase.");
        }
        throw error;
      }

      // Si RLS bloqueó el borrado, data vendrá vacío
      if (!data || data.length === 0) {
        alert("⚠️ La base de datos no permitió borrar el comercio. Esto ocurre porque la política RLS en Supabase no tiene habilitado el permiso de DELETE.");
        return;
      }
      
      alert(`El comercio "${storeName}" ha sido eliminado exitosamente.`);
      fetchAdminStores();
    } catch (error) {
      alert("Error al eliminar el comercio: " + error.message);
    }
  };

const [storeIsDemo, setStoreIsDemo] = useState(false);

  const handleToggleDemo = async (storeId, currentStatus) => {
    try {
      const { error } = await supabase.from('stores').update({ is_demo: !currentStatus }).eq('id', storeId);
      if (error) throw error;
      fetchAdminStores();
    } catch (error) {
      alert("Error al cambiar estatus de demo: " + error.message);
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
    setStoreCountry(store.country || 'venezuela'); 
    setStorePaidAdvance(false);
    setStoreCustomDiscount(store.custom_discount !== undefined && store.custom_discount !== null ? store.custom_discount : globalPromoDiscount);
    setNewStoreType(store.store_type || 'standard');
    setStoreIsDemo(store.is_demo || false);
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
    setStoreCountry('venezuela'); 
    setStorePaidAdvance(false);
    setStoreCustomDiscount(0);
    setNewStoreType('standard');
    setStoreIsDemo(false);
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
      custom_discount: parseFloat(storeCustomDiscount) || 0,
      country: storeCountry,
      is_demo: storeIsDemo
    };

    try {
      if (editingStore) {
        const updatePayload = { ...payload, store_type: newStoreType, country: storeCountry };
        const { error } = await supabase.from('stores').update(updatePayload).eq('id', editingStore.id);
        if (error) throw error;
        alert("¡Comercio actualizado exitosamente!");
        if (editingStore.id === currentStoreId) {
          setCurrentStoreName(storeName.trim());
          setCurrentStoreType(newStoreType);
          setCurrentStoreCountry(storeCountry);
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
          store_type: newStoreType,
          country: storeCountry
        }]).select().single();
        
        if (error) throw error;
        
        // Si NO es demo, registra ingreso a la contabilidad
        if (storePaidAdvance && newStore && !storeIsDemo) {
          await supabase.from('saas_transactions').insert([{
            type: 'income',
            amount: priceToLock,
            description: 'Registro inicial Standalone (Suscripción): ' + newStore.name,
            store_id: newStore.id
          }]);
          alert("¡Comercio registrado exitosamente con 40 DÍAS ACTIVOS!");
        } else {
          alert(storeIsDemo ? "¡Comercio de prueba (DEMO) registrado! No afectará la contabilidad." : "¡Comercio registrado exitosamente con 10 días de prueba!");
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
      const { data, error } = await supabase.from('stores').update({
        is_trial: false,
        is_active: true,
        subscription_expires_at: newExpirationDate.toISOString()
      }).eq('id', store.id).select();

      if (error) throw error;
      if (!data || data.length === 0) {
        alert("⚠️ La base de datos no permitió actualizar la tienda. Asegúrate de ejecutar el SQL en Supabase.");
        return;
      }

      // Ingreso financiero SOLO si NO es demo
      if (!store.is_demo) {
        try {
          await supabase.from('saas_transactions').insert([{
            type: 'income',
            amount: parseFloat(finalPrice),
            description: 'Renovación Mensual: ' + store.name,
            store_id: store.id,
            vendor_id: store.system_vendor_id || null
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
        } catch (transErr) {
          console.warn("Aviso transacciones SaaS:", transErr.message);
        }
      }

      alert(`¡Suscripción renovada exitosamente!\n\nNueva fecha de vencimiento: ${newExpirationDate.toLocaleDateString()}\nEl comercio ha sido reactivado.`);
      fetchAdminStores();
      fetchSystemVendors();
      fetchSaasTransactions();
    } catch (error) {
      alert("Error al renovar suscripción: " + error.message);
    }
  };

  const handleSaasWhatsApp = (store) => {
    if (!store) return;
    const storeName = store.name || 'Comercio';
    const ownerName = store.owner_name || store.full_name || 'Nombres';
    const fee = Number(store.monthly_fee || 13.40).toFixed(2);
    
    const message = `Hola *${ownerName}* de *${storeName}*, le escribimos de Fiskal para enviarle su recibo de servicios SaaS.

📋 *Detalle:* Suscripción Mensual Sistema Fiskal
💰 *Total Facturado:* $${fee}

¡Gracias por confiar en Fiskal para la gestión de su negocio!`;

    const phone = store.phone || store.whatsapp || '';
    const whatsappUrl = phone 
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
    
    window.open(whatsappUrl, '_blank');
  };

  const handlePrintSaasPdf = (store) => {
    if (!store) return;
    const printAreaElement = document.getElementById('saas-invoice-print-area');
    if (!printAreaElement) return;

    const printContents = printAreaElement.innerHTML;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    printWindow.document.write(`
      <html>
        <head>
          <title>Recibo_Fiskal_${store.name}</title>
          <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #000; }
            h1 { margin: 0 0 5px 0; font-size: 24px; color: #000; }
            .subtitle { font-size: 16px; font-weight: bold; color: #333; margin-bottom: 30px; }
            .info-grid { margin-bottom: 30px; font-size: 14px; color: #000; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 14px; }
            th, td { padding: 10px 5px; text-align: left; }
            th { border-bottom: 1px solid #000; font-weight: bold; }
            td { border-bottom: 1px solid #eee; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .total-container { display: flex; justify-content: flex-end; margin-bottom: 40px; font-size: 16px; font-weight: bold; }
            .footer { text-align: left; font-size: 14px; color: #000; }
            img { height: 45px; object-fit: contain; margin-bottom: 8px; }
          </style>
        </head>
        <body>
          ${printContents}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 350);
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
      // CORRECCIÓN: Crear la imagen y esperar a que cargue correctamente
      const img = new Image();
      img.src = logoDark;
      
      await new Promise((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo cargar la imagen del logo"));
      });

      const imgWidth = img.width || 1590; 
      const imgHeight = img.height || 461; 
      
      const pdfImageWidth = 35;
      const pdfImageHeight = (imgHeight * pdfImageWidth) / imgWidth;

      doc.addImage(img, 'PNG', 14, currentY, pdfImageWidth, pdfImageHeight);
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
    if (isSyncing || !currentStoreId) return;
    setIsSyncing(true);

    try {
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

      let generalErrorOccurred = false;
      const idMap = {}; 

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
        const { data, error } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId) // <--- Filtro estricto de Supabase
          .order('id', { ascending: false });
          
        if (!error) {
          cloudProducts = data || [];
          // Guardamos en caché de manera específica para esta tienda
          localStorage.setItem(`fiskal_cache_products_${storeId}`, JSON.stringify(cloudProducts));
        } else {
          console.error("Error en Supabase al traer productos:", error.message);
        }
      } else {
        // Modo offline: leemos exclusivamente la caché de ESTA tienda
        const cached = localStorage.getItem(`fiskal_cache_products_${storeId}`);
        if (cached) cloudProducts = JSON.parse(cached);
      }
      
      const actions = await getOfflineActions();
      const localProducts = [];
      actions.forEach(action => {
        // Aseguramos que las acciones offline también pertenezcan a esta tienda si guardas ese dato
        if (action.type === 'INSERT_PRODUCT' && action.productData) {
          localProducts.push({ ...action.productData, id: action.tempId });
        }
      });

      const deletedIds = actions.filter(a => a.type === 'DELETE_PRODUCT').map(a => a.productId);
      let finalCloudProducts = cloudProducts.filter(p => !deletedIds.includes(p.id));

      const productUpdateActions = actions.filter(a => a.type === 'UPDATE_PRODUCT');
      finalCloudProducts = finalCloudProducts.map(p => {
        const update = productUpdateActions.find(a => a.productId === p.id);
        return update ? { ...p, ...update.productData } : p;
      });

      // Actualizamos el estado limpio solo con lo de esta tienda
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

      // Guardamos el fondo en Bs dentro del campo notes para no alterar la BD
      const shiftNotesTag = `FondoBs:${floatValVES}`;

      const { data, error } = await supabase.from('shifts').insert([{
          status: 'open',
          register_id: regId,
          opening_float_usd: floatValUSD,
          total_sales_usd: 0,
          expected_cash_usd: floatValUSD,
          user_id: userId,
          store_id: currentStoreId,
          notes: shiftNotesTag
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

  const fondoBsTag = currentShift?.notes?.includes('FondoBs:') 
    ? currentShift.notes.match(/FondoBs:[0-9.]+/)?.[0] || '' 
    : '';

  const notasFinales = fondoBsTag + (shiftNotes ? ` | Cierre: ${shiftNotes}` : '');

const handleCloseShift = async () => {
    if (!currentShift) return;

    // Extracción segura del fondo en Bs desde la base de datos o desde las notas
    const floatUsd = Number(currentShift.opening_float_usd || 0);
    const match = (currentShift.notes || '').match(/FondoBs:([0-9.]+)/);
    const floatBs = match ? parseFloat(match[1]) : Number(currentShift.opening_float_ves || currentShift.opening_float_bs || 0);

    // 1. Cálculos de expectativa separados (Fondo inicial + Ventas en efectivo)
    const expectedUsd = floatUsd + shiftCashUSD;
    const expectedBs = floatBs + shiftCashBs;

    // 2. Efectivo físico real ingresado por el cajero
    const countedUsd = parseFloat(actualCashUSD) || 0;
    const countedBs = parseFloat(actualCashBs) || 0;

    // 3. Diferencias aisladas por moneda
    const differenceUsd = countedUsd - expectedUsd;
    const differenceBs = countedBs - expectedBs;

    // 4. Payload limpio solo con las columnas nuevas y nativas
    const payload = {
      closed_at: new Date().toISOString(),
      expected_cash_usd: expectedUsd,
      expected_cash_bs: expectedBs,
      actual_cash_usd: countedUsd,
      actual_cash_bs: countedBs,
      difference_usd: differenceUsd,
      difference_bs: differenceBs,
      notes: shiftNotes,
      status: 'closed'
    };

    try {
      const { error } = await supabase
        .from('shifts')
        .update(payload)
        .eq('id', currentShift.id);

      if (error) {
        console.error("Error al cerrar en BD:", error);
        alert('Error en BD: ' + error.message);
        return;
      }

      // 5. Alerta detallando ambas cajas
      let alertMsg = 'Corte de caja realizado.\n\n';
      alertMsg += `Diferencia USD: ${differenceUsd > 0 ? '+' : ''}$${differenceUsd.toFixed(2)}\n`;
      if (currentStoreCountry === 'venezuela') {
        alertMsg += `Diferencia Bs: ${differenceBs > 0 ? '+' : ''}Bs. ${differenceBs.toFixed(2)}`;
      }
      alert(alertMsg);

      setShowCloseShiftModal(false);
      setActualCashUSD('');
      setActualCashBs('');
      setShiftNotes('');
      
      // Recargar la página o ejecutar tu función de refresco
      window.location.reload(); 
    } catch (err) {
      console.error('Error cerrando turno:', err);
      alert('Error cerrando el turno.');
    }
  };

const syncRate = async (type, storeId, manualValue = null) => {
    setLoadingRate(true);
    try {
      if (type === 'CUSTOM' && manualValue !== null) {
        const val = parseFloat(manualValue);
        if (!isNaN(val) && val > 0) {
          setBcvRate(val);
          setLastSync('Tasa Manual');
          localStorage.setItem('fiskal_cache_bcv_rate', val.toString());
        }
        setLoadingRate(false);
        return;
      }

      if (navigator.onLine) {
        const endpoint = type === 'EUR' 
          ? 'https://ve.dolarapi.com/v1/euros/oficial' 
          : 'https://ve.dolarapi.com/v1/dolares/oficial';
          
        const response = await fetch(endpoint);
        if (!response.ok) throw new Error('Error al conectar con el servicio de tasas');
        
        const data = await response.json();
        const liveRate = parseFloat(data.promedio || data.price);

        if (liveRate && !isNaN(liveRate)) {
          setBcvRate(liveRate);
          const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          setLastSync(timeStr);
          localStorage.setItem('fiskal_cache_bcv_rate', liveRate.toString());

          if (storeId) {
            await supabase.from('settings').upsert({ key: type === 'EUR' ? 'eur_rate' : 'bcv_rate', value: liveRate, store_id: storeId }, { onConflict: 'key' });
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

  const syncBcvRate = (storeId) => syncRate(rateType, storeId, rateType === 'CUSTOM' ? customRateInput : null);

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
      } else if (imagePreview && !imagePreview.startsWith('blob:')) {
        // Mantiene la foto existente al duplicar
        imageUrl = imagePreview;
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
        store_id: currentStoreId,
        show_in_krono: showInKrono,
        krono_preferential_price: kronoPrice ? parseFloat(kronoPrice) : null
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
      alert("¡Producto guardado exitosamente!");
    } catch (error) {
      console.error('Error al guardar producto:', error.message);
      alert("Error al guardar producto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    if (!editingProduct || !name || !price || !currentStoreId) {
      alert("Falta el nombre, el precio, o no hay una tienda/producto seleccionado. No se guardó ningún cambio.");
      return;
    }

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
        modifiers: productModifiers.join(', '),
        extras: productExtras,
        show_in_krono: showInKrono,
        krono_preferential_price: kronoPrice ? parseFloat(kronoPrice) : null
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

      const { data, error } = await supabase.from('products').update(updatedProductData).eq('id', editingProduct.id).eq('store_id', currentStoreId).select();
      if (error) throw error;
      if (!data || data.length === 0) {
        throw new Error("No se encontró ese producto en tu tienda para actualizar — no se guardó ningún cambio. Refresca la página e intenta de nuevo.");
      }

      resetProductForm();
      fetchProducts(currentStoreId);
    } catch (error) {
      console.error('Error al actualizar producto:', error.message);
      alert("Error al actualizar producto: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // NUEVO: Generador inteligente de correlativo de SKU / Código de Barras
  const generateDuplicateSku = (originalSku) => {
    if (!originalSku || !originalSku.trim()) {
      return `SKU-${Date.now().toString().slice(-4)}`;
    }
    const clean = originalSku.trim();
    // Si termina en guion con número: ej. PROD-1 o SKU-001
    const match = clean.match(/^(.*?)[-_](\d+)$/);
    if (match) {
      const prefix = match[1];
      const numStr = match[2];
      const nextNum = parseInt(numStr, 10) + 1;
      const paddedNum = String(nextNum).padStart(numStr.length, '0');
      const separator = clean.includes('_') ? '_' : '-';
      return `${prefix}${separator}${paddedNum}`;
    }
    // Si es un número puro: ej. 75910001 -> 75910002
    if (/^\d+$/.test(clean)) {
      try {
        const nextNum = BigInt(clean) + 1n;
        return nextNum.toString();
      } catch(e) {
        return `${clean}-1`;
      }
    }
    // Si es solo texto: ej. HAMBURGUESA -> HAMBURGUESA-1
    return `${clean}-1`;
  };

  // NUEVO: Duplicador completo de producto
  const handleDuplicateProduct = (prod) => {
    setEditingProduct(null); // Modo nuevo producto (Insertar)
    setName(`${prod.name} (Copia)`);
    setPrice(prod.price !== undefined ? prod.price.toString() : '');
    setCost(prod.cost !== undefined ? prod.cost.toString() : '');
    setStock(prod.stock !== undefined ? prod.stock.toString() : '0');
    setCategory(prod.category || 'General');
    
    // Generar nuevo SKU correlativo automático
    setBarcode(generateDuplicateSku(prod.barcode));

    // Mantener la foto existente si no se sube una nueva
    setImagePreview(prod.image_url || null);
    setImageFile(null);

    setShowInKrono(prod.show_in_krono || false);
    setKronoPrice(prod.krono_preferential_price ? prod.krono_preferential_price.toString() : '');

    // Copiar todos los modificadores/ingredientes
    if (prod.modifiers) {
      const arr = typeof prod.modifiers === 'string' 
        ? prod.modifiers.split(',').map(s => s.trim()).filter(Boolean) 
        : prod.modifiers;
      setProductModifiers(arr);
    } else {
      setProductModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']);
    }

    // Copiar todos los extras con sus precios
    if (prod.extras) {
      try {
        setProductExtras(typeof prod.extras === 'string' ? JSON.parse(prod.extras) : prod.extras);
      } catch(e) { setProductExtras([]); }
    } else {
      setProductExtras([]);
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEditProduct = (prod) => {
    setEditingProduct(prod);
    setName(prod.name);
    setPrice(prod.price !== undefined ? prod.price.toString() : '');
    setCost(prod.cost !== undefined ? prod.cost.toString() : '');
    setStock(prod.stock !== undefined ? prod.stock.toString() : '');
    setCategory(prod.category || 'General');
    setBarcode(prod.barcode || '');
    setImagePreview(prod.image_url || null);
    setImageFile(null);
    
    setShowInKrono(prod.show_in_krono || false);
    setKronoPrice(prod.krono_preferential_price !== null && prod.krono_preferential_price !== undefined ? prod.krono_preferential_price.toString() : '');

    if (prod.modifiers) {
      const arr = typeof prod.modifiers === 'string' 
        ? prod.modifiers.split(',').map(s => s.trim()).filter(Boolean) 
        : prod.modifiers;
      setProductModifiers(arr);
    } else {
      setProductModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']);
    }

    if (prod.extras) {
      try {
        setProductExtras(typeof prod.extras === 'string' ? JSON.parse(prod.extras) : prod.extras);
      } catch(e) { setProductExtras([]); }
    } else {
      setProductExtras([]);
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
    setProductModifiers(['Cebolla', 'Papa', 'Queso', 'Salsas']);
    setNewModifierText('');
    setShowInKrono(false);
    setKronoPrice('');
    setProductExtras([]);
    setNewExtraName('');
    setNewExtraPrice('');
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
    const savedRateType = localStorage.getItem('fiskal_rate_type') || 'BCV';
    const savedCustomRate = localStorage.getItem('fiskal_custom_rate') || '';
    setRateType(savedRateType);
    setCustomRateInput(savedCustomRate);

    if (savedRateType === 'CUSTOM' && savedCustomRate) {
      const val = parseFloat(savedCustomRate);
      if (!isNaN(val)) {
        setBcvRate(val);
        setLastSync('Tasa Manual');
      }
    } else if (currentStoreId) {
      syncRate(savedRateType, currentStoreId);
    }
  }, [currentStoreId]);

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

  const rawCartSum = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  let cartSubtotalUSD = 0;
  let calculatedTaxUSD = 0;
  let calculatedTotalUSD = 0;

  if (currentStoreTaxEnabled) {
    if (currentStoreTaxInclusive) {
      calculatedTotalUSD = rawCartSum;
      cartSubtotalUSD = parseFloat((calculatedTotalUSD / (1 + (currentStoreTaxRate / 100))).toFixed(2));
      calculatedTaxUSD = parseFloat((calculatedTotalUSD - cartSubtotalUSD).toFixed(2));
    } else {
      cartSubtotalUSD = rawCartSum;
      calculatedTaxUSD = parseFloat((cartSubtotalUSD * (currentStoreTaxRate / 100)).toFixed(2));
      calculatedTotalUSD = cartSubtotalUSD + calculatedTaxUSD;
    }
  } else {
    cartSubtotalUSD = rawCartSum;
    calculatedTaxUSD = 0;
    calculatedTotalUSD = rawCartSum;
  }

  const totalUSD = settlingSale ? (settlingSale.balance_due_usd || settlingSale.total_usd) : calculatedTotalUSD;
  const totalBs = totalUSD * bcvRate;

  const paidUSDFromCashUSD = calcPayments.cashUSD;
  const paidUSDFromCashBs = currentStoreCountry === 'venezuela' ? (calcPayments.cashBs / (bcvRate || 1)) : 0;
  const paidUSDFromPagoMovil = currentStoreCountry === 'venezuela' ? (calcPayments.pagoMovil / (bcvRate || 1)) : 0;
  const paidUSDFromZelle = calcPayments.zelle;
  const paidUSDFromDebit = currentStoreCountry === 'venezuela' ? (calcPayments.debit / (bcvRate || 1)) : calcPayments.debit;

  const totalPaidUSD = paidUSDFromCashUSD + paidUSDFromCashBs + paidUSDFromPagoMovil + paidUSDFromZelle + paidUSDFromDebit;
  const remainingUSD = Math.max(0, parseFloat((totalUSD - totalPaidUSD).toFixed(2)));
  const remainingBs = remainingUSD * bcvRate; 
  const changeUSD = Math.max(0, parseFloat((totalPaidUSD - totalUSD).toFixed(2)));
  const changeBs = changeUSD * bcvRate;

  // Tasa a usar específicamente para el vuelto por Pago Móvil: la actual, o una
  // personalizada para esta transacción puntual (no afecta el resto de la venta).
  const pagoMovilChangeRate = (changeCurrencyType === 'PAGO_MOVIL' && pagoMovilRateMode === 'personalizada' && parseFloat(pagoMovilCustomRate) > 0)
    ? parseFloat(pagoMovilCustomRate)
    : bcvRate;
  const pagoMovilChangeBs = changeUSD * pagoMovilChangeRate;

  useEffect(() => {
    if (changeUSD <= 0) {
      setPagoMovilRateMode('actual');
      setPagoMovilCustomRate('');
    }
  }, [changeUSD]);

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
      subtotal_usd: cartSubtotalUSD,
      tax_usd: calculatedTaxUSD,
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
      
      alert(currentStoreType === 'restaurant' 
        ? "¡Comanda enviada a la cocina exitosamente!" 
        : "¡Venta guardada en espera exitosamente!"
      );
    }
    setProcessing(false);
  };

  const handleResumeOrder = (sale) => {
    if (cart.length > 0) {
      if (!window.confirm("Tienes productos en el carrito actual. ¿Deseas reemplazarlos por esta comanda?")) {
        return;
      }
    }

    // Cargamos los productos y el cliente
    setCart(sale.items || []);
    setSelectedClient(sale.client_name || 'Cliente General');

    // VINCULAMOS la comanda para cobrarla sin borrarla de la base de datos
    setSettlingSale(sale);

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

    const invoiceNumber = await getNextInvoiceNumber(currentStoreId);

    const saleData = {
      invoice_number: invoiceNumber,
      total_usd: totalUSD, total_bs: totalBs, 
      subtotal_usd: cartSubtotalUSD, tax_usd: calculatedTaxUSD,
      items: cart,
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
      alert(`¡Estás Offline! Crédito ${invoiceNumber} guardado localmente.`);
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
        alert(`¡Venta a crédito ${invoiceNumber} registrada con éxito!`);
      }
    }
    setProcessing(false);
  };

const handleCheckoutSubmit = async () => {
    if (!currentShift || !currentStoreId) {
      alert("La caja está cerrada.");
      return;
    }

    if (currentStoreCountry && currentStoreCountry.toLowerCase().includes('venezuela') && (!bcvRate || bcvRate <= 0)) {
      alert("No se puede cobrar: la tasa de cambio (BCV) no está configurada o es inválida en este momento. Ve a Ajustes, sincroniza o ingresa la tasa manualmente, y vuelve a intentarlo.");
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

    if (changeCurrencyType === 'PAGO_MOVIL' && pagoMovilRateMode === 'personalizada' && !(parseFloat(pagoMovilCustomRate) > 0)) {
      alert("Ingresa una tasa personalizada válida para el vuelto por Pago Móvil antes de confirmar.");
      setProcessing(false);
      return;
    }

    const changeRateToUse = (changeCurrencyType === 'PAGO_MOVIL' && pagoMovilRateMode === 'personalizada')
      ? parseFloat(pagoMovilCustomRate)
      : (bcvRate || 1);

    const calculatedChangeUSD = parseFloat((Math.max(0, currentTotalPaidUSD - totalUSD)).toFixed(2));
    const calculatedChangeBs = parseFloat((calculatedChangeUSD * changeRateToUse).toFixed(2));

    // =========================================================================
    // LÓGICA DE VUELTO REAL: Si es Pago Móvil, el efectivo en gaveta NO se toca
    // =========================================================================
    let netCashUsdToRegister = finalCashUSD;
    let netCashBsToRegister = finalCashBs;

    if (calculatedChangeUSD > 0 && currentStoreCountry && currentStoreCountry.toLowerCase().includes('venezuela')) {
      if (changeCurrencyType === 'BS') {
        // Salió efectivo físico en Bs de la gaveta
        netCashBsToRegister = Math.max(0, finalCashBs - calculatedChangeBs);
      } else if (changeCurrencyType === 'USD') {
        // Salió efectivo físico en USD de la gaveta
        netCashUsdToRegister = Math.max(0, finalCashUSD - calculatedChangeUSD);
      }
      // NOTA: Si changeCurrencyType === 'PAGO_MOVIL', NO se descuenta nada de gaveta física.
      // Los $10 USD entran íntegros al conteo físico.
    }

    const paymentDetails = {
      cash_usd: netCashUsdToRegister,
      cash_bs: netCashBsToRegister,
      raw_cash_usd: finalCashUSD,
      raw_cash_bs: finalCashBs,
      pago_movil: finalPagoMovil,
      zelle: finalZelle,
      debit: finalDebit,
      reference: paymentRef,
      change_usd: calculatedChangeUSD,
      change_bs: calculatedChangeBs,
      change_currency_type: changeCurrencyType || 'USD',
      change_rate_used: changeRateToUse,
      applied_bcv_rate: bcvRate,
      client_document: clientDocToSave
    };

    if (settlingSale) {
      const currentDebt = settlingSale.balance_due_usd || settlingSale.total_usd;
      const netPaidForDebt = Math.min(currentTotalPaidUSD, currentDebt);
      const newBalanceDue = parseFloat((currentDebt - netPaidForDebt).toFixed(2));
      const isFullyPaid = newBalanceDue <= 0.01;
      const updatedStatus = isFullyPaid ? 'completed' : 'credit';

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
        alert("Error al procesar abono: " + error.message);
      } else {
        alert(isFullyPaid ? "¡Crédito pagado por completo!" : `¡Abono registrado! Saldo pendiente: $${newBalanceDue.toFixed(2)}`);
        setSettlingSale(null);
        setShowPaymentModal(false);
        setPayCashUSD(''); setPayCashBs(''); setPayPagoMovil(''); setPayZelle(''); setPayDebit(''); setPaymentRef('');
        setCalcPayments({ cashUSD: 0, cashBs: 0, pagoMovil: 0, zelle: 0, debit: 0 });
        fetchSales(currentStoreId);
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

      const invoiceNumber = await getNextInvoiceNumber(currentStoreId);

      const saleData = {
        invoice_number: invoiceNumber,
        total_usd: totalUSD, 
        total_bs: totalBs, 
        subtotal_usd: cartSubtotalUSD, 
        tax_usd: calculatedTaxUSD,
        items: cart,
        client_name: selectedClient, 
        status: finalStatus, 
        balance_due_usd: newBalanceDue,
        shift_id: currentShift.id, 
        store_id: currentStoreId, 
        payment_details: paymentDetails
      };

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
        alert(newBalanceDue > 0 ? `¡Venta ${invoiceNumber} registrada con crédito pendiente!` : `¡Venta ${invoiceNumber} procesada con éxito!`);
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

  

  const handlePrintZReport = () => {
  if (!selectedShiftReport) return;
  const printWindow = window.open('', '_blank', 'width=400,height=600');
  if (!printWindow) return;

  const shiftSales = (typeof sales !== 'undefined' ? sales : []).filter(sale => sale.shift_id === selectedShiftReport.id && sale.status === 'completed');
  const emp = (typeof employees !== 'undefined' ? employees : []).find(e => e.id === selectedShiftReport.user_id) || { full_name: 'Cajero' };
  const reg = (typeof registers !== 'undefined' ? registers : []).find(r => r.id === selectedShiftReport.register_id) || { name: 'Caja Principal' };

  let tUsd = 0, tBs = 0, tZelle = 0, tDebit = 0, tPm = 0;
  shiftSales.forEach(s => {
    tUsd += (s.payment_details?.cash_usd || 0);
    tBs += (s.payment_details?.cash_bs || 0);
    tZelle += (s.payment_details?.zelle || 0);
    tDebit += (s.payment_details?.debit_bs || 0);
    tPm += (s.payment_details?.pago_movil_bs || 0);
  });

  const salesHtml = shiftSales.map(sale => `
    <tr>
      <td>${sale.invoice_number || `A-${String(sale.id).padStart(3, '0')}`}</td>
      <td>$${Number(sale.total_usd).toFixed(2)}</td>
    </tr>
  `).join('');

  const html = `
    <html>
      <head>
        <title>Reporte Z - ${new Date(selectedShiftReport.opened_at).toLocaleDateString()}</title>
        <style>
          body { font-family: 'Courier New', monospace; padding: 15px; color: #000; width: 280px; margin: 0 auto; background: #fff; }
          h3, p { text-align: center; margin: 4px 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11px; }
          th, td { padding: 4px 0; border-bottom: 1px dashed #ccc; text-align: left; }
          th:last-child, td:last-child { text-align: right; }
          .section-title { font-weight: bold; margin-top: 15px; border-bottom: 1px dashed #000; padding-bottom: 3px; font-size: 12px; }
        </style>
      </head>
      <body>
        <h3>REPORTE Z (Cierre)</h3>
        <p>Caja: ${reg.name}</p>
        <p>Cajero: ${emp.full_name}</p>
        <p>Apertura: ${new Date(selectedShiftReport.opened_at).toLocaleString()}</p>
        <p>Cierre: ${selectedShiftReport.closed_at ? new Date(selectedShiftReport.closed_at).toLocaleString() : 'En curso'}</p>
        
        <div class="section-title">DESGLOSE DE INGRESOS</div>
        <table>
          <tr><td>Fondo Inicial:</td><td>$${Number(selectedShiftReport.opening_float_usd || 0).toFixed(2)}</td></tr>
          <tr><td>Efectivo USD:</td><td>$${tUsd.toFixed(2)}</td></tr>
          <tr><td>Zelle:</td><td>$${tZelle.toFixed(2)}</td></tr>
          <tr><td>Punto Venta:</td><td>Bs. ${tDebit.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Pago Móvil:</td><td>Bs. ${tPm.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
          <tr><td>Efectivo Bs:</td><td>Bs. ${tBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</td></tr>
        </table>

        <div class="section-title">VENTAS DEL TURNO (${shiftSales.length})</div>
        <table>
          <thead><tr><th>Factura</th><th>Total USD</th></tr></thead>
          <tbody>${salesHtml || '<tr><td colspan="2">Sin ventas registradas</td></tr>'}</tbody>
        </table>
        
        <p style="text-align: center; margin-top: 30px; font-size: 10px;">________________________</p>
        <p style="text-align: center; margin-top: 5px; font-size: 10px;">Firma del Cajero</p>
        
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `;
  printWindow.document.write(html);
  printWindow.document.close();
};

  const getNextInvoiceNumber = async (storeId) => {
    if (!storeId) return 'A-001';
    try {
      if (navigator.onLine) {
        const { data, error } = await supabase
          .from('sales')
          .select('invoice_number')
          .eq('store_id', storeId)
          .not('invoice_number', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
          
        let nextSeq = 1;
        if (!error && data && data.invoice_number) {
          const parts = data.invoice_number.split('-');
          if (parts.length === 2) {
            const currentNum = parseInt(parts[1], 10);
            if (!isNaN(currentNum)) {
              nextSeq = currentNum + 1;
            }
          }
        }
        return `A-${String(nextSeq).padStart(3, '0')}`;
      } else {
        const storeSales = sales.filter(s => String(s.store_id) === String(storeId));
        let maxNum = 0;
        storeSales.forEach(s => {
          if (s.invoice_number && s.invoice_number.startsWith('A-')) {
            const num = parseInt(s.invoice_number.split('-')[1], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        });
        return `A-${String(maxNum + 1).padStart(3, '0')}`;
      }
    } catch (e) {
      console.warn("Error calculando correlativo:", e);
    }
    return `A-${Date.now().toString().slice(-4)}`;
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
  const shiftZelle = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.zelle || 0), 0);
  const shiftPagoMovilBs = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.pago_movil || 0), 0);
  const shiftDebitBs = currentShiftSales.reduce((sum, s) => sum + (s.payment_details?.debit || 0), 0);


// Efectivo USD en gaveta (Descuenta el vuelto incluso si no se recibió efectivo USD en esa venta)
  const shiftCashUSD = currentShiftSales.reduce((sum, s) => {
    const pd = s.payment_details || {};
    const cashIn = Number(pd.raw_cash_usd !== undefined ? pd.raw_cash_usd : (pd.cash_usd || 0));
    const changeOut = (!pd.change_currency_type || pd.change_currency_type === 'USD') ? Number(pd.change_usd || 0) : 0;
    return sum + (cashIn - changeOut); 
  }, 0);;

// Efectivo Bs en gaveta (Descuenta el vuelto en Bs físicos incluso si se pagó solo en Dólares)
  // Efectivo Bs en gaveta física (SOLO resta si el vuelto se entregó en billetes físicos de Bs)
  const shiftCashBs = currentShiftSales.reduce((sum, s) => {
    const pd = s.payment_details || {};
    const cashIn = Number(pd.raw_cash_bs !== undefined ? pd.raw_cash_bs : (pd.cash_bs || 0));
    
    // Si el vuelto fue en Pago Móvil, NO se resta de la gaveta física
    let changeOutPhysicalBs = 0;
    if (pd.change_currency_type === 'BS') {
      changeOutPhysicalBs = Number(pd.change_bs || 0);
    }
    return sum + (cashIn - changeOutPhysicalBs);
  }, 0);

  // NUEVO: Total de Egresos del Banco (Vueltos pagados por Pago Móvil a tasa del comercio)
  const shiftChangePagoMovilBs = currentShiftSales.reduce((sum, s) => {
    const pd = s.payment_details || {};
    return sum + (pd.change_currency_type === 'PAGO_MOVIL' ? Number(pd.change_bs || 0) : 0);
  }, 0);

  const shiftChangePagoMovilUSD = currentShiftSales.reduce((sum, s) => {
    const pd = s.payment_details || {};
    return sum + (pd.change_currency_type === 'PAGO_MOVIL' ? Number(pd.change_usd || 0) : 0);
  }, 0);

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
    // Obtenemos los IDs de comercios que sean DEMO para ignorarlos
    const demoStoreIds = adminStores.filter(s => s.is_demo).map(s => s.id);

    // Solo sumamos ingresos de comercios REALES
    const totalIncome = saasTransactions
      .filter(t => t.type === 'income' && !demoStoreIds.includes(t.store_id))
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const totalExpenses = saasTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + parseFloat(t.amount), 0);

    const netProfit = totalIncome - totalExpenses;
    const totalPendingComm = systemVendors.reduce((sum, v) => sum + (parseFloat(v.pending_balance) || 0), 0);
    return { totalIncome, totalExpenses, netProfit, totalPendingComm };
  };

// =================== FIN DEL BLOQUE 3 ===================

// --- PANTALLA DE NUEVA CONTRASEÑA (DESDE EL CORREO) ---
  if (isRecoveringPassword) {
    return (
      <div className="fiskal-login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', background: '#f8f9fa', padding: '20px', boxSizing: 'border-box' }}>
        <div className="product-form-card" style={{ width: '400px', maxWidth: '100%', padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', background: '#fff', borderRadius: '8px', textAlign: 'center' }}>
          <h2 style={{ marginBottom: '8px', color: '#111827', fontSize: '20px', fontWeight: '900' }}>Nueva Contraseña</h2>
          <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '24px' }}>Ingresa tu nueva contraseña para acceder a Fiskal.</p>
          
          <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <input 
              type="password" 
              value={newPassword} 
              onChange={e => setNewPassword(e.target.value)} 
              placeholder="Mínimo 6 caracteres" 
              style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '14px', outline: 'none' }}
              required 
              minLength={6}
              autoFocus
            />
            <button 
              type="submit" 
              disabled={updatingPassword}
              style={{ width: '100%', padding: '14px', background: '#111827', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: '800', cursor: 'pointer', fontSize: '14px' }}
            >
              {updatingPassword ? 'Actualizando...' : 'Guardar Nueva Contraseña'}
            </button>
          </form>
        </div>
      </div>
    );
  }

if (!session) {
    return (
      <div className="fiskal-login-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', width: '100%', background: '#f8f9fa', padding: '20px', boxSizing: 'border-box' }}>
        <div className="product-form-card" style={{ width: '400px', maxWidth: '100%', padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', background: '#fff', borderRadius: '8px' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <img src={logoDark} alt="Fiskal Logo" style={{ height: '38px', objectFit: 'contain', marginBottom: '4px' }} />
            <p style={{ fontSize: '13px', color: '#6c757d', margin: 0 }}>Sistema de Gestión Comercial y POS</p>
          </div>

          {authError && (
            <div style={{ background: '#ffe3e3', color: '#c92a2a', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="fiskal-form">
            <div className="form-group" style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#495057' }}>Correo Electrónico</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#adb5bd' }} />
                <input 
                  type="email" 
                  value={authEmail} 
                  onChange={(e) => setAuthEmail(e.target.value)} 
                  placeholder="tu@correo.com" 
                  style={{ paddingLeft: '34px', width: '100%', padding: '10px 10px 10px 34px', border: '1px solid #ced4da', borderRadius: '4px', outline: 'none' }}
                  required 
                />
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', marginBottom: '6px', color: '#495057' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <Key size={16} style={{ position: 'absolute', left: '10px', top: '11px', color: '#adb5bd' }} />
                <input 
                  type="password" 
                  value={authPassword} 
                  onChange={(e) => setAuthPassword(e.target.value)} 
                  placeholder="••••••••" 
                  style={{ paddingLeft: '34px', width: '100%', padding: '10px 10px 10px 34px', border: '1px solid #ced4da', borderRadius: '4px', outline: 'none' }}
                  required 
                />
              </div>
            </div>
            
            <button type="submit" className="btn-primary" style={{ width: '100%', padding: '12px', fontSize: '15px', background: '#212529', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }} disabled={authLoading}>
              {authLoading ? 'Procesando...' : 'Iniciar Sesión'}
            </button>
          </form>

          {/* Enlaces de registro y recuperación de contraseña */}
          <div style={{ textAlign: 'center', marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a 
              href="https://wa.me/584245013484?text=Hola,%20estoy%20interesado%20en%20adquirir%20una%20cuenta%20para%20el%20sistema%20Fiskal." 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ color: '#1c7ed6', fontSize: '13px', textDecoration: 'none', fontWeight: '500' }}
            >
              ¿Eres dueño de un negocio? Regístrate aquí
            </a>

            <button 
              type="button"
              onClick={() => { setShowForgotPassword(!showForgotPassword); setResetMessage(''); }}
              style={{ background: 'none', border: 'none', color: '#6c757d', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}
            >
              ¿Olvidaste tu contraseña?
            </button>

            {showForgotPassword && (
              <form onSubmit={handleForgotPasswordSubmit} style={{ marginTop: '10px', background: '#f8f9fa', padding: '14px', borderRadius: '8px', border: '1px solid #dee2e6', textAlign: 'left' }}>
                <p style={{ fontSize: '12px', color: '#495057', marginBottom: '8px', fontWeight: 'bold' }}>Recuperar Contraseña:</p>
                <input 
                  type="email" 
                  value={resetEmail} 
                  onChange={e => setResetEmail(e.target.value)} 
                  placeholder="Ingresa tu correo..." 
                  style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', marginBottom: '8px', outline: 'none' }}
                  required 
                />
                {resetMessage && (
                  <p style={{ fontSize: '11px', color: resetMessage.includes('Error') ? '#c92a2a' : '#2b8a3e', marginBottom: '8px', lineHeight: '1.4' }}>
                    {resetMessage}
                  </p>
                )}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button type="button" onClick={() => setShowForgotPassword(false)} style={{ flex: 1, padding: '6px', background: '#fff', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '11px', cursor: 'pointer' }}>
                    Cerrar
                  </button>
                  <button type="submit" disabled={resetLoading} style={{ flex: 2, padding: '6px', background: '#212529', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', fontWeight: 'bold' }}>
                    {resetLoading ? 'Enviando...' : 'Enviar Correo'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '12px', color: '#6c757d' }}>
          © 2026 Fiskal. Desarrollado por <a href="https://wa.me/50764749094?text=Hola,%20me%20gustaría%20más%20información%20sobre%20sus%20servicios." target="_blank" rel="noopener noreferrer" style={{ color: '#1c7ed6', textDecoration: 'none', fontWeight: 'bold' }}>KunstonAgency</a>
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
          
          <button className={activeTab === 'cash' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { 
            e.stopPropagation(); 
            setActiveTab('cash'); 
            setIsSidebarExpanded(false); 
            if (navigator.onLine && currentStoreId) {
              supabase.from('shifts')
                .select('*')
                .eq('store_id', currentStoreId)
                .eq('status', 'closed')
                .order('closed_at', { ascending: false })
                .limit(20)
                .then(({ data }) => { if (data) setPastShifts(data); });
            }
          }}>
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
          
          {currentStoreKronoEnabled && (
            <button className={activeTab === 'delivery' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('delivery'); setIsSidebarExpanded(false); }}>
              <MapPin size={20} /> <span>Delivery Krono</span>
            </button>
          )}

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

          {currentStoreType === 'restaurant' && (
            <button 
              className={activeTab === 'recipes' ? 'nav-btn active' : 'nav-btn'} 
              onClick={(e) => { e.stopPropagation(); setActiveTab('recipes'); setIsSidebarExpanded(false); }}
              style={{ color: '#16a34a', fontWeight: 'bold' }}
            >
              <ChefHat size={20} /> <span>Costos & Recetas</span>
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
             activeTab === 'delivery' ? 'Dashboard de Delivery Krono' :
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
            
            <div className="exchange-rate-badge" style={{ position: 'relative' }}>
              <div 
                onClick={() => {
                  setTempRateType(rateType);
                  setTempCustomRate(customRateInput);
                  setShowRateDropdown(!showRateDropdown);
                }} 
                style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                title="Clic para cambiar tipo de tasa"
              >
                <span>
                  {rateType === 'BCV' ? 'Dólar BCV' : rateType === 'EUR' ? 'Euro BCV' : 'Tasa Manual'}: 
                  <strong> Bs. {bcvRate ? bcvRate.toFixed(2) : '---'}</strong>
                </span>
                <span style={{ fontSize: '10px' }}>▼</span>
              </div>

              <button 
                className={`btn-sync ${loadingRate ? 'spinning' : ''}`} 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  syncRate(rateType, currentStoreId, rateType === 'CUSTOM' ? customRateInput : null); 
                }} 
                title="Sincronizar tasa actual"
              >
                <RefreshCw size={14} />
              </button>
              
              {lastSync && <span className="sync-time">{lastSync}</span>}

              {showRateDropdown && (
                <div style={{ position: 'absolute', top: 'calc(100% + 5px)', right: '0', background: '#ffffff', border: '1px solid #ced4da', borderRadius: '8px', padding: '14px', boxShadow: '0 8px 16px rgba(0,0,0,0.15)', zIndex: 9999, width: '250px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 'bold', color: '#495057', margin: 0 }}>Seleccionar Tipo de Tasa:</label>
                  <select 
                    value={tempRateType}
                    onChange={(e) => setTempRateType(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', fontSize: '13px', outline: 'none' }}
                  >
                    <option value="BCV">Dólar Oficial BCV (Automático)</option>
                    <option value="EUR">Euro Oficial BCV (Automático)</option>
                    <option value="CUSTOM">Tasa Personalizada / Redondeo</option>
                  </select>

                  {tempRateType === 'CUSTOM' && (
                    <div style={{ marginTop: '2px' }}>
                      <label style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', display: 'block' }}>Valor personalizado (Bs.):</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        value={tempCustomRate} 
                        onChange={(e) => setTempCustomRate(e.target.value)} 
                        placeholder="Ej. 45.00" 
                        style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #1c7ed6', fontSize: '14px', outline: 'none', fontWeight: 'bold' }}
                        autoFocus
                      />
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                    <button 
                      type="button"
                      onClick={() => setShowRateDropdown(false)}
                      style={{ flex: 1, padding: '8px', background: '#f1f3f5', border: '1px solid #ced4da', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold', color: '#495057' }}
                    >
                      Cancelar
                    </button>
                    <button 
                      type="button"
                      onClick={() => {
                        setRateType(tempRateType);
                        setCustomRateInput(tempCustomRate);
                        localStorage.setItem('fiskal_rate_type', tempRateType);
                        localStorage.setItem('fiskal_custom_rate', tempCustomRate);
                        
                        setShowRateDropdown(false);
                        
                        if (tempRateType === 'CUSTOM') {
                          syncRate('CUSTOM', currentStoreId, tempCustomRate);
                        } else {
                          syncRate(tempRateType, currentStoreId);
                        }
                      }}
                      style={{ flex: 1, padding: '8px', background: '#2b8a3e', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
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
  <PosTerminalView 
    currentStoreType={currentStoreType}
    barcodeInput={barcodeInput}
    setBarcodeInput={setBarcodeInput}
    handleBarcodeSubmit={handleBarcodeSubmit}
    barcodeInputRef={barcodeInputRef}
    startCameraScanner={startCameraScanner}
    productSearchQuery={productSearchQuery}
    setProductSearchQuery={setProductSearchQuery}
    currentShift={currentShift}
    products={products}
    filteredProductsForCatalog={filteredProductsForCatalog}
    selectedRestaurantCategory={selectedRestaurantCategory}
    setSelectedRestaurantCategory={setSelectedRestaurantCategory}
    handleOpenModifierModal={handleOpenModifierModal}
    handleOpenWeightModal={handleOpenWeightModal}
    addToCart={addToCart}
    selectedClient={selectedClient}
    setSelectedClient={setSelectedClient}
    clientSearchQuery={clientSearchQuery}
    handleClientSearchChange={handleClientSearchChange}
    setClientSearchQuery={setClientSearchQuery}
    filteredClientsForPOS={filteredClientsForPOS}
    setQuickDocInput={setQuickDocInput}
    setClientDoc={setClientDoc}
    setShowQuickClientModal={setShowQuickClientModal}
    cart={cart}
    updateQuantity={updateQuantity}
    removeFromCart={removeFromCart}
    currentStoreTaxEnabled={currentStoreTaxEnabled}
    currentStoreTaxRate={currentStoreTaxRate}
    cartSubtotalUSD={cartSubtotalUSD}
    calculatedTaxUSD={calculatedTaxUSD}
    totalUSD={totalUSD}
    totalBs={totalBs}
    currentStoreCountry={currentStoreCountry}
    handleHoldOrder={handleHoldOrder}
    processing={processing}
    setSettlingSale={setSettlingSale}
    setShowPaymentModal={setShowPaymentModal}
  />
)}

{activeTab === 'vendor_portal' && currentUserRole === 'system_vendor' && (
  <VendorPortalView 
    globalPromoDiscount={globalPromoDiscount}
    handleVendorRegisterStoreSubmit={handleVendorRegisterStoreSubmit}
    vendorStoreName={vendorStoreName}
    setVendorStoreName={setVendorStoreName}
    vendorStoreRif={vendorStoreRif}
    setVendorStoreRif={setVendorStoreRif}
    vendorNewStoreType={vendorNewStoreType}
    setVendorNewStoreType={setVendorNewStoreType}
    vendorStoreCountry={vendorStoreCountry}
    setVendorStoreCountry={setVendorStoreCountry}
    vendorOwnerName={vendorOwnerName}
    setVendorOwnerName={setVendorOwnerName}
    vendorOwnerPhone={vendorOwnerPhone}
    setVendorOwnerPhone={setVendorOwnerPhone}
    vendorOwnerEmail={vendorOwnerEmail}
    setVendorOwnerEmail={setVendorOwnerEmail}
    vendorPaidAdvance={vendorPaidAdvance}
    setVendorPaidAdvance={setVendorPaidAdvance}
    getCalculatedMonthlyPrice={getCalculatedMonthlyPrice}
    baseMonthlyPrice={baseMonthlyPrice}
  />
)}

{activeTab === 'admin' && currentUserRole === 'super_admin' && (
  <AdminMasterView
    bcvRate={bcvRate}
    saasTransactions={saasTransactions}
    currentStoreType={currentStoreType}
    setCurrentStoreType={setCurrentStoreType}
    getSystemFinancials={getSystemFinancials}
    baseMonthlyPrice={baseMonthlyPrice}
    setBaseMonthlyPrice={setBaseMonthlyPrice}
    globalPromoDiscount={globalPromoDiscount}
    setGlobalPromoDiscount={setGlobalPromoDiscount}
    handleSaveSaasSettings={handleSaveSaasSettings}
    savingSettings={savingSettings}
    getCalculatedMonthlyPrice={getCalculatedMonthlyPrice}
    systemVendors={systemVendors}
    adminStores={adminStores}
    fetchAdminStores={fetchAdminStores}
    handlePayVendor={handlePayVendor}
    editingStore={editingStore}
    resetStoreForm={resetStoreForm}
    handleSaveStore={handleSaveStore}
    storeName={storeName}
    setStoreName={setStoreName}
    storeRif={storeRif}
    setStoreRif={setStoreRif}
    newStoreType={newStoreType}
    setNewStoreType={setNewStoreType}
    storeCountry={storeCountry}
    setStoreCountry={setStoreCountry}
    ownerName={ownerName}
    setOwnerName={setOwnerName}
    ownerDoc={ownerDoc}
    setOwnerDoc={setOwnerDoc}
    storePhone={storePhone}
    setStorePhone={setStorePhone}
    storeEmail={storeEmail}
    setStoreEmail={setStoreEmail}
    storeAddress={storeAddress}
    setStoreAddress={setStoreAddress}
    storeCity={storeCity}
    handleCityChange={handleCityChange}
    storeState={storeState}
    storeCustomDiscount={storeCustomDiscount}
    setStoreCustomDiscount={setStoreCustomDiscount}
    storePaidAdvance={storePaidAdvance}
    setStorePaidAdvance={setStorePaidAdvance}
    handleCreateSystemVendor={handleCreateSystemVendor}
    creatingVendor={creatingVendor}
    newVendorName={newVendorName}
    setNewVendorName={setNewVendorName}
    newVendorEmail={newVendorEmail}
    setNewVendorEmail={setNewVendorEmail}
    newVendorPhone={newVendorPhone}
    setNewVendorPhone={setNewVendorPhone}
    sendStoreRenewalWhatsApp={sendStoreRenewalWhatsApp}
    handleRenewSubscription={handleRenewSubscription}
    handleOpenPreInvoice={handleOpenPreInvoice}
    handleOpenOwnerModal={handleOpenOwnerModal}
    handleStartEditStore={handleStartEditStore}
    handleToggleKrono={handleToggleKrono}
    storeIsDemo={storeIsDemo}
    setStoreIsDemo={setStoreIsDemo}
    handleToggleDemo={handleToggleDemo}
    handleDeleteStore={handleDeleteStore}
  />
)}

{activeTab === 'cash' && (
  <CashShiftsView 
    shiftChangePagoMovilBs={shiftChangePagoMovilBs}
    shiftChangePagoMovilUSD={shiftChangePagoMovilUSD}
    currentShift={currentShift}
    getCurrentRegisterName={getCurrentRegisterName}
    setShowCloseShiftModal={setShowCloseShiftModal}
    currentStoreCountry={currentStoreCountry}
    shiftCashUSD={shiftCashUSD}
    shiftCashBs={shiftCashBs}
    shiftZelle={shiftZelle}
    shiftPagoMovilBs={shiftPagoMovilBs}
    shiftDebitBs={shiftDebitBs}
    setShowOpenShiftModal={setShowOpenShiftModal}
    pastShifts={pastShifts}
    registers={registers}
    employees={employees}
    sales={sales}
    setSelectedShiftReport={setSelectedShiftReport}
    setShowShiftReportModal={setShowShiftReportModal}
  />
)}

{activeTab === 'history' && (
  <SalesHistoryView 
    filteredSales={filteredSales}
    historyFilterType={historyFilterType}
    setHistoryFilterType={setHistoryFilterType}
    historyCustomDate={historyCustomDate}
    setHistoryCustomDate={setHistoryCustomDate}
    handleResumeOrder={handleResumeOrder}
    handleStartSettleCredit={handleStartSettleCredit}
    sendWhatsAppReminder={sendWhatsAppReminder}
    handleViewInvoice={handleViewInvoice}
    currentUserRole={currentUserRole}
    currentStoreId={currentStoreId}
    setSales={setSales}
  />
)}

{activeTab === 'clients' && (
  <ClientsView 
    clientName={clientName}
    setClientName={setClientName}
    clientDoc={clientDoc}
    setClientDoc={setClientDoc}
    clientPhone={clientPhone}
    setClientPhone={setClientPhone}
    clientEmail={clientEmail}
    setClientEmail={setClientEmail}
    handleAddClient={handleAddClient}
    loadingClient={loadingClient}
    clientFilterTab={clientFilterTab}
    setClientFilterTab={setClientFilterTab}
    clientsWithMetrics={clientsWithMetrics}
    getFilteredClientsByTab={getFilteredClientsByTab}
    handleOpenClientDetail={handleOpenClientDetail}
    sendClientGeneralWhatsApp={sendClientGeneralWhatsApp}
    currentUserRole={currentUserRole}
    handleDeleteClient={handleDeleteClient}
  />
)}

{activeTab === 'products' && (
  <ProductsView 
    handleDuplicateProduct={handleDuplicateProduct}
    editingProduct={editingProduct}
    currentStoreType={currentStoreType}
    handleUpdateProduct={handleUpdateProduct}
    handleAddProduct={handleAddProduct}
    imagePreview={imagePreview}
    handleImageSelect={handleImageSelect}
    name={name}
    setName={setName}
    barcode={barcode}
    setBarcode={setBarcode}
    price={price}
    setPrice={setPrice}
    stock={stock}
    setStock={setStock}
    category={category}
    setCategory={setCategory}
    products={products}
    productModifiers={productModifiers}
    setProductModifiers={setProductModifiers}
    newModifierText={newModifierText}
    setNewModifierText={setNewModifierText}
    addProductModifierTag={addProductModifierTag}
    removeProductModifierTag={removeProductModifierTag}
    currentStoreKronoEnabled={currentStoreKronoEnabled}
    showInKrono={showInKrono}
    setShowInKrono={setShowInKrono}
    kronoPrice={kronoPrice}
    setKronoPrice={setKronoPrice}
    resetProductForm={resetProductForm}
    loading={loading}
    setShowPrintCatalog={setShowPrintCatalog}
    handleOpenLabel={handleOpenLabel}
    handleStartEditProduct={handleStartEditProduct}
    handleDeleteProduct={handleDeleteProduct}
    productExtras={productExtras}
    setProductExtras={setProductExtras}
    newExtraName={newExtraName}
    setNewExtraName={setNewExtraName}
    newExtraPrice={newExtraPrice}
    setNewExtraPrice={setNewExtraPrice}
  />
)}

{activeTab === 'recipes' && currentStoreType === 'restaurant' && (
            <RecipesCostView 
              currentStoreId={currentStoreId}
              products={products}
              fetchProducts={fetchProducts}
              bcvRate={bcvRate}
            />
          )}

{activeTab === 'settings' && (currentUserRole === 'owner' || currentUserRole === 'super_admin' || currentUserRole === 'system_vendor') && (
            <SettingsView 
              currentStoreRif={currentStoreRif}
              setCurrentStoreRif={setCurrentStoreRif}
              currentStoreAddress={currentStoreAddress}
              setCurrentStoreAddress={setCurrentStoreAddress}
              currentStoreCountry={currentStoreCountry}
              currentStoreTaxEnabled={currentStoreTaxEnabled}
              setCurrentStoreTaxEnabled={setCurrentStoreTaxEnabled}
              currentStoreTaxRate={currentStoreTaxRate}
              setCurrentStoreTaxRate={setCurrentStoreTaxRate}
              currentStoreTaxInclusive={currentStoreTaxInclusive}
              setCurrentStoreTaxInclusive={setCurrentStoreTaxInclusive}
              handleSaveFiscalSettings={handleSaveFiscalSettings}
              savingFiscal={savingFiscal}
              currentStoreLat={currentStoreLat}
              setCurrentStoreLat={setCurrentStoreLat}
              currentStoreLng={currentStoreLng}
              setCurrentStoreLng={setCurrentStoreLng}
              handleGetLocation={handleGetLocation}
              newEmpName={newEmpName}
              setNewEmpName={setNewEmpName}
              newEmpEmail={newEmpEmail}
              setNewEmpEmail={setNewEmpEmail}
              newEmpPass={newEmpPass}
              setNewEmpPass={setNewEmpPass}
              handleCreateEmployee={handleCreateEmployee}
              creatingEmployee={creatingEmployee}
              employees={employees}
              newRegisterName={newRegisterName}
              setNewRegisterName={setNewRegisterName}
              isMainRegister={isMainRegister}
              setIsMainRegister={setIsMainRegister}
              handleAddRegister={handleAddRegister}
              registers={registers}
              handleDeleteRegister={handleDeleteRegister}
              clientes={clientes}
              clienteSeleccionado={clienteSeleccionado}
              setClienteSeleccionado={setClienteSeleccionado}
              productos={productos}
              productoSeleccionado={productoSeleccionado}
              setProductoSeleccionado={setProductoSeleccionado}
              mostrarNuevaPlantilla={mostrarNuevaPlantilla}
              setMostrarNuevaPlantilla={setMostrarNuevaPlantilla}
              nombreNuevaPlantilla={nombreNuevaPlantilla}
              setNombreNuevaPlantilla={setNombreNuevaPlantilla}
              handleCrearPlantilla={handleCrearPlantilla}
              plantillaActiva={plantillaActiva}
              setPlantillaActiva={setPlantillaActiva}
              plantillas={plantillas}
              setPlantillas={setPlantillas}
              insertarVariable={insertarVariable}
              textareaRef={textareaRef}
              handleGuardarPlantillas={handleGuardarPlantillas}
              handleEnviarWhatsApp={handleEnviarWhatsApp}
              kdsBanners={currentStoreKdsBanners}
              handleUploadKdsBanner={handleUploadKdsBanner}
              handleDeleteKdsBanner={handleDeleteKdsBanner}
              uploadingBanner={uploadingBanner}
              currentStoreType={currentStoreType}
            />
          )}

{activeTab === 'delivery' && currentStoreKronoEnabled && (
 <DeliveryDashboard storeId={currentStoreId} isOnline={isOnline} bcvRate={bcvRate} />
)}

{activeTab === 'kds' && (
  <KitchenDashboard 
  sales={sales} 
  setSales={setSales} 
  currentStoreId={currentStoreId}
  currentStoreName={currentStoreName}
  kdsBanners={currentStoreKdsBanners}
/>
)}
        </section>
      </main>

{/* ========================================================================== */}
      {/*                           MODALES GLOBALES                                 */}
      {/* ========================================================================== */}


      {/* -------------------------------------------------------------------------- */}
      {/* GRUPO 1: OPERACIONES DE VENTA Y POS                                       */}
      {/* -------------------------------------------------------------------------- */}

{/* 1.1 MODAL: PERSONALIZAR PLATILLO (CON EXTRAS Y PRECIOS) */}
      {showModifierModal && productForModifiers && (
        <div className="modal-overlay" style={{ zIndex: 10006 }}>
          <div className="modal-content" style={{ width: '430px', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #f1f3f5' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>
                Personalizar: {productForModifiers.name}
              </h3>
              <button className="btn-close-modal" onClick={() => setShowModifierModal(false)}>
                <X size={18} color="#6b7280" />
              </button>
            </div>
            
            <div className="modal-body fiskal-form" style={{ padding: '20px', maxHeight: '70vh', overflowY: 'auto' }}>
              
              {/* SECCIÓN 1: INGREDIENTES BASE (CON TODO) */}
              <div style={{ marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                  Ingredientes Base (Desmarca para quitar)
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fafafa', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', fontWeight: '700', color: '#16a34a' }}>
                    <input type="checkbox" checked={true} disabled style={{ width: '16px', height: '16px' }} />
                    Con todo (Base incluida)
                  </label>
                  <hr style={{ border: '0', borderTop: '1px dashed #e5e7eb', margin: '2px 0' }} />
                  
                  {Object.keys(dynamicToggles).map((modName, idx) => (
                    <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', color: '#374151' }}>
                      <input 
                        type="checkbox" 
                        checked={dynamicToggles[modName]} 
                        onChange={(e) => setDynamicToggles({ ...dynamicToggles, [modName]: e.target.checked })} 
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                      />
                      {modName}
                    </label>
                  ))}
                </div>
              </div>

              {/* SECCIÓN 2: EXTRAS / ADICIONALES CON PRECIO (DESMARCADOS POR DEFECTO) */}
              {(() => {
                let availableExtras = [];
                if (productForModifiers.extras) {
                  try {
                    availableExtras = typeof productForModifiers.extras === 'string' ? JSON.parse(productForModifiers.extras) : productForModifiers.extras;
                  } catch(e) { availableExtras = []; }
                }

                if (availableExtras.length === 0) return null;

                return (
                  <div style={{ marginBottom: '16px' }}>
                    <span style={{ fontSize: '11px', color: '#111827', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: '8px' }}>
                      ⭐ Adicionales / Extras (Opcionales con costo)
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#f9fafb', padding: '12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                      {availableExtras.map((ex, idx) => {
                        const isChecked = !!selectedExtrasToggles[ex.name];
                        return (
                          <label key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', padding: '4px 0' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <input 
                                type="checkbox" 
                                checked={isChecked} 
                                onChange={(e) => setSelectedExtrasToggles({ ...selectedExtrasToggles, [ex.name]: e.target.checked })} 
                                style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                              />
                              <span style={{ fontSize: '13px', fontWeight: isChecked ? '700' : '500', color: isChecked ? '#111827' : '#4b5563' }}>
                                + {ex.name}
                              </span>
                            </div>
                            <strong style={{ fontSize: '13px', color: '#16a34a' }}>
                              +${Number(ex.price).toFixed(2)}
                            </strong>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* SECCIÓN 3: PARA LLEVAR */}
              <div style={{ background: '#f9fafb', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '13px', fontWeight: '700', color: '#111827', margin: 0 }}>
                  <input 
                    type="checkbox" 
                    checked={isParaLlevar} 
                    onChange={(e) => setIsParaLlevar(e.target.checked)} 
                    style={{ width: '16px', height: '16px', cursor: 'pointer' }} 
                  />
                  📦 Empacar Para Llevar
                </label>
              </div>

              {/* RESUMEN DEL PRECIO FINAL EN VIVO */}
              {(() => {
                let availableExtras = [];
                if (productForModifiers.extras) {
                  try {
                    availableExtras = typeof productForModifiers.extras === 'string' ? JSON.parse(productForModifiers.extras) : productForModifiers.extras;
                  } catch(e) { availableExtras = []; }
                }

                let extrasSum = 0;
                availableExtras.forEach(ex => {
                  if (selectedExtrasToggles[ex.name]) extrasSum += (parseFloat(ex.price) || 0);
                });

                const finalTotal = (productForModifiers.price || 0) + extrasSum;

                return (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', padding: '12px 14px', background: '#f3f4f6', borderRadius: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#4b5563', fontWeight: '600' }}>
                      Precio Base: ${productForModifiers.price.toFixed(2)} {extrasSum > 0 && `(Extras: +$${extrasSum.toFixed(2)})`}
                    </span>
                    <strong style={{ fontSize: '18px', fontWeight: '900', color: '#111827' }}>
                      ${finalTotal.toFixed(2)} USD
                    </strong>
                  </div>
                );
              })()}

            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', padding: '14px 20px', background: '#fafafa', borderTop: '1px solid #f1f3f5' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowModifierModal(false)} style={{ border: '1px solid #d1d5db', color: '#4b5563' }}>
                Cancelar
              </button>
              <button type="button" className="btn-primary" onClick={confirmAddToCartWithModifiers} style={{ background: '#111827', color: '#ffffff', border: 'none', fontWeight: '700', padding: '10px 18px' }}>
                Añadir a la Comanda
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 1.2 MODAL: VENTA POR PESO (BALANZA DIGITAL) */}
      {showWeightModal && productForWeight && (
        <div className="modal-overlay" style={{ zIndex: 10007 }}>
          <div className="modal-content" style={{ width: '380px', textAlign: 'center' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>⚖️ Balanza: {productForWeight.name}</h3>
              <button className="btn-close-modal" onClick={() => setShowWeightModal(false)}>
                <X size={20} />
              </button>
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

      {/* 1.3 MODAL: PASARELA DE COBRO Y PAGOS MIXTOS (MINIMALISTA CON VERDE FISKAL Y ROJO PASTEL) */}
      {showPaymentModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '520px', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 16px 36px rgba(0,0,0,0.12)' }}>
            <div className="modal-header" style={{ borderBottom: '1px solid #f1f3f5', padding: '16px 20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#111827', margin: 0 }}>
                {settlingSale ? 'Abonar / Pagar Crédito' : 'Pasarela de Pagos'}
              </h3>
              <button className="btn-close-modal" onClick={() => { setShowPaymentModal(false); setSettlingSale(null); }}>
                <X size={18} color="#6b7280" />
              </button>
            </div>
            
            <div className="modal-body" style={{ padding: '20px' }}>
              {/* Resumen Total */}
              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <span style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', fontWeight: '800', letterSpacing: '0.5px' }}>Total a Pagar</span>
                <div style={{ textAlign: 'right' }}>
                  <h2 style={{ fontSize: '24px', fontWeight: '900', color: '#111827', margin: 0 }}>${totalUSD.toFixed(2)}</h2>
                  {currentStoreCountry === 'venezuela' && (
                    <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '600' }}>
                      Bs. {totalBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Estado de Pagos con los toques de color precisos */}
              <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                  <span>Total Ingresado:</span>
                  <strong style={{ color: totalPaidUSD >= totalUSD ? '#16a34a' : '#111827' }}>
                    ${totalPaidUSD.toFixed(2)} {currentStoreCountry === 'venezuela' && `(Bs. ${(totalPaidUSD * bcvRate).toFixed(2)})`}
                  </strong>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#4b5563' }}>
                  <span>Restante / Falta:</span>
                  <strong style={{ color: remainingUSD > 0 ? '#e05d5d' : '#9ca3af' }}>
                    ${remainingUSD.toFixed(2)} {currentStoreCountry === 'venezuela' && `(Bs. ${remainingBs.toFixed(2)})`}
                  </strong>
                </div>

                {changeUSD > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', borderTop: '1px dashed #e5e7eb', paddingTop: '8px', marginTop: '2px' }}>
                    <span style={{ fontWeight: '700', color: '#111827' }}>Cambio / Vuelto:</span>
                    <strong style={{ fontSize: '18px', fontWeight: '900', color: '#16a34a' }}>
                      ${changeUSD.toFixed(2)}
                    </strong>
                  </div>
                )}
              </div>

              {/* SELECTOR DE VUELTO / CAMBIO */}
              {changeUSD > 0 && currentStoreCountry === 'venezuela' && (
                <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '800', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
                    ¿Cómo vas a entregar el Vuelto de ${changeUSD.toFixed(2)}?
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', marginBottom: '10px' }}>
                    {[
                      { id: 'USD', label: '💵 Efectivo USD' },
                      { id: 'BS', label: '💵 Efectivo Bs' },
                      { id: 'PAGO_MOVIL', label: '📱 Pago Móvil' }
                    ].map(btn => {
                      const active = changeCurrencyType === btn.id;
                      return (
                        <button
                          key={btn.id}
                          type="button"
                          onClick={() => setChangeCurrencyType(btn.id)}
                          style={{
                            padding: '9px 4px', fontSize: '11px', borderRadius: '6px', fontWeight: '700', cursor: 'pointer',
                            border: active ? '1px solid #111827' : '1px solid #d1d5db',
                            background: active ? '#111827' : '#ffffff',
                            color: active ? '#ffffff' : '#374151',
                            transition: 'all 0.15s'
                          }}
                        >
                          {btn.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* AJUSTES DE TASA PARA PAGO MÓVIL */}
                  {changeCurrencyType === 'PAGO_MOVIL' && (
                    <div style={{ background: '#ffffff', padding: '12px', borderRadius: '6px', border: '1px solid #e5e7eb', marginTop: '8px' }}>
                      <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                        <button
                          type="button"
                          onClick={() => { setPagoMovilRateMode('actual'); setPagoMovilCustomRate(''); }}
                          style={{
                            flex: 1, padding: '7px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', fontWeight: '700',
                            border: pagoMovilRateMode === 'actual' ? '1px solid #111827' : '1px solid #e5e7eb',
                            background: pagoMovilRateMode === 'actual' ? '#111827' : '#f9fafb',
                            color: pagoMovilRateMode === 'actual' ? '#ffffff' : '#4b5563'
                          }}
                        >
                          Tasa BCV ({bcvRate ? bcvRate.toFixed(2) : '---'})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setPagoMovilRateMode('personalizada'); setPagoMovilCustomRate(String(Math.round(bcvRate * 1.05))); }}
                          style={{
                            flex: 1, padding: '7px', fontSize: '11px', borderRadius: '4px', cursor: 'pointer', fontWeight: '700',
                            border: pagoMovilRateMode === 'personalizada' ? '1px solid #111827' : '1px solid #e5e7eb',
                            background: pagoMovilRateMode === 'personalizada' ? '#111827' : '#f9fafb',
                            color: pagoMovilRateMode === 'personalizada' ? '#ffffff' : '#4b5563'
                          }}
                        >
                          ⭐ Tasa Preferencial
                        </button>
                      </div>

                      {pagoMovilRateMode === 'personalizada' && (
                        <div style={{ marginBottom: '8px' }}>
                          <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '2px' }}>Tasa acordada (Bs/$):</label>
                          <input 
                            type="number" 
                            step="0.01" 
                            value={pagoMovilCustomRate} 
                            onChange={(e) => setPagoMovilCustomRate(e.target.value)} 
                            placeholder="Ej. 850.00"
                            style={{ width: '100%', padding: '7px 10px', borderRadius: '4px', border: '1px solid #111827', fontWeight: '700', fontSize: '13px', outline: 'none' }} 
                            autoFocus
                          />
                        </div>
                      )}

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '6px', borderTop: '1px dashed #f3f4f6' }}>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>Monto a transferir por banco:</span>
                        <strong style={{ fontSize: '16px', fontWeight: '900', color: '#16a34a' }}>
                          Bs. {pagoMovilChangeBs.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                      </div>
                    </div>
                  )}

                  {changeCurrencyType === 'USD' && (
                    <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Entregarás <strong>${changeUSD.toFixed(2)} USD</strong> en billetes físicos de la gaveta.</span>
                  )}
                  {changeCurrencyType === 'BS' && (
                    <span style={{ fontSize: '11px', color: '#6b7280', display: 'block' }}>Entregarás <strong>Bs. {changeBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong> en billetes físicos de la gaveta.</span>
                  )}
                </div>
              )}

              {/* Inputs de Cobro */}
              <div className="payment-inputs-grid">
                <div className="form-group">
                  <label>Efectivo ($ USD)</label>
                  <input type="number" step="0.01" value={payCashUSD} onChange={(e) => setPayCashUSD(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>
                    {currentStoreCountry === 'panama' ? 'Yappy ($)' : currentStoreCountry === 'el_salvador' ? 'Transferencia / Chivo ($)' : 'Zelle ($)'}
                  </label>
                  <input type="number" step="0.01" value={payZelle} onChange={(e) => setPayZelle(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                
                {currentStoreCountry === 'venezuela' && (
                  <>
                    <div className="form-group">
                      <label>Efectivo (Bs)</label>
                      <input type="number" step="0.01" value={payCashBs} onChange={(e) => setPayCashBs(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                    </div>
                    <div className="form-group">
                      <label>Pago Móvil / Transf. (Bs)</label>
                      <input type="number" step="0.01" value={payPagoMovil} onChange={(e) => setPayPagoMovil(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                    </div>
                  </>
                )}
                
                <div className="form-group">
                  <label>Punto de Venta / Débito {currentStoreCountry === 'venezuela' ? '(Bs)' : '($ USD)'}</label>
                  <input type="number" step="0.01" value={payDebit} onChange={(e) => setPayDebit(e.target.value)} onBlur={updateCalculations} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label>Referencia Bancaria (Opcional)</label>
                  <input 
                    type="text" 
                    value={paymentRef} 
                    onChange={(e) => setPaymentRef(e.target.value)} 
                    placeholder="Últimos 4 dígitos o ref" 
                  />
                </div>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', background: '#f9fafb', borderTop: '1px solid #f1f3f5' }}>
              {!settlingSale && (
                <button className="btn-secondary" onClick={handleCreditCheckout} style={{ border: '1px solid #e05d5d', color: '#e05d5d', fontWeight: '700' }}>
                  Pasar a Crédito
                </button>
              )}
              <div style={{ display: 'flex', gap: '8px', marginLeft: settlingSale ? 'auto' : '0' }}>
                <button className="btn-secondary" onClick={() => { setShowPaymentModal(false); setSettlingSale(null); }} style={{ border: '1px solid #d1d5db', color: '#4b5563' }}>
                  Cancelar
                </button>
                <button className="btn-primary" onClick={handleCheckoutSubmit} disabled={totalPaidUSD <= 0 || processing} style={{ background: '#111827', color: '#ffffff', border: 'none', fontWeight: '700', padding: '10px 20px' }}>
                  {processing ? 'Procesando...' : 'Confirmar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1.4 MODAL: ESCÁNER CON CÁMARA EN VIVO */}
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
              <div ref={typeof scannerContainerRef !== 'undefined' ? scannerContainerRef : null} id="fiskal-qr-reader" style={{ width: '100%', minHeight: '250px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}></div>
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


      {/* -------------------------------------------------------------------------- */}
      {/* GRUPO 2: CAJA Y TURNOS                                                    */}
      {/* -------------------------------------------------------------------------- */}

      {/* 2.1 MODAL: APERTURA DE CAJA (REPORTE X) */}
      {showOpenShiftModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Unlock size={18} /> Apertura de Turno (Reporte X)
              </h3>
              <button className="btn-close-modal" onClick={() => setShowOpenShiftModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body fiskal-form">
              <div className="form-group" style={{ marginTop: '4px' }}>
                <label>Caja Física a Operar</label>
                <select 
                  value={selectedRegisterIdForOpen} 
                  onChange={(e) => setSelectedRegisterIdForOpen(e.target.value)} 
                  style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '14px', background: '#fff' }}
                >
                  {registers.map(r => (
                    <option key={r.id} value={r.id}>{r.name} {r.is_main ? '(Principal)' : ''}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Fondo Inicial de Caja / Sencillo ($ USD)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#6c757d' }} />
                  <input 
                    type="number" 
                    step="0.01" 
                    value={openingFloat} 
                    onChange={(e) => setOpeningFloat(e.target.value)} 
                    style={{ paddingLeft: '32px' }} 
                    placeholder="0.00" 
                    autoFocus 
                  />
                </div>
              </div>

              {currentStoreCountry === 'venezuela' && (
                <div className="form-group">
                  <label>Fondo Inicial (Bs. Físico)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#6c757d', fontWeight: 'bold', fontSize: '13px' }}>Bs</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={openingFloatVes} 
                      onChange={(e) => setOpeningFloatVes(e.target.value)} 
                      style={{ paddingLeft: '32px' }} 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowOpenShiftModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleOpenShift}>
                <Check size={16} /> Iniciar Turno
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.2 MODAL: CIERRE DE CAJA Y ARQUEO (REPORTE Z) */}
      {showCloseShiftModal && currentShift && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                <Lock size={18} /> Cierre de Turno y Arqueo (Reporte Z)
              </h3>
              <button className="btn-close-modal" onClick={() => setShowCloseShiftModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body fiskal-form">
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #dee2e6', textAlign: 'center' }}>
                <p style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Esperado en Sistema</p>
                {(() => {
                  const floatUsd = Number(currentShift?.opening_float_usd || 0);
                  const match = (currentShift?.notes || '').match(/FondoBs:([0-9.]+)/);
                  const floatBs = match ? parseFloat(match[1]) : Number(currentShift?.opening_float_ves || currentShift?.opening_float_bs || 0);
                  
                  return (
                    <>
                      <h2 style={{ color: '#212529', margin: 0, fontSize: '22px' }}>
                        ${(floatUsd + shiftCashUSD).toFixed(2)} USD
                      </h2>
                      {(!currentStoreCountry || currentStoreCountry.toLowerCase().includes('venezuela')) && (
                        <h3 style={{ margin: '5px 0 0 0', color: '#2b8a3e', fontSize: '18px' }}>
                          Bs. {(floatBs + shiftCashBs).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="form-group">
                <label>Efectivo Físico Contado ($ USD)</label>
                <div style={{ position: 'relative' }}>
                  <DollarSign size={16} style={{ position: 'absolute', left: '10px', top: '12px', color: '#6c757d' }} />
                  <input 
                    type="number" 
                    step="0.01" 
                    value={actualCashUSD} 
                    onChange={(e) => setActualCashUSD(e.target.value)} 
                    style={{ paddingLeft: '32px' }} 
                    placeholder="0.00" 
                  />
                </div>
              </div>

              {(!currentStoreCountry || currentStoreCountry.toLowerCase().includes('venezuela')) && (
                <div className="form-group">
                  <label>Efectivo Físico Contado (Bs. Físico)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '10px', top: '10px', color: '#6c757d', fontWeight: 'bold', fontSize: '13px' }}>Bs</span>
                    <input 
                      type="number" 
                      step="0.01" 
                      value={actualCashBs} 
                      onChange={(e) => setActualCashBs(e.target.value)} 
                      style={{ paddingLeft: '32px' }} 
                      placeholder="0.00" 
                    />
                  </div>
                </div>
              )}

              <div className="form-group">
                <label>Notas de Cierre (Opcional)</label>
                <textarea 
                  value={shiftNotes} 
                  onChange={(e) => setShiftNotes(e.target.value)} 
                  placeholder="Ej. Faltaron $2 por error de vuelto..." 
                  rows="2"
                ></textarea>
              </div>
            </div>

            <div className="modal-footer" style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn-secondary" onClick={() => setShowCloseShiftModal(false)}>Cancelar</button>
              <button className="btn-primary" onClick={handleCloseShift}>
                <Check size={16} /> Confirmar Cierre Definitivo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2.3 MODAL: AUDITORÍA DETALLADA DE REPORTE Z ANTERIOR */}
      {showShiftReportModal && selectedShiftReport && (
        <div className="modal-overlay" style={{ zIndex: 10000, padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-content" style={{ width: '100%', maxWidth: '600px', maxHeight: '90vh', background: '#fff', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '20px', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: '0 0 10px 0', color: '#212529', fontSize: '18px' }}>Detalle de Reporte Z (Auditoría)</h3>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#6c757d' }}>
                  <strong>Apertura:</strong> {new Date(selectedShiftReport.opened_at).toLocaleString()}
                </p>
                <p style={{ margin: '2px 0', fontSize: '12px', color: '#6c757d' }}>
                  <strong>Cierre:</strong> {selectedShiftReport.closed_at ? new Date(selectedShiftReport.closed_at).toLocaleString() : 'Turno Abierto'}
                </p>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', color: '#212529' }}>
                  <strong>Responsable:</strong> {employees.find(e => e.id === selectedShiftReport.user_id)?.full_name || 'Cajero'}
                </p>
              </div>

              <hr style={{ border: 'none', borderTop: '1px dashed #dee2e6', marginBottom: '20px' }} />

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#212529' }}>Desglose de Ingresos Calculados:</h4>
                {(() => {
                  const shiftSales = (typeof sales !== 'undefined' ? sales : []).filter(sale => sale.shift_id === selectedShiftReport.id && sale.status === 'completed');
                  let tUsd = 0, tBs = 0, tZelle = 0, tDebit = 0, tPm = 0;
                  shiftSales.forEach(s => {
                    const pd = s.payment_details || {};
                    tUsd += (pd.cash_usd || 0);
                    tBs += (pd.cash_bs || 0);
                    tZelle += (pd.zelle || 0);
                    tDebit += (pd.debit || pd.debit_bs || 0);
                    tPm += (pd.pago_movil || pd.pago_movil_bs || 0);
                  });
                  
                  const floatUsd = Number(selectedShiftReport?.opening_float_usd || selectedShiftReport?.opening_float || 0);
                  const match = selectedShiftReport?.notes?.match(/FondoBs:([0-9.]+)/);
                  const floatBs = match ? parseFloat(match[1]) : 0;

                  return (
                    <div style={{ fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '8px', background: '#f8f9fa', padding: '16px', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fondo Inicial USD:</span> <strong>${floatUsd.toFixed(2)}</strong></div>
                      {currentStoreCountry === 'venezuela' && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Fondo Inicial Bs:</span> <strong>Bs. {floatBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></div>
                      )}
                      <hr style={{ border: 'none', borderTop: '1px dashed #dee2e6', margin: '4px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Efectivo USD:</span> <strong>${tUsd.toFixed(2)}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Zelle:</span> <strong>${tZelle.toFixed(2)}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Punto Venta:</span> <strong>Bs. {tDebit.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Pago Móvil:</span> <strong>Bs. {tPm.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Efectivo Bs:</span> <strong>Bs. {tBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#212529' }}>Detalle de Facturas y Productos Vendidos:</h4>
                {(() => {
                  const shiftSalesList = (typeof sales !== 'undefined' ? sales : []).filter(sale => sale.shift_id === selectedShiftReport.id && sale.status === 'completed');
                  
                  if (shiftSalesList.length === 0) {
                    return <p style={{ fontSize: '13px', color: '#6c757d', textAlign: 'center', padding: '20px 0' }}>Sin ventas registradas en este turno</p>;
                  }

                  return shiftSalesList.map((sale, index) => (
                    <div key={sale.id || index} style={{ border: '1px solid #e9ecef', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid #f1f3f5', paddingBottom: '8px' }}>
                        <strong style={{ fontSize: '13px', color: '#1971c2' }}>Factura #{sale.receipt_number || `A-00${index + 1}`} - {sale.client_name || 'Cliente General'}</strong>
                        <strong style={{ fontSize: '13px', color: '#1971c2' }}>${(sale.total_usd || 0).toFixed(2)} USD</strong>
                      </div>
                      
                      <table style={{ width: '100%', fontSize: '12px', color: '#495057' }}>
                        <thead>
                          <tr style={{ textAlign: 'left', color: '#adb5bd' }}>
                            <th style={{ paddingBottom: '4px', fontWeight: 'normal', width: '40px' }}>Cant</th>
                            <th style={{ paddingBottom: '4px', fontWeight: 'normal' }}>Producto</th>
                            <th style={{ paddingBottom: '4px', fontWeight: 'normal', textAlign: 'right' }}>Subtotal</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sale.items && sale.items.map((item, idx) => (
                            <tr key={idx}>
                              <td style={{ padding: '2px 0', verticalAlign: 'top' }}>{item.quantity}</td>
                              <td style={{ padding: '2px 0' }}>{item.name}</td>
                              <td style={{ padding: '2px 0', textAlign: 'right' }}>
                                ${((item.price || item.price_usd || item.unit_price || 0) * item.quantity).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div style={{ textAlign: 'right', marginTop: '6px', fontSize: '11px', color: '#adb5bd' }}>
                        Hora: {new Date(sale.created_at).toLocaleTimeString()}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </div>

            <div style={{ padding: '16px 20px', borderTop: '1px solid #e9ecef', background: '#f8f9fa', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="btn-primary" style={{ width: '100%', padding: '10px', background: '#1971c2', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                🖨️ Imprimir / Guardar PDF Detallado
              </button>
              <button className="btn-secondary" onClick={() => setShowShiftReportModal(false)} style={{ width: '100%', padding: '10px', background: '#fff', border: '1px solid #ced4da', borderRadius: '6px', color: '#495057', cursor: 'pointer' }}>
                Cerrar Reporte
              </button>
            </div>
          </div>
        </div>
      )}


      {/* -------------------------------------------------------------------------- */}
      {/* GRUPO 3: CLIENTES Y COMUNICACIÓN                                          */}
      {/* -------------------------------------------------------------------------- */}

      {/* 3.1 MODAL: REGISTRO RÁPIDO DE CLIENTE (DESDE EL POS) */}
      {showQuickClientModal && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '400px' }}>
            <div className="modal-header">
              <h3>Registro Rápido de Cliente</h3>
              <button className="btn-close-modal" onClick={() => { setShowQuickClientModal(false); setClientDoc(''); setClientName(''); }}>
                <X size={20} />
              </button>
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

      {/* 3.2 MODAL: DETALLE, HISTORIAL Y NOTAS DE CLIENTE */}
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
                <label style={{ fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Edit2 size={14}/> Comentario / Nota Personalizada
                </label>
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

      {/* 3.3 MODAL: ENVÍO RÁPIDO DE MENSAJES POR WHATSAPP */}
      {modalWhatsAppOpen && (
        <div className="modal-overlay" style={{ zIndex: 9999 }}>
          <div className="modal-content" style={{ width: '560px' }}>
            <div className="modal-header">
              <h3>Envío de Mensaje por WhatsApp</h3>
              <button className="btn-close-modal" onClick={() => setModalWhatsAppOpen(false)}>
                <X size={20} />
              </button>
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


      {/* -------------------------------------------------------------------------- */}
      {/* GRUPO 4: FACTURAS, RECIBOS Y ETIQUETAS                                    */}
      {/* -------------------------------------------------------------------------- */}

      {/* 4.1 MODAL: FACTURA / RECIBO DETALLADO DEL CLIENTE */}
      {showInvoiceModal && selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>Factura #{String(selectedInvoice.id).startsWith('local') ? 'Pendiente' : selectedInvoice.invoice_number || `A-${String(selectedInvoice.id).padStart(3, '0')}`}</h3>
              <button className="btn-close-modal" onClick={() => setShowInvoiceModal(false)}>
                <X size={20} />
              </button>
            </div>
            
            <div className="modal-body fiskal-form" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              <div style={{ textAlign: 'center', marginBottom: '16px', borderBottom: '1px dashed #dee2e6', paddingBottom: '12px' }}>
                <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', color: '#212529' }}>{currentStoreName}</h2>
                {currentStoreRif && <div style={{ fontSize: '12px', color: '#495057' }}>{currentStoreCountry === 'venezuela' ? 'RIF' : 'RUC/Documento'}: {currentStoreRif}</div>}
                {currentStoreAddress && <div style={{ fontSize: '12px', color: '#495057', marginTop: '2px' }}>{currentStoreAddress}</div>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: '#495057' }}>
                <span><strong>Cliente:</strong> {selectedInvoice.client_name || 'Cliente General'}</span>
                <span><strong>{currentStoreCountry === 'venezuela' ? 'Cédula/RIF' : 'Cédula/RUC'}:</strong> {selectedInvoice.payment_details?.client_document || 'N/A'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', fontSize: '13px', color: '#495057' }}>
                <span><strong>Fecha:</strong> {new Date(selectedInvoice.created_at).toLocaleString()}</span>
                <span><strong>Estatus:</strong> {selectedInvoice.status.toUpperCase()}</span>
              </div>

              {(() => {
                const isVzla = currentStoreCountry === 'venezuela';
                const saleBcvRate = selectedInvoice.payment_details?.applied_bcv_rate || bcvRate || 1;
                const showTaxes = selectedInvoice.tax_usd > 0;
                
                const formatMoney = (usdVal) => {
                  if (isVzla) return `Bs. ${(usdVal * saleBcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  return `$${usdVal.toFixed(2)}`;
                };

                const formatRef = (usdVal) => {
                  if (isVzla) return `(Ref: $${usdVal.toFixed(2)})`;
                  return '';
                };

                return (
                  <>
                    {isVzla && (
                      <div style={{ textAlign: 'right', fontSize: '11px', color: '#868e96', marginBottom: '8px' }}>
                        Tasa BCV Aplicada: Bs. {saleBcvRate.toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    )}

                    <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#212529' }}>Artículos Facturados</h4>
                    <div className="table-responsive" style={{ marginBottom: '16px' }}>
                      <table className="receipt-table">
                        <thead>
                          <tr>
                            <th>Cant</th>
                            <th>Producto</th>
                            <th>Precio Unit</th>
                            <th>Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let parsedItems = [];
                            if (Array.isArray(selectedInvoice.items)) {
                              parsedItems = selectedInvoice.items;
                            } else if (typeof selectedInvoice.items === 'string') {
                              try { parsedItems = JSON.parse(selectedInvoice.items); } catch(e){}
                            }

                            return parsedItems.map((item, idx) => {
                              const itemTotalUsd = (item.price || 0) * (item.quantity || 1);
                              return (
                                <tr key={idx}>
                                  <td>{item.quantity}</td>
                                  <td>{item.name}</td>
                                  <td>
                                    <div>{formatMoney(item.price)}</div>
                                    <div style={{ fontSize: '10px', color: '#868e96' }}>{formatRef(item.price)}</div>
                                  </td>
                                  <td>
                                    <strong>{formatMoney(itemTotalUsd)}</strong>
                                    <div style={{ fontSize: '10px', color: '#868e96', fontWeight: 'normal' }}>{formatRef(itemTotalUsd)}</div>
                                  </td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
                      {showTaxes && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '4px', color: '#495057' }}>
                            <span>Subtotal:</span>
                            <div style={{ textAlign: 'right' }}>
                              <strong>{formatMoney(selectedInvoice.subtotal_usd || (selectedInvoice.total_usd - selectedInvoice.tax_usd))}</strong>
                              <div style={{ fontSize: '11px', fontWeight: 'normal' }}>{formatRef(selectedInvoice.subtotal_usd || (selectedInvoice.total_usd - selectedInvoice.tax_usd))}</div>
                            </div>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px', color: '#495057' }}>
                            <span>Impuesto ({currentStoreTaxRate}%):</span>
                            <div style={{ textAlign: 'right' }}>
                              <strong>{formatMoney(selectedInvoice.tax_usd)}</strong>
                              <div style={{ fontSize: '11px', fontWeight: 'normal' }}>{formatRef(selectedInvoice.tax_usd)}</div>
                            </div>
                          </div>
                        </>
                      )}
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '15px', marginBottom: '6px', alignItems: 'center' }}>
                        <span>Total Facturado:</span>
                        <div style={{ textAlign: 'right' }}>
                          <strong>{formatMoney(selectedInvoice.total_usd)}</strong>
                          <div style={{ fontSize: '12px', fontWeight: 'normal', color: '#495057' }}>{formatRef(selectedInvoice.total_usd)}</div>
                        </div>
                      </div>

                      {selectedInvoice.balance_due_usd > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fa5252', marginTop: '6px', borderTop: '1px solid #dee2e6', paddingTop: '6px' }}>
                          <span>Saldo Pendiente:</span>
                          <div style={{ textAlign: 'right' }}>
                            <strong>{formatMoney(selectedInvoice.balance_due_usd)}</strong>
                            <div style={{ fontSize: '11px', fontWeight: 'normal' }}>{formatRef(selectedInvoice.balance_due_usd)}</div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Desglose de Pago y Vuelto */}
                    {selectedInvoice.payment_details && (
                      <div style={{ background: '#e7f5ff', padding: '12px', borderRadius: '6px', border: '1px solid #74c0fc', marginBottom: '16px', fontSize: '13px' }}>
                        <h4 style={{ fontSize: '13px', color: '#1864ab', marginBottom: '8px', textTransform: 'uppercase', borderBottom: '1px solid #a5d8ff', paddingBottom: '4px' }}>Desglose de Pago y Vuelto</h4>
                        
                        {selectedInvoice.payment_details.raw_cash_usd > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#495057' }}>Efectivo USD Recibido:</span>
                            <strong>${selectedInvoice.payment_details.raw_cash_usd.toFixed(2)}</strong>
                          </div>
                        )}
                        {selectedInvoice.payment_details.raw_cash_bs > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#495057' }}>Efectivo Bs Recibido:</span>
                            <strong>Bs. {selectedInvoice.payment_details.raw_cash_bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                          </div>
                        )}
                        {selectedInvoice.payment_details.pago_movil > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#495057' }}>Pago Móvil:</span>
                            <strong>Bs. {selectedInvoice.payment_details.pago_movil.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong>
                          </div>
                        )}
                        {selectedInvoice.payment_details.zelle > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#495057' }}>Zelle:</span>
                            <strong>${selectedInvoice.payment_details.zelle.toFixed(2)}</strong>
                          </div>
                        )}
                        {selectedInvoice.payment_details.debit > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ color: '#495057' }}>Punto / Tarjeta:</span>
                            <strong>{isVzla ? `Bs. ${selectedInvoice.payment_details.debit.toLocaleString('es-VE', { minimumFractionDigits: 2 })}` : `$${selectedInvoice.payment_details.debit.toFixed(2)}`}</strong>
                          </div>
                        )}

                        {(selectedInvoice.payment_details.change_usd || 0) > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#2b8a3e', borderTop: '1px dashed #74c0fc', paddingTop: '6px', marginTop: '6px', fontWeight: 'bold' }}>
                            <span>Vuelto Entregado:</span>
                            <span>
                              ${selectedInvoice.payment_details.change_usd.toFixed(2)} 
                              {selectedInvoice.payment_details.change_currency_type === 'BS' ? ' (En Efectivo Bs)' : 
                               selectedInvoice.payment_details.change_currency_type === 'PAGO_MOVIL' ? ' (Por Pago Móvil)' : ' (En Efectivo USD)'}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                );
              })()}

              {invoiceHistory && invoiceHistory.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <h4 style={{ fontSize: '14px', marginBottom: '8px', color: '#212529' }}>Historial de Abonos / Pagos</h4>
                  {invoiceHistory.map((h, i) => {
                    const histBcvRate = h.payment_details?.applied_bcv_rate || (selectedInvoice.payment_details?.applied_bcv_rate) || bcvRate || 1;
                    const isVzlaHist = currentStoreCountry === 'venezuela';
                    const abonoText = isVzlaHist 
                      ? `Bs. ${(h.amount_usd * histBcvRate).toLocaleString('es-VE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (Ref: $${h.amount_usd.toFixed(2)})`
                      : `$${h.amount_usd.toFixed(2)}`;
                      
                    return (
                      <div key={i} style={{ fontSize: '12px', padding: '6px', background: '#e7f5ff', borderRadius: '4px', marginBottom: '4px', display: 'flex', justifyContent: 'space-between' }}>
                        <span>{new Date(h.created_at).toLocaleString()}</span>
                        <strong>Abono: {abonoText}</strong>
                      </div>
                    );
                  })}
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

      {/* 4.2 MODAL: ETIQUETA QR INDIVIDUAL DE PRODUCTO */}
      {showLabelModal && labelProduct && (
        <div className="modal-overlay" style={{ zIndex: 10005 }}>
          <div className="modal-content label-modal-content" style={{ width: '380px' }}>
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} /> Etiqueta de Producto
              </h3>
              <button className="btn-close-modal" onClick={() => setShowLabelModal(false)}>
                <X size={20} />
              </button>
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

      {/* 4.3 MODAL: CATÁLOGO COMPLETO DE ETIQUETAS PARA IMPRESIÓN (CARTA / A4) */}
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


      {/* -------------------------------------------------------------------------- */}
      {/* GRUPO 5: ADMINISTRACIÓN SAAS                                              */}
      {/* -------------------------------------------------------------------------- */}

      {/* 5.1 MODAL: PRE-FACTURACIÓN Y RECIBO SAAS */}
      {showPreInvoiceModal && preInvoiceStore && (
        <div className="modal-overlay" style={{ zIndex: 10005 }}>
          <div className="modal-content" style={{ width: '650px', padding: '0' }}>
            <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Generar Recibo SaaS</h3>
              <button className="btn-close-modal" onClick={() => setShowPreInvoiceModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto', background: '#f8f9fa' }}>
              <div id="saas-invoice-print-area" style={{ padding: '40px', background: '#fff', margin: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <div style={{ marginBottom: '30px', textAlign: 'center' }}>
                  <img src={logoDark} alt="Fiskal" style={{ height: '45px', objectFit: 'contain', marginBottom: '8px' }} />
                  <div className="subtitle" style={{ fontSize: '16px', fontWeight: 'bold', color: '#333' }}>Recibo de Servicios SaaS</div>
                  {saasInvoiceHeader && (
                    <div style={{ marginTop: '10px', fontSize: '12px', color: '#666', whiteSpace: 'pre-line' }}>{saasInvoiceHeader}</div>
                  )}
                </div>
                <div className="info-grid" style={{ marginBottom: '30px', fontSize: '14px', color: '#000', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div><strong>Comercio:</strong> {preInvoiceStore.name}</div>
                  <div><strong>Propietario:</strong> {preInvoiceStore.owner_name || preInvoiceStore.full_name || 'Nombres'}</div>
                  <div><strong>{preInvoiceStore.country === 'venezuela' ? 'RIF' : 'RIF/Documento'}:</strong> {preInvoiceStore.rif || preInvoiceStore.document || 'N/A'}</div>
                  <div><strong>Fecha de Emisión:</strong> {new Date().toLocaleDateString('es-ES')}</div>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '30px', fontSize: '14px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #000', textAlign: 'left' }}>
                      <th style={{ padding: '10px 5px', fontWeight: 'bold' }}>Descripción</th>
                      <th className="text-center" style={{ padding: '10px 5px', fontWeight: 'bold', textAlign: 'center' }}>Precio Base</th>
                      <th className="text-center" style={{ padding: '10px 5px', fontWeight: 'bold', textAlign: 'center' }}>Descuentos</th>
                      <th className="text-right" style={{ padding: '10px 5px', fontWeight: 'bold', textAlign: 'right' }}>Subtotal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '15px 5px' }}>Suscripción Mensual Sistema Fiskal</td>
                      <td className="text-center" style={{ padding: '15px 5px', textAlign: 'center' }}>
                        ${(preInvoiceStore.monthly_price_agreed !== null && preInvoiceStore.monthly_price_agreed !== undefined ? preInvoiceStore.monthly_price_agreed : baseMonthlyPrice).toFixed(2)}
                      </td>
                      <td className="text-center" style={{ padding: '15px 5px', textAlign: 'center' }}>
                        {preInvoiceStore.custom_discount > 0 ? `${preInvoiceStore.custom_discount}%` : '0%'}
                      </td>
                      <td className="text-right" style={{ padding: '15px 5px', textAlign: 'right' }}>
                        ${(getCalculatedMonthlyPrice(preInvoiceStore.custom_discount, preInvoiceStore.monthly_price_agreed)).toFixed(2)}
                      </td>
                    </tr>
                    {parseFloat(preInvoiceExtraAmount) > 0 && (
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px 5px' }}>{preInvoiceExtraDesc || "Cargo Adicional"}</td>
                        <td className="text-center" style={{ padding: '15px 5px', textAlign: 'center' }}>${parseFloat(preInvoiceExtraAmount).toFixed(2)}</td>
                        <td className="text-center" style={{ padding: '15px 5px', textAlign: 'center' }}>0%</td>
                        <td className="text-right" style={{ padding: '15px 5px', textAlign: 'right' }}>${parseFloat(preInvoiceExtraAmount).toFixed(2)}</td>
                      </tr>
                    )}
                    {parseFloat(preInvoiceDiscount) > 0 && (
                      <tr style={{ borderBottom: '1px solid #eee' }}>
                        <td style={{ padding: '15px 5px' }}>Descuento Especial Aplicado</td>
                        <td className="text-center" style={{ padding: '15px 5px', textAlign: 'center' }}>-${parseFloat(preInvoiceDiscount).toFixed(2)}</td>
                        <td className="text-center" style={{ padding: '15px 5px', textAlign: 'center' }}>N/A</td>
                        <td className="text-right" style={{ padding: '15px 5px', textAlign: 'right' }}>-${parseFloat(preInvoiceDiscount).toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <div className="total-container" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '40px' }}>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#000' }}>
                    Total Facturado: ${(getCalculatedMonthlyPrice(preInvoiceStore.custom_discount, preInvoiceStore.monthly_price_agreed) + (parseFloat(preInvoiceExtraAmount) || 0) - (parseFloat(preInvoiceDiscount) || 0)).toFixed(2)}
                  </div>
                </div>
                <div className="footer" style={{ textAlign: 'center', fontSize: '12px', color: '#666', whiteSpace: 'pre-line' }}>
                  {saasInvoiceFooter ? saasInvoiceFooter : '¡Gracias por confiar en Fiskal para la gestión de su negocio!'}
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ padding: '16px 20px', borderTop: '1px solid #dee2e6', display: 'flex', gap: '10px', justifyContent: 'flex-end', background: '#fff' }}>
              <button type="button" className="btn-secondary" style={{ background: '#25D366', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px' }} onClick={() => handleSaasWhatsApp(preInvoiceStore)}>
                Enviar por WhatsApp
              </button>
              <button type="button" className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '8px 16px', borderRadius: '4px', background: '#000', color: '#fff', border: 'none' }} onClick={() => generateCustomSaaSInvoice()}>
                Generar PDF
              </button>
              <button type="button" className="btn-secondary" style={{ cursor: 'pointer', padding: '8px 16px', borderRadius: '4px', border: '1px solid #ccc', background: '#fff' }} onClick={() => setShowPreInvoiceModal(false)}>
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5.2 MODAL: CREAR ACCESO DE DUEÑO (SUPER ADMIN) */}
      {showOwnerModal && targetStoreForOwner && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '440px' }}>
            <div className="modal-header">
              <h3>Crear Acceso de Dueño</h3>
              <button className="btn-close-modal" onClick={() => setShowOwnerModal(false)}>
                <X size={20} />
              </button>
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

    </div>
  );
}

export default App;