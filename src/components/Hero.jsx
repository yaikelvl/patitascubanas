import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Sparkles, Search, HandCoins, Compass, MessageCircle, MapPin, AlertCircle, Heart } from 'lucide-react';

export default function Hero({ site, pets = [] }) {
  const containerRef = useRef(null);
  const worldRef = useRef(null);
  const orbRef = useRef(null);
  const rAFRef = useRef(null);

  // Seleccionar hasta 21 mascotas para la esfera Fibonacci
  const spherePets = useMemo(() => {
    if (!pets || pets.length === 0) return [];
    return pets.slice(0, 21);
  }, [pets]);

  // Estado físico de la cámara, rotación e inercia
  const stateRef = useRef({
    spin: 0,
    tilt: -6,
    camZ: 0,
    dragX: 0,
    dragY: 0,
    velX: 0,
    velY: 0,
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    R: 420,
    cw: 210,
    ch: 145,
    persp: 1200
  });

  const [activeModalPet, setActiveModalPet] = useState(null);
  const [dimensions, setDimensions] = useState({ R: 420, cw: 210, ch: 145 });

  // Distribución de puntos esféricos mediante Espiral Fibonacci
  const fibonacciCards = useMemo(() => {
    const N = Math.max(1, spherePets.length);
    const GA = Math.PI * (3 - Math.sqrt(5)); // Golden Angle ~2.39996 rad

    return spherePets.map((pet, i) => {
      const y = N === 1 ? 0 : 1 - (i / (N - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - y * y));
      const theta = i * GA;
      const x = Math.cos(theta) * rad;
      const z = Math.sin(theta) * rad;
      const lat = Math.asin(Math.max(-1, Math.min(1, y))) * (180 / Math.PI);
      const lon = Math.atan2(x, z) * (180 / Math.PI);

      return {
        pet,
        x,
        y,
        z,
        lat,
        lon
      };
    });
  }, [spherePets]);

  // Medición y ajuste de radio R y tamaño de tarjetas agrandadas para protagonismo visual
  useEffect(() => {
    const updateSize = () => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = rect.width || window.innerWidth;
      const h = rect.height || 720;

      // Radio de la esfera notablemente mayor para dar amplitud
      let R;
      let cw;
      let ch;
      let persp;

      if (w <= 640) {
        // Móvil: tarjetas proporcionadas pero bien visibles
        R = Math.max(190, Math.min(240, w * 0.45));
        cw = Math.round(R * 0.58); // ~125-140px
        ch = Math.round(cw / 1.42); // ~90-100px
        persp = 820;
      } else if (w <= 1024) {
        // Tablet
        R = Math.max(280, Math.min(360, w * 0.38, h * 0.48));
        cw = Math.round(R * 0.52); // ~160-185px
        ch = Math.round(cw / 1.44); // ~110-128px
        persp = 1000;
      } else {
        // Escritorio: fotos grandes, de alto impacto y nítidas
        R = Math.max(380, Math.min(480, w * 0.32, h * 0.55));
        cw = Math.round(R * 0.49); // ~205-235px
        ch = Math.round(cw / 1.45); // ~140-162px
        persp = 1250;
      }

      stateRef.current.R = R;
      stateRef.current.cw = cw;
      stateRef.current.ch = ch;
      stateRef.current.persp = persp;
      setDimensions({ R, cw, ch });
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  // Bucle de renderizado continuo 3D con auto-rotación constante e inercia interactiva
  useEffect(() => {
    let active = true;

    const loop = () => {
      if (!active) return;
      const s = stateRef.current;

      // Rotación constante y suave por defecto cuando el usuario no arrastra
      if (!s.isDragging) {
        // Giro suave y majestuoso (~0.07° por cuadro)
        s.spin += 0.07;

        // Inercia amortiguada si el usuario dio un empujón
        s.dragX += s.velX;
        s.dragY += s.velY;
        s.velX *= 0.94;
        s.velY *= 0.94;
        if (Math.abs(s.velX) < 0.001) s.velX = 0;
        if (Math.abs(s.velY) < 0.001) s.velY = 0;
      }

      // Restricción de inclinación vertical (pitch)
      const currentPitch = s.tilt + s.dragY;
      if (currentPitch > 32) s.dragY = 32 - s.tilt;
      if (currentPitch < -32) s.dragY = -32 - s.tilt;

      const sx = s.tilt + s.dragY;
      const sy = s.spin + s.dragX;

      // Transform del espacio 3D (#world)
      if (worldRef.current) {
        worldRef.current.style.transform = `translateZ(${s.camZ}px) rotateY(${sy.toFixed(2)}deg) rotateX(${sx.toFixed(2)}deg)`;
      }

      // Cálculo de profundidad (Z) e iluminación para cada tarjeta
      if (orbRef.current) {
        const radSx = (sx * Math.PI) / 180;
        const radSy = (sy * Math.PI) / 180;
        const cosX = Math.cos(radSx);
        const sinX = Math.sin(radSx);
        const cosY = Math.cos(radSy);
        const sinY = Math.sin(radSy);

        const cardElements = orbRef.current.children;
        for (let i = 0; i < cardElements.length; i++) {
          const card = fibonacciCards[i];
          if (!card) continue;

          // Rotación del vector espacial de la tarjeta
          const rx = card.x * cosY + card.z * sinY;
          const rz1 = -card.x * sinY + card.z * cosY;
          const ry = card.y * cosX - rz1 * sinX;
          const rz = card.y * sinX + rz1 * cosX;

          // Iluminación y ordenamiento por profundidad
          const base = 0.22 + 0.78 * Math.pow((rz + 1) / 2, 0.85);
          const dim = Math.max(0, Math.min(0.68, (1 - base) * 0.9));

          const el = cardElements[i];
          if (el) {
            el.style.setProperty('--d', dim.toFixed(3));
            el.style.zIndex = Math.round((rz + 1) * 100);
          }
        }
      }

      rAFRef.current = requestAnimationFrame(loop);
    };

    rAFRef.current = requestAnimationFrame(loop);
    return () => {
      active = false;
      if (rAFRef.current) cancelAnimationFrame(rAFRef.current);
    };
  }, [fibonacciCards]);

  // Controladores de interacción táctil y ratón
  const handlePointerDown = (e) => {
    const s = stateRef.current;
    s.isDragging = true;
    s.startX = e.clientX;
    s.startY = e.clientY;
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    s.velX = 0;
    s.velY = 0;
  };

  const handlePointerMove = (e) => {
    const s = stateRef.current;
    if (!s.isDragging) return;

    const dx = e.clientX - s.lastX;
    const dy = e.clientY - s.lastY;

    s.dragX += dx * 0.22;
    s.dragY -= dy * 0.22;

    s.velX = dx * 0.22;
    s.velY = -dy * 0.22;

    s.lastX = e.clientX;
    s.lastY = e.clientY;
  };

  const handlePointerUp = () => {
    const s = stateRef.current;
    s.isDragging = false;
  };

  return (
    <section className="relative w-full h-[86vh] min-h-[640px] max-h-[880px] bg-[#070b08] overflow-hidden select-none border-b border-emerald-950/80">
      {/* Iluminación de fondo radial */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-emerald-900/25 via-[#080d09]/75 to-[#070b08] pointer-events-none" />

      {/* 1. INFORMACIÓN LATERAL REDUCIDA Y REFINADA (Esquina Superior Izquierda) */}
      <div className="absolute top-5 left-4 sm:top-8 sm:left-8 z-20 pointer-events-none max-w-[280px] sm:max-w-xs space-y-2.5">
        <div className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-emerald-500/30 text-emerald-300 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider shadow-lg">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Red Nacional de Adopción • Cuba 🇨🇺</span>
        </div>

        <h1 className="pointer-events-auto text-xl sm:text-2xl lg:text-3xl font-extrabold text-white tracking-tight leading-tight drop-shadow-xl">
          Cada vida cuenta: <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-300">
            adopta un amigo
          </span>
        </h1>

        <p className="pointer-events-auto text-xs text-stone-300/85 font-normal drop-shadow leading-relaxed">
          Gira la esfera 3D o toca una foto para conocer su historia y coordinar su adopción en Cuba.
        </p>

        <div className="pointer-events-auto flex items-center gap-2 pt-0.5">
          <a
            href="#mascotas"
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-md text-xs transition-all hover:scale-105"
          >
            <Search className="w-3 h-3" />
            <span>Ver Listado</span>
          </a>

          <a
            href="#donativos"
            className="inline-flex items-center gap-1.5 bg-black/70 hover:bg-black/90 backdrop-blur-md border border-amber-600/50 text-amber-300 font-bold px-3.5 py-1.5 rounded-xl shadow-md text-xs transition-all hover:scale-105"
          >
            <HandCoins className="w-3 h-3 text-amber-400" />
            <span>Donativos</span>
          </a>
        </div>
      </div>

      {/* 2. TARJETA COMPAÑERA LATERAL DERECHA (Rellena y equilibra el espacio con impacto solidario) */}
      <div className="hidden lg:flex absolute top-8 right-8 z-20 pointer-events-none flex-col gap-2 max-w-[250px]">
        <div className="pointer-events-auto bg-black/70 backdrop-blur-md border border-emerald-800/40 rounded-2xl p-3.5 shadow-2xl space-y-2.5">
          <div className="flex items-center justify-between pb-1.5 border-b border-emerald-950">
            <span className="text-[11px] font-bold text-emerald-300 flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400/30" />
              Impacto Solidario
            </span>
            <span className="text-[10px] text-stone-400 font-medium">Cuba 🇨🇺</span>
          </div>

          {/* Mini Grid de 3 métricas clave */}
          <div className="grid grid-cols-3 gap-1.5 text-center py-1.5 bg-[#0b120d]/80 rounded-xl border border-emerald-900/30">
            <div>
              <span className="block text-sm font-black text-emerald-400">340+</span>
              <span className="text-[8px] text-stone-400 uppercase font-semibold">Rescates</span>
            </div>
            <div>
              <span className="block text-sm font-black text-white">280+</span>
              <span className="text-[8px] text-stone-400 uppercase font-semibold">Adoptados</span>
            </div>
            <div>
              <span className="block text-sm font-black text-teal-300">16</span>
              <span className="text-[8px] text-stone-400 uppercase font-semibold">Provincias</span>
            </div>
          </div>

          <p className="text-[11px] text-stone-300/80 leading-snug">
            ¿Tienes espacio temporal? Ofrece tu hogar de tránsito para animalitos en recuperación.
          </p>

          <a
            href="#transito"
            className="flex items-center justify-between text-[11px] font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-800/40 rounded-lg px-2.5 py-1 transition-colors"
          >
            <span>Hogares de Tránsito</span>
            <span>→</span>
          </a>
        </div>
      </div>

      {/* 3. INSIGNIA INFERIOR DERECHA (Cantidad de rescatados en la parte baja derecha de la esfera) */}
      <div className="hidden sm:flex absolute bottom-4 right-4 sm:bottom-6 sm:right-8 z-20 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-2 bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-800/40 text-stone-200 text-xs shadow-xl">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
          <span className="font-semibold text-white">340+</span>
          <span className="text-stone-300 text-[11px]">Rescatados en 16 Provincias</span>
        </div>
      </div>

      {/* 4. ESCENARIO 3D CENTRAL COMPLETO (La Esfera es la protagonista absoluta) */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full h-full cursor-grab active:cursor-grabbing overflow-hidden"
        style={{
          perspective: `${stateRef.current.persp}px`,
          perspectiveOrigin: '50% 50%'
        }}
      >
        {/* Mundo 3D (Centro absoluto de la pantalla) */}
        <div
          ref={worldRef}
          className="absolute top-1/2 left-1/2 w-0 h-0 will-change-transform"
          style={{ transformStyle: 'preserve-3d' }}
        >
          {/* Esfera de fotos de animales agrandadas */}
          <div ref={orbRef} className="absolute top-0 left-0 w-0 h-0" style={{ transformStyle: 'preserve-3d' }}>
            {fibonacciCards.map(({ pet, x, y, z, lat, lon }, idx) => {
              const { R, cw, ch } = dimensions;
              const posX = x * R;
              const posY = -y * R;
              const posZ = z * R;

              return (
                <div
                  key={pet.id || idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveModalPet(pet);
                  }}
                  className="absolute rounded-2xl overflow-hidden shadow-2xl transition-transform duration-300 hover:scale-115 cursor-pointer border border-emerald-500/30 bg-stone-900 group"
                  style={{
                    width: `${cw}px`,
                    height: `${ch}px`,
                    marginLeft: `-${cw / 2}px`,
                    marginTop: `-${ch / 2}px`,
                    transform: `translate3d(${posX.toFixed(1)}px, ${posY.toFixed(1)}px, ${posZ.toFixed(1)}px) rotateY(${lon.toFixed(1)}deg) rotateX(${lat.toFixed(1)}deg)`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  <img
                    src={pet.image}
                    alt={pet.name}
                    loading="eager"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />

                  {/* Capa de oscurecimiento por distancia para dar volumen y profundidad */}
                  <div
                    className="absolute inset-0 pointer-events-none transition-colors"
                    style={{ backgroundColor: `rgba(0, 0, 0, var(--d, 0))` }}
                  />

                  {/* Pie de foto de la tarjeta con nombre y provincia */}
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex items-baseline justify-between">
                    <span className="text-xs font-bold text-white truncate max-w-[95px] drop-shadow-md">
                      {pet.name}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-300 drop-shadow-md">
                      {pet.province?.split(' ')[0]}
                    </span>
                  </div>

                  {pet.status === 'urgente' && (
                    <span className="absolute top-2 left-2 w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-md" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Indicador inferior de interacción */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 pointer-events-none flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-1.5 rounded-full border border-emerald-900/50 text-stone-300 text-[10px] sm:text-xs font-medium tracking-wide shadow-xl">
          <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin" style={{ animationDuration: '10s' }} />
          <span>Giro automático • Arrastra para rotar en 3D • Toca una foto para detalles</span>
        </div>
      </div>

      {/* 4. MODAL ESTANDARIZADO AL 100% (Foto con tamaño fijo y contenido siempre visible) */}
      {activeModalPet && (
        <div
          onClick={() => setActiveModalPet(null)}
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0f1611] border border-emerald-700/40 rounded-3xl max-w-md w-full max-h-[85vh] sm:max-h-[88vh] flex flex-col overflow-hidden shadow-2xl relative"
          >
            {/* Cabecera con Foto ESTANDARIZADA: altura fija idéntica para todas las fotos */}
            <div className="relative h-52 sm:h-56 w-full shrink-0 bg-stone-950 overflow-hidden">
              <img
                src={activeModalPet.image}
                alt={activeModalPet.name}
                className="w-full h-full object-cover object-center"
              />
              <button
                onClick={() => setActiveModalPet(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/70 text-white hover:bg-black flex items-center justify-center transition-all z-10"
                aria-label="Cerrar ficha"
              >
                ✕
              </button>

              {/* Insignias sobre la foto */}
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                <span className="bg-black/70 backdrop-blur-md text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-lg border border-emerald-500/30 uppercase tracking-wide">
                  {activeModalPet.species || 'Mascota'} • {activeModalPet.gender || 'Criollo'}
                </span>
                {activeModalPet.status === 'urgente' && (
                  <span className="bg-rose-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg flex items-center gap-1 shadow-md animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Urgente
                  </span>
                )}
              </div>

              <div className="absolute bottom-2.5 left-3 bg-black/75 backdrop-blur-md text-white text-xs font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-white/10 shadow-md">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate max-w-[280px]">
                  {activeModalPet.municipality}, {activeModalPet.province}
                </span>
              </div>
            </div>

            {/* Cuerpo desplazable: garantiza que toda la información se pueda leer */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3.5">
              <div>
                <h3 className="text-2xl font-black text-white">{activeModalPet.name}</h3>
                <p className="text-xs text-emerald-400 font-medium">
                  {activeModalPet.breed || 'Mestizo criollo cubano'} • {activeModalPet.approxAge || activeModalPet.ageCategory} • Tamaño {activeModalPet.size || 'Mediano'}
                </p>
              </div>

              {/* Chips de salud */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {activeModalPet.isVaccinated && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 font-medium">
                    ✓ Vacunado
                  </span>
                )}
                {activeModalPet.isDewormed && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 font-medium">
                    ✓ Desparasitado
                  </span>
                )}
                {activeModalPet.isSterilized && (
                  <span className="px-2.5 py-0.5 rounded-md bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 font-medium">
                    ✓ Esterilizado
                  </span>
                )}
              </div>

              {/* Historia */}
              <div className="text-xs text-stone-300 leading-relaxed bg-[#0a0f0b] p-3 rounded-xl border border-emerald-950/80">
                <span className="block text-[10px] uppercase font-bold text-emerald-400/80 mb-1">
                  Historia y Personalidad:
                </span>
                <p>{activeModalPet.story}</p>
              </div>

              {activeModalPet.specialNeeds && activeModalPet.specialNeeds !== 'Ninguna' && (
                <div className="text-[11px] text-amber-200/90 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/30">
                  <span className="font-semibold text-amber-400">Nota especial: </span>
                  {activeModalPet.specialNeeds}
                </div>
              )}
            </div>

            {/* Pie de modal FIJO: Siempre visible en pantalla sin importar el tamaño del monitor */}
            <div className="shrink-0 p-3.5 sm:p-4 bg-[#090e0b] border-t border-emerald-950 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[9px] text-stone-400 uppercase font-semibold block">Protector(a)</span>
                <p className="font-bold text-xs text-white truncate max-w-[120px] sm:max-w-[160px]">
                  {activeModalPet.contactName || 'Protector Solidario'}
                </p>
              </div>

              <a
                href={`https://wa.me/${(activeModalPet.contactWhatsapp || '5352000001').replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                  `¡Hola! Vi la ficha de ${activeModalPet.name} (${activeModalPet.municipality}, ${activeModalPet.province}) en Patitas Cubanas y me gustaría coordinar su adopción.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs sm:text-sm font-bold py-2.5 px-4 rounded-xl shadow-lg transition-all hover:scale-105 shrink-0"
              >
                <MessageCircle className="w-4 h-4 fill-white/20 shrink-0" />
                <span>Adoptar vía WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
