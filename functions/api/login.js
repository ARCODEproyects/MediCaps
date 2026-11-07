// POST /api/login → responde 200 si la contraseña es correcta.
import { json, missingSetup, isAdmin, wait } from "./_lib.js";

export async function onRequestPost({ request, env }) {
  const setup = missingSetup(env);
  if (setup) return setup;
  if (!isAdmin(request, env)) {
    await wait(800); // frena intentos repetidos
    return json({ error: "Contraseña incorrecta." }, 401);
  }
  return json({ ok: true });
}
