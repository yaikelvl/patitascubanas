import React, { useState, useEffect, useRef, startTransition } from 'react';
import Navbar from './Navbar';
import Marquee from './Marquee';
import Hero from './Hero';
import SectionReveal from './SectionReveal';
import PetSection from './PetSection';
import DonationsSection from './DonationsSection';
import FosterSection from './FosterSection';
import SuccessStories from './SuccessStories';
import FaqSection from './FaqSection';
import Footer from './Footer';
import AdminModal from './AdminModal';
import CookieBanner from './CookieBanner';
import { INITIAL_DATA } from '../data/initialData';
import { fetchAdoptionDataFromSupabase } from '../utils/supabaseClient';
import { loadFromLocalStorage, saveToLocalStorage } from '../utils/cryptoUtils';

export default function AppRoot() {
  // Inicializamos siempre con INITIAL_DATA para que SSR y cliente coincidan perfectamente
  const [state, setState] = useState(INITIAL_DATA);
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const isHydratedRef = useRef(false);

  // Escuchar atajo de teclado secreto Alt + A para abrir/cerrar admin
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        setIsAdminOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 1. Cargar datos locales de localStorage tras el montaje y escuchar hash secreto #admin
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && window.location.hash === '#admin') {
        setIsAdminOpen(true);
      }
      const handleHashChange = () => {
        if (window.location.hash === '#admin') setIsAdminOpen(true);
      };
      window.addEventListener('hashchange', handleHashChange);

      const fromStorage = loadFromLocalStorage();
      if (fromStorage) {
        startTransition(() => {
          setState((prev) => ({
            ...prev,
            ...fromStorage,
            site: { ...prev.site, ...(fromStorage.site || {}) },
            donations: { ...prev.donations, ...(fromStorage.donations || {}) },
            pets: fromStorage.pets && fromStorage.pets.length > 0 ? fromStorage.pets : prev.pets
          }));
        });
      }

      return () => window.removeEventListener('hashchange', handleHashChange);
    } catch (e) {
      console.warn('Error leyendo almacenamiento local:', e);
    }
    isHydratedRef.current = true;
  }, []);

  // 2. Sincronizar en segundo plano con la base de datos en la nube si está disponible
  useEffect(() => {
    let isMounted = true;
    async function syncFromCloud() {
      try {
        const cloudData = await fetchAdoptionDataFromSupabase();
        if (cloudData && isMounted) {
          startTransition(() => {
            setState((prev) => {
              const updated = {
                ...prev,
                ...cloudData,
                site: { ...prev.site, ...cloudData.site },
                donations: { ...prev.donations, ...cloudData.donations },
                pets: cloudData.pets && cloudData.pets.length > 0 ? cloudData.pets : prev.pets
              };
              saveToLocalStorage(updated);
              return updated;
            });
          });
        }
      } catch (err) {
        console.warn('[Cloud] Operando con datos locales:', err);
      }
    }

    syncFromCloud();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-[#0c120e] text-stone-100">
      {/* Barra superior de navegación */}
      <Navbar />

      {/* Marquesina de avisos urgentes con desplazamiento continuo */}
      <Marquee items={state.marquee} />

      <main className="flex-1">
        {/* Hero Section con Esfera 3D Fibonacci Interactiva y Auto-giro */}
        <Hero site={state.site} pets={state.pets} />

        {/* Mascotas en Adopción (Filtrado por Provincia y Municipio de Cuba) */}
        <SectionReveal>
          <PetSection pets={state.pets} />
        </SectionReveal>

        {/* Donativos y Tarjetas Bancarias en Cuba */}
        <SectionReveal>
          <DonationsSection donations={state.donations} />
        </SectionReveal>

        {/* Hogares de Tránsito */}
        <SectionReveal>
          <FosterSection whatsapp={state.site?.whatsapp} />
        </SectionReveal>

        {/* Finales Felices */}
        <SectionReveal>
          <SuccessStories stories={state.successStories} />
        </SectionReveal>

        {/* Preguntas Frecuentes */}
        <SectionReveal>
          <FaqSection faqs={state.faqs} />
        </SectionReveal>
      </main>

      {/* Footer */}
      <Footer site={state.site} />

      {/* Alerta de Cookies y Privacidad */}
      <CookieBanner />

      {/* Modal de Administración protegido con PIN */}
      {isAdminOpen && (
        <AdminModal
          isOpen={isAdminOpen}
          onClose={() => setIsAdminOpen(false)}
          state={state}
          setState={setState}
        />
      )}
    </div>
  );
}
