import { handleUpload, handleDelete, handleHealth } from './_lib/mediaCore.js';

function reply({ status, json }) {
  return new Response(JSON.stringify(json), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

export async function onRequestGet(context) {
  return reply(handleHealth({ env: context.env }));
}

export async function onRequestPost(context) {
  return reply(await handleUpload({ request: context.request, env: context.env }));
}

export async function onRequestDelete(context) {
  return reply(await handleDelete({ request: context.request, env: context.env }));
}
