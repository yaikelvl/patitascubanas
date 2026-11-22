import React, { useState } from 'react';
import {
  CreditCard,
  Copy,
  Check,
  HeartHandshake,
  MessageCircle,
  Smartphone,
  Package,
  Coins
} from 'lucide-react';

export default function DonationsSection({ donations }) {
  const [copiedField, setCopiedField] = useState(null);

  if (!donations || donations.isActive === false) return null;

  const handleCopy = (text, fieldName) => {
    if (!text) return;
    const cleanNumber = text.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanNumber);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const whatsappConfirmationUrl = `https://wa.me/${(donations.phoneConfirmation || '5352000000').replace(
    /[^0-9]/g,
    ''
  )}?text=${encodeURIComponent('Hola, acabo de realizar un donativo solidario para los rescataditos de Patitas Cubanas. Les adjunto el comprobante:')}`;

  return (
    <section id="donativos" className="py-16 sm:py-24 bg-[#0a0f0c] border-y border-emerald-950/60 relative overflow-hidden">
      {/* Glow decorations */}
      <div className="absolute top-1/2 left-0 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-950/70 border border-amber-800/40 text-amber-300 text-xs font-semibold uppercase tracking-wider">
            <HeartHandshake className="w-3.5 h-3.5 text-amber-400" />
            <span>Solidaridad en Cuba y el Exterior</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            {donations.title || 'Billeteras y Donativos Solidarios'}
          </h2>
          <p className="text-stone-300 text-sm sm:text-base leading-relaxed">
            {donations.description ||
              'No contamos con fondos estatales. Cada rescate, vacuna, esterilización y plato de comida es posible gracias al aporte voluntario de la comunidad.'}
          </p>
        </div>

        {/* Bank & Crypto Wallets Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto mb-14">
          {/* Card CUP */}
          <div className="relative group rounded-3xl p-6 bg-gradient-to-br from-[#122417] via-[#101e14] to-[#0a140d] border border-emerald-800/50 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Billetera CUP</h4>
                    <p className="text-[11px] text-emerald-400/90 font-medium">Transfermóvil & EnZona</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-300 bg-emerald-950/90 border border-emerald-700/40 px-2 py-0.5 rounded-full">
                  {donations.bankCup || 'Banco Metropolitano'}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Número de Tarjeta</span>
                <p className="text-lg sm:text-xl font-mono font-bold tracking-wider text-emerald-200 select-all">
                  {donations.cardNumberCup || '9224 0000 0000 0000'}
                </p>
              </div>

              <div className="space-y-0.5 mb-6 text-xs text-stone-300">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Titular</span>
                <p className="font-semibold text-white">{donations.cardHolderCup || 'Patitas Cubanas'}</p>
              </div>
            </div>

            <button
              onClick={() => handleCopy(donations.cardNumberCup, 'cup')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                copiedField === 'cup'
                  ? 'bg-emerald-500 text-stone-950'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white hover:scale-[1.01]'
              }`}
            >
              {copiedField === 'cup' ? (
                <>
                  <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                  <span>¡Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Tarjeta CUP</span>
                </>
              )}
            </button>
          </div>

          {/* Card MLC */}
          <div className="relative group rounded-3xl p-6 bg-gradient-to-br from-[#1a1c18] via-[#151613] to-[#0c0d0a] border border-amber-800/40 shadow-2xl flex flex-col justify-between overflow-hidden">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Tarjeta MLC</h4>
                    <p className="text-[11px] text-amber-400/90 font-medium">BPA / BANDEC / Metropolitano</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-amber-300 bg-amber-950/90 border border-amber-700/40 px-2 py-0.5 rounded-full">
                  {donations.bankMlc || 'BPA / BANDEC'}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Número de Tarjeta</span>
                <p className="text-lg sm:text-xl font-mono font-bold tracking-wider text-amber-200 select-all">
                  {donations.cardNumberMlc || '9225 0000 0000 0000'}
                </p>
              </div>

              <div className="space-y-0.5 mb-6 text-xs text-stone-300">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Titular</span>
                <p className="font-semibold text-white">{donations.cardHolderMlc || 'Patitas Cubanas'}</p>
              </div>
            </div>

            <button
              onClick={() => handleCopy(donations.cardNumberMlc, 'mlc')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                copiedField === 'mlc'
                  ? 'bg-amber-400 text-stone-950'
                  : 'bg-amber-600 hover:bg-amber-500 text-white hover:scale-[1.01]'
              }`}
            >
              {copiedField === 'mlc' ? (
                <>
                  <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                  <span>¡Copiado al Portapapeles!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Tarjeta MLC</span>
                </>
              )}
            </button>
          </div>

          {/* Crypto / International Wallet (USDT TRC20) */}
          <div className="relative group rounded-3xl p-6 bg-gradient-to-br from-[#121c22] via-[#0f171c] to-[#0a0f12] border border-cyan-800/40 shadow-2xl flex flex-col justify-between overflow-hidden md:col-span-2 lg:col-span-1">
            <div>
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Cripto / Exterior</h4>
                    <p className="text-[11px] text-cyan-400/90 font-medium">Donaciones Internacionales</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/90 border border-cyan-700/40 px-2 py-0.5 rounded-full">
                  {donations.cryptoNetwork || 'USDT TRC-20'}
                </span>
              </div>

              <div className="space-y-1 mb-4">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Dirección de Billetera</span>
                <p className="text-xs font-mono font-bold tracking-tight text-cyan-200 select-all break-all bg-black/40 p-2 rounded-lg border border-cyan-900/30">
                  {donations.cryptoAddress || 'TF7Nu8QzZ82J67XUvK91a45M89o456xXYZ'}
                </p>
              </div>

              <div className="space-y-0.5 mb-6 text-xs text-stone-300">
                <span className="text-[10px] text-stone-400 uppercase tracking-wider font-semibold">Red</span>
                <p className="font-semibold text-white">{donations.cryptoNetwork || 'Tron (TRC-20)'}</p>
              </div>
            </div>

            <button
              onClick={() => handleCopy(donations.cryptoAddress, 'crypto')}
              className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 shadow-lg transition-all ${
                copiedField === 'crypto'
                  ? 'bg-cyan-400 text-stone-950'
                  : 'bg-cyan-600 hover:bg-cyan-500 text-white hover:scale-[1.01]'
              }`}
            >
              {copiedField === 'crypto' ? (
                <>
                  <Check className="w-4 h-4 text-stone-950 stroke-[3]" />
                  <span>¡Billetera Copiada!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Dirección Cripto</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Confirmation Note & WhatsApp Direct Message */}
        <div className="max-w-2xl mx-auto bg-[#121914] border border-emerald-900/40 rounded-2xl p-5 mb-14 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <h5 className="text-sm font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <Smartphone className="w-4 h-4 text-emerald-400" />
              <span>Confirmación del Donativo</span>
            </h5>
            <p className="text-xs text-stone-300">
              {donations.confirmationNote ||
                'Envíanos la captura o número de operación por WhatsApp para registrar tu aporte en el balance de transparencia.'}
            </p>
          </div>
          <a
            href={whatsappConfirmationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="whitespace-nowrap inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow transition-all hover:scale-105"
          >
            <MessageCircle className="w-4 h-4 fill-white/20" />
            <span>Enviar Comprobante</span>
          </a>
        </div>

        {/* Needed Supplies Grid */}
        {donations.neededSupplies && donations.neededSupplies.length > 0 && (
          <div className="max-w-4xl mx-auto bg-[#111713] border border-emerald-900/30 rounded-3xl p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-4">
              <Package className="w-5 h-5 text-emerald-400" />
              <h4 className="text-base sm:text-lg font-bold text-white">
                ¿No puedes donar dinero? ¡También necesitamos insumos físicos!
              </h4>
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mb-6">
              En Cuba la escasez de medicamentos y alimento es el mayor reto. Si tienes o puedes comprar cualquiera de estos insumos, contáctanos:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {donations.neededSupplies.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-[#0c120e] border border-emerald-950 rounded-xl p-3 flex items-start gap-2.5"
                >
                  <span className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${item.urgent ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
                  <div>
                    <p className="text-xs font-medium text-stone-200">{item.name}</p>
                    {item.urgent && (
                      <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Urgente</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
