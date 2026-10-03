import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

/**
 * useAuth - Hook para manejar autenticación, sesión y recuperación de contraseña.
 *
 * Responsabilidades:
 * - Estados de login, registro, recuperación de contraseña
 * - Suscripción a cambios de sesión de Supabase
 * - Handlers: login, logout, update password, forgot password
 *
 * @param {Object} options
 * @param {Function} options.onLoginSuccess - callback cuando hay sesión activa. Recibe (session).
 * @param {Function} options.onLogout - callback cuando la sesión se cierra.
 * @param {Function} options.onPasswordRecovery - callback cuando llega evento PASSWORD_RECOVERY.
 * @param {Number} options.baseMonthlyPrice - precio base para registro de tienda nueva.
 * @param {Number} options.globalPromoDiscount - descuento global para registro.
 */
export function useAuth({
  onLoginSuccess,
  onLogout,
  onPasswordRecovery,
  baseMonthlyPrice = 30,
  globalPromoDiscount = 0,
} = {}) {
  const [session, setSession] = useState(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);

  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMessage, setResetMessage] = useState("");

  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [updatingPassword, setUpdatingPassword] = useState(false);

  // ============================================================
  // Refs para callbacks (evita que el useEffect se re-suscriba
  // cada vez que App.jsx cambia una función o un precio)
  // ============================================================
  const onLoginSuccessRef = useRef(onLoginSuccess);
  const onLogoutRef = useRef(onLogout);
  const onPasswordRecoveryRef = useRef(onPasswordRecovery);
  const basePriceRef = useRef(baseMonthlyPrice);
  const promoDiscountRef = useRef(globalPromoDiscount);

  useEffect(() => {
    onLoginSuccessRef.current = onLoginSuccess;
    onLogoutRef.current = onLogout;
    onPasswordRecoveryRef.current = onPasswordRecovery;
    basePriceRef.current = baseMonthlyPrice;
    promoDiscountRef.current = globalPromoDiscount;
  });

  // ============================================================
  // SUSCRIPCIÓN A CAMBIOS DE SESIÓN
  // ============================================================
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session && onLoginSuccessRef.current) {
        onLoginSuccessRef.current(session);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // 1. Detectar recuperación de contraseña
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoveringPassword(true);
        if (onPasswordRecoveryRef.current) onPasswordRecoveryRef.current();
      }

      setSession(session);

      // 2. Login exitoso
      if (session && event !== "PASSWORD_RECOVERY") {
        if (onLoginSuccessRef.current) onLoginSuccessRef.current(session);
      } else if (!session) {
        // 3. Logout
        if (onLogoutRef.current) onLogoutRef.current();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // ============================================================
  // HANDLERS
  // ============================================================

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      alert("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setUpdatingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      alert(
        "¡Contraseña actualizada con éxito! Ya puedes iniciar sesión con tu nueva clave."
      );
      setIsRecoveringPassword(false);
      setNewPassword("");
      await supabase.auth.signOut();
    } catch (err) {
      alert("Error actualizando contraseña: " + err.message);
    } finally {
      setUpdatingPassword(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!resetEmail.trim()) return;
    setResetLoading(true);
    setResetMessage("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        resetEmail.trim(),
        {
          redirectTo: window.location.origin,
        }
      );
      if (error) throw error;
      setResetMessage(
        "¡Correo enviado con éxito! Revisa tu bandeja de entrada y spam para restablecer tu contraseña."
      );
    } catch (err) {
      setResetMessage("Error: " + err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    try {
      if (isRegistering) {
        const { data, error } = await supabase.auth.signUp({
          email: authEmail,
          password: authPassword,
          options: {
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;

        if (data.user) {
          const trialEnd = new Date(
            Date.now() + 10 * 24 * 60 * 60 * 1000
          ).toISOString();
          const { data: newStore, error: storeErr } = await supabase
            .from("stores")
            .insert([
              {
                name: "Mi Comercio Nuevo",
                is_active: true,
                is_trial: true,
                trial_end_date: trialEnd,
                monthly_price_agreed: basePriceRef.current,
                custom_discount: promoDiscountRef.current,
                store_type: "standard",
              },
            ])
            .select()
            .single();

          if (!storeErr && newStore) {
            await supabase.from("profiles").upsert([
              {
                id: data.user.id,
                store_id: newStore.id,
                role: "owner",
                full_name: "Propietario Principal",
              },
            ]);
          }
        }

        alert(
          "¡Registro exitoso! Ya puedes iniciar sesión y configurar tu comercio con 10 días de cortesía."
        );
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

  return {
    // Estado
    session,
    authEmail,
    setAuthEmail,
    authPassword,
    setAuthPassword,
    authLoading,
    authError,
    isRegistering,
    setIsRegistering,
    showForgotPassword,
    setShowForgotPassword,
    resetEmail,
    setResetEmail,
    resetLoading,
    resetMessage,
    setResetMessage,
    isRecoveringPassword,
    newPassword,
    setNewPassword,
    updatingPassword,
    // Handlers
    handleUpdatePassword,
    handleForgotPasswordSubmit,
    handleLoginSubmit,
    handleLogout,
  };
}