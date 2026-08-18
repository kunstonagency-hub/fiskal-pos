import React, { useState, useEffect, useRef } from 'react';
import { ShoppingCart, Settings, Package, Users, PlusCircle, Trash2, Minus, Plus, RefreshCw, History, UserCheck, CreditCard, X, FileText, Eye, Clock, AlertCircle, CheckCircle, Play, DollarSign, AlertTriangle, Edit2, QrCode, Lock, Unlock, ShieldAlert, Barcode, Image as ImageIcon, Wifi, WifiOff, UploadCloud, Search, Store, MapPin, Phone, Mail, LogOut, Key, User, MessageCircle, Award, HardDrive, UserPlus, Camera } from 'lucide-react';
import { supabase } from './supabase';
import { initDB, queueOfflineAction, getOfflineActions, clearOfflineAction, getOfflineSales, clearOfflineSale } from './db';
import { Html5Qrcode } from 'html5-qrcode';
import './App.css';

// Diccionario de ciudades de Venezuela para auto-detectar el estado
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

function App() {
  // Estado de Autenticación Supabase
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

  // Estado para expandir/contraer el menú lateral en móvil horizontal por toque
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);

  // Estados de Usuario, Roles y Tenant (Store ID)
  const [currentUserRole, setCurrentUserRole] = useState('cajero');
  const [currentStoreId, setCurrentStoreId] = useState(null);
  const [adminStores, setAdminStores] = useState([]);
  const [employees, setEmployees] = useState([]);

  // Campos para nuevo empleado
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpPass, setNewEmpPass] = useState('');
  const [creatingEmployee, setCreatingEmployee] = useState(false);
  
  // Campos extendidos para Registro y Edición de Comercio SaaS
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

  // Estados para creación rápida de acceso de dueño desde Panel Maestro
  const [showOwnerModal, setShowOwnerModal] = useState(false);
  const [targetStoreForOwner, setTargetStoreForOwner] = useState(null);
  const [ownerModalEmail, setOwnerModalEmail] = useState('');
  const [ownerModalPass, setOwnerModalPass] = useState('');
  const [ownerModalName, setOwnerModalName] = useState('');
  const [creatingOwnerLoading, setCreatingOwnerLoading] = useState(false);

  // Campos para gestión de Cajas Físicas
  const [newRegisterName, setNewRegisterName] = useState('');
  const [isMainRegister, setIsMainRegister] = useState(false);

  // Estados del Modo Offline
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSalesCount, setPendingSalesCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [conflictState, setConflictState] = useState(null);

  const [selectedClient, setSelectedClient] = useState('Cliente General');
  
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [showQuickClientModal, setShowQuickClientModal] = useState(false);
  const [quickDocInput, setQuickDocInput] = useState('');

  const [barcodeInput, setBarcodeInput] = useState('');
  const barcodeInputRef = useRef(null);

  // Estados para el Escáner de Cámara de Códigos de Barras
  const [showCameraScannerModal, setShowCameraScannerModal] = useState(false);
  const videoScannerRef = useRef(null);
  const [cameraScanError, setCameraScanError] = useState('');
  const mediaStreamRef = useRef(null);
  const html5QrCodeRef = useRef(null);

  const [currentShift, setCurrentShift] = useState(null);
  const [showOpenShiftModal, setShowOpenShiftModal] = useState(false);
  const [openingFloat, setOpeningFloat] = useState('');
  const [selectedRegisterIdForOpen, setSelectedRegisterIdForOpen] = useState('');
  const [showCloseShiftModal, setShowCloseShiftModal] = useState(false);
  const [actualCashCounted, setActualCashCounted] = useState('');
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

  // Estados de Plantillas y Alertas WhatsApp Avanzadas (Configuración)
  const [plantillas, setPlantillas] = useState({
    reposicionStock: '¡Hola {cliente}! Te contamos que el producto {producto} que tanto te gusta ya está disponible nuevamente en stock. ¿Te guardamos el tuyo?',
    promocionGeneral: '¡Hola {cliente}! Tenemos ofertas especiales hoy en Fiskal con el producto {producto}. ¡Visítanos o escríbenos para más detalles!',
  });
  const [mensajePersonalizadoTemp, setMensajePersonalizadoTemp] = useState('');
  const [modalWhatsAppOpen, setModalWhatsAppOpen] = useState(false);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('reposicionStock');
  const [modalProductId, setModalProductId] = useState('');
  const [modalClientName, setModalClientName] = useState('Cliente General');

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
        setCurrentUserRole('cajero');
        setProducts([]);
        setSales([]);
        setClients([]);
        setRegisters([]);
        setCurrentShift(null);
      }
    });

    const handleOnline = () => { setIsOnline(true); syncOfflineData(); };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    checkPendingSales();

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

  const fetchUserProfileAndStore = async (user) => {
    try {
      let { data: profile, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      if (!profile) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        const retry = await supabase.from('profiles').select('*').eq('id', user.id).single();
        profile = retry.data;

        if (!profile) {
          console.warn("No se encontró perfil para este usuario.");
          return;
        }
      }

      // Validar estrictamente si el comercio está suspendido (excepto si es super_admin)
      if (profile.role !== 'super_admin' && profile.store_id) {
        const { data: storeInfo, error: storeErr } = await supabase.from('stores').select('is_active').eq('id', profile.store_id).single();
        
        if (storeErr || !storeInfo || storeInfo.is_active === false) {
          alert("⚠️ Este comercio se encuentra suspendido por la administración. Acceso denegado.");
          await supabase.auth.signOut();
          return;
        }
      }

      setCurrentStoreId(profile.store_id);
      setCurrentUserRole(profile.role || 'cajero');

      if (profile.role === 'super_admin') {
        fetchAdminStores();
      }

      loadStoreData(profile.store_id, profile.role);

    } catch (error) {
      console.warn('Error en la configuración del perfil:', error.message);
    }
  };

  const loadStoreData = async (storeId, role) => {
    await fetchRegisters(storeId);
    await fetchProducts(storeId);
    await fetchSales(storeId);
    await fetchClients(storeId);
    
    if (role === 'owner' || role === 'super_admin') {
      await fetchEmployees(storeId);
    }
    
    await syncBcvRate(storeId);
    await checkActiveShift();
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
      .replace(/{producto}/g, prodName);
    
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

  const handleTemplateChange = (e) => {
    const newKey = e.target.value;
    setSelectedTemplateKey(newKey);
    actualizarTextoMensaje(newKey, modalProductId, modalClientName);
  };

  const handleModalProductChange = (e) => {
    const newProdId = e.target.value;
    setModalProductId(newProdId);
    actualizarTextoMensaje(selectedTemplateKey, newProdId, modalClientName);
  };

  const handleModalClientChange = (e) => {
    const newClient = e.target.value;
    setModalClientName(newClient);
    actualizarTextoMensaje(selectedTemplateKey, modalProductId, newClient);
  };

  const enviarMensajeWhatsAppFinal = () => {
    let phone = '584120000000';
    if (modalClientName !== 'Cliente General') {
      const clientData = clients.find(c => c.name === modalClientName);
      if (clientData && clientData.phone) {
        phone = clientData.phone.replace(/\D/g, '');
      }
    }
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(mensajePersonalizadoTemp)}`;
    window.open(url, '_blank');
    setModalWhatsAppOpen(false);
  };

  const sendWhatsAppReminder = (sale) => {
    const clientData = clients.find(c => c.name === sale.client_name);
    const phone = clientData?.phone?.replace(/\D/g, ''); 

    if (!phone) {
      alert("No se encontró un número de teléfono para este cliente.");
      return;
    }

    const message = `Hola ${sale.client_name}, te saludamos de Fiskal. Te recordamos que tienes un saldo pendiente por la factura #${sale.id.toString().startsWith('local') ? 'Pendiente' : sale.id} de $${(sale.balance_due_usd || 0).toFixed(2)}. ¡Esperamos tu pago pronto!`;
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const sendClientGeneralWhatsApp = (client, totalDebt) => {
    const phone = client.phone?.replace(/\D/g, '');
    if (!phone) {
      alert("Este cliente no tiene un número de teléfono registrado.");
      return;
    }

    const message = `Hola ${client.name}, te saludamos de Fiskal. Te escribimos para recordarte que tienes un saldo pendiente acumulado de $${totalDebt.toFixed(2)} en tus cuentas. ¡Agradecemos tu pronto pago!`;
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
        });
        if (error) throw error;
        
        if (data.user) {
          const { data: newStore, error: storeErr } = await supabase.from('stores')
            .insert([{ name: 'Mi Comercio Nuevo', is_active: true }])
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

        alert("¡Registro exitoso! Ya puedes iniciar sesión y configurar tu comercio.");
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
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, role')
        .eq('store_id', storeId);
      
      if (!error && data) {
        setEmployees(data);
      }
    } catch (error) {
      console.warn("Error cargando empleados");
    }
  };

  const fetchAdminStores = async () => {
    try {
      const { data, error } = await supabase.from('stores').select('*').order('created_at', { ascending: false });
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
    try {
      const { data, error } = await supabase.from('cash_registers').select('*').eq('store_id', storeId).order('id', { ascending: true });
      if (error || !data || data.length === 0) {
        const { data: checkExist } = await supabase.from('cash_registers').select('*').eq('store_id', storeId);
        if (!checkExist || checkExist.length === 0) {
          const { data: newReg, error: insErr } = await supabase.from('cash_registers').insert([{ name: 'Caja Principal', is_main: true, store_id: storeId }]).select().single();
          if (!insErr && newReg) {
            setRegisters([newReg]);
            setSelectedRegisterIdForOpen(newReg.id.toString());
          }
        } else {
          setRegisters(checkExist);
          const mainReg = checkExist.find(r => r.is_main) || checkExist[0];
          if (mainReg) setSelectedRegisterIdForOpen(mainReg.id.toString());
        }
      } else {
        setRegisters(data);
        const mainReg = data.find(r => r.is_main) || data[0];
        if (mainReg) setSelectedRegisterIdForOpen(mainReg.id.toString());
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
      const { error } = await supabase
        .from('stores')
        .update({ is_active: !currentStatus })
        .eq('id', storeId);

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
      state: storeState.trim()
    };

    try {
      if (editingStore) {
        const { error } = await supabase
          .from('stores')
          .update(payload)
          .eq('id', editingStore.id);

        if (error) throw error;
        alert("¡Comercio actualizado exitosamente!");
      } else {
        const { error } = await supabase
          .from('stores')
          .insert([{ ...payload, is_active: true }]);

        if (error) throw error;
        alert("¡Comercio registrado exitosamente!");
      }

      resetStoreForm();
      fetchAdminStores();
    } catch (error) {
      alert("Error al guardar comercio: " + error.message);
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
        const { data: newSale, error } = await supabase.from('sales').insert([record.saleData]).select().single();
        if (!error && newSale) {
          if (record.historyData) {
            await supabase.from('payment_history').insert([{
              sale_id: newSale.id, amount_usd: record.historyData.amount_usd, payment_details: record.historyData.payment_details, store_id: currentStoreId
            }]);
          }
          await clearOfflineSale(record.id);
        }
      }
    }

    const actions = await getOfflineActions();
    if (actions.length === 0 && oldOfflineSales.length === 0) return;

    setIsSyncing(true);
    try {
      actions.sort((a, b) => a.timestamp - b.timestamp);

      for (const action of actions) {
        if (action.type === 'INSERT_SALE') {
          const { data: newSale, error } = await supabase.from('sales').insert([{...action.saleData, store_id: currentStoreId}]).select().single();
          if (!error && newSale && action.historyData) {
            await supabase.from('payment_history').insert([{
              sale_id: newSale.id,
              amount_usd: action.historyData.amount_usd,
              payment_details: action.historyData.payment_details,
              store_id: currentStoreId
            }]);
          }
        } 
        else if (action.type === 'UPDATE_SALE') {
          if (typeof action.saleId === 'number' || !action.saleId.toString().startsWith('local_')) {
            await supabase.from('sales').update({
              status: action.updatedStatus, balance_due_usd: action.newBalanceDue, payment_details: action.paymentDetails
            }).eq('id', action.saleId).eq('store_id', currentStoreId);

            await supabase.from('payment_history').insert([{
              sale_id: action.saleId, amount_usd: action.historyData.amount_usd, payment_details: action.historyData.payment_details, store_id: currentStoreId
            }]);
          }
        } 
        else if (action.type === 'DELETE_SALE') {
          if (typeof action.saleId === 'number' || !action.saleId.toString().startsWith('local_')) {
            await supabase.from('sales').delete().eq('id', action.saleId).eq('store_id', currentStoreId);
          }
        }
        else if (action.type === 'INSERT_CLIENT') {
          let conflictResolved = false;
          if (action.clientData.document) {
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
                await supabase.from('clients').update({
                  name: action.clientData.name,
                  phone: action.clientData.phone,
                  email: action.clientData.email
                }).eq('id', existing.id).eq('store_id', currentStoreId);
              }
              conflictResolved = true;
            }
          }
          if (!conflictResolved) {
            if (action.clientData.document) {
              const { data: checkDup } = await supabase.from('clients').select('*').eq('document', action.clientData.document).eq('store_id', currentStoreId).single();
              if (!checkDup) {
                await supabase.from('clients').insert([{...action.clientData, store_id: currentStoreId}]);
              }
            } else {
              await supabase.from('clients').insert([{...action.clientData, store_id: currentStoreId}]);
            }
          }
        }
        else if (action.type === 'DELETE_CLIENT') {
          if (typeof action.clientId === 'number' || !action.clientId.toString().startsWith('local_')) {
            await supabase.from('clients').delete().eq('id', action.clientId).eq('store_id', currentStoreId);
          }
        }
        else if (action.type === 'INSERT_PRODUCT') {
          await supabase.from('products').insert([{...action.productData, store_id: currentStoreId}]);
        }
        else if (action.type === 'UPDATE_PRODUCT') {
          if (typeof action.productId === 'number' || !action.productId.toString().startsWith('local_')) {
            await supabase.from('products').update(action.productData).eq('id', action.productId).eq('store_id', currentStoreId);
          }
        }
        else if (action.type === 'DELETE_PRODUCT') {
          if (typeof action.productId === 'number' || !action.productId.toString().startsWith('local_')) {
            await supabase.from('products').delete().eq('id', action.productId).eq('store_id', currentStoreId);
          }
        }
        
        await clearOfflineAction(action.local_id);
      }
      
      await fetchClients(currentStoreId);
      await fetchSales(currentStoreId);
      await fetchProducts(currentStoreId); 
      checkPendingSales();
      alert("¡Sincronización de transacciones offline completada exitosamente!");
    } catch (error) {
      console.error("Error sincronizando ventas offline:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchProducts = async (storeId) => {
    try {
      const { data, error } = await supabase.from('products').select('*').eq('store_id', storeId).order('id', { ascending: false });
      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error('Error cargando productos:', error.message);
    }
  };

  const fetchSales = async (storeId) => {
    try {
      const { data, error } = await supabase.from('sales').select('*').eq('store_id', storeId).order('created_at', { ascending: false });
      if (error) throw error;
      setSales(data || []);
    } catch (error) {
      console.error('Error cargando historial de ventas:', error.message);
    }
  };

  const fetchClients = async (storeId) => {
    try {
      const { data, error } = await supabase.from('clients').select('*').eq('store_id', storeId).order('id', { ascending: false });
      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error cargando clientes:', error.message);
    }
  };

  const checkActiveShift = async () => {
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      const userId = currentSession?.user?.id;
      if (!userId) return;

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
      } else {
        setCurrentShift(null);
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
    const floatVal = parseFloat(openingFloat) || 0;
    
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

      const { data: checkReg } = await supabase
        .from('shifts')
        .select('id')
        .eq('status', 'open')
        .eq('register_id', regId)
        .maybeSingle();

      if (checkReg) {
          alert("¡Atención! Esta caja física ya se encuentra abierta y siendo operada por otro usuario.");
          return;
      }

      const { data, error } = await supabase
        .from('shifts')
        .insert([{
          status: 'open',
          register_id: regId,
          opening_float_usd: floatVal,
          total_sales_usd: 0,
          expected_cash_usd: floatVal,
          user_id: userId,
          store_id: currentStoreId
        }])
        .select()
        .single();

      if (error) throw error;
      setCurrentShift(data);
      setShowOpenShiftModal(false);
      setOpeningFloat('');
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

    const actualCash = parseFloat(actualCashCounted) || 0;
    const shiftSales = sales.filter(s => s.shift_id === currentShift.id && s.status === 'completed');
    const cashCollectedUSD = shiftSales.reduce((sum, s) => sum + (s.payment_details?.cash_usd || 0), 0);
    const expectedCash = currentShift.opening_float_usd + cashCollectedUSD;
    const difference = parseFloat((actualCash - expectedCash).toFixed(2));

    try {
      const { error } = await supabase
        .from('shifts')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          expected_cash_usd: expectedCash,
          actual_cash_usd: actualCash,
          difference_usd: difference,
          notes: shiftNotes
        })
        .eq('id', currentShift.id);

      if (error) throw error;

      alert(`Corte de caja realizado.\nDiferencia: $${difference >= 0 ? '+' : ''}${difference}`);
      setShowCloseShiftModal(false);
      setActualCashCounted('');
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
      const response = await fetch('https://ve.dolarapi.com/v1/dolares/oficial');
      if (!response.ok) throw new Error('Error al conectar con el servicio de tasa BCV');
      
      const data = await response.json();
      const liveRate = parseFloat(data.promedio || data.price);

      if (liveRate && !isNaN(liveRate)) {
        setBcvRate(liveRate);
        setLastSync(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));

        if (isOnline && storeId) {
          await supabase.from('settings').upsert({ key: 'bcv_rate', value: liveRate, store_id: storeId }, { onConflict: 'key' });
        }
        setLoadingRate(false);
        return;
      }
    } catch (error) {
      console.warn('Error obteniendo tasa en vivo:', error.message);
    }
    setLoadingRate(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
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
        category, 
        barcode,
        image_url: imageUrl,
        type: 'retail',
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
        category,
        barcode,
        image_url: imageUrl
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

  // Referencia inmutable para que el callback del escáner en vivo siempre tenga el estado fresco
  const handleScannedCodeResultRef = useRef(handleScannedCodeResult);
  useEffect(() => {
    handleScannedCodeResultRef.current = handleScannedCodeResult;
  });

  // Lógica del nuevo Motor de Escaneo en Vivo (html5-qrcode)
  useEffect(() => {
    if (showCameraScannerModal) {
      // Pequeño retardo para asegurar que el DOM pinto el DIV
      const timer = setTimeout(() => {
        const html5QrCode = new Html5Qrcode("fiskal-qr-reader");
        html5QrCodeRef.current = html5QrCode;

        html5QrCode.start(
          { facingMode: "environment" },
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Se leyó exitosamente. Detenemos la cámara inmediatamente.
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
          (errorMessage) => {
            // Ignoramos errores de lectura de fotogramas, son normales hasta que enfoca bien
          }
        ).catch((err) => {
          setCameraScanError("Error al iniciar cámara: " + err.message);
        });
      }, 150);

      return () => clearTimeout(timer);
    } else {
      // Limpieza si se cierra el modal
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

  // Mantenida intacta para no eliminar funciones antiguas, pero no será necesaria por el nuevo motor
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
    const newClientData = { name: clientName, document: clientDoc, phone: clientPhone, email: clientEmail, store_id: currentStoreId };

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
      if (id.toString().startsWith('local_')) {
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

  const removeFromCart = (id) => {
    setCart(prevCart => prevCart.filter(item => item.id !== id));
  };

  const updateQuantity = (id, delta) => {
    const productInfo = products.find(p => p.id === id);
    setCart(prevCart => prevCart.map(item => {
      if (item.id === id) {
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
      alert("¡Estás Offline! Cuenta guardada en espera localmente.");
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
      alert("¡Venta guardada en espera exitosamente!");
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
      if (!sale.id.toString().startsWith('local_')) {
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
        if (settlingSale.id.toString().startsWith('local_')) {
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
    
    const { data, error } = await supabase
      .from('payment_history')
      .select('*')
      .eq('sale_id', sale.id)
      .eq('store_id', currentStoreId)
      .order('created_at', { ascending: true });
    
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

  if (!session) {
    return (
      <div className="fiskal-login-container">
        <div className="product-form-card" style={{ width: '400px', maxWidth: '100%', padding: '32px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '28px', color: '#1c7ed6', marginBottom: '4px' }}>Fiskal</h2>
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
      {/* Fondo transparente para cerrar el menú flotante en horizontal al tocar afuera */}
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
          <h2>Fiskal</h2>
          <span>Sistema de Gestión</span>
        </div>
        <nav className="nav-menu">
          <button className={activeTab === 'pos' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('pos'); setSettlingSale(null); setIsSidebarExpanded(false); }}>
            <ShoppingCart size={20} /> <span>Terminal (POS)</span>
          </button>
          <button className={activeTab === 'cash' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('cash'); setIsSidebarExpanded(false); }}>
            <Lock size={20} /> <span>Caja / Turnos</span>
          </button>
          <button className={activeTab === 'products' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('products'); resetProductForm(); setIsSidebarExpanded(false); }}>
            <Package size={20} /> <span>Productos & Stock</span>
          </button>
          <button className={activeTab === 'history' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('history'); setIsSidebarExpanded(false); }}>
            <History size={20} /> <span>Historial</span>
          </button>
          <button className={activeTab === 'clients' ? 'nav-btn active' : 'nav-btn'} onClick={(e) => { e.stopPropagation(); setActiveTab('clients'); setIsSidebarExpanded(false); }}>
            <Users size={20} /> <span>Clientes</span>
          </button>
          
          {(currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
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
            {activeTab === 'pos' ? 'Terminal de Venta' : 
             activeTab === 'cash' ? 'Arqueo y Control de Caja' :
             activeTab === 'products' ? 'Gestión de Productos e Inventario' : 
             activeTab === 'history' ? 'Historial de Ventas' : 
             activeTab === 'clients' ? 'Gestión de Clientes y Rendimiento' : 
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
              <button className={`btn-sync ${loadingRate ? 'spinning' : ''}`} onClick={() => syncBcvRate(currentStoreId)} title="Sincronizar con BCV" disabled={!isOnline}>
                <RefreshCw size={14} />
              </button>
              {lastSync && <span className="sync-time">{lastSync}</span>}
            </div>
          </div>
        </header>

        <section className="content-area">
          {activeTab === 'pos' && (
            <div className="pos-grid">
              <div className="products-catalog">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <h3>Catálogo Rápido</h3>
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

                {!currentShift && (
                  <div className="alert-banner-warning">
                    <ShieldAlert size={20} />
                    <span>La caja se encuentra cerrada. Debes abrir un turno en la pestaña <strong>Caja / Turnos</strong> para poder facturar.</span>
                  </div>
                )}
                <div className="catalog-grid">
                  {products.length === 0 ? (
                    <p className="empty-text">No hay productos registrados. Ve a Productos para agregarlos.</p>
                  ) : (
                    products.map((prod) => (
                      <div 
                        key={prod.id} 
                        className={`product-card ${prod.stock <= 0 ? 'out-of-stock' : ''}`} 
                        onClick={() => addToCart(prod)}
                      >
                        {prod.image_url ? (
                          <img src={prod.image_url} alt={prod.name} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', marginBottom: '6px' }} />
                        ) : (
                          <div style={{ width: '100%', height: '80px', background: '#f1f3f5', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', marginBottom: '6px', color: '#adb5bd' }}>
                            <ImageIcon size={28} />
                          </div>
                        )}
                        <h4>{prod.name}</h4>
                        <span className="product-price">${prod.price.toFixed(2)}</span>
                        <div style={{ marginTop: '6px', fontSize: '11px', color: prod.stock <= 2 ? '#fa5252' : '#6c757d', fontWeight: '600' }}>
                          Stock: {prod.stock !== undefined ? prod.stock : 0}
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-info">
                          <strong>{item.name}</strong>
                          <span>${item.price.toFixed(2)} c/u</span>
                        </div>
                        <div className="cart-item-controls">
                          <button onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button>
                          <span>{item.quantity}</span>
                          <button onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button>
                          <button className="btn-delete" onClick={() => removeFromCart(item.id)}><Trash2 size={14}/></button>
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
                      <Clock size={14} /> En Espera
                    </button>
                    <button className="btn-primary checkout-btn" onClick={() => { setSettlingSale(null); setShowPaymentModal(true); }} disabled={cart.length === 0 || !currentShift} style={{ flex: 2 }}>
                      <CreditCard size={16} /> Cobrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'admin' && currentUserRole === 'super_admin' && (
            <div className="products-layout">
              <div className="product-form-card">
                <h3>{editingStore ? `Editando: ${editingStore.name}` : 'Registrar Nuevo Comercio SaaS'}</h3>
                <form onSubmit={handleSaveStore} className="fiskal-form">
                  <div className="form-group">
                    <label>Nombre del Negocio / Comercio</label>
                    <input 
                      type="text" 
                      value={storeName} 
                      onChange={(e) => setStoreName(e.target.value)} 
                      placeholder="Ej. Inversiones La Esquina C.A." 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>RIF del Negocio</label>
                    <input 
                      type="text" 
                      value={storeRif} 
                      onChange={(e) => setStoreRif(e.target.value)} 
                      placeholder="Ej. J-12345678-9" 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label>Nombre del Propietario</label>
                      <input 
                        type="text" 
                        value={ownerName} 
                        onChange={(e) => setOwnerName(e.target.value)} 
                        placeholder="Ej. Carlos Pérez" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Cédula del Propietario</label>
                      <input 
                        type="text" 
                        value={ownerDoc} 
                        onChange={(e) => setOwnerDoc(e.target.value)} 
                        placeholder="Ej. V-12345678" 
                      />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label>Teléfono de Contacto</label>
                      <input 
                        type="text" 
                        value={storePhone} 
                        onChange={(e) => setStorePhone(e.target.value)} 
                        placeholder="Ej. 0414-1234567" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Correo Electrónico</label>
                      <input 
                        type="email" 
                        value={storeEmail} 
                        onChange={(e) => setStoreEmail(e.target.value)} 
                        placeholder="correo@negocio.com" 
                      />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>Dirección Física</label>
                    <input 
                      type="text" 
                      value={storeAddress} 
                      onChange={(e) => setStoreAddress(e.target.value)} 
                      placeholder="Ej. Av. Principal, Local 4" 
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div className="form-group">
                      <label>Ciudad</label>
                      <input 
                        type="text" 
                        value={storeCity} 
                        onChange={handleCityChange} 
                        placeholder="Ej. Los Teques" 
                      />
                    </div>
                    <div className="form-group">
                      <label>Estado (Auto-detectado)</label>
                      <input 
                        type="text" 
                        value={storeState} 
                        onChange={(e) => setStoreState(e.target.value)} 
                        placeholder="Ej. Miranda" 
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    {editingStore && (
                      <button type="button" className="btn-secondary" onClick={resetStoreForm} style={{ flex: 1 }}>
                        Cancelar
                      </button>
                    )}
                    <button type="submit" className="btn-primary" style={{ flex: 2 }}>
                      <Store size={18} /> {editingStore ? 'Actualizar Comercio' : 'Registrar Comercio'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="product-list-card">
                <h3>Comercios Registrados ({adminStores.length})</h3>
                <div className="table-responsive">
                  <table className="fiskal-table">
                    <thead>
                      <tr>
                        <th>Negocio & RIF</th>
                        <th>Propietario & Cédula</th>
                        <th>Ubicación</th>
                        <th>Estatus</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminStores.length === 0 ? (
                        <tr>
                          <td colSpan="5" className="empty-text">No hay comercios registrados.</td>
                        </tr>
                      ) : (
                        adminStores.map((store) => (
                          <tr key={store.id}>
                            <td>
                              <strong>{store.name}</strong><br/>
                              <span style={{ fontSize: '11px', color: '#6c757d' }}>{store.rif || store.document || 'Sin RIF'}</span>
                            </td>
                            <td>
                              <span>{store.owner_name || 'No especificado'}</span><br/>
                              <span style={{ fontSize: '11px', color: '#6c757d' }}>{store.owner_document || 'Sin Cédula'} | {store.phone || 'Sin Telf'}</span>
                            </td>
                            <td>
                              <span style={{ fontSize: '12px' }}>{store.city || '---'}, {store.state || '---'}</span><br/>
                              <span style={{ fontSize: '11px', color: '#6c757d' }}>{store.address || 'Sin dirección'}</span>
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
                                <button 
                                  className="btn-icon-success" 
                                  onClick={() => handleOpenOwnerModal(store)}
                                  title="Crear o Asignar Acceso de Administrador para este negocio"
                                  style={{ background: '#2b8a3e', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <Key size={13} /> Acceso
                                </button>
                                <button 
                                  className="btn-icon-edit" 
                                  onClick={() => handleStartEditStore(store)}
                                  title="Editar Datos"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button 
                                  className="btn-secondary" 
                                  onClick={() => handleToggleStoreStatus(store.id, store.is_active)}
                                  style={{ borderColor: store.is_active ? '#fa5252' : '#2b8a3e', color: store.is_active ? '#fa5252' : '#2b8a3e', fontSize: '11px', padding: '4px 8px' }}
                                >
                                  {store.is_active ? 'Suspender' : 'Activar'}
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

          {activeTab === 'cash' && (
            <div className="product-form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
              <h3>Gestión de Turno y Arqueo de Caja</h3>
              
              {currentShift ? (
                <div style={{ marginTop: '20px' }}>
                  <div className="shift-active-box">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <span className="badge-completed">CAJA ABIERTA: {getCurrentRegisterName()}</span>
                        <p style={{ fontSize: '13px', color: '#6c757d', marginTop: '4px' }}>
                          Iniciado el: {new Date(currentShift.opened_at).toLocaleString()}
                        </p>
                      </div>
                      <button className="btn-primary" onClick={() => setShowCloseShiftModal(true)} style={{ background: '#fa5252' }}>
                        Cerrar Turno (Reporte Z)
                      </button>
                    </div>

                    <div className="payment-summary-box" style={{ marginTop: '16px' }}>
                      <div>
                        <span>Fondo Inicial:</span>
                        <h2>${currentShift.opening_float_usd.toFixed(2)}</h2>
                      </div>
                      <div>
                        <span>Ventas del Turno:</span>
                        <h2 style={{ color: '#2b8a3e' }}>${shiftTotalUSD.toFixed(2)}</h2>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span>Efectivo Esperado en Gaveta:</span>
                        <h3>${(currentShift.opening_float_usd + shiftCashUSD).toFixed(2)}</h3>
                      </div>
                    </div>

                    <div className="invoice-payment-breakdown" style={{ marginTop: '20px' }}>
                      <h4>Desglose de Ingresos en Turno Actual</h4>
                      <p><span>Efectivo USD:</span> <strong>${shiftCashUSD.toFixed(2)}</strong></p>
                      <p><span>Efectivo Bs:</span> <strong>Bs. {shiftCashBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></p>
                      <p><span>Zelle:</span> <strong>${shiftZelle.toFixed(2)}</strong></p>
                      <p><span>Pago Móvil:</span> <strong>Bs. {shiftPagoMovilBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></p>
                      <p><span>Punto / Débito:</span> <strong>Bs. {shiftDebitBs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</strong></p>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <Lock size={48} color="#6c757d" style={{ marginBottom: '16px' }} />
                  <h4>No hay ningún turno de caja abierto</h4>
                  <p style={{ color: '#6c757d', fontSize: '14px', margin: '8px 0 24px 0' }}>
                    Selecciona una de tus cajas físicas registradas para iniciar operaciones.
                  </p>
                  <button className="btn-primary" onClick={() => setShowOpenShiftModal(true)} style={{ margin: '0 auto' }}>
                    Abrir Nueva Caja / Turno
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="product-list-card" style={{ width: '100%' }}>
              <h3>Registro de Ventas y Cuentas ({sales.length})</h3>
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
                    {sales.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="empty-text">No hay ventas registradas.</td>
                      </tr>
                    ) : (
                      sales.map((sale) => (
                        <tr key={sale.id}>
                          <td><strong>#{sale.id.toString().startsWith('local') ? 'Pendiente' : sale.id}</strong></td>
                          <td>{new Date(sale.created_at).toLocaleString()}</td>
                          <td>{sale.client_name || 'Cliente General'}</td>
                          <td><strong>${sale.total_usd.toFixed(2)}</strong></td>
                          <td>
                            {sale.status === 'credit' ? (
                              <span style={{ color: '#fa5252', fontWeight: 'bold' }}>${(sale.balance_due_usd !== undefined ? sale.balance_due_usd : sale.total_usd).toFixed(2)}</span>
                            ) : (
                              <span>$0.00</span>
                            )}
                          </td>
                          <td>
                            {sale.status === 'credit' ? (
                              <span className="badge-credit"><AlertCircle size={12}/> Crédito</span>
                            ) : sale.status === 'pending' ? (
                              <span className="badge-pending"><Clock size={12}/> En Espera</span>
                            ) : (
                              <span className="badge-completed"><CheckCircle size={12}/> Pagada</span>
                            )}
                          </td>
                          <td className="action-cell">
                            <div className="action-buttons">
                              {sale.status === 'pending' && (
                                <button className="btn-icon-success" onClick={() => handleResumeOrder(sale)} title="Retomar cuenta">
                                  <Play size={16} />
                                </button>
                              )}
                              {sale.status === 'credit' && (
                                <button className="btn-icon-success" onClick={() => handleStartSettleCredit(sale)} title="Abonar">
                                  <DollarSign size={16} />
                                </button>
                              )}
                              {sale.status === 'credit' && (
                                <button className="btn-icon-whatsapp" onClick={() => sendWhatsAppReminder(sale)} title="WhatsApp">
                                  <MessageCircle size={16} />
                                </button>
                              )}
                              <button className="btn-icon-primary" onClick={() => handleViewInvoice(sale)} title="Ver Factura">
                                <Eye size={18} />
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
                <h3>Lista y Rendimiento de Clientes ({clientsWithMetrics.length})</h3>
                <div className="table-responsive">
                  <table className="fiskal-table">
                    <thead>
                      <tr>
                        <th>Cliente & Cédula</th>
                        <th>Total Facturado</th>
                        <th>Saldo Pendiente</th>
                        <th>Rendimiento</th>
                        <th style={{ textAlign: 'center' }}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {clientsWithMetrics.length === 0 ? (
                        <tr><td colSpan="5" className="empty-text">No hay clientes registrados.</td></tr>
                      ) : (
                        clientsWithMetrics.map((cli, index) => (
                          <tr key={cli.id}>
                            <td>
                              <strong>{cli.name}</strong><br/>
                              <span style={{ fontSize: '11px', color: '#6c757d' }}>{cli.document || 'Sin Cédula'}</span>
                            </td>
                            <td><strong>${cli.totalBilled.toFixed(2)}</strong></td>
                            <td>
                              {cli.totalPending > 0 ? (
                                <span style={{ color: '#fa5252', fontWeight: 'bold' }}>${cli.totalPending.toFixed(2)}</span>
                              ) : (
                                <span style={{ color: '#2b8a3e' }}>$0.00</span>
                              )}
                            </td>
                            <td>
                              {index === 0 && cli.totalBilled > 0 ? (
                                <span className="badge-completed" style={{ background: '#e7f5ff', color: '#1971c2' }}>
                                  <Award size={12}/> Top 1 (VIP)
                                </span>
                              ) : (
                                <span style={{ fontSize: '12px', color: '#495057' }}>Activo</span>
                              )}
                            </td>
                            <td className="action-cell">
                              <div className="action-buttons">
                                {cli.totalPending > 0 && cli.phone && (
                                  <button className="btn-icon-whatsapp" onClick={() => sendClientGeneralWhatsApp(cli, cli.totalPending)} title="Cobro por WhatsApp">
                                    <MessageCircle size={16} />
                                  </button>
                                )}
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
                <h3>{editingProduct ? `Editando: ${editingProduct.name}` : 'Agregar Nuevo Producto'}</h3>
                <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="fiskal-form">
                  <div className="form-group">
                    <label>Fotografía del Producto</label>
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
                    <label>Nombre del Producto</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Ej. Harina PAN" />
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
                    <input type="text" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Víveres" />
                  </div>
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
                <h3>Inventario Actual ({products.length})</h3>
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
                      {products.map((prod) => (
                        <tr key={prod.id}>
                          <td>
                            {prod.image_url ? (
                              <img src={prod.image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                            ) : (
                              <div style={{ width: '40px', height: '40px', background: '#f1f3f5', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#adb5bd' }}>
                                <ImageIcon size={18} />
                              </div>
                            )}
                          </td>
                          <td><strong>{prod.name}</strong></td>
                          <td>{prod.barcode || '---'}</td>
                          <td>${prod.price.toFixed(2)}</td>
                          <td><strong>{prod.stock}</strong></td>
                          <td className="action-cell">
                            <div className="action-buttons">
                              <button className="btn-icon-primary" onClick={() => handleOpenLabel(prod)} title="QR">
                                <QrCode size={16} />
                              </button>
                              <button className="btn-icon-edit" onClick={() => handleStartEditProduct(prod)} title="Editar">
                                <Edit2 size={16} />
                              </button>
                              <button className="btn-icon-danger" onClick={() => handleDeleteProduct(prod.id)} title="Eliminar">
                                <Trash2 size={16} />
                              </button>
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

          {activeTab === 'settings' && (currentUserRole === 'owner' || currentUserRole === 'super_admin') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '1000px', margin: '0 auto', width: '100%' }}>
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
                      <input type="checkbox" id="isMainReg" checked={isMainRegister} onChange={(e) => setIsMainRegister(e.checked)} style={{ width: '18px', height: '18px', cursor: 'pointer' }} />
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

      {/* MODAL PARA ESCÁNER DE CÁMARA (NUEVO MOTOR EN VIVO: HTML5-QRCODE) */}
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
              {/* Contenedor oficial para la librería html5-qrcode */}
              <div id="fiskal-qr-reader" style={{ width: '100%', minHeight: '250px', background: '#000', borderRadius: '8px', overflow: 'hidden' }}></div>

              {cameraScanError ? (
                <p style={{ color: '#fa5252', fontSize: '12px', marginTop: '8px' }}>{cameraScanError}</p>
              ) : (
                <p style={{ color: '#6c757d', fontSize: '12px', marginTop: '8px' }}>Apunta al código para escanear automáticamente</p>
              )}

              {/* Botón de captura directa nativa (Lo mantengo oculto para no eliminar código tuyo, pero el escaneo en vivo ya funciona perfectamente) */}
              <div style={{ marginTop: '12px', display: 'none' }}>
                <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', cursor: 'pointer', background: '#2b8a3e', color: '#fff', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>
                  <Camera size={18} /> Tomar Foto del Código (Respaldo)
                  <input type="file" accept="image/*" capture="environment" onChange={handleCapturePhotoScan} style={{ display: 'none' }} />
                </label>
              </div>
            </div>
            <div className="modal-footer" style={{ borderTop: 'none', justifyContent: 'center' }}>
              <button type="button" className="btn-secondary" onClick={stopCameraScanner} style={{ width: '100%' }}>
                Cancelar Escáner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL PARA CREAR ACCESO DE DUEÑO DESDE EL PANEL MAESTRO */}
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
                <p style={{ fontSize: '13px', color: '#6c757d', marginBottom: '12px' }}>
                  Comercio: <strong>{targetStoreForOwner.name}</strong>
                </p>
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

      {/* MODAL REGISTRO RÁPIDO DE CLIENTE (POS) */}
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

      {/* MODAL DETALLE DE FACTURA */}
      {showInvoiceModal && selectedInvoice && (
        <div className="modal-overlay" style={{ zIndex: 10000 }}>
          <div className="modal-content" style={{ width: '500px' }}>
            <div className="modal-header">
              <h3>Factura #{selectedInvoice.id.toString().startsWith('local') ? 'Pendiente' : selectedInvoice.id}</h3>
              <button className="btn-close-modal" onClick={() => setShowInvoiceModal(false)}>
                <X size={20} />
              </button>
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
                    <tr>
                      <th>Cant</th>
                      <th>Producto</th>
                      <th>Precio Unit</th>
                      <th>Subtotal</th>
                    </tr>
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
                  <span>Total Facturado:</span>
                  <strong>${selectedInvoice.total_usd.toFixed(2)}</strong>
                </div>
                {selectedInvoice.balance_due_usd > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#fa5252' }}>
                    <span>Saldo Pendiente:</span>
                    <strong>${selectedInvoice.balance_due_usd.toFixed(2)}</strong>
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

      {/* MODALES ADICIONALES (Caja, WhatsApp, Pagos, Facturas, etc.) */}
      {showOpenShiftModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ width: '420px' }}>
            <div className="modal-header">
              <h3>Apertura de Caja / Turno</h3>
              <button className="btn-close-modal" onClick={() => setShowOpenShiftModal(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleOpenShift}>
              <div className="modal-body fiskal-form">
                <div className="form-group">
                  <label>Seleccionar Caja Física</label>
                  <select 
                    value={selectedRegisterIdForOpen} 
                    onChange={(e) => setSelectedRegisterIdForOpen(e.target.value)}
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ced4da', fontSize: '13px', background: '#fff' }}
                    required
                  >
                    {registers.length === 0 && <option value="">-- No hay cajas configuradas --</option>}
                    {registers.map(reg => (
                      <option key={reg.id} value={reg.id}>
                        {reg.name} {reg.is_main ? '⭐ (Caja Principal)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Fondo de Cambio Inicial ($ USD)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    value={openingFloat} 
                    onChange={(e) => setOpeningFloat(e.target.value)} 
                    placeholder="Ej. 50.00" 
                    required 
                  />
                  <span style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                    Dinero físico en dólares con el que arranca esta caja hoy.
                  </span>
                </div>
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
          <div className="modal-content" style={{ width: '450px' }}>
            <div className="modal-header">
              <h3>Cierre de Turno ({getCurrentRegisterName()})</h3>
              <button className="btn-close-modal" onClick={() => setShowCloseShiftModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-summary-box">
                <div>
                  <span>Efectivo Esperado:</span>
                  <h2>${(currentShift ? currentShift.opening_float_usd + shiftCashUSD : 0).toFixed(2)}</h2>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Efectivo Físico Contado ($ USD)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={actualCashCounted} 
                  onChange={(e) => setActualCashCounted(e.target.value)} 
                  placeholder="0.00" 
                  required 
                />
                <span style={{ fontSize: '11px', color: '#6c757d', marginTop: '4px' }}>
                  Cuenta los billetes reales en gaveta e ingrésalos aquí.
                </span>
              </div>
              <div className="form-group">
                <label>Notas u Observaciones (Opcional)</label>
                <input 
                  type="text" 
                  value={shiftNotes} 
                  onChange={(e) => setShiftNotes(e.target.value)} 
                  placeholder="Ej. Sin novedad / Retiro de $20" 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowCloseShiftModal(false)}>Cancelar</button>
              <button type="button" className="btn-primary" onClick={handleCloseShift} style={{ background: '#fa5252' }}>
                Confirmar Cierre de Turno
              </button>
            </div>
          </div>
        </div>
      )}

      {showLabelModal && labelProduct && (
        <div className="modal-overlay">
          <div className="modal-content label-modal-content">
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <QrCode size={18} /> Etiqueta de Producto
              </h3>
              <button className="btn-close-modal" onClick={() => setShowLabelModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body label-print-area" style={{ textAlign: 'center', padding: '24px' }}>
              <div className="store-tag-header">FISKAL STORE</div>
              <h2 className="tag-product-name">{labelProduct.name}</h2>
              <div className="tag-qr-container">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(`ID:${labelProduct.id}|PROD:${labelProduct.name}|PRECIO:$${labelProduct.price.toFixed(2)}`)}`} 
                  alt="QR Producto" 
                  style={{ width: '160px', height: '160px', margin: '12px auto', display: 'block' }}
                />
              </div>
              <div className="tag-price-box">
                <span className="tag-currency">USD</span>
                <span className="tag-price-value">${labelProduct.price.toFixed(2)}</span>
              </div>
              <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '6px' }}>
                Escanea para consultar o pagar referencialmente
              </div>
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
                </div>
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
                <button className="btn-secondary" onClick={handleCreditCheckout} style={{ borderColor: '#fa5252', color: '#fa5252' }}>
                  Pasar a Crédito
                </button>
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
    </div>
  );
}

export default App;