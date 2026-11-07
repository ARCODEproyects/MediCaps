// GET  /api/store  → datos públicos de la tienda (los lee la página principal)
// PUT  /api/store  → guarda productos y textos (solo con contraseña)
import { json, missingSetup, isAdmin, wait, readStore, sanitizeStore, imageIds } from "./_lib.js";

export async function onRequestGet({ env }) {
  if (!env.STORE) return missingSetup(env);
  return json(await readStore(env));
}

export async function onRequestPut({ request, env }) {
  const setup = missingSetup(env);
  if (setup) return setup;
  if (!isAdmin(request, env)) {
    await wait(800);
    return json({ error: "Contraseña incorrecta. Vuelve a iniciar sesión." }, 401);
  }

  let body;
  try { body = await request.json(); } catch { return json({ error: "Los datos llegaron incompletos." }, 400); }
  const clean = sanitizeStore(body);
  if (!clean) return json({ error: "Hay un producto con datos inválidos. Revisa que todos tengan nombre y precio." }, 400);

  await env.STORE.put("store", JSON.stringify(clean));

  // Borra fotos que ya no usa ningún producto, para no llenar el espacio.
  const used = imageIds(clean);
  let cursor;
  do {
    const page = await env.STORE.list({ prefix: "img:", cursor });
    for (const k of page.keys) {
      if (!used.has(k.name.slice(4))) await env.STORE.delete(k.name);
    }
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);

  return json({ ok: true, products: clean.products.length });
}
