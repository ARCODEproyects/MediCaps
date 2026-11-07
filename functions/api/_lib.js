// Utilidades compartidas por las funciones de la API.
// Los archivos que empiezan con "_" no se convierten en rutas.

export const DEFAULT_STORE = {
  settings: {
    storeName: "MediCaps",
    tagline: "Haute Chirurgie",
    announcement: "Pedidos directos por WhatsApp · Envíos a todo México",
    whatsapp: "+52 1 33 2201 4797",
    currency: "MXN",
    heroBadge: "Colección 2026",
    heroTitle: "La elegancia clásica también entra al quirófano.",
    heroText: "Gorros quirúrgicos ergonómicos, con telas antifluido e hipoalergénicas y confección artesanal para profesionales de la salud.",
    aboutTitle: "Hacemos de la indumentaria médica un oficio de sastre.",
    aboutText: "Un gorro quirúrgico es la primera prenda que te pones antes de entrar a cirugía. Por eso cuidamos el patrón, la tela y cada costura, para que sea cómodo durante jornadas largas y se vea impecable lavado tras lavado.\n\nCada pieza se confecciona a mano y puede llevar tu nombre bordado."
  },
  products: [
    { id: "p1", name: "Gorro Botanical", category: "Edición Limitada", price: 320, color: "#4A5D4E", pattern: "Hojas de salvia", fabric: "Algodón orgánico antifluido", description: "Estampado de hojas en verde salvia. Ajuste trasero con cintas y botones salva-orejas.", tag: "Más vendido", image: "", available: true },
    { id: "p2", name: "Gorro Minimal Taupe", category: "Liso", price: 280, color: "#8C7A6B", pattern: "Taupe mate", fabric: "Tejido stretch en 4 direcciones", description: "Liso, sobrio y muy ligero. Ideal para turnos largos.", tag: "Esencial", image: "", available: true },
    { id: "p3", name: "Gorro Terrazzo", category: "Diseño Exclusivo", price: 300, color: "#C8945F", pattern: "Mármol y terrazzo", fabric: "Antimicrobiano transpirable", description: "Estampado tipo terrazzo en tonos arena y miel.", tag: "Nuevo", image: "", available: true },
    { id: "p4", name: "Gorro Terracota", category: "Liso", price: 290, color: "#B5654B", pattern: "Terracota cálido", fabric: "Algodón ligero", description: "Color terracota que no se deslava. Banda interior absorbente.", tag: "Popular", image: "", available: true },
    { id: "p5", name: "Gorro Little Stars", category: "Estampado Ilustrado", price: 310, color: "#3B4A6B", pattern: "Constelaciones suaves", fabric: "Antifluido de alta densidad", description: "Pensado para pediatría: estrellas pequeñas sobre azul noche.", tag: "Pediatría", image: "", available: true },
    { id: "p6", name: "Gorro Menta Silvestre", category: "Edición Limitada", price: 300, color: "#5B8C7E", pattern: "Botánico menta", fabric: "Microfibra quirúrgica suave", description: "Hojas finas en verde menta. Edición limitada.", tag: "Edición limitada", image: "", available: true }
  ]
};

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" }
  });
}

export function missingSetup(env) {
  if (!env.STORE) return json({ error: "Falta conectar el KV con el nombre STORE en Cloudflare (Settings → Bindings)." }, 500);
  if (!env.ADMIN_PASSWORD) return json({ error: "Falta la variable ADMIN_PASSWORD en Cloudflare (Settings → Variables and Secrets)." }, 500);
  return null;
}

// Compara la contraseña enviada en "Authorization: Bearer <contraseña>" contra ADMIN_PASSWORD.
export function isAdmin(request, env) {
  const pass = env.ADMIN_PASSWORD;
  if (!pass) return false;
  const header = request.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  const a = new TextEncoder().encode(given);
  const b = new TextEncoder().encode(pass);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export async function readStore(env) {
  const saved = await env.STORE.get("store", "json");
  return saved || DEFAULT_STORE;
}

// Limpia y valida lo que manda el panel antes de guardarlo.
const str = (v, max) => String(v == null ? "" : v).slice(0, max);
const SETTINGS_KEYS = Object.keys(DEFAULT_STORE.settings);

export function sanitizeStore(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.products) || typeof body.settings !== "object") return null;
  if (body.products.length > 300) return null;
  const settings = {};
  for (const k of SETTINGS_KEYS) settings[k] = str(body.settings[k], 3000);
  const seen = new Set();
  const products = [];
  for (const p of body.products) {
    if (!p || typeof p !== "object") return null;
    const id = str(p.id, 40);
    if (!/^[\w-]{1,40}$/.test(id) || seen.has(id)) return null;
    seen.add(id);
    const image = str(p.image, 600);
    if (image && !image.startsWith("/api/images/") && !/^https:\/\//.test(image)) return null;
    const color = /^#[0-9a-fA-F]{3,8}$/.test(p.color) ? p.color : "#8C7A6B";
    products.push({
      id,
      name: str(p.name, 120),
      category: str(p.category, 60) || "General",
      price: Math.max(0, Math.round((Number(p.price) || 0) * 100) / 100),
      color,
      pattern: str(p.pattern, 120),
      fabric: str(p.fabric, 120),
      description: str(p.description, 1500),
      tag: str(p.tag, 40),
      image,
      available: p.available !== false
    });
  }
  return { settings, products };
}
