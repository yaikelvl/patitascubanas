/**
 * Cloudflare Worker Entrypoint — Adopción de Animales Cuba
 * ==========================================================================
 * Permite que el proyecto funcione en Cloudflare Workers con Static Assets
 * (`workers.dev`), atendiendo la API de fotos en `/api/media` y sirviendo los
 * archivos estáticos generados por Astro en `./dist`.
 */

import { handleUpload, handleDelete, handleHealth } from './functions/api/_lib/mediaCore.js';

function reply({ status, json }) {
  return new Response(JSON.stringify(json), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (url.pathname === '/api/media' || url.pathname === '/api/media/') {
      switch (request.method) {
        case 'GET':
          return reply(handleHealth({ env }));
        case 'POST':
          return reply(await handleUpload({ request, env }));
        case 'DELETE':
          return reply(await handleDelete({ request, env }));
        default:
          return reply({
            status: 405,
            json: { ok: false, code: 'method-not-allowed', error: `Método ${request.method} no soportado` }
          });
      }
    }

    // Servir assets estáticos compilados de Astro (dist/)
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not Found', { status: 404 });
  }
};
