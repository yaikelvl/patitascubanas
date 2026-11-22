import React from 'react';
import { Sparkles, Heart, Quote } from 'lucide-react';

export default function SuccessStories({ stories = [] }) {
  if (!stories || stories.length === 0) return null;

  return (
    <section id="historias" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="text-center max-w-2xl mx-auto mb-12 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-950/80 border border-teal-800/40 text-teal-300 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Transformando realidades</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Finales Felices en Cuba
        </h2>
        <p className="text-stone-300 text-sm sm:text-base">
          Detrás de cada adopción hay una historia de superación y amor. Conoce algunos de los animalitos que hoy tienen una vida feliz.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
        {stories.map((item) => (
          <div
            key={item.id}
            className="bg-[#121914] border border-emerald-900/30 rounded-3xl overflow-hidden shadow-xl flex flex-col sm:flex-row"
          >
            <div className="sm:w-1/2 aspect-square sm:aspect-auto relative bg-stone-950">
              <img
                src={item.imageAfter}
                alt={item.petName}
                loading="lazy"
                className="w-full h-full object-cover"
              />
              <span className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md text-emerald-300 text-xs font-bold px-3 py-1 rounded-full">
                {item.location}
              </span>
            </div>

            <div className="sm:w-1/2 p-6 flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <Quote className="w-6 h-6 text-emerald-500/40" />
                <h3 className="text-xl font-bold text-white">{item.petName}</h3>
                <p className="text-xs text-emerald-400 font-medium">{item.type}</p>
                <p className="text-sm text-stone-300 leading-relaxed italic">
                  "{item.story}"
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium pt-3 border-t border-emerald-900/20">
                <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                <span>Adoptado y amado para siempre</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
