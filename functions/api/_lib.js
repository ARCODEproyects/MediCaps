// Utilidades compartidas por las funciones de la API.
// Los archivos que empiezan con "_" no se convierten en rutas.

export const DEFAULT_STORE = {
  settings: {
    storeName: "MediCaps",
    tagline: "Haute Chirurgie",
    announcement: "",
    shippingArea: "Guadalajara",
    whatsapp: "+52 1 33 2201 4797",
    currency: "MXN",
    heroBadge: "Colección 2026",
    heroTitle: "La elegancia clásica también entra al quirófano.",
    heroText: "Gorros quirúrgicos ergonómicos, con telas antifluido e hipoalergénicas y confección artesanal para profesionales de la salud.",
    aboutTitle: "Hacemos de la indumentaria médica un oficio de sastre.",
    freeShippingMin: 500,
    templates: [],
    categories: ["Edición Limitada", "Liso", "Diseño Exclusivo", "Estampado Ilustrado"],
    aboutText: "Un gorro quirúrgico es la primera prenda que te pones antes de entrar a cirugía. Por eso cuidamos el patrón, la tela y cada costura, para que sea cómodo durante jornadas largas y se vea impecable lavado tras lavado.\n\nCada pieza se confecciona a mano en Guadalajara."
  },
  products: [
    { id: "p1", name: "Gorro Botanical", category: "Edición Limitada", price: 320, color: "#4A5D4E", pattern: "Hojas de salvia", fabric: "Algodón orgánico antifluido", description: "Estampado de hojas en verde salvia. Tipo buff, con elástico suave alrededor.", tag: "Más vendido", image: "", patternImage: "", imageMode: "pattern", patternFit: "cover", stock: null },
    { id: "p2", name: "Gorro Minimal Taupe", category: "Liso", price: 280, color: "#8C7A6B", pattern: "Taupe mate", fabric: "Tejido stretch en 4 direcciones", description: "Liso, sobrio y muy ligero. Ideal para turnos largos.", tag: "Esencial", image: "", patternImage: "", imageMode: "pattern", patternFit: "cover", stock: null },
    { id: "p3", name: "Gorro Terrazzo", category: "Diseño Exclusivo", price: 300, color: "#C8945F", pattern: "Mármol y terrazzo", fabric: "Antimicrobiano transpirable", description: "Estampado tipo terrazzo en tonos arena y miel.", tag: "Nuevo", image: "", patternImage: "", imageMode: "pattern", patternFit: "cover", stock: null },
    { id: "p4", name: "Gorro Terracota", category: "Liso", price: 290, color: "#B5654B", pattern: "Terracota cálido", fabric: "Algodón ligero", description: "Color terracota que no se deslava. Banda interior absorbente.", tag: "Popular", image: "", patternImage: "", imageMode: "pattern", patternFit: "cover", stock: null },
    { id: "p5", name: "Gorro Little Stars", category: "Estampado Ilustrado", price: 310, color: "#3B4A6B", pattern: "Constelaciones suaves", fabric: "Antifluido de alta densidad", description: "Pensado para pediatría: estrellas pequeñas sobre azul noche.", tag: "Pediatría", image: "", patternImage: "", imageMode: "pattern", patternFit: "cover", stock: null },
    { id: "p6", name: "Gorro Menta Silvestre", category: "Edición Limitada", price: 300, color: "#5B8C7E", pattern: "Botánico menta", fabric: "Microfibra quirúrgica suave", description: "Hojas finas en verde menta. Edición limitada.", tag: "Edición limitada", image: "", patternImage: "", imageMode: "pattern", patternFit: "cover", stock: null }
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
const SETTINGS_KEYS = Object.keys(DEFAULT_STORE.settings).filter((k) => k !== "categories" && k !== "freeShippingMin" && k !== "templates");
const okImage = (u) => !u || u.startsWith("/api/images/") || /^https:\/\//.test(u);

export function imageIds(store) {
  const ids = new Set();
  for (const p of store.products) {
    for (const u of [p.image, p.patternImage]) {
      if (u && u.startsWith("/api/images/")) ids.add(u.slice("/api/images/".length));
    }
  }
  for (const t of (store.settings && store.settings.templates) || []) {
    for (const u of [t.photo, t.mask]) {
      if (u && u.startsWith("/api/images/")) ids.add(u.slice("/api/images/".length));
    }
  }
  return ids;
}

export function sanitizeStore(body) {
  if (!body || typeof body !== "object" || !Array.isArray(body.products) || !body.settings || typeof body.settings !== "object") return null;
  if (body.products.length > 300) return null;

  const settings = {};
  for (const k of SETTINGS_KEYS) settings[k] = str(body.settings[k], 3000);
  const cats = [];
  for (const c of Array.isArray(body.settings.categories) ? body.settings.categories : []) {
    const name = str(c, 60).trim();
    if (name && !cats.includes(name) && cats.length < 50) cats.push(name);
  }

  const seen = new Set();
  const products = [];
  for (const p of body.products) {
    if (!p || typeof p !== "object") return null;
    const id = str(p.id, 40);
    if (!/^[\w-]{1,40}$/.test(id) || seen.has(id)) return null;
    seen.add(id);
    const image = str(p.image, 600);
    const patternImage = str(p.patternImage, 600);
    if (!okImage(image) || !okImage(patternImage)) return null;
    const category = str(p.category, 60).trim() || "General";
    if (!cats.includes(category)) cats.push(category);

    // Existencias: vacío = no se lleva conteo; 0 = agotado.
    let stock = null;
    if (p.stock !== null && p.stock !== undefined && p.stock !== "") {
      const n = Math.floor(Number(p.stock));
      if (Number.isFinite(n)) stock = Math.max(0, Math.min(100000, n));
    } else if (p.available === false) {
      stock = 0; // productos guardados con la versión anterior
    }

    products.push({
      id,
      name: str(p.name, 120).trim(),
      category,
      price: Math.max(0, Math.round((Number(p.price) || 0) * 100) / 100),
      color: /^#[0-9a-fA-F]{3,8}$/.test(p.color) ? p.color : "#5E8C8A",
      pattern: str(p.pattern, 120),
      fabric: str(p.fabric, 120),
      description: str(p.description, 1500),
      tag: str(p.tag, 40),
      image,
      patternImage,
      imageMode: p.imageMode === "photo" ? "photo" : "pattern",
      patternFit: p.patternFit === "tile" ? "tile" : "cover",
      stock
    });
  }
  settings.categories = cats;
  // plantillas con foto: foto del maniquí + máscara de la tela
  const tpls = [];
  for (const t of Array.isArray(body.settings.templates) ? body.settings.templates : []) {
    if (!t || typeof t !== "object" || tpls.length >= 6) continue;
    const id = str(t.id, 40), photo = str(t.photo, 300), mask = str(t.mask, 300);
    if (!/^[\w-]{1,40}$/.test(id) || !photo.startsWith("/api/images/") || !mask.startsWith("/api/images/")) continue;
    tpls.push({ id, name: str(t.name, 40).trim() || "Plantilla", photo, mask });
  }
  settings.templates = tpls;
  const min = Number(body.settings.freeShippingMin);
  settings.freeShippingMin = Number.isFinite(min) ? Math.max(0, Math.round(min)) : 500;
  return { settings, products };
}
