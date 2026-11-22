const STORAGE_KEY = 'patitas_cubanas_state_v1';

/**
 * Guarda el estado completo de la aplicación en el almacenamiento local persistente.
 */
export function saveToLocalStorage(data) {
  try {
    if (typeof window !== 'undefined' && window.localStorage && data) {
      // Garantizar que ninguna credencial de seguridad o hash se almacene en el cliente
      const sanitized = { ...data };
      delete sanitized.security;
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    }
  } catch (e) {
    console.warn('No se pudo guardar en almacenamiento local:', e);
  }
}

/**
 * Carga el estado almacenado en el navegador si existe, purgando cualquier residuo de seguridad.
 */
export function loadFromLocalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          if (parsed.security) {
            delete parsed.security;
            try {
              window.localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            } catch (ignore) {}
          }
          return parsed;
        }
      }
    }
  } catch (e) {
    console.warn('No se pudo leer del almacenamiento local:', e);
  }
  return null;
}

/**
 * Limpia el estado almacenado en el navegador.
 */
export function clearLocalStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch (e) {
    console.warn('No se pudo limpiar el almacenamiento local:', e);
  }
}
