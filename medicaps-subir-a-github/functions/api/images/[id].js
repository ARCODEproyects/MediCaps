// GET /api/images/<id>  → muestra la foto
// PUT /api/images/<id>  → sube una foto (solo con contraseña)
import { json, missingSetup, isAdmin, wait } from "../_lib.js";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;
const validId = (id) => /^[a-z0-9-]{6,48}$/.test(id);

export async function onRequestGet({ params, env }) {
  if (!env.STORE || !validId(params.id)) return new Response("No encontrada", { status: 404 });
  const { value, metadata } = await env.STORE.getWithMetadata("img:" + params.id, { type: "arrayBuffer" });
  if (!value) return new Response("No encontrada", { status: 404 });
  return new Response(value, {
    headers: {
      "content-type": (metadata && metadata.type) || "image/jpeg",
      // cada foto tiene un id único, así que se puede guardar en caché para siempre
      "cache-control": "public, max-age=31536000, immutable"
    }
  });
}

export async function onRequestPut({ request, params, env }) {
  const setup = missingSetup(env);
  if (setup) return setup;
  if (!isAdmin(request, env)) {
    await wait(800);
    return json({ error: "Contraseña incorrecta." }, 401);
  }
  if (!validId(params.id)) return json({ error: "Nombre de foto inválido." }, 400);
  const type = (request.headers.get("content-type") || "").split(";")[0];
  if (!TYPES.includes(type)) return json({ error: "Solo se aceptan fotos JPG, PNG o WEBP." }, 415);
  const buf = await request.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) return json({ error: "La foto pesa más de 2 MB." }, 413);
  await env.STORE.put("img:" + params.id, buf, { metadata: { type } });
  return json({ ok: true, url: "/api/images/" + params.id });
}
