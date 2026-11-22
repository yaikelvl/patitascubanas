import React from 'react';
import { PawPrint, Phone, Mail, MapPin, MessageCircle } from 'lucide-react';

export default function Footer({ site }) {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#080d09] border-t border-emerald-950/80 text-stone-400 text-xs sm:text-sm pt-14 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Brand info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                <PawPrint className="w-4 h-4" />
              </div>
              <span className="font-extrabold text-base text-white tracking-tight">
                Patitas<span className="text-emerald-400">Cubanas</span>
              </span>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed max-w-sm">
              {site?.description ||
                'Plataforma comunitaria e independiente para la promoción de la adopción responsable y rescate de animales en todas las provincias de Cuba.'}
            </p>
            <p className="text-emerald-400/90 text-xs font-semibold">
              🇨🇺 Por el bienestar y la dignidad animal en toda Cuba.
            </p>
          </div>

          {/* Quick Links */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">Navegación</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <a href="#mascotas" className="hover:text-emerald-400 transition-colors">
                  Mascotas en Adopción
                </a>
              </li>
              <li>
                <a href="#donativos" className="hover:text-emerald-400 transition-colors text-amber-300 font-semibold">
                  Donativos a Tarjetas Cuba
                </a>
              </li>
              <li>
                <a href="#transito" className="hover:text-emerald-400 transition-colors">
                  Hogares de Tránsito
                </a>
              </li>
              <li>
                <a href="#historias" className="hover:text-emerald-400 transition-colors">
                  Finales Felices
                </a>
              </li>
              <li>
                <a href="#faq" className="hover:text-emerald-400 transition-colors">
                  Preguntas Frecuentes
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-3">
            <h5 className="text-xs font-bold uppercase tracking-wider text-white">Contacto Solidario</h5>
            <div className="space-y-2 text-xs">
              <p className="flex items-center gap-2 text-stone-300">
                <Phone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href={`tel:${(site?.phonePrimary || '+53 5200 0000').replace(/[^0-9+]/g, '')}`} className="hover:text-emerald-300 transition-colors">
                  {site?.phonePrimary || '+53 5200 0000'}
                </a>
              </p>
              <p className="flex items-center gap-2 text-stone-300">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a
                  href={`https://wa.me/${(site?.whatsapp || '5352000000').replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-emerald-300 transition-colors"
                >
                  WhatsApp: {site?.whatsapp || '5352000000'}
                </a>
              </p>
              <p className="flex items-center gap-2 text-stone-300">
                <Mail className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <a href={`mailto:${site?.email || 'contacto@patitascubanas.org'}`} className="hover:text-emerald-300 transition-colors">
                  {site?.email || 'contacto@patitascubanas.org'}
                </a>
              </p>
              <p className="flex items-center gap-2 text-stone-300">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>{site?.address || 'La Habana & Villa Clara, Cuba'}</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-emerald-950 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-stone-400">
          <p>© {currentYear} Patitas Cubanas. Iniciativa comunitaria sin fines de lucro.</p>
          <p className="text-stone-400 text-[11px]">
            Hecho con amor por los animales vulnerables en toda Cuba
          </p>
        </div>
      </div>
    </footer>
  );
}
