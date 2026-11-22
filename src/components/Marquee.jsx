import React from 'react';

export default function Marquee({ items = [] }) {
  if (!items || items.length === 0) return null;

  return (
    <div className="bg-[#08120b] border-y border-emerald-900/50 py-2.5 overflow-hidden select-none relative group">
      <div className="animate-marquee-infinite flex items-center">
        {/* Strip 1 */}
        <div className="flex items-center gap-12 text-xs sm:text-sm font-medium text-emerald-300/90 pr-12">
          {items.map((item, idx) => (
            <div key={`m1-${idx}`} className="flex items-center gap-2.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="tracking-wide">{item}</span>
            </div>
          ))}
        </div>
        {/* Strip 2 for seamless infinite scroll */}
        <div className="flex items-center gap-12 text-xs sm:text-sm font-medium text-emerald-300/90 pr-12" aria-hidden="true">
          {items.map((item, idx) => (
            <div key={`m2-${idx}`} className="flex items-center gap-2.5 shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400/50" />
              <span className="tracking-wide">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
