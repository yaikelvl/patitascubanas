/**
 * Núcleo de medios (Cloudflare Pages Function & Cloudflare Workers).
 * Gestiona subidas optimizadas hacia Supabase Storage en el bucket 'media'.
 *
 * REGLA DE SEGURIDAD:
 * - SUPABASE_SERVICE_ROLE_KEY nunca se expone al cliente.
 * - Solo este endpoint la usa para escribir en Storage tras verificar el PIN hash.
 */

export const MEDIA_BUCKET = 'media';
export const MEDIA_FOLDERS = ['pets', 'donations', 'campaigns', 'general'];
export const VARIANT_NAMES = ['thumb', 'card', 'full'];
export const VARIANT_DEFAULT_WIDTHS = { thumb: 400, card: 900, full: 1600 };
export const ALLOWED_MIMES = ['image/webp', 'image/jpeg', 'image/png', 'image/avif'];
export const MAX_VARIANT_BYTES = 3 * 1024 * 1024; // 3 MB por variante
export const MAX_TOTAL_BYTES = 8 * 1024 * 1024;
export const MAX_ALT_LENGTH = 180;

export class MediaError extends Error {
  constructor(status, code, message, details = null) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function resolveConfig(env = {}) {
  return {
    url: env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL || '',
    anonKey: env.SUPABASE_ANON_KEY || env.PUBLIC_SUPABASE_ANON_KEY || '',
    serviceKey: env.SUPABASE_SERVICE_ROLE_KEY || ''
  };
}

export function isConfigured(env = {}) {
  const { url, serviceKey } = resolveConfig(env);
  return Boolean(url && serviceKey && serviceKey.length > 20);
}

export function isPinHash(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/i.test(value.trim());
}

export function isUuid(value) {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.trim())
  );
}

export function extensionFor(mime) {
  if (mime === 'image/jpeg') return 'jpg';
  if (mime === 'image/png') return 'png';
  if (mime === 'image/avif') return 'avif';
  return 'webp';
}

export function publicObjectUrl(baseUrl, path, bucket = MEDIA_BUCKET) {
  return `${baseUrl}/storage/v1/object/public/${bucket}/${path}`;
}

export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function authHeaders(key, extra = {}) {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

export async function verifyPinHash({ config, pinHash, fetchImpl = fetch }) {
  if (!isPinHash(pinHash)) {
    throw new MediaError(401, 'unauthorized', 'Credencial de seguridad ausente o malformada');
  }

  const response = await fetchImpl(`${config.url}/rest/v1/rpc/verify_admin_pin`, {
    method: 'POST',
    headers: authHeaders(config.anonKey, { 'content-type': 'application/json' }),
    body: JSON.stringify({ p_pin_hash: String(pinHash).trim() })
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    if (response.status === 404 || /PGRST202|does not exist|schema cache/i.test(detail)) {
      throw new MediaError(503, 'backend-not-migrated', 'La base de datos requiere las funciones RPC de seguridad.');
    }
    throw new MediaError(502, 'verify-failed', 'No se pudo validar la credencial con el servidor.');
  }

  const result = await response.json().catch(() => null);
  if (!result || result.success !== true) {
    throw new MediaError(401, 'unauthorized', (result && result.error) || 'PIN incorrecto');
  }
  return true;
}

export async function putObject({ config, path, bytes, mime, fetchImpl = fetch }) {
  const response = await fetchImpl(`${config.url}/storage/v1/object/${MEDIA_BUCKET}/${path}`, {
    method: 'POST',
    headers: {
      ...authHeaders(config.serviceKey),
      'content-type': mime,
      'cache-control': 'public, max-age=31536000',
      'x-upsert': 'true'
    },
    body: bytes
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new MediaError(502, 'storage-upload-failed', `Supabase Storage rechazó "${path}": ${detail.slice(0, 200)}`);
  }
  return path;
}

export async function removeObjects({ config, paths, fetchImpl = fetch }) {
  const prefixes = (paths || []).filter(Boolean);
  if (prefixes.length === 0) return [];

  try {
    const response = await fetchImpl(`${config.url}/storage/v1/object/${MEDIA_BUCKET}`, {
      method: 'DELETE',
      headers: authHeaders(config.serviceKey, { 'content-type': 'application/json' }),
      body: JSON.stringify({ prefixes })
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      return [{ ok: false, error: detail.slice(0, 200) }];
    }
    return await response.json().catch(() => []);
  } catch (error) {
    return [{ ok: false, error: String((error && error.message) || error) }];
  }
}

export function handleHealth({ env = {} }) {
  const configured = isConfigured(env);
  return {
    status: 200,
    json: {
      ok: true,
      ready: configured,
      available: configured,
      configured,
      bucket: MEDIA_BUCKET,
      folders: MEDIA_FOLDERS
    }
  };
}

export async function handleUpload({ request, env = {}, fetchImpl = fetch }) {
  const config = resolveConfig(env);
  if (!isConfigured(env)) {
    return {
      status: 503,
      json: { ok: false, code: 'not-configured', error: 'Servicio de almacenamiento no configurado en Cloudflare Workers.' }
    };
  }

  let formData;
  try {
    formData = await request.formData();
  } catch (e) {
    return {
      status: 400,
      json: { ok: false, code: 'bad-request', error: 'Formato multipart no válido' }
    };
  }

  const pinHash = formData.get('pin_hash');
  try {
    await verifyPinHash({ config, pinHash, fetchImpl });
  } catch (err) {
    return {
      status: err.status || 401,
      json: { ok: false, code: err.code || 'unauthorized', error: err.message }
    };
  }

  const folder = String(formData.get('folder') || 'pets').trim();
  const validFolder = MEDIA_FOLDERS.includes(folder) ? folder : 'pets';
  const alt = String(formData.get('alt') || '').slice(0, MAX_ALT_LENGTH);
  const assetId = newId();

  // Variantes
  const variants = {};
  const paths = {};
  const now = new Date();
  const yearMonth = `${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}`;

  for (const name of VARIANT_NAMES) {
    const file = formData.get(`variant_${name}`) || formData.get(name);
    if (!file || typeof file === 'string') continue;

    const mime = file.type || 'image/webp';
    const ext = extensionFor(mime);
    const storagePath = `${validFolder}/${yearMonth}/${assetId}-${name}.${ext}`;
    const bytes = await file.arrayBuffer();

    try {
      await putObject({ config, path: storagePath, bytes, mime, fetchImpl });
      paths[name] = storagePath;
      variants[name] = publicObjectUrl(config.url, storagePath, MEDIA_BUCKET);
    } catch (uploadErr) {
      console.error('Error subiendo variante:', uploadErr);
    }
  }

  // Si no llegaron variantes separadas, buscar archivo único 'file'
  if (Object.keys(variants).length === 0) {
    const singleFile = formData.get('file');
    if (singleFile && typeof singleFile !== 'string') {
      const mime = singleFile.type || 'image/webp';
      const ext = extensionFor(mime);
      const storagePath = `${validFolder}/${yearMonth}/${assetId}-card.${ext}`;
      const bytes = await singleFile.arrayBuffer();

      await putObject({ config, path: storagePath, bytes, mime, fetchImpl });
      paths['card'] = storagePath;
      variants['card'] = publicObjectUrl(config.url, storagePath, MEDIA_BUCKET);
      variants['thumb'] = variants['card'];
      variants['full'] = variants['card'];
    } else {
      return {
        status: 400,
        json: { ok: false, code: 'no-file', error: 'No se enviaron imágenes para subir' }
      };
    }
  }

  // Registrar asset en la base de datos Supabase
  const assetRecord = {
    id: assetId,
    bucket: MEDIA_BUCKET,
    folder: validFolder,
    base_path: `${validFolder}/${yearMonth}/${assetId}`,
    variants,
    paths,
    alt,
    created_at: now.toISOString()
  };

  try {
    const dbRes = await fetchImpl(`${config.url}/rest/v1/media_assets`, {
      method: 'POST',
      headers: authHeaders(config.serviceKey, {
        'content-type': 'application/json',
        'prefer': 'return=representation'
      }),
      body: JSON.stringify(assetRecord)
    });

    if (dbRes.ok) {
      const inserted = await dbRes.json().catch(() => [assetRecord]);
      return {
        status: 200,
        json: { ok: true, asset: inserted[0] || assetRecord }
      };
    }
  } catch (dbErr) {
    console.warn('No se pudo registrar media_assets en BD, devolviendo registro directo:', dbErr);
  }

  return {
    status: 200,
    json: { ok: true, asset: assetRecord }
  };
}

export async function handleDelete({ request, env = {}, fetchImpl = fetch }) {
  const config = resolveConfig(env);
  if (!isConfigured(env)) {
    return { status: 503, json: { ok: false, error: 'Servicio no configurado' } };
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return { status: 400, json: { ok: false, error: 'Cuerpo JSON requerido' } };
  }

  const { pin_hash: pinHash, id: assetId } = body || {};
  try {
    await verifyPinHash({ config, pinHash, fetchImpl });
  } catch (err) {
    return { status: 401, json: { ok: false, error: err.message } };
  }

  if (!assetId) {
    return { status: 400, json: { ok: false, error: 'ID de activo requerido' } };
  }

  // Buscar asset para saber paths
  try {
    const getRes = await fetchImpl(`${config.url}/rest/v1/media_assets?id=eq.${encodeURIComponent(assetId)}&select=paths`, {
      headers: authHeaders(config.serviceKey)
    });
    if (getRes.ok) {
      const rows = await getRes.json();
      const asset = rows?.[0];
      if (asset && asset.paths) {
        const filePaths = Object.values(asset.paths);
        await removeObjects({ config, paths: filePaths, fetchImpl });
      }
    }

    // Borrar de la tabla
    await fetchImpl(`${config.url}/rest/v1/media_assets?id=eq.${encodeURIComponent(assetId)}`, {
      method: 'DELETE',
      headers: authHeaders(config.serviceKey)
    });

    return { status: 200, json: { ok: true, deleted: assetId } };
  } catch (err) {
    return { status: 500, json: { ok: false, error: err.message } };
  }
}
