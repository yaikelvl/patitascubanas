import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Lock,
  KeyRound,
  Save,
  Plus,
  Trash2,
  Check,
  AlertCircle,
  Upload,
  Image as ImageIcon,
  Shield,
  CreditCard,
  PawPrint,
  Settings,
  HelpCircle,
  Search,
  MapPin,
  FolderOpen
} from 'lucide-react';
import { CUBA_PROVINCES, getMunicipalitiesByProvince } from '../data/cubaLocations';
import { saveToLocalStorage } from '../utils/cryptoUtils';
import {
  saveAllDataToSupabase,
  deletePetFromSupabase,
  updateAdminPinInSupabase,
  fetchMediaLibrary,
  isSupabaseConfigured
} from '../utils/supabaseClient';
import {
  verifyAdminPinWithBackend,
  getLockoutStatus,
  generateSalt,
  derivePinHash,
  validateNewPin
} from '../utils/securityUtils';
import {
  probeMediaEndpoint,
  uploadMediaAsset,
  deleteMediaAsset
} from '../utils/mediaAssets';

export default function AdminModal({ isOpen, onClose, state: appState, setState: onUpdateState }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinErrorMessage, setPinErrorMessage] = useState('');
  const [isValidatingPin, setIsValidatingPin] = useState(false);
  const [authenticatedPinHash, setAuthenticatedPinHash] = useState(null);

  const [activeTab, setActiveTab] = useState('pets'); // 'pets' | 'donations' | 'media' | 'settings' | 'security'
  const [isSaving, setIsSaving] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState({ text: '', type: '' });

  // Copia local editable de los datos
  const [localState, setLocalState] = useState(() => ({
    site: appState?.site || {},
    marquee: appState?.marquee || [],
    donations: appState?.donations || {},
    pets: appState?.pets || [],
    faqs: appState?.faqs || []
  }));

  // Bloqueo de intentos fallidos
  const [lockout, setLockout] = useState(() => getLockoutStatus());

  // Biblioteca de fotos
  const [mediaLibrary, setMediaLibrary] = useState([]);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [pickerTargetPetId, setPickerTargetPetId] = useState(null);

  // Filtro de gestión de mascotas
  const [petSearchQuery, setPetSearchQuery] = useState('');

  // Formulario de cambio de PIN
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState({ text: '', type: '' });
  const [isUpdatingPin, setIsUpdatingPin] = useState(false);

  // Sincronizar localState si appState cambia
  useEffect(() => {
    if (appState) {
      setLocalState({
        site: appState.site || {},
        marquee: appState.marquee || [],
        donations: appState.donations || {},
        pets: appState.pets || [],
        faqs: appState.faqs || []
      });
    }
  }, [appState]);

  // Temporizador de bloqueo
  useEffect(() => {
    if (!lockout.isLocked || lockout.remainingSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockout(getLockoutStatus());
    }, 1000);
    return () => clearInterval(interval);
  }, [lockout]);

  // Cargar biblioteca cuando se autentica o abre la pestaña
  useEffect(() => {
    if (isAuthenticated && (activeTab === 'media' || pickerTargetPetId)) {
      loadMedia();
    }
  }, [isAuthenticated, activeTab, pickerTargetPetId]);

  const loadMedia = async () => {
    setMediaLoading(true);
    try {
      const items = await fetchMediaLibrary();
      setMediaLibrary(items || []);
    } catch (e) {
      console.warn('Error cargando medios:', e);
    } finally {
      setMediaLoading(false);
    }
  };

  // Validar PIN de acceso
  const handlePinSubmit = async (e) => {
    e?.preventDefault();
    if (lockout.isLocked) return;

    setIsValidatingPin(true);
    setPinErrorMessage('');

    try {
      const result = await verifyAdminPinWithBackend(pinInput);
      if (result.success) {
        setIsAuthenticated(true);
        setAuthenticatedPinHash(result.pinHash);
        setPinInput('');
      } else {
        setPinErrorMessage(result.error || 'PIN incorrecto');
        setLockout(getLockoutStatus());
      }
    } catch (err) {
      setPinErrorMessage('Error de validación');
    } finally {
      setIsValidatingPin(false);
    }
  };

  // Guardar todo en la nube y almacenamiento local
  const handleSaveAll = async () => {
    setIsSaving(true);
    setSaveFeedback({ text: 'Guardando cambios en el servidor...', type: 'info' });

    try {
      // 1. Guardar en memoria de la app y LocalStorage
      onUpdateState(localState);
      saveToLocalStorage(localState);

      // 2. Guardar en el servidor en la nube
      if (isSupabaseConfigured && authenticatedPinHash) {
        const cloudRes = await saveAllDataToSupabase(localState, authenticatedPinHash);
        if (cloudRes.success) {
          setSaveFeedback({ text: '¡Cambios guardados y publicados con éxito!', type: 'success' });
        } else {
          setSaveFeedback({ text: `Guardado en este dispositivo: ${cloudRes.error}`, type: 'warning' });
        }
      } else {
        setSaveFeedback({ text: '¡Cambios guardados con éxito!', type: 'success' });
      }
    } catch (err) {
      setSaveFeedback({ text: 'Error al guardar los cambios', type: 'error' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveFeedback({ text: '', type: '' }), 4000);
    }
  };

  // Subir foto desde el panel
  const handleFileUpload = async (file, folder = 'pets', targetPetId = null) => {
    if (!file) return;
    setUploadingImage(true);
    setUploadProgress('Comprimiendo WebP...');

    try {
      const res = await uploadMediaAsset({
        pinHash: authenticatedPinHash,
        folder,
        file,
        alt: file.name,
        onProgress: (msg) => setUploadProgress(msg)
      });

      if (res.ok && res.asset) {
        setMediaLibrary((prev) => [res.asset, ...prev]);
        const imageUrl = res.asset.variants?.card || res.asset.variants?.full || res.asset.variants?.thumb;

        if (targetPetId) {
          // Asignar inmediatamente a la mascota
          setLocalState((prev) => ({
            ...prev,
            pets: prev.pets.map((p) =>
              p.id === targetPetId ? { ...p, image: imageUrl, assetId: res.asset.id, asset: res.asset } : p
            )
          }));
          setPickerTargetPetId(null);
        }
      } else {
        alert(res.error || 'No se pudo subir la foto');
      }
    } catch (err) {
      alert('Error al subir imagen');
    } finally {
      setUploadingImage(false);
      setUploadProgress('');
    }
  };

  // Cambiar PIN
  const handlePinUpdate = async (e) => {
    e.preventDefault();
    const err = validateNewPin(newPin);
    if (err) {
      setPinChangeMsg({ text: err, type: 'error' });
      return;
    }
    if (newPin !== confirmPin) {
      setPinChangeMsg({ text: 'Los PINs nuevos no coinciden.', type: 'error' });
      return;
    }

    setIsUpdatingPin(true);
    setPinChangeMsg({ text: '', type: '' });

    try {
      const newSalt = generateSalt(16);
      const newHash = derivePinHash(newPin, newSalt, 25000);
      const curHash = derivePinHash(currentPin, 'c0f3e8b41a924b1d', 25000);

      const res = await updateAdminPinInSupabase(curHash, newSalt, newHash, 25000);
      if (res.success) {
        setAuthenticatedPinHash(newHash);
        setPinChangeMsg({ text: 'PIN actualizado exitosamente.', type: 'success' });
        setCurrentPin('');
        setNewPin('');
        setConfirmPin('');
      } else {
        setPinChangeMsg({ text: res.error || 'Error al cambiar PIN', type: 'error' });
      }
    } catch (e) {
      setPinChangeMsg({ text: 'Error al comunicarse con el servidor', type: 'error' });
    } finally {
      setIsUpdatingPin(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#101712] border border-emerald-800/50 rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Top Bar Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-emerald-900/40 bg-[#0d140f]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>Panel de Administración</span>
                <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  Patitas Cubanas
                </span>
                <span className="hidden sm:inline-block text-[10px] font-mono text-stone-300 bg-stone-900 border border-stone-800 px-2 py-0.5 rounded-md">
                  Alt + A
                </span>
              </h3>
              <p className="text-xs text-stone-400">Control de mascotas, tarjetas Cuba y fotos</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs sm:text-sm font-bold px-4 py-2 rounded-xl shadow-md transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{isSaving ? 'Guardando...' : 'Guardar Cambios'}</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-white rounded-xl hover:bg-stone-800 transition-colors"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Alert Pill */}
        {saveFeedback.text && (
          <div
            className={`px-6 py-2.5 text-xs font-semibold flex items-center justify-between border-b ${
              saveFeedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/40'
                : saveFeedback.type === 'warning'
                ? 'bg-amber-950/80 text-amber-300 border-amber-800/40'
                : 'bg-rose-950/80 text-rose-300 border-rose-800/40'
            }`}
          >
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4" />
              <span>{saveFeedback.text}</span>
            </div>
          </div>
        )}

        {/* Modal Body */}
        {!isAuthenticated ? (
          /* Authentication Screen */
          <div className="p-8 sm:p-12 flex flex-col items-center justify-center max-w-md mx-auto text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-700/50 flex items-center justify-center text-emerald-400">
              <KeyRound className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <h4 className="text-xl font-extrabold text-white">Ingresa el PIN de Administrador</h4>
              <p className="text-xs text-stone-400">
                Asegura el acceso para editar las tarjetas de donativo, mascotas y fotos del sitio. (PIN por defecto: <span className="font-mono text-emerald-400">1234</span>)
              </p>
            </div>

            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              <div>
                <input
                  type="password"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  disabled={lockout.isLocked || isValidatingPin}
                  placeholder="••••"
                  maxLength={12}
                  autoFocus
                  className="w-full text-center tracking-widest text-2xl font-mono py-3 rounded-2xl bg-[#0c120e] border border-emerald-900/60 text-white focus:outline-none focus:border-emerald-500 disabled:opacity-50"
                />
              </div>

              {pinErrorMessage && (
                <p className="text-xs text-rose-400 font-medium flex items-center justify-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{pinErrorMessage}</span>
                </p>
              )}

              {lockout.isLocked && (
                <p className="text-xs text-amber-400 font-semibold">
                  Demasiados intentos. Espera {lockout.remainingSeconds} segundos.
                </p>
              )}

              <button
                type="submit"
                disabled={lockout.isLocked || isValidatingPin || !pinInput}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm shadow-md transition-all"
              >
                {isValidatingPin ? 'Comprobando acceso...' : 'Acceder al Panel'}
              </button>
            </form>
          </div>
        ) : (
          /* Authenticated Dashboard */
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
            {/* Sidebar Navigation */}
            <aside className="w-full md:w-56 bg-[#0c130e] border-b md:border-b-0 md:border-r border-emerald-900/40 p-3 flex md:flex-col gap-1 overflow-x-auto shrink-0">
              <button
                onClick={() => setActiveTab('pets')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap text-left ${
                  activeTab === 'pets'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-emerald-950/50 hover:text-emerald-300'
                }`}
              >
                <PawPrint className="w-4 h-4" />
                <span>Mascotas ({localState.pets?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveTab('donations')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap text-left ${
                  activeTab === 'donations'
                    ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
                    : 'text-amber-300 hover:bg-amber-950/60 hover:text-amber-200'
                }`}
              >
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>💳 Billeteras & Donativos</span>
              </button>

              <button
                onClick={() => setActiveTab('media')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap text-left ${
                  activeTab === 'media'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-emerald-950/50 hover:text-emerald-300'
                }`}
              >
                <ImageIcon className="w-4 h-4" />
                <span>Biblioteca de Fotos</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap text-left ${
                  activeTab === 'settings'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-emerald-950/50 hover:text-emerald-300'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configuración Sitio</span>
              </button>

              <button
                onClick={() => setActiveTab('security')}
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap text-left ${
                  activeTab === 'security'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-stone-300 hover:bg-emerald-950/50 hover:text-emerald-300'
                }`}
              >
                <Lock className="w-4 h-4" />
                <span>Seguridad (PIN)</span>
              </button>
            </aside>

            {/* Tab Content Panel */}
            <main className="flex-1 p-5 sm:p-7 overflow-y-auto">
              {/* TAB 1: MASCOTAS */}
              {activeTab === 'pets' && (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="text-lg font-bold text-white">Gestión de Mascotas en Adopción</h4>
                      <p className="text-xs text-stone-400">
                        Añade, edita o marca animales como adoptados o urgentes.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const newId = `pet-${Date.now()}`;
                        const newPet = {
                          id: newId,
                          name: 'Nueva Mascota',
                          species: 'Perro',
                          breed: 'Mestizo criollo',
                          gender: 'Macho',
                          ageCategory: 'Joven',
                          approxAge: '1 año',
                          size: 'Mediano',
                          province: 'La Habana',
                          municipality: 'Plaza de la Revolución',
                          addressReference: '',
                          status: 'disponible',
                          isVaccinated: false,
                          isDewormed: false,
                          isSterilized: false,
                          specialNeeds: '',
                          story: '',
                          contactName: '',
                          contactWhatsapp: '5352000000',
                          contactPhone: '',
                          image: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?auto=format&fit=crop&w=800&q=80',
                          badge: 'Nuevo',
                          isFeatured: false
                        };
                        setLocalState((prev) => ({
                          ...prev,
                          pets: [newPet, ...prev.pets]
                        }));
                      }}
                      className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Agregar Mascota</span>
                    </button>
                  </div>

                  {/* Pet Search Filter */}
                  <div className="relative">
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={petSearchQuery}
                      onChange={(e) => setPetSearchQuery(e.target.value)}
                      placeholder="Buscar mascota por nombre o municipio..."
                      className="w-full bg-[#0c120e] border border-emerald-900/40 rounded-xl pl-10 pr-4 py-2 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Pet List */}
                  <div className="space-y-4">
                    {localState.pets
                      ?.filter((p) =>
                        petSearchQuery ? p.name?.toLowerCase().includes(petSearchQuery.toLowerCase()) : true
                      )
                      .map((pet, idx) => {
                        const petMunicipalities = getMunicipalitiesByProvince(pet.province || 'La Habana');

                        return (
                          <div
                            key={pet.id}
                            className="bg-[#0c120e] border border-emerald-900/30 rounded-2xl p-5 space-y-4 hover:border-emerald-700/40 transition-colors"
                          >
                            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between pb-3 border-b border-emerald-950">
                              <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-xl overflow-hidden bg-stone-900 shrink-0 border border-emerald-900/40">
                                  <img src={pet.image} alt={pet.name} className="w-full h-full object-cover" />
                                </div>
                                <div>
                                  <input
                                    type="text"
                                    value={pet.name}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLocalState((prev) => ({
                                        ...prev,
                                        pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, name: val } : p))
                                      }));
                                    }}
                                    className="font-bold text-base text-white bg-transparent border-b border-transparent hover:border-stone-700 focus:border-emerald-500 focus:outline-none px-1"
                                  />
                                  <p className="text-[11px] text-stone-400">
                                    {pet.species} • {pet.province}, {pet.municipality}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                                {/* Status select */}
                                <select
                                  value={pet.status}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, status: val } : p))
                                    }));
                                  }}
                                  className="bg-[#121914] border border-emerald-900/50 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-stone-200"
                                >
                                  <option value="disponible">🟢 Disponible</option>
                                  <option value="urgente">🚨 Urgente</option>
                                  <option value="en_adopcion">⏳ En Adopción</option>
                                  <option value="adoptado">🎉 Adoptado</option>
                                </select>

                                {/* Delete pet */}
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (confirm(`¿Eliminar la ficha de ${pet.name}?`)) {
                                      setLocalState((prev) => ({
                                        ...prev,
                                        pets: prev.pets.filter((p) => p.id !== pet.id)
                                      }));
                                      if (authenticatedPinHash) {
                                        await deletePetFromSupabase(pet.id, authenticatedPinHash);
                                      }
                                    }
                                  }}
                                  className="p-1.5 text-stone-400 hover:text-rose-400 rounded-lg hover:bg-rose-950/30 transition-colors"
                                  title="Eliminar mascota"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Details grid */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                              {/* Especie */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Especie</label>
                                <select
                                  value={pet.species}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, species: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                >
                                  <option value="Perro">Perro</option>
                                  <option value="Gato">Gato</option>
                                  <option value="Otro">Otro</option>
                                </select>
                              </div>

                              {/* Sexo */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Sexo</label>
                                <select
                                  value={pet.gender}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, gender: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                >
                                  <option value="Macho">Macho</option>
                                  <option value="Hembra">Hembra</option>
                                </select>
                              </div>

                              {/* Provincia */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Provincia Cuba</label>
                                <select
                                  value={pet.province}
                                  onChange={(e) => {
                                    const provName = e.target.value;
                                    const firstMuni = getMunicipalitiesByProvince(provName)[0] || '';
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) =>
                                        p.id === pet.id ? { ...p, province: provName, municipality: firstMuni } : p
                                      )
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                >
                                  {CUBA_PROVINCES.map((prov) => (
                                    <option key={prov.id} value={prov.name}>
                                      {prov.name}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Municipio */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Municipio</label>
                                <select
                                  value={pet.municipality}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, municipality: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                >
                                  {petMunicipalities.map((mun) => (
                                    <option key={mun} value={mun}>
                                      {mun}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {/* Edad aproximada */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Edad / Tiempo</label>
                                <input
                                  type="text"
                                  value={pet.approxAge || ''}
                                  placeholder="Ej: 8 meses, 2 años"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, approxAge: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                />
                              </div>

                              {/* WhatsApp del rescatista */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">WhatsApp Rescatista</label>
                                <input
                                  type="text"
                                  value={pet.contactWhatsapp || ''}
                                  placeholder="5352000000"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, contactWhatsapp: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                />
                              </div>

                              {/* Nombre del cuidador */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Nombre Protector(a)</label>
                                <input
                                  type="text"
                                  value={pet.contactName || ''}
                                  placeholder="Ej: Laura / Refugio Esperanza"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, contactName: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                />
                              </div>

                              {/* Insignia / Badge */}
                              <div>
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Insignia / Etiqueta</label>
                                <input
                                  type="text"
                                  value={pet.badge || ''}
                                  placeholder="Ej: Urgente, Cachorro, Dúo"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, badge: val } : p))
                                    }));
                                  }}
                                  className="w-full mt-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-stone-200"
                                />
                              </div>
                            </div>

                            {/* Health Checkboxes */}
                            <div className="flex flex-wrap items-center gap-5 pt-1 text-xs">
                              <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={pet.isVaccinated}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, isVaccinated: checked } : p))
                                    }));
                                  }}
                                  className="rounded border-emerald-900 text-emerald-600 focus:ring-0"
                                />
                                <span>Vacunado(a)</span>
                              </label>

                              <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={pet.isSterilized}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, isSterilized: checked } : p))
                                    }));
                                  }}
                                  className="rounded border-emerald-900 text-emerald-600 focus:ring-0"
                                />
                                <span>Esterilizado / Castrado</span>
                              </label>

                              <label className="flex items-center gap-2 text-stone-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={pet.isDewormed}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, isDewormed: checked } : p))
                                    }));
                                  }}
                                  className="rounded border-emerald-900 text-emerald-600 focus:ring-0"
                                />
                                <span>Desparasitado(a)</span>
                              </label>
                            </div>

                            {/* Foto & Historia */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                              {/* Image action */}
                              <div className="space-y-1">
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Foto de Portada</label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={pet.image || ''}
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      setLocalState((prev) => ({
                                        ...prev,
                                        pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, image: val } : p))
                                      }));
                                    }}
                                    placeholder="URL o sube de biblioteca"
                                    className="flex-1 bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1.5 text-xs text-stone-200"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setPickerTargetPetId(pet.id)}
                                    className="p-1.5 rounded-lg bg-emerald-950 border border-emerald-700/50 text-emerald-400 hover:bg-emerald-900/50"
                                    title="Elegir de Biblioteca de Fotos"
                                  >
                                    <FolderOpen className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              {/* Historia / Descripción */}
                              <div className="md:col-span-2 space-y-1">
                                <label className="text-[10px] text-stone-400 uppercase font-semibold">Historia / Personalidad</label>
                                <textarea
                                  value={pet.story || ''}
                                  rows={2}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setLocalState((prev) => ({
                                      ...prev,
                                      pets: prev.pets.map((p) => (p.id === pet.id ? { ...p, story: val } : p))
                                    }));
                                  }}
                                  placeholder="Cuenta cómo fue rescatado, su carácter con niños y otros animales..."
                                  className="w-full bg-[#121914] border border-emerald-900/40 rounded-lg px-2.5 py-1 text-xs text-stone-200 focus:outline-none focus:border-emerald-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* TAB 2: DONATIVOS Y TARJETAS CUBA */}
              {activeTab === 'donations' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <CreditCard className="w-5 h-5 text-amber-400" />
                      <span>Configuración de Billeteras y Donativos en Cuba</span>
                    </h4>
                    <p className="text-xs text-stone-400">
                      Actualiza en tiempo real las tarjetas bancarias en CUP y MLC, billeteras cripto y la lista de insumos urgentes.
                    </p>
                  </div>

                  {/* Tarjeta CUP */}
                  <div className="bg-[#0c120e] border border-emerald-800/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                      <h5 className="text-sm font-bold text-emerald-300 uppercase tracking-wide">
                        Tarjeta CUP (Moneda Nacional)
                      </h5>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/40">
                        Transfermóvil & EnZona
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Número de Tarjeta CUP</label>
                        <input
                          type="text"
                          value={localState.donations?.cardNumberCup || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, cardNumberCup: val }
                            }));
                          }}
                          placeholder="9224 0000 1234 5678"
                          className="w-full font-mono text-sm bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Titular de la Tarjeta</label>
                        <input
                          type="text"
                          value={localState.donations?.cardHolderCup || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, cardHolderCup: val }
                            }));
                          }}
                          placeholder="Nombre y Apellidos"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Banco Emisor</label>
                        <input
                          type="text"
                          value={localState.donations?.bankCup || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, bankCup: val }
                            }));
                          }}
                          placeholder="Banco Metropolitano / BANDEC / BPA"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Plataformas Soportadas</label>
                        <input
                          type="text"
                          value={localState.donations?.paymentMethodsCup || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, paymentMethodsCup: val }
                            }));
                          }}
                          placeholder="Transfermóvil & EnZona"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tarjeta MLC */}
                  <div className="bg-[#0c120e] border border-amber-800/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-950">
                      <h5 className="text-sm font-bold text-amber-300 uppercase tracking-wide">
                        Tarjeta MLC / Divisas (Opcional)
                      </h5>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800/40">
                        BPA / BANDEC / Metropolitano
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Número de Tarjeta MLC</label>
                        <input
                          type="text"
                          value={localState.donations?.cardNumberMlc || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, cardNumberMlc: val }
                            }));
                          }}
                          placeholder="9225 0000 8765 4321"
                          className="w-full font-mono text-sm bg-[#121914] border border-amber-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Titular Tarjeta MLC</label>
                        <input
                          type="text"
                          value={localState.donations?.cardHolderMlc || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, cardHolderMlc: val }
                            }));
                          }}
                          placeholder="Nombre y Apellidos"
                          className="w-full bg-[#121914] border border-amber-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Billetera Cripto / Exterior */}
                  <div className="bg-[#0c120e] border border-cyan-800/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-cyan-950">
                      <h5 className="text-sm font-bold text-cyan-300 uppercase tracking-wide">
                        Billetera Cripto (Donaciones del Exterior)
                      </h5>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/40">
                        USDT / TRC-20
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Dirección de Billetera</label>
                        <input
                          type="text"
                          value={localState.donations?.cryptoAddress || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, cryptoAddress: val }
                            }));
                          }}
                          placeholder="TF7Nu8QzZ82J67XUvK91a45M89o456xXYZ"
                          className="w-full font-mono text-xs bg-[#121914] border border-cyan-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Red / Moneda</label>
                        <input
                          type="text"
                          value={localState.donations?.cryptoNetwork || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, cryptoNetwork: val }
                            }));
                          }}
                          placeholder="USDT (Red TRC-20)"
                          className="w-full bg-[#121914] border border-cyan-900/40 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Insumos y Medicamentos Urgentes */}
                  <div className="bg-[#0c120e] border border-emerald-900/40 rounded-2xl p-5 space-y-4">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                      <h5 className="text-sm font-bold text-white">Lista de Insumos y Medicamentos Urgentes</h5>
                      <button
                        type="button"
                        onClick={() => {
                          const name = prompt('Nombre del insumo o medicamento (ej: Pienso para gatos, Amoxicilina):');
                          if (name && name.trim()) {
                            setLocalState((prev) => ({
                              ...prev,
                              donations: {
                                ...prev.donations,
                                neededSupplies: [
                                  ...(prev.donations?.neededSupplies || []),
                                  { name: name.trim(), urgent: true }
                                ]
                              }
                            }));
                          }
                        }}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" /> Agregar Insumo
                      </button>
                    </div>

                    <div className="space-y-2">
                      {localState.donations?.neededSupplies?.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between bg-[#121914] px-3 py-2 rounded-xl text-xs border border-emerald-950">
                          <span className="text-stone-200">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => {
                              setLocalState((prev) => ({
                                ...prev,
                                donations: {
                                  ...prev.donations,
                                  neededSupplies: prev.donations.neededSupplies.filter((_, i) => i !== idx)
                                }
                              }));
                            }}
                            className="text-stone-400 hover:text-rose-400 p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Teléfono de confirmación */}
                  <div className="bg-[#0c120e] border border-emerald-900/30 rounded-2xl p-5 space-y-4">
                    <h5 className="text-sm font-bold text-white">Confirmación y Transparencia</h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Teléfono para recibir comprobantes (WhatsApp/SMS)</label>
                        <input
                          type="text"
                          value={localState.donations?.phoneConfirmation || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, phoneConfirmation: val }
                            }));
                          }}
                          placeholder="+53 5200 0000"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Nota de confirmación</label>
                        <input
                          type="text"
                          value={localState.donations?.confirmationNote || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              donations: { ...prev.donations, confirmationNote: val }
                            }));
                          }}
                          placeholder="Envía comprobante para registrar en balance"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: BIBLIOTECA DE MEDIOS */}
              {activeTab === 'media' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="text-lg font-bold text-white">Galería de Fotos y Medios</h4>
                    <p className="text-xs text-stone-400">
                      Sube y gestiona las fotos de los animalitos para usarlas en sus fichas y en la esfera 3D.
                    </p>
                  </div>

                  {/* Upload Dropzone */}
                  <div className="border-2 border-dashed border-emerald-800/50 rounded-2xl p-6 text-center hover:border-emerald-600 transition-colors bg-[#0c120e]">
                    <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-white">
                      Arrastra una foto aquí o haz clic para subir
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1">
                      Se optimizan automáticamente para que carguen velozmente incluso con conexiones lentas.
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'pets');
                      }}
                      className="hidden"
                      id="file-upload-input"
                    />
                    <label
                      htmlFor="file-upload-input"
                      className="mt-3 inline-block cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all"
                    >
                      Seleccionar Archivo
                    </label>

                    {uploadingImage && (
                      <p className="text-xs text-emerald-300 font-bold mt-3 animate-pulse">
                        {uploadProgress || 'Subiendo foto...'}
                      </p>
                    )}
                  </div>

                  {/* Media Grid */}
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-stone-400">
                      Fotos Subidas ({mediaLibrary.length})
                    </h5>

                    {mediaLoading ? (
                      <p className="text-xs text-stone-400">Cargando biblioteca...</p>
                    ) : mediaLibrary.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                        {mediaLibrary.map((asset) => {
                          const url = asset.variants?.card || asset.variants?.thumb || asset.variants?.full;
                          return (
                            <div
                              key={asset.id}
                              className="group relative aspect-square rounded-xl overflow-hidden bg-stone-900 border border-emerald-950"
                            >
                              <img src={url} alt={asset.alt || 'Foto'} className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={async () => {
                                  if (confirm('¿Eliminar esta foto de la biblioteca?')) {
                                    await deleteMediaAsset({ pinHash: authenticatedPinHash, assetId: asset.id });
                                    setMediaLibrary((prev) => prev.filter((a) => a.id !== asset.id));
                                  }
                                }}
                                className="absolute top-1 right-1 p-1 bg-black/60 rounded-md text-white opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-opacity"
                                title="Eliminar"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-stone-500 py-4">No hay fotos en la biblioteca aún.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: CONFIGURACIÓN GENERAL */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-3xl">
                  <div>
                    <h4 className="text-lg font-bold text-white">Configuración General y Contacto</h4>
                    <p className="text-xs text-stone-400">Edita la identidad de la plataforma, teléfonos, correos y redes de contacto solidario.</p>
                  </div>

                  {/* 1. Identidad de la Plataforma */}
                  <div className="bg-[#0c120e] border border-emerald-900/30 rounded-2xl p-5 space-y-4 text-xs">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-950 pb-2">
                      Identidad de la Organización
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Nombre de la Organización</label>
                        <input
                          type="text"
                          value={localState.site?.name || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, name: val }
                            }));
                          }}
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Lema / Slogan</label>
                        <input
                          type="text"
                          value={localState.site?.slogan || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, slogan: val }
                            }));
                          }}
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-300">Descripción del Proyecto (Visible en Pie de Página)</label>
                      <textarea
                        value={localState.site?.description || ''}
                        rows={2}
                        onChange={(e) => {
                          const val = e.target.value;
                          setLocalState((prev) => ({
                            ...prev,
                            site: { ...prev.site, description: val }
                          }));
                        }}
                        className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {/* 2. Datos de Contacto Solidario (Pie de Página y Enlaces) */}
                  <div className="bg-[#0c120e] border border-emerald-900/30 rounded-2xl p-5 space-y-4 text-xs">
                    <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider border-b border-emerald-950 pb-2">
                      Datos de Contacto Solidario (Pie de Página)
                    </h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Teléfono Principal</label>
                        <input
                          type="text"
                          value={localState.site?.phonePrimary || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, phonePrimary: val }
                            }));
                          }}
                          placeholder="+53 5200 0000"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">WhatsApp Oficial</label>
                        <input
                          type="text"
                          value={localState.site?.whatsapp || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, whatsapp: val }
                            }));
                          }}
                          placeholder="5352000000"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Correo Electrónico de Contacto</label>
                        <input
                          type="email"
                          value={localState.site?.email || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, email: val }
                            }));
                          }}
                          placeholder="contacto@patitascubanas.org"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Ubicación / Cobertura de Referencia</label>
                        <input
                          type="text"
                          value={localState.site?.address || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, address: val }
                            }));
                          }}
                          placeholder="La Habana & Villa Clara, Cuba"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Canal / Grupo de Telegram</label>
                        <input
                          type="text"
                          value={localState.site?.telegramGroup || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, telegramGroup: val }
                            }));
                          }}
                          placeholder="https://t.me/patitascubanas"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-stone-300">Página de Facebook o Redes</label>
                        <input
                          type="text"
                          value={localState.site?.facebookPage || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setLocalState((prev) => ({
                              ...prev,
                              site: { ...prev.site, facebookPage: val }
                            }));
                          }}
                          placeholder="https://facebook.com/patitascubanas"
                          className="w-full bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Anuncios de la Marquesina (Teleprónter) */}
                  <div className="bg-[#0c120e] border border-emerald-900/30 rounded-2xl p-5 space-y-4 text-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-emerald-950">
                      <h5 className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                        Avisos de la Marquesina (Teleprónter en Vivo)
                      </h5>
                      <button
                        type="button"
                        onClick={() => {
                          setLocalState((prev) => ({
                            ...prev,
                            marquee: [...(prev.marquee || []), '📢 Nuevo aviso urgente para la comunidad...']
                          }));
                        }}
                        className="inline-flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agregar Aviso</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {(localState.marquee || []).map((notice, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={notice}
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalState((prev) => ({
                                ...prev,
                                marquee: prev.marquee.map((m, i) => (i === idx ? val : m))
                              }));
                            }}
                            className="flex-1 bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setLocalState((prev) => ({
                                ...prev,
                                marquee: prev.marquee.filter((_, i) => i !== idx)
                              }));
                            }}
                            className="p-2 text-stone-400 hover:text-rose-400 transition-colors"
                            title="Eliminar aviso"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: SEGURIDAD (CAMBIO DE PIN) */}
              {activeTab === 'security' && (
                <div className="space-y-6 max-w-md">
                  <div>
                    <h4 className="text-lg font-bold text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-emerald-400" />
                      <span>Seguridad y Clave Administrativa</span>
                    </h4>
                    <p className="text-xs text-stone-400">
                      Actualiza el PIN maestro de acceso al panel administrativo.
                    </p>
                  </div>

                  <form onSubmit={handlePinUpdate} className="bg-[#0c120e] border border-emerald-900/30 rounded-2xl p-5 space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-300">PIN Actual</label>
                      <input
                        type="password"
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value)}
                        placeholder="••••"
                        className="w-full font-mono text-sm bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-300">Nuevo PIN (4 a 12 caracteres)</label>
                      <input
                        type="password"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value)}
                        placeholder="••••"
                        className="w-full font-mono text-sm bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-stone-300">Confirmar Nuevo PIN</label>
                      <input
                        type="password"
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value)}
                        placeholder="••••"
                        className="w-full font-mono text-sm bg-[#121914] border border-emerald-900/40 rounded-xl px-3 py-2 text-white"
                      />
                    </div>

                    {pinChangeMsg.text && (
                      <p
                        className={`text-xs font-semibold ${
                          pinChangeMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {pinChangeMsg.text}
                      </p>
                    )}

                    <button
                      type="submit"
                      disabled={isUpdatingPin || !currentPin || !newPin || !confirmPin}
                      className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold transition-all"
                    >
                      {isUpdatingPin ? 'Actualizando...' : 'Actualizar PIN'}
                    </button>
                  </form>
                </div>
              )}
            </main>
          </div>
        )}

        {/* Modal Photo Picker Overlay */}
        {pickerTargetPetId && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <div className="bg-[#101712] border border-emerald-800/60 rounded-3xl p-6 max-w-2xl w-full max-h-[80vh] flex flex-col space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-900/40">
                <h4 className="text-sm font-bold text-white">Elige una foto para la mascota</h4>
                <button
                  onClick={() => setPickerTargetPetId(null)}
                  className="p-1 text-stone-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Upload directly to this pet */}
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileUpload(f, 'pets', pickerTargetPetId);
                  }}
                  id="picker-upload"
                  className="hidden"
                />
                <label
                  htmlFor="picker-upload"
                  className="cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold py-2 px-3.5 rounded-xl transition-all"
                >
                  Subir Nueva Foto
                </label>
                {uploadingImage && <span className="text-xs text-emerald-400 animate-pulse">{uploadProgress}</span>}
              </div>

              {/* Existing library photos */}
              <div className="flex-1 overflow-y-auto grid grid-cols-3 sm:grid-cols-4 gap-3 pt-2">
                {mediaLibrary.map((asset) => {
                  const url = asset.variants?.card || asset.variants?.thumb || asset.variants?.full;
                  return (
                    <div
                      key={asset.id}
                      onClick={() => {
                        setLocalState((prev) => ({
                          ...prev,
                          pets: prev.pets.map((p) =>
                            p.id === pickerTargetPetId
                              ? { ...p, image: url, assetId: asset.id, asset }
                              : p
                          )
                        }));
                        setPickerTargetPetId(null);
                      }}
                      className="cursor-pointer aspect-square rounded-xl overflow-hidden bg-stone-900 border-2 border-transparent hover:border-emerald-400 transition-all group relative"
                    >
                      <img src={url} alt={asset.alt} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-emerald-600/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Check className="w-6 h-6 text-white stroke-[3]" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
