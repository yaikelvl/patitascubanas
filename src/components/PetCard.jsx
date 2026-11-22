import React, { useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  MessageCircle,
  Heart,
  Sparkles,
  Info
} from 'lucide-react';
import { buildPetImageProps } from '../utils/imageUtils';

export default function PetCard({ pet, onSelectPet }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const imageProps = buildPetImageProps(pet);

  const cleanWhatsapp = (pet.contactWhatsapp || '5352000000').replace(/[^0-9]/g, '');
  const whatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    `¡Hola! Estoy muy interesado/a en adoptar a ${pet.name} (${pet.species}, ubicado en ${pet.municipality}, ${pet.province}) que vi en Patitas Cubanas. ¿Sigue disponible?`
  )}`;

  const isUrgent = pet.status === 'urgente' || pet.badge?.toLowerCase().includes('urgente');
  const isAdopted = pet.status === 'adoptado';

  return (
    <article className="group bg-[#131b15] border border-emerald-900/30 rounded-3xl overflow-hidden shadow-lg hover:shadow-2xl hover:border-emerald-700/50 transition-all duration-300 flex flex-col">
      {/* Photo Header */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-stone-950">
        <img
          {...imageProps}
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${
            imgLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
        {!imgLoaded && (
          <div className="absolute inset-0 bg-stone-900 animate-pulse flex items-center justify-center">
            <span className="text-2xl">🐾</span>
          </div>
        )}

        {/* Gradient overlay for legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#131b15] via-transparent to-black/30 pointer-events-none" />

        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
          <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-black/60 backdrop-blur-md text-emerald-300 border border-emerald-500/20 shadow-sm">
            {pet.species} • {pet.gender}
          </span>

          {isUrgent && (
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-rose-600/90 text-white shadow-md flex items-center gap-1 animate-pulse">
              <AlertCircle className="w-3.5 h-3.5" />
              Urgente
            </span>
          )}
          {isAdopted && (
            <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-600 text-white shadow-md">
              ¡Adoptado! 🎉
            </span>
          )}
          {!isUrgent && !isAdopted && pet.badge && (
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-500/30">
              {pet.badge}
            </span>
          )}
        </div>

        {/* Floating location tag over photo */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 text-xs font-medium text-white/90 bg-black/50 backdrop-blur-sm px-2.5 py-1 rounded-lg">
          <MapPin className="w-3.5 h-3.5 text-emerald-400" />
          <span>{pet.municipality}, {pet.province}</span>
        </div>
      </div>

      {/* Body content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-extrabold text-white group-hover:text-emerald-300 transition-colors">
              {pet.name}
            </h3>
            <span className="text-xs font-medium text-stone-400">
              {pet.approxAge || pet.ageCategory} • {pet.size}
            </span>
          </div>

          <p className="text-xs text-emerald-400/90 font-medium mt-0.5">
            {pet.breed || 'Mestizo criollo cubano'}
          </p>

          <p className="text-sm text-stone-300 line-clamp-2 mt-2.5 leading-relaxed">
            {pet.story}
          </p>
        </div>

        {/* Health status flags */}
        <div className="pt-2 border-t border-emerald-900/20">
          <div className="flex flex-wrap gap-1.5 text-[11px] font-medium text-stone-300">
            {pet.isVaccinated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Vacunado
              </span>
            )}
            {pet.isSterilized && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-teal-950/60 text-teal-300 border border-teal-800/40">
                <CheckCircle2 className="w-3 h-3 text-teal-400" /> Esterilizado
              </span>
            )}
            {pet.isDewormed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-stone-800/60 text-stone-300 border border-stone-700/40">
                <CheckCircle2 className="w-3 h-3 text-stone-400" /> Desparasitado
              </span>
            )}
            {pet.specialNeeds && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-950/50 text-amber-300 border border-amber-800/40 col-span-2">
                <Info className="w-3 h-3 text-amber-400" /> {pet.specialNeeds}
              </span>
            )}
          </div>
        </div>

        {/* Caregiver & WhatsApp CTA */}
        <div className="pt-3 border-t border-emerald-900/30 flex items-center justify-between gap-3">
          <div className="text-xs">
            <p className="text-stone-400 text-[10px] uppercase font-semibold">Protector(a)</p>
            <p className="text-stone-200 font-medium truncate max-w-[120px]">{pet.contactName || 'Protector Solidario'}</p>
          </div>

          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl shadow-md transition-all hover:scale-[1.02]"
          >
            <MessageCircle className="w-4 h-4 fill-white/20" />
            <span>Adoptar vía WhatsApp</span>
          </a>
        </div>
      </div>
    </article>
  );
}
