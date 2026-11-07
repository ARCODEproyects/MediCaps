/* Dibujo del gorro y utilidades compartidas por la tienda y el panel. */
(function () {
  "use strict";
  var n = 0;
  var SHAPE = "M30 110C20 60 50 20 100 20s80 40 70 90c-30 10-110 10-140 0z";
  var BAND = "M28 108c32 10 112 10 144 0 2 14-4 18-12 18-40 4-80 4-120 0-8 0-14-4-12-18z";

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* Gorro dibujado. Si hay foto de diseño, la recorta con la forma del gorro
     (fit "cover" = la estira para llenar; "tile" = la repite como tela). */
  function capSVG(o) {
    o = o || {};
    var id = "cap" + (++n);
    var color = esc(o.color || "#5E8C8A");
    var fill = color, defs = "";
    defs += '<clipPath id="' + id + 'k"><path d="' + SHAPE + '"/><path d="' + BAND + '"/></clipPath>';
    defs += '<radialGradient id="' + id + 's" cx="38%" cy="28%" r="85%"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></radialGradient>';
    if (o.gradient) {
      defs += '<linearGradient id="' + id + 'g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + color + '"/><stop offset="1" stop-color="#1E2B30"/></linearGradient>';
      fill = "url(#" + id + "g)";
    }
    var body;
    if (o.pattern) {
      var img = esc(o.pattern);
      if (o.fit === "tile") {
        defs += '<pattern id="' + id + 'p" patternUnits="userSpaceOnUse" width="56" height="56"><image href="' + img + '" width="56" height="56" preserveAspectRatio="xMidYMid slice"/></pattern>';
        body = '<g clip-path="url(#' + id + 'k)"><rect width="200" height="160" fill="' + color + '"/><rect width="200" height="160" fill="url(#' + id + 'p)"/></g>';
      } else {
        body = '<g clip-path="url(#' + id + 'k)"><rect width="200" height="160" fill="' + color + '"/><image href="' + img + '" x="20" y="14" width="160" height="118" preserveAspectRatio="xMidYMid slice"/></g>';
      }
    } else {
      body = '<path d="' + SHAPE + '" fill="' + fill + '"/><path d="' + BAND + '" fill="' + fill + '"/>';
    }
    return '<svg viewBox="0 0 200 160" aria-hidden="true"><defs>' + defs + '</defs>' + body +
      '<path d="' + SHAPE + '" fill="url(#' + id + 's)"/>' +
      '<path d="' + BAND + '" fill="#000" opacity=".2"/>' +
      '<path d="M100 22c-2 30-2 60 0 90" stroke="#000" stroke-opacity=".14" stroke-width="1.2" fill="none"/>' +
      '<path d="M160 120c6 8 10 18 8 30M166 118c8 6 14 14 16 26" stroke="' + color + '" stroke-width="5" fill="none" stroke-linecap="round" opacity=".9"/>' +
      '<circle cx="152" cy="100" r="5" fill="#FFFFFF" stroke="#00000040" stroke-width="1.2"/>' +
      '<circle cx="48" cy="100" r="5" fill="#FFFFFF" stroke="#00000040" stroke-width="1.2"/>' +
      (o.text ? '<text x="100" y="96" fill="#FFFFFF" font-size="9" font-family="Georgia,serif" text-anchor="middle" letter-spacing="1" style="paint-order:stroke" stroke="#00000055" stroke-width="1.5">' + esc(o.text) + '</text>' : "") +
      "</svg>";
  }

  /* Lo que se muestra de un producto: foto real o gorro con diseño. */
  function usesPhoto(p) {
    if (p.image && (p.imageMode === "photo" || !p.patternImage)) return true;
    return false;
  }
  function visual(p, alt) {
    var photo = alt ? !usesPhoto(p) : usesPhoto(p);
    if (photo && p.image) return '<img src="' + esc(p.image) + '" alt="' + esc(p.name) + '" loading="lazy">';
    return capSVG({ color: p.color, pattern: p.patternImage, fit: p.patternFit });
  }
  function hasBoth(p) { return !!(p.image && p.patternImage); }

  /* Existencias: null = sin conteo; 0 = agotado */
  function soldOut(p) { return p.stock === 0 || p.available === false; }
  function stockLeft(p) { return typeof p.stock === "number" ? p.stock : Infinity; }

  window.MC = { esc: esc, capSVG: capSVG, visual: visual, usesPhoto: usesPhoto, hasBoth: hasBoth, soldOut: soldOut, stockLeft: stockLeft };
})();
