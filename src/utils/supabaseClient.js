import { createClient } from '@supabase/supabase-js';
import { INITIAL_DATA } from '../data/initialData.js';

// Polyfill seguro de WebSocket para compilación en Node.js < 22 en Cloudflare CI
if (typeof globalThis !== 'undefined' && typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = class WebSocketPolyfill {
    constructor() {
      this.readyState = 3; // CLOSED
    }
    addEventListener() {}
    removeEventListener() {}
    send() {}
    close() {}
  };
}

const cloudUrl = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_URL) || '';
const cloudAnonKey = (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_SUPABASE_ANON_KEY) || '';

export const isSupabaseConfigured = Boolean(
  cloudUrl &&
  cloudAnonKey &&
  cloudUrl.includes('supabase.co')
);

export const supabase = isSupabaseConfigured
  ? createClient(cloudUrl, cloudAnonKey, {
      auth: {
        persistSession: typeof window !== 'undefined',
        autoRefreshToken: typeof window !== 'undefined'
      },
      realtime: {
        transport: typeof window !== 'undefined' && typeof window.WebSocket !== 'undefined'
          ? window.WebSocket
          : globalThis.WebSocket
      }
    })
  : null;

/**
 * Consulta la configuración del sitio, donativos y mascotas desde Supabase.
 * Retorna null si la conexión no está configurada para que la app cargue offline instantáneamente.
 */
export async function fetchAdoptionDataFromSupabase() {
  if (!supabase) {
    console.info('[Cloud] Supabase no configurado aún. Operando en modo offline-first.');
    return null;
  }

  try {
    // 1. Configuración del sitio
    const { data: settingsData, error: settingsError } = await supabase
      .from('site_settings')
      .select('*')
      .limit(1);

    if (settingsError) {
      console.warn('[Cloud] Consulta de configuración no completada:', settingsError.message);
    }

    // 2. Configuración de donativos
    const { data: donationsData, error: donationsError } = await supabase
      .from('donation_settings')
      .select('*')
      .limit(1);

    if (donationsError) {
      console.warn('[Cloud] Consulta de donativos no completada:', donationsError.message);
    }

    // 3. Biblioteca de fotos (media_assets)
    let assetsData = [];
    try {
      const { data: assetsRes, error: assetsErr } = await supabase
        .from('media_assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (!assetsErr && assetsRes) {
        assetsData = assetsRes;
      }
    } catch (e) {
      console.warn('[Cloud] Error consultando media_assets:', e);
    }
    const assetById = new Map(assetsData.map((a) => [a.id, a]));

    // 4. Mascotas
    const { data: petsData, error: petsError } = await supabase
      .from('pets')
      .select('*')
      .order('sort_order', { ascending: true });

    if (petsError) {
      console.warn('[Cloud] Consulta de mascotas no completada:', petsError.message);
    }

    if (!settingsData?.[0] && !petsData?.length && !donationsData?.[0]) {
      return null;
    }

    const sRow = settingsData?.[0];
    const site = sRow
      ? {
          name: sRow.name || INITIAL_DATA.site.name,
          subtitle: sRow.subtitle || INITIAL_DATA.site.subtitle,
          slogan: sRow.slogan || INITIAL_DATA.site.slogan,
          accentPhrase: sRow.accent_phrase || INITIAL_DATA.site.accentPhrase,
          description: sRow.description || INITIAL_DATA.site.description,
          phonePrimary: sRow.phone_primary || INITIAL_DATA.site.phonePrimary,
          phoneSecondary: sRow.phone_secondary || '',
          whatsapp: sRow.whatsapp || INITIAL_DATA.site.whatsapp,
          email: sRow.email || INITIAL_DATA.site.email,
          address: sRow.address || INITIAL_DATA.site.address,
          stats: sRow.stats || INITIAL_DATA.site.stats,
          socials: sRow.socials || {}
        }
      : INITIAL_DATA.site;

    const marquee = (sRow?.marquee && Array.isArray(sRow.marquee) && sRow.marquee.length > 0)
      ? sRow.marquee
      : INITIAL_DATA.marquee;

    const faqs = (sRow?.faqs && Array.isArray(sRow.faqs) && sRow.faqs.length > 0)
      ? sRow.faqs
      : INITIAL_DATA.faqs;

    const dRow = donationsData?.[0];
    const donations = dRow
      ? {
          title: dRow.title || INITIAL_DATA.donations.title,
          description: dRow.description || INITIAL_DATA.donations.description,
          cardHolderCup: dRow.card_holder_cup || INITIAL_DATA.donations.cardHolderCup,
          cardNumberCup: dRow.card_number_cup || INITIAL_DATA.donations.cardNumberCup,
          bankCup: dRow.bank_cup || INITIAL_DATA.donations.bankCup,
          paymentMethodsCup: dRow.payment_methods_cup || INITIAL_DATA.donations.paymentMethodsCup,
          cardHolderMlc: dRow.card_holder_mlc || INITIAL_DATA.donations.cardHolderMlc,
          cardNumberMlc: dRow.card_number_mlc || INITIAL_DATA.donations.cardNumberMlc,
          bankMlc: dRow.bank_mlc || INITIAL_DATA.donations.bankMlc,
          cryptoAddress: dRow.crypto_address || INITIAL_DATA.donations.cryptoAddress,
          cryptoNetwork: dRow.crypto_network || INITIAL_DATA.donations.cryptoNetwork,
          phoneConfirmation: dRow.phone_confirmation || INITIAL_DATA.donations.phoneConfirmation,
          confirmationNote: dRow.confirmation_note || INITIAL_DATA.donations.confirmationNote,
          neededSupplies: dRow.needed_supplies || INITIAL_DATA.donations.neededSupplies,
          isActive: dRow.is_active ?? true
        }
      : INITIAL_DATA.donations;

    const pets = (petsData && petsData.length > 0)
      ? petsData.map((item) => ({
          id: item.id,
          name: item.name,
          species: item.species || 'Perro',
          breed: item.breed || 'Mestizo',
          gender: item.gender || 'Macho',
          ageCategory: item.age_category || 'Joven',
          approxAge: item.approx_age || '',
          size: item.size || 'Mediano',
          province: item.province,
          municipality: item.municipality,
          addressReference: item.address_reference || '',
          status: item.status || 'disponible',
          isVaccinated: Boolean(item.is_vaccinated),
          isDewormed: Boolean(item.is_dewormed),
          isSterilized: Boolean(item.is_sterilized),
          specialNeeds: item.special_needs || '',
          story: item.story || '',
          contactName: item.contact_name || '',
          contactWhatsapp: item.contact_whatsapp || '',
          contactPhone: item.contact_phone || '',
          image: item.image || '',
          assetId: item.asset_id || null,
          asset: assetById.get(item.asset_id) || null,
          isFeatured: Boolean(item.is_featured),
          badge: item.badge || '',
          sortOrder: item.sort_order || 1
        }))
      : INITIAL_DATA.pets;

    return {
      site,
      marquee,
      donations,
      pets,
      faqs,
      successStories: INITIAL_DATA.successStories
    };
  } catch (err) {
    console.error('[Cloud] Error al sincronizar con Supabase:', err);
    return null;
  }
}

/**
 * Consulta los parámetros públicos de derivación criptográfica (salt e iteraciones) desde Supabase.
 */
export async function getAdminAuthParamsFromSupabase() {
  if (!supabase) {
    return { salt: 'c0f3e8b41a924b1d', iterations: 25000 };
  }

  try {
    const { data, error } = await supabase.rpc('get_admin_auth_params');
    if (!error && data && data.salt) {
      return {
        salt: data.salt,
        iterations: Number(data.iterations) || 25000
      };
    }
  } catch (e) {
    console.warn('[Cloud] get_admin_auth_params falló, usando contingencia:', e);
  }

  return { salt: 'c0f3e8b41a924b1d', iterations: 25000 };
}

/**
 * Valida un hash derivado directamente en Supabase mediante el procedimiento RPC.
 */
export async function verifyAdminPinInSupabase(pinHash) {
  if (!supabase) {
    // Si no está configurado, permitir acceso demo con PIN 1234
    return { success: true };
  }

  try {
    const { data, error } = await supabase.rpc('verify_admin_pin', {
      p_pin_hash: pinHash
    });

    if (!error && data) {
      return {
        success: Boolean(data.success),
        error: data.error
      };
    }

    return {
      success: false,
      error: error?.message || 'Error al validar credencial con el servidor'
    };
  } catch (err) {
    console.error('[Cloud] Error al verificar PIN en Supabase:', err);
    return {
      success: false,
      error: err.message || 'Error de conexión con el servidor'
    };
  }
}

/**
 * Guarda y sincroniza la plataforma en Supabase con verificación criptográfica en servidor.
 */
export async function saveAllDataToSupabase(state, pinHash) {
  if (!supabase) {
    return { success: false, error: 'Servidor remoto no configurado aún.' };
  }

  if (!pinHash) {
    return { success: false, error: 'No autorizado: Se requiere verificación de PIN activo.' };
  }

  const sitePayload = {
    name: state.site?.name,
    subtitle: state.site?.subtitle,
    slogan: state.site?.slogan,
    accentPhrase: state.site?.accentPhrase,
    description: state.site?.description,
    phonePrimary: state.site?.phonePrimary,
    phoneSecondary: state.site?.phoneSecondary,
    whatsapp: state.site?.whatsapp,
    email: state.site?.email,
    address: state.site?.address,
    stats: state.site?.stats,
    socials: state.site?.socials,
    marquee: state.marquee,
    faqs: state.faqs
  };

  const donationsPayload = {
    title: state.donations?.title,
    description: state.donations?.description,
    cardHolderCup: state.donations?.cardHolderCup,
    cardNumberCup: state.donations?.cardNumberCup,
    bankCup: state.donations?.bankCup,
    paymentMethodsCup: state.donations?.paymentMethodsCup,
    cardHolderMlc: state.donations?.cardHolderMlc,
    cardNumberMlc: state.donations?.cardNumberMlc,
    bankMlc: state.donations?.bankMlc,
    cryptoAddress: state.donations?.cryptoAddress,
    cryptoNetwork: state.donations?.cryptoNetwork,
    phoneConfirmation: state.donations?.phoneConfirmation,
    confirmationNote: state.donations?.confirmationNote,
    neededSupplies: state.donations?.neededSupplies,
    isActive: state.donations?.isActive
  };

  const petsPayload = (state.pets && state.pets.length > 0)
    ? state.pets.map((item, index) => ({
        id: String(item.id),
        name: item.name,
        species: item.species || 'Perro',
        breed: item.breed || '',
        gender: item.gender || 'Macho',
        age_category: item.ageCategory || 'Joven',
        approx_age: item.approxAge || '',
        size: item.size || 'Mediano',
        province: item.province,
        municipality: item.municipality,
        address_reference: item.addressReference || '',
        status: item.status || 'disponible',
        is_vaccinated: Boolean(item.isVaccinated),
        is_dewormed: Boolean(item.isDewormed),
        is_sterilized: Boolean(item.isSterilized),
        special_needs: item.specialNeeds || '',
        story: item.story || '',
        contact_name: item.contactName || '',
        contact_whatsapp: item.contactWhatsapp || '',
        contact_phone: item.contactPhone || '',
        image: item.image || '',
        asset_id: item.assetId || null,
        is_featured: Boolean(item.isFeatured),
        badge: item.badge || '',
        sort_order: index + 1
      }))
    : [];

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_save_all', {
      p_pin_hash: pinHash,
      p_site: sitePayload,
      p_donations: donationsPayload,
      p_pets: petsPayload
    });

    if (!rpcErr && rpcRes) {
      if (rpcRes.success) {
        return { success: true, message: rpcRes.message };
      } else {
        return { success: false, error: rpcRes.error || 'Credencial de seguridad no autorizada' };
      }
    }

    return {
      success: false,
      error: rpcErr?.message || 'Error al ejecutar el procedimiento remoto de guardado'
    };
  } catch (err) {
    console.error('[Cloud] Excepción al guardar datos en Supabase:', err);
    return { success: false, error: err.message || 'Error de comunicación con el servidor' };
  }
}

/**
 * Elimina una mascota en el servidor por ID.
 */
export async function deletePetFromSupabase(petId, pinHash) {
  if (!supabase) return { success: false };
  if (!pinHash) return { success: false, error: 'No autorizado: Se requiere verificación de PIN.' };

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_delete_pet', {
      p_pin_hash: pinHash,
      p_pet_id: String(petId)
    });

    if (!rpcErr && rpcRes && rpcRes.success) {
      return { success: true };
    }

    return {
      success: false,
      error: rpcRes?.error || rpcErr?.message || 'No autorizado para eliminar la mascota'
    };
  } catch (err) {
    console.error('[Cloud] Error al eliminar mascota:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Actualiza el PIN administrativo en Supabase.
 */
export async function updateAdminPinInSupabase(currentPinHash, newSalt, newHash, iterations = 25000) {
  if (!supabase) return { success: false, error: 'Servidor remoto no configurado.' };

  try {
    const { data: rpcRes, error: rpcErr } = await supabase.rpc('verify_and_update_pin', {
      p_current_pin_hash: currentPinHash,
      p_new_salt: newSalt,
      p_new_hash: newHash,
      p_iterations: iterations
    });

    if (rpcErr) {
      return { success: false, error: rpcErr.message };
    }

    if (rpcRes && !rpcRes.success) {
      return { success: false, error: rpcRes.error || 'PIN actual incorrecto' };
    }

    return {
      success: true,
      message: rpcRes?.message || 'PIN actualizado exitosamente'
    };
  } catch (err) {
    return { success: false, error: err.message || 'Error al conectar con la base de datos' };
  }
}

/**
 * Obtiene la lista de activos de la biblioteca de medios.
 */
export async function fetchMediaLibrary() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('media_assets')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[Cloud] Biblioteca de fotos no disponible:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('[Cloud] Error al leer la biblioteca de fotos:', err);
    return [];
  }
}
