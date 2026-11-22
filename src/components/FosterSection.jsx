import React from 'react';
import { Home, Heart, Shield, Users, ArrowRight, MessageCircle } from 'lucide-react';

export default function FosterSection({ whatsapp = '5352000000' }) {
  const cleanWhatsapp = whatsapp.replace(/[^0-9]/g, '');
  const fosterWhatsappUrl = `https://wa.me/${cleanWhatsapp}?text=${encodeURIComponent(
    '¡Hola! Me gustaría ofrecerme como Hogar de Tránsito para cuidar temporalmente a un animalito rescatado en mi municipio.'
  )}`;

  return (
    <section id="transito" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#122216] via-[#0f1b13] to-[#0c140e] border border-emerald-800/40 p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-3xl space-y-6 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950 border border-emerald-700/50 text-emerald-300 text-xs font-semibold uppercase tracking-wider">
            <Home className="w-3.5 h-3.5 text-emerald-400" />
            <span>El corazón del rescate animal en Cuba</span>
          </div>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white tracking-tight leading-tight">
            ¿No puedes adoptar para siempre? <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
              Sé un Hogar de Tránsito
            </span>
          </h2>

          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            En Cuba no existen suficientes refugios estatales. La vida de un animal atropellado o recién operado depende de familias solidarias que le brinden un rincón seguro en su casa por unos días o semanas mientras se recupera y encuentra su hogar definitivo.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-[#0c120e]/80 border border-emerald-900/40 p-4 rounded-2xl">
              <Shield className="w-6 h-6 text-emerald-400 mb-2" />
              <h4 className="text-sm font-bold text-white">Gastos Cubiertos</h4>
              <p className="text-xs text-stone-400 mt-1">La red de protectores cubre los medicamentos y ayuda con la comida.</p>
            </div>

            <div className="bg-[#0c120e]/80 border border-emerald-900/40 p-4 rounded-2xl">
              <Heart className="w-6 h-6 text-teal-400 mb-2" />
              <h4 className="text-sm font-bold text-white">Tiempo Flexible</h4>
              <p className="text-xs text-stone-400 mt-1">Tú decides cuántos días o semanas puedes acoger al animalito.</p>
            </div>

            <div className="bg-[#0c120e]/80 border border-emerald-900/40 p-4 rounded-2xl">
              <Users className="w-6 h-6 text-amber-400 mb-2" />
              <h4 className="text-sm font-bold text-white">Acompañamiento</h4>
              <p className="text-xs text-stone-400 mt-1">Nunca estarás solo: te orientamos veterinariamente en cada paso.</p>
            </div>
          </div>

          <div className="pt-4">
            <a
              href={fosterWhatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg transition-all hover:scale-105 text-sm sm:text-base"
            >
              <MessageCircle className="w-5 h-5 fill-white/20" />
              <span>Quiero ser Hogar de Tránsito</span>
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
