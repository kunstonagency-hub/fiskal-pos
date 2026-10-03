import { useState, useEffect } from "react";

// 🎯 Hook: useOnlineStatus
// Detecta si el navegador tiene conexión a internet en tiempo real.
// Se auto-suscribe a los eventos 'online' y 'offline' del navegador
// y limpia los listeners al desmontar el componente.
//
// Uso:
//   const isOnline = useOnlineStatus();
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return isOnline;
}