/**
 * Manejador de la biblioteca de medios en cliente.
 * Optimiza y comprime en WebP (400, 900, 1600 px) y sube al endpoint `/api/media` de Cloudflare.
 */

export const MEDIA_ENDPOINT = '/api/media';
export const MEDIA_FOLDERS = ['pets', 'donations', 'campaigns', 'general'];

export const VARIANT_SPECS = [
  { width: 400, quality: 0.78, name: 'thumb' },
  { width: 900, quality: 0.8, name: 'card' },
  { width: 1600, quality: 0.82, name: 'full' }
];

let endpointStatus = null;

export async function probeMediaEndpoint({ force = false } = {}) {
  if (endpointStatus && !force) return endpointStatus;
  if (typeof fetch !== 'function') {
    endpointStatus = { available: false, configured: false, status: 0 };
    return endpointStatus;
  }
  try {
    const response = await fetch(MEDIA_ENDPOINT, { method: 'GET', headers: { accept: 'application/json' } });
    const data = await response.json().catch(() => null);
    endpointStatus = {
      available: Boolean(response.ok && data && data.ok),
      configured: Boolean(data && data.configured),
      status: response.status
    };
  } catch {
    endpointStatus = { available: false, configured: false, status: 0 };
  }
  return endpointStatus;
}

async function loadSource(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file);
      return { source: bitmap, release: () => bitmap.close && bitmap.close() };
    } catch {}
  }

  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ source: image, release: () => URL.revokeObjectURL(objectUrl) });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('No se pudo leer el archivo de imagen'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function encodeCanvas(canvas, quality) {
  const webp = await canvasToBlob(canvas, 'image/webp', quality);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await canvasToBlob(canvas, 'image/jpeg', quality);
  return jpeg || webp;
}

export async function buildImageVariants(file) {
  const { source, release } = await loadSource(file);
  try {
    const sourceWidth = source.width || source.naturalWidth || 0;
    const sourceHeight = source.height || source.naturalHeight || 0;
    if (!sourceWidth || !sourceHeight) throw new Error('La imagen no tiene dimensiones válidas');

    const variants = {};

    for (const spec of VARIANT_SPECS) {
      const targetWidth = Math.min(spec.width, sourceWidth);
      const targetHeight = Math.max(1, Math.round((sourceHeight * targetWidth) / sourceWidth));
      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(source, 0, 0, targetWidth, targetHeight);

      const blob = await encodeCanvas(canvas, spec.quality);
      if (blob) {
        variants[spec.name] = blob;
      }
    }

    if (Object.keys(variants).length === 0) throw new Error('No se pudo generar ninguna variante WebP');

    return {
      variants,
      width: sourceWidth,
      height: sourceHeight
    };
  } finally {
    release();
  }
}

export async function uploadMediaAsset({ pinHash, folder = 'pets', file, alt = '', onProgress } = {}) {
  if (!file) return { ok: false, error: 'No se seleccionó ningún archivo.' };
  if (!pinHash) return { ok: false, error: 'Sesión administrativa no autorizada.' };

  const status = await probeMediaEndpoint();
  if (!status.available || !status.configured) {
    // Si no está corriendo el worker /api/media (por ejemplo en local Astro dev simple),
    // creamos un data URL local para que el usuario pueda seguir previsualizando
    try {
      const localDataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(file);
      });
      return {
        ok: true,
        localOnly: true,
        asset: {
          id: `local-${Date.now()}`,
          folder,
          variants: { card: localDataUrl, thumb: localDataUrl, full: localDataUrl },
          alt: alt || file.name,
          created_at: new Date().toISOString()
        }
      };
    } catch (e) {
      return { ok: false, error: 'Servicio de fotos en la nube no conectado aún.' };
    }
  }

  let built;
  try {
    onProgress?.('Optimizando imágenes...');
    built = await buildImageVariants(file);
  } catch (error) {
    return { ok: false, error: error.message };
  }

  const form = new FormData();
  form.append('pin_hash', pinHash);
  form.append('folder', folder);
  form.append('alt', alt || file.name.replace(/\.[^/.]+$/, ''));

  for (const [name, blob] of Object.entries(built.variants)) {
    form.append(`variant_${name}`, blob, `${name}.webp`);
  }

  try {
    onProgress?.('Subiendo a Supabase Storage...');
    const response = await fetch(MEDIA_ENDPOINT, {
      method: 'POST',
      body: form
    });
    const result = await response.json();
    return result;
  } catch (err) {
    return { ok: false, error: 'Error al enviar la imagen al servidor.' };
  }
}

export async function deleteMediaAsset({ pinHash, assetId }) {
  if (!assetId || !pinHash) return { ok: false };
  try {
    const res = await fetch(MEDIA_ENDPOINT, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pin_hash: pinHash, id: assetId })
    });
    return await res.json();
  } catch (e) {
    return { ok: false, error: e.message };
  }
}
