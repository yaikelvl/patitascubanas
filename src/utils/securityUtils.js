import CryptoJS from 'crypto-js';
import {
  getAdminAuthParamsFromSupabase,
  verifyAdminPinInSupabase
} from './supabaseClient.js';

const LOCKOUT_STORAGE_KEY = 'patitas_admin_lockout_v1';

export const FALLBACK_SALT = 'c0f3e8b41a924b1d';
export const FALLBACK_ITERATIONS = 25000;

/**
 * Genera un salt criptográficamente seguro de 128 bits (16 bytes)
 */
export function generateSalt(byteLength = 16) {
  try {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const array = new Uint8Array(byteLength);
      window.crypto.getRandomValues(array);
      return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
    }
  } catch (e) {
    // Fallback a CryptoJS
  }
  return CryptoJS.lib.WordArray.random(byteLength).toString(CryptoJS.enc.Hex);
}

/**
 * Deriva un hash robusto con PBKDF2-HMAC-SHA256 y 25.000 iteraciones
 */
export function derivePinHash(pin, salt = FALLBACK_SALT, iterations = FALLBACK_ITERATIONS) {
  const cleanPin = String(pin).trim();
  const cleanSalt = String(salt).trim();
  return CryptoJS.PBKDF2(cleanPin, cleanSalt, {
    keySize: 256 / 32,
    iterations: Number(iterations) || 25000
  }).toString();
}

/**
 * Comparación en tiempo constante para mitigar ataques de canal lateral
 */
export function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;

  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Consulta los parámetros de derivación desde Supabase.
 */
export async function getAdminAuthParams() {
  return await getAdminAuthParamsFromSupabase();
}

/**
 * Valida un PIN candidato directamente contra el backend (Supabase RPC).
 */
export async function verifyAdminPinWithBackend(candidatePin) {
  const clean = String(candidatePin || '').trim();
  if (!clean) {
    return { success: false, error: 'Ingresa un PIN para continuar.' };
  }

  try {
    const authParams = await getAdminAuthParams();
    const candidateHash = derivePinHash(
      clean,
      authParams.salt || FALLBACK_SALT,
      authParams.iterations || FALLBACK_ITERATIONS
    );

    const result = await verifyAdminPinInSupabase(candidateHash);
    if (result.success) {
      resetFailedAttempts();
      return { success: true, pinHash: candidateHash };
    }

    recordFailedAttempt();
    return {
      success: false,
      error: result.error || 'PIN incorrecto. Verifica tus credenciales.'
    };
  } catch (err) {
    console.error('[Security] Error al verificar PIN con backend:', err);
    return {
      success: false,
      error: 'Error de conexión con el servidor. Inténtalo nuevamente.'
    };
  }
}

/**
 * Gestión de intentos fallidos y bloqueo temporal
 */
export function getLockoutStatus() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { isLocked: false, remainingSeconds: 0 };
    }
    const raw = window.localStorage.getItem(LOCKOUT_STORAGE_KEY);
    if (!raw) return { isLocked: false, remainingSeconds: 0 };
    const data = JSON.parse(raw);
    const now = Date.now();
    if (data.lockedUntil && data.lockedUntil > now) {
      const remaining = Math.ceil((data.lockedUntil - now) / 1000);
      return { isLocked: true, remainingSeconds: remaining };
    }
  } catch (e) {}
  return { isLocked: false, remainingSeconds: 0 };
}

export function recordFailedAttempt() {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    const raw = window.localStorage.getItem(LOCKOUT_STORAGE_KEY);
    const data = raw ? JSON.parse(raw) : { attempts: 0 };
    data.attempts = (data.attempts || 0) + 1;
    if (data.attempts >= 5) {
      data.lockedUntil = Date.now() + 60 * 1000; // 1 minuto de bloqueo
      data.attempts = 0;
    }
    window.localStorage.setItem(LOCKOUT_STORAGE_KEY, JSON.stringify(data));
  } catch (e) {}
}

export function resetFailedAttempts() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(LOCKOUT_STORAGE_KEY);
    }
  } catch (e) {}
}

export function validateNewPin(pin) {
  if (!pin || typeof pin !== 'string') return 'El PIN no puede estar vacío.';
  const clean = pin.trim();
  if (clean.length < 4 || clean.length > 12) {
    return 'El PIN debe tener entre 4 y 12 caracteres.';
  }
  return null;
}
