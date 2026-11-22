import React, { useState } from 'react';
import { Heart, Menu, X, PawPrint, Landmark } from 'lucide-react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#0c120e]/85 border-b border-emerald-900/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <a href="#" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-950/40 group-hover:scale-105 transition-transform">
            <PawPrint className="w-5 h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-lg tracking-tight text-white group-hover:text-emerald-400 transition-colors">
              Patitas<span className="text-emerald-400 font-bold">Cubanas</span>
            </span>
            <span className="text-[10px] text-stone-400 font-medium tracking-wide uppercase -mt-1">
              Adopción Responsable
            </span>
          </div>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-300">
          <a href="#mascotas" className="hover:text-emerald-400 transition-colors">
            En Adopción
          </a>
          <a href="#donativos" className="hover:text-emerald-400 transition-colors flex items-center gap-1.5 text-amber-300/90 font-semibold">
            <Landmark className="w-3.5 h-3.5" />
            Donativos Cuba
          </a>
          <a href="#transito" className="hover:text-emerald-400 transition-colors">
            Hogares de Tránsito
          </a>
          <a href="#historias" className="hover:text-emerald-400 transition-colors">
            Finales Felices
          </a>
          <a href="#faq" className="hover:text-emerald-400 transition-colors">
            Preguntas
          </a>
        </nav>

        {/* Action Button */}
        <div className="hidden md:flex items-center gap-3">
          <a
            href="#mascotas"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-md shadow-emerald-900/40 transition-all hover:scale-[1.02]"
          >
            <Heart className="w-4 h-4 fill-white/20" />
            <span>Adoptar Ahora</span>
          </a>
        </div>

        {/* Mobile menu trigger */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 text-stone-300 hover:text-white"
            aria-label="Abrir menú"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="md:hidden bg-[#0c120e] border-b border-emerald-900/40 px-4 pt-2 pb-6 space-y-3">
          <a
            href="#mascotas"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-stone-200 hover:text-emerald-400 font-medium"
          >
            🐾 En Adopción
          </a>
          <a
            href="#donativos"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-amber-300 font-semibold"
          >
            💳 Donativos Tarjetas Cuba
          </a>
          <a
            href="#transito"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-stone-200 hover:text-emerald-400 font-medium"
          >
            🏡 Hogares de Tránsito
          </a>
          <a
            href="#historias"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-stone-200 hover:text-emerald-400 font-medium"
          >
            ✨ Finales Felices
          </a>
          <a
            href="#faq"
            onClick={() => setIsOpen(false)}
            className="block py-2 text-stone-200 hover:text-emerald-400 font-medium"
          >
            ❓ Preguntas Frecuentes
          </a>
          <div className="pt-2">
            <a
              href="#mascotas"
              onClick={() => setIsOpen(false)}
              className="w-full text-center flex items-center justify-center gap-2 bg-emerald-600 text-white py-2.5 rounded-xl font-semibold shadow-md"
            >
              <Heart className="w-4 h-4 fill-white/20" />
              <span>Ver Mascotas</span>
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
