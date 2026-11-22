import React, { useState, useEffect } from 'react';
import { Cookie, Check, X } from 'lucide-react';

export default function CookieBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem('patitas_cookie_consent');
      if (!consent) {
        // Mostrar tras 1 segundo para entrada suave
        const timer = setTimeout(() => setIsVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      // Ignorar errores de localStorage privado
    }
  }, []);

  const handleAccept = (type = 'all') => {
    try {
      localStorage.setItem('patitas_cookie_consent', type);
    } catch (e) {}
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-[#0c140f]/95 backdrop-blur-md border border-emerald-700/50 rounded-2xl p-4 sm:p-5 shadow-2xl shadow-black/80 space-y-3 animate-fade-in text-xs select-none"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-white font-bold text-sm">
          <Cookie className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Cookies y Privacidad</span>
        </div>
        <button
          onClick={() => handleAccept('essential')}
          className="text-stone-400 hover:text-white p-1 -mr-1 -mt-1 transition-colors"
          aria-label="Cerrar aviso de cookies"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <p className="text-stone-300 text-[11px] leading-relaxed">
        Utilizamos cookies técnicas y almacenamiento local para recordar tus filtros de búsqueda por provincia, optimizar la carga rápida de fotos y garantizar una experiencia segura. No rastreamos con fines comerciales.
      </p>

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          onClick={() => handleAccept('essential')}
          className="px-3 py-1.5 rounded-xl border border-emerald-900/60 text-stone-300 hover:text-white hover:bg-emerald-950/40 text-[11px] font-semibold transition-colors"
        >
          Solo esenciales
        </button>

        <button
          onClick={() => handleAccept('all')}
          className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md shadow-emerald-950/60 transition-all hover:scale-105 flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5 stroke-[3]" />
          <span>Aceptar todas</span>
        </button>
      </div>
    </div>
  );
}
