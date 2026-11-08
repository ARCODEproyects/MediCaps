/* Plantillas del buff y utilidades compartidas por la tienda y el panel.
   Cada producto se ve en 3 plantillas: en la cabeza de lado, de frente,
   y extendido (rectángulo). El diseño que subes se pega en las tres. */
(function () {
  "use strict";
  var n = 0;

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Cabeza de maniquí negra (cuello largo y base), como en las fotos de referencia */
  var MANNEQUIN = {
    side: {
      neck: "M90 140C94 160 92 178 84 194C74 212 52 224 28 236L184 236C162 226 144 214 136 196C128 178 126 156 128 128Z",
      head: "M62 70C62 40 86 22 112 24C136 26 150 46 150 74C150 104 138 128 118 140C106 147 92 148 80 142C66 134 60 112 60 96C60 88 61 78 62 70Z",
      // brillos: frente, nariz, pómulo y cuello
      shine: "M66 84C64 92 64 98 66 104M62 104C59 107 59 111 62 113M74 120C78 128 84 134 92 136M98 152C100 172 96 190 88 204",
      cheek: "M70 112C76 126 88 136 102 138"
    },
    front: {
      neck: "M84 132C86 160 82 182 68 200C56 214 42 224 24 236L176 236C158 224 144 214 132 200C118 182 114 160 116 132Z",
      head: "M100 30C124 30 140 54 140 88C140 120 124 146 100 146C76 146 60 120 60 88C60 54 76 30 100 30Z",
      shine: "M101 82C100 94 99 104 97 112M82 46C88 40 94 37 100 36",
      cheek: "M76 118C84 132 92 138 100 140"
    }
  };

  /* Piezas de tela de cada plantilla.
     back = detrás de la cabeza · front = encima · shadow = sombra de la tela sobre el maniquí
     hem = dobladillo del borde · folds = pliegues oscuros · soft = brillos de la tela */
  var PIECES = {
    side: {
      box: 'x="44" y="14" width="134" height="206"',
      back: [],
      front: [
        // cubre frente, coronilla y nuca, y cae como cola hasta el hombro
        "M54 78C54 46 82 20 112 20C140 20 156 42 156 72C156 96 154 120 158 150C161 172 166 192 170 210C162 214 150 210 142 214C140 192 136 170 130 150C128 138 126 128 124 120C102 108 78 94 54 78Z"
      ],
      shadow: "M66 90C86 102 106 114 126 126L130 150C134 172 138 192 140 214",
      hem: "M54 78C78 94 102 108 124 120",
      lining: "M142 214C150 210 162 214 170 210L169 205C161 208 150 205 143 208Z",
      folds: "M138 116C144 126 146 136 146 146M150 106C154 118 154 132 156 144M130 122C134 130 136 140 137 150M150 152C154 172 156 190 158 210M141 160C145 180 147 196 149 212M66 62C72 70 80 76 90 80",
      soft: "M66 52C82 32 108 24 132 30M146 50C152 64 152 82 150 98M154 156C157 176 160 192 163 206"
    },
    front: {
      box: 'x="46" y="18" width="108" height="196"',
      back: [
        // las dos caídas de la cola que se asoman a los lados del cuello
        "M58 104L72 110C74 140 74 172 70 206L54 208C56 172 56 140 58 104Z",
        "M142 104L128 110C126 140 126 172 130 206L146 208C144 172 144 140 142 104Z"
      ],
      front: [
        // banda sobre la frente que cubre la parte de arriba de la cabeza
        "M57 108C50 70 66 30 100 26C134 30 150 70 143 108L136 106C136 90 132 76 124 68C116 60 108 58 100 58C92 58 84 60 76 68C68 76 64 90 64 106Z"
      ],
      shadow: "M65 108C65 90 70 74 80 66C88 61 94 60 100 60C106 60 112 61 120 66C130 74 135 90 135 108",
      hem: "M64 106C64 88 70 72 80 64C88 59 94 58 100 58C106 58 112 59 120 64C130 72 136 88 136 106",
      folds: "M62 116C64 140 64 170 62 204M138 116C136 140 136 170 138 204M70 40C66 50 62 62 60 76M130 40C134 50 138 62 140 76",
      soft: "M74 42C84 32 92 29 100 28M66 120C67 150 66 180 63 204"
    },
    flat: {
      box: 'x="44" y="18" width="112" height="192"',
      back: [],
      front: [
        // el buff extendido: un tubo rectangular de tela
        "M56 28C80 22 120 22 144 28C148 70 150 140 152 196C130 206 70 206 48 196C50 140 52 70 56 28Z"
      ],
      lining: "M50 194C74 184 126 184 150 194C128 208 72 208 50 194Z",
      folds: "M84 30C86 90 82 150 80 200M118 30C116 90 120 150 122 200",
      soft: "M60 30C62 90 58 150 54 196M100 26C102 80 100 140 100 196"
    }
  };

  function capSVG(o) {
    o = o || {};
    var view = PIECES[o.view] ? o.view : "side";
    var P = PIECES[view], M = MANNEQUIN[view];
    var id = "bf" + (++n);
    var color = esc(o.color || "#3C7F86");
    var defs = "";
    defs += '<linearGradient id="' + id + 'm" x1="0" y1="0" x2="1" y2=".25"><stop offset="0" stop-color="#4A5156"/><stop offset=".3" stop-color="#262B2F"/><stop offset=".75" stop-color="#14171A"/><stop offset="1" stop-color="#0B0D0F"/></linearGradient>';
    defs += '<linearGradient id="' + id + 's" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>';
    defs += '<radialGradient id="' + id + 'r" cx="45%" cy="12%" r="45%"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>';
    defs += '<filter id="' + id + 'b" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="2.4"/></filter>';
    defs += '<filter id="' + id + 'f" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation=".9"/></filter>';

    // relleno de la tela: diseño (estirado o repetido) o color liso
    var fabric;
    if (o.pattern) {
      var img = esc(o.pattern);
      if (o.fit === "tile") {
        defs += '<pattern id="' + id + 'p" patternUnits="userSpaceOnUse" width="46" height="46"><image href="' + img + '" width="46" height="46" preserveAspectRatio="xMidYMid slice"/></pattern>';
        fabric = function (d) { return '<path d="' + d + '" fill="' + color + '"/><path d="' + d + '" fill="url(#' + id + 'p)"/>'; };
      } else {
        var big = '<image href="' + img + '" ' + P.box + ' preserveAspectRatio="xMidYMid slice"/>';
        fabric = function (d, i) {
          return '<path d="' + d + '" fill="' + color + '"/>' +
            '<clipPath id="' + id + 'c' + i + '"><path d="' + d + '"/></clipPath><g clip-path="url(#' + id + 'c' + i + ')">' + big + '</g>';
        };
      }
    } else {
      fabric = function (d) { return '<path d="' + d + '" fill="' + color + '"/>'; };
    }
    var k = 0;
    var piece = function (d) {
      return fabric(d, k++) + '<path d="' + d + '" fill="url(#' + id + 's)"/><path d="' + d + '" fill="url(#' + id + 'r)"/>';
    };
    var stroke = function (d, c, op, w, blur) {
      return d ? '<path d="' + d + '" stroke="' + c + '" stroke-opacity="' + op + '" stroke-width="' + w + '" fill="none" stroke-linecap="round"' + (blur ? ' filter="url(#' + id + blur + ')"' : '') + '/>' : "";
    };

    var out = '<svg viewBox="0 0 200 240" aria-hidden="true"><defs>' + defs + '</defs>';
    out += P.back.map(piece).join("");
    if (M) {
      out += '<path d="' + M.neck + '" fill="url(#' + id + 'm)"/>' +
        '<path d="' + M.head + '" fill="url(#' + id + 'm)"/>' +
        stroke(M.shine, "#fff", ".28", 2.4, "f") + stroke(M.cheek, "#fff", ".1", 5, "b");
    }
    // sombra que hace la tela sobre la cabeza y el cuello
    if (P.shadow) out += stroke(P.shadow, "#000", ".7", 7, "b");
    out += P.front.map(piece).join("");
    if (P.lining) out += '<path d="' + P.lining + '" fill="#fff" opacity=".5"/><path d="' + P.lining + '" fill="none" stroke="#000" stroke-opacity=".18" stroke-width=".8"/>';
    out += stroke(P.folds, "#000", ".32", 2, "f");
    out += stroke(P.soft, "#fff", ".22", 3, "f");
    // dobladillo: el borde de la tela se ve un poco más oscuro y con grosor
    if (P.hem) out += stroke(P.hem, "#000", ".45", 2.2) + stroke(P.hem, "#fff", ".18", .8);
    return out + "</svg>";
  }

  /* ================= Plantillas con foto =================
     Una plantilla = foto del maniquí con un buff liso claro + máscara (la zona de tela).
     El diseño se pinta dentro de la máscara y se multiplica por la luz de la foto,
     así conserva las sombras y los pliegues reales. */
  var TPL = [];
  function setTemplates(list) {
    TPL = (Array.isArray(list) ? list : []).filter(function (t) { return t && t.id && t.photo && t.mask; });
  }
  function templates() { return TPL; }
  function findTpl(id) { return TPL.find(function (t) { return t.id === id; }); }

  var imgCache = {};
  function loadImg(src) {
    if (!imgCache[src]) imgCache[src] = new Promise(function (res, rej) {
      var i = new Image(); i.decoding = "async";
      i.onload = function () { res(i); }; i.onerror = function () { delete imgCache[src]; rej(new Error("img")); };
      i.src = src;
    });
    return imgCache[src];
  }
  function dims(el) { return { w: el.naturalWidth || el.width, h: el.naturalHeight || el.height }; }

  /* photo, mask, pattern: Image o canvas. Devuelve un canvas con el diseño aplicado. */
  function composite(photo, mask, spec) {
    var d = dims(photo), w = d.w, h = d.h;
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d", { willReadFrequently: true });
    x.drawImage(photo, 0, 0, w, h);
    var pd = x.getImageData(0, 0, w, h), o = pd.data;

    var mc = document.createElement("canvas"); mc.width = w; mc.height = h;
    var mx = mc.getContext("2d", { willReadFrequently: true });
    if ("filter" in mx) mx.filter = "blur(" + Math.max(0.6, w / 900) + "px)"; // orillas suaves
    mx.drawImage(mask, 0, 0, w, h);
    var md = mx.getImageData(0, 0, w, h).data;

    // caja de la tela y luz de referencia (lo más claro de la tela = blanco)
    var minX = w, minY = h, maxX = 0, maxY = 0, hist = new Uint32Array(256), tot = 0, i, px, py;
    for (py = 0; py < h; py += 2) for (px = 0; px < w; px += 2) {
      i = (py * w + px) * 4;
      if (md[i + 3] > 128) {
        if (px < minX) minX = px; if (px > maxX) maxX = px; if (py < minY) minY = py; if (py > maxY) maxY = py;
        hist[(o[i] * .299 + o[i + 1] * .587 + o[i + 2] * .114) | 0]++; tot++;
      }
    }
    if (!tot) return c;
    var acc = 0, ref = 255;
    for (var v = 0; v < 256; v++) { acc += hist[v]; if (acc >= tot * 0.96) { ref = Math.max(v, 50); break; } }
    var bw = maxX - minX + 1, bh = maxY - minY + 1;

    var fc = document.createElement("canvas"); fc.width = w; fc.height = h;
    var fx = fc.getContext("2d", { willReadFrequently: true });
    fx.fillStyle = spec.color || "#3C7F86"; fx.fillRect(0, 0, w, h);
    if (spec.pattern) {
      var pdm = dims(spec.pattern);
      if (spec.fit === "tile") {
        var tw = Math.max(24, Math.round(bw / 4.5)), th = Math.round(tw * pdm.h / pdm.w);
        var tc = document.createElement("canvas"); tc.width = tw; tc.height = th;
        tc.getContext("2d").drawImage(spec.pattern, 0, 0, tw, th);
        fx.fillStyle = fx.createPattern(tc, "repeat"); fx.fillRect(0, 0, w, h);
      } else {
        var sc = Math.max(bw / pdm.w, bh / pdm.h), dw = pdm.w * sc, dh = pdm.h * sc;
        fx.drawImage(spec.pattern, minX + (bw - dw) / 2, minY + (bh - dh) / 2, dw, dh);
      }
    }
    var fd = fx.getImageData(0, 0, w, h).data;
    for (i = 0; i < o.length; i += 4) {
      var a = md[i + 3]; if (!a) continue;
      var L = (o[i] * .299 + o[i + 1] * .587 + o[i + 2] * .114) / ref;
      var m = L > 1 ? 1 : Math.pow(L, 1.15);           // sombras y pliegues
      var hi = L > 1 ? Math.min(60, (L - 1) * 255) : 0; // brillos
      var t = a / 255;
      o[i]     = o[i]     * (1 - t) + Math.min(255, fd[i]     * m + hi) * t;
      o[i + 1] = o[i + 1] * (1 - t) + Math.min(255, fd[i + 1] * m + hi) * t;
      o[i + 2] = o[i + 2] * (1 - t) + Math.min(255, fd[i + 2] * m + hi) * t;
    }
    x.putImageData(pd, 0, 0);
    return c;
  }

  /* Cola de mockups: se generan uno por uno y se guardan en caché */
  var mockCache = {}, pending = {}, queue = [], busy = false;
  function hash(str) { var h = 5381; for (var i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0; return (h >>> 0).toString(36); }
  function mockKey(t, p) { return "m" + hash([t.photo, t.mask, p.patternImage || "", p.patternFit || "", p.color || ""].join("|")); }
  function pump() {
    if (busy || !queue.length) return;
    busy = true;
    var job = queue.shift();
    job().then(function () { busy = false; setTimeout(pump, 0); });
  }
  function requestMock(t, p, key) {
    if (mockCache[key] || pending[key]) return;
    pending[key] = 1;
    queue.push(function () {
      return Promise.all([loadImg(t.photo), loadImg(t.mask), p.patternImage ? loadImg(p.patternImage) : null])
        .then(function (r) { mockCache[key] = composite(r[0], r[1], { color: p.color, pattern: r[2], fit: p.patternFit }).toDataURL("image/jpeg", 0.88); })
        .catch(function () { mockCache[key] = t.photo; })
        .then(function () {
          delete pending[key];
          var els = document.querySelectorAll('img[data-mk="' + key + '"]');
          for (var i = 0; i < els.length; i++) { els[i].src = mockCache[key]; els[i].classList.remove("loading"); }
        });
    });
    pump();
  }

  /* ================= Vistas de un producto ================= */
  var DRAWN_NAMES = { side: "En la cabeza", front: "De frente", flat: "Extendido", photo: "Foto" };
  function isDrawn(v) { return v === "side" || v === "front" || v === "flat"; }
  function viewName(v) {
    if (v && v.indexOf("t:") === 0) { var t = findTpl(v.slice(2)); return t ? (t.name || "Plantilla") : "Plantilla"; }
    return DRAWN_NAMES[v] || v;
  }
  function views(p) {
    var v = TPL.length ? TPL.map(function (t) { return "t:" + t.id; }) : ["side", "front", "flat"];
    if (p.image) { if (p.imageMode === "photo") v.unshift("photo"); else v.push("photo"); }
    return v;
  }
  function usesPhoto(p) { return views(p)[0] === "photo"; }
  function visual(p, view) {
    view = view || views(p)[0];
    if (view === "photo" && p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">';
    if (view.indexOf("t:") === 0) {
      var t = findTpl(view.slice(2));
      if (t) {
        var key = mockKey(t, p), ready = mockCache[key];
        if (!ready) requestMock(t, p, key);
        return '<img class="mock' + (ready ? '' : ' loading') + '" data-mk="' + key + '" src="' + esc(ready || t.photo) + '" alt="' + esc(p.name) + '">';
      }
      view = "side";
    }
    return capSVG({ view: view, color: p.color, pattern: p.patternImage, fit: p.patternFit });
  }
  function hasBoth(p) { return !!(p.image && p.patternImage); }

  /* Existencias: null = sin conteo; 0 = agotado */
  function soldOut(p) { return p.stock === 0 || p.available === false; }
  function stockLeft(p) { return typeof p.stock === "number" ? p.stock : Infinity; }

  window.MC = { esc: esc, capSVG: capSVG, visual: visual, views: views, viewName: viewName, isDrawn: isDrawn, usesPhoto: usesPhoto,
    setTemplates: setTemplates, templates: templates, composite: composite, loadImg: loadImg, hasBoth: hasBoth, soldOut: soldOut, stockLeft: stockLeft };
})();
