import React, { useState, useMemo } from 'react';
import { Search, MapPin, PawPrint, RotateCcw, AlertTriangle } from 'lucide-react';
import PetCard from './PetCard';
import { CUBA_PROVINCES, getMunicipalitiesByProvince } from '../data/cubaLocations';

export default function PetSection({ pets = [] }) {
  const [selectedProvince, setSelectedProvince] = useState('all');
  const [selectedMunicipality, setSelectedMunicipality] = useState('all');
  const [selectedSpecies, setSelectedSpecies] = useState('all');
  const [onlyUrgent, setOnlyUrgent] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Municipios dinámicos según la provincia seleccionada
  const availableMunicipalities = useMemo(() => {
    return getMunicipalitiesByProvince(selectedProvince);
  }, [selectedProvince]);

  const handleProvinceChange = (e) => {
    const prov = e.target.value;
    setSelectedProvince(prov);
    setSelectedMunicipality('all'); // reiniciar municipio al cambiar provincia
  };

  const handleResetFilters = () => {
    setSelectedProvince('all');
    setSelectedMunicipality('all');
    setSelectedSpecies('all');
    setOnlyUrgent(false);
    setSearchQuery('');
  };

  // Filtrado de mascotas
  const filteredPets = useMemo(() => {
    return pets.filter((pet) => {
      // Búsqueda por texto (nombre, historia, raza)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = pet.name?.toLowerCase().includes(q);
        const matchBreed = pet.breed?.toLowerCase().includes(q);
        const matchStory = pet.story?.toLowerCase().includes(q);
        const matchMuni = pet.municipality?.toLowerCase().includes(q);
        if (!matchName && !matchBreed && !matchStory && !matchMuni) return false;
      }

      // Especie
      if (selectedSpecies !== 'all') {
        if (pet.species?.toLowerCase() !== selectedSpecies.toLowerCase()) return false;
      }

      // Provincia
      if (selectedProvince !== 'all') {
        const provObj = CUBA_PROVINCES.find((p) => p.id === selectedProvince);
        const targetName = provObj ? provObj.name.toLowerCase() : selectedProvince.toLowerCase();
        if (pet.province?.toLowerCase() !== targetName) return false;
      }

      // Municipio
      if (selectedMunicipality !== 'all') {
        if (pet.municipality?.toLowerCase() !== selectedMunicipality.toLowerCase()) return false;
      }

      // Solo urgentes
      if (onlyUrgent) {
        const isUrg = pet.status === 'urgente' || pet.badge?.toLowerCase().includes('urgente');
        if (!isUrg) return false;
      }

      return true;
    });
  }, [pets, searchQuery, selectedSpecies, selectedProvince, selectedMunicipality, onlyUrgent]);

  return (
    <section id="mascotas" className="py-16 sm:py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center max-w-2xl mx-auto mb-10 space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
          <PawPrint className="w-3.5 h-3.5" />
          <span>Amigos esperando por ti</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Mascotas en Adopción en Cuba
        </h2>
        <p className="text-stone-300 text-sm sm:text-base">
          Encuentra a tu compañero ideal en tu provincia o municipio. Cada adopción salva dos vidas: la que acoges y la que deja su lugar en el refugio.
        </p>
      </div>

      {/* Control Bar & Filters */}
      <div className="bg-[#121914] border border-emerald-900/40 rounded-3xl p-5 mb-10 shadow-xl space-y-4">
        {/* Top row: search + species toggles */}
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search box */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, raza o municipio..."
              className="w-full bg-[#0c120e] border border-emerald-900/50 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-stone-200 placeholder-stone-500 focus:outline-none focus:border-emerald-500 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-white"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Species Tabs */}
          <div className="flex items-center gap-1.5 bg-[#0c120e] p-1 rounded-2xl border border-emerald-900/50 w-full md:w-auto justify-center">
            {[
              { id: 'all', label: 'Todos' },
              { id: 'perro', label: '🐶 Perros' },
              { id: 'gato', label: '🐱 Gatos' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedSpecies(tab.id)}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-all ${
                  selectedSpecies === tab.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-400 hover:text-stone-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Bottom row: Province, Municipality, Urgents toggle & Reset */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-emerald-900/20">
          {/* Province selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-400 flex items-center gap-1">
              <MapPin className="w-3 h-3 text-emerald-400" /> Provincia de Cuba
            </label>
            <select
              value={selectedProvince}
              onChange={handleProvinceChange}
              className="w-full bg-[#0c120e] border border-emerald-900/50 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="all">Todas las Provincias</option>
              {CUBA_PROVINCES.map((prov) => (
                <option key={prov.id} value={prov.id}>
                  {prov.name}
                </option>
              ))}
            </select>
          </div>

          {/* Municipality selector */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-stone-400">
              Municipio {selectedProvince !== 'all' ? `(${availableMunicipalities.length})` : ''}
            </label>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              disabled={selectedProvince === 'all'}
              className="w-full bg-[#0c120e] border border-emerald-900/50 rounded-xl px-3 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <option value="all">
                {selectedProvince === 'all' ? 'Elige provincia primero' : 'Todos los municipios'}
              </option>
              {availableMunicipalities.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>
          </div>

          {/* Urgent only button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => setOnlyUrgent(!onlyUrgent)}
              className={`w-full py-2 px-3 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${
                onlyUrgent
                  ? 'bg-rose-950/70 border-rose-600 text-rose-300'
                  : 'bg-[#0c120e] border-emerald-900/50 text-stone-300 hover:border-emerald-700'
              }`}
            >
              <AlertTriangle className={`w-3.5 h-3.5 ${onlyUrgent ? 'text-rose-400' : 'text-stone-400'}`} />
              <span>{onlyUrgent ? 'Mostrando Urgentes' : 'Filtrar Urgentes'}</span>
            </button>
          </div>

          {/* Reset button */}
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleResetFilters}
              className="w-full py-2 px-3 rounded-xl bg-stone-800/60 hover:bg-stone-800 border border-stone-700/50 text-xs text-stone-300 font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Limpiar Filtros</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid of Pets */}
      {filteredPets.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredPets.map((pet) => (
            <PetCard key={pet.id} pet={pet} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#121914] border border-emerald-900/30 rounded-3xl max-w-xl mx-auto p-8 space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-950 flex items-center justify-center mx-auto text-2xl">
            🐾
          </div>
          <h3 className="text-xl font-bold text-white">No encontramos mascotas con esos filtros</h3>
          <p className="text-sm text-stone-400 max-w-md mx-auto">
            Prueba seleccionando "Todas las Provincias" o eliminando el filtro de búsqueda para ver más animalitos esperando un hogar.
          </p>
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl transition-all"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Restablecer filtros</span>
          </button>
        </div>
      )}
    </section>
  );
}
