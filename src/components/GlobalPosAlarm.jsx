import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

export default function GlobalPosAlarm({ supabase, currentStoreId, currentShift }) {
  const [alerts, setAlerts] = useState([]);

  useEffect(() => {
    if (!supabase || !currentStoreId || !currentShift) {
      setAlerts([]);
      return;
    }

    const alarmSound = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');

    const checkAlarms = async () => {
      // Traer puntos de venta
      const { data: terminals } = await supabase.from("pos_terminals").select("*").eq("store_id", currentStoreId);
      // Traer cierres de hoy
      const { data: closures } = await supabase.from("pos_closures").select("*").eq("shift_id", currentShift.id);

      if (!terminals) return;

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const newAlerts = [];
      let playAlarm = false;

      terminals.forEach(pos => {
        const isClosed = closures?.some(c => c.pos_terminal_id === pos.id);
        if (isClosed) return; // Si ya se cerró, no suena

        const [hours, mins] = pos.closing_time.split(':').map(Number);
        const posMinutes = hours * 60 + mins;
        const diff = posMinutes - currentMinutes;

        if (diff > 0 && diff <= 5) {
          newAlerts.push({ id: pos.id, message: `Faltan ${diff} min para cerrar ${pos.name} (${pos.bank})`, type: 'warning' });
        } else if (diff <= 0 && diff >= -60) {
          newAlerts.push({ id: pos.id, message: `¡URGENTE! Cierra YA el lote de ${pos.name} (${pos.bank})`, type: 'critical' });
          playAlarm = true;
        }
      });

      setAlerts(newAlerts);
      if (playAlarm) {
        alarmSound.play().catch(e => console.log("Audio bloqueado", e));
      }
    };

    checkAlarms();
    const interval = setInterval(checkAlarms, 60000); // Revisa cada 1 minuto
    return () => clearInterval(interval);
  }, [supabase, currentStoreId, currentShift]);

  if (alerts.length === 0) return null;

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      left: '24px',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '10px'
    }}>
      {alerts.map((al, idx) => (
        <div key={idx} className={al.type === 'critical' ? 'pulse-animation' : ''} style={{
          background: al.type === 'critical' ? '#ef4444' : '#f59e0b',
          color: '#fff',
          padding: '16px',
          borderRadius: '12px',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '300px',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <Clock size={24} className={al.type === 'critical' ? 'vibrate' : ''} />
          <div>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>
              Alarma de Punto de Venta
            </strong>
            <span style={{ fontSize: '12px', opacity: 0.9 }}>{al.message}</span>
          </div>
        </div>
      ))}
    </div>
  );
}