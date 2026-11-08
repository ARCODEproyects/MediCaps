(function(){
"use strict";
var esc=MC.esc, capSVG=MC.capSVG, visual=MC.visual, soldOut=MC.soldOut, stockLeft=MC.stockLeft;

/* Textos por defecto: se reemplazan con lo que guardas en /admin */
var CONFIG = {
  storeName: "MediCaps", tagline: "Haute Chirurgie", whatsapp: "+52 1 33 2201 4797", currency: "MXN",
  announcement: "", heroBadge: "Colección 2026",
  heroTitle: "La elegancia clásica también entra al quirófano.",
  heroText: "Gorros quirúrgicos ergonómicos, con telas antifluido e hipoalergénicas y confección artesanal para profesionales de la salud.",
  aboutTitle: "Hacemos de la indumentaria médica un oficio de sastre.", aboutText: "", categories: [],
  shippingArea: "Guadalajara", freeShippingMin: 500
};

var PRODUCTS = [];
var loading = true, loadFailed = false;
var ui = { view:"shop", cat:"Todos", q:"", cartOpen:false, quick:null, quickQty:1, qv:null, buyerName:"", buyerNote:"", sent:null };
var cart = loadCart();
var app = document.getElementById("app");

/* ---------- utilidades ---------- */
function money(n){return "$"+Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:2})+" "+CONFIG.currency;}
function moneyShort(n){return "$"+Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:2});}
function find(id){return PRODUCTS.find(function(p){return p.id===id;});}
function waDigits(){
  var d=String(CONFIG.whatsapp||"").replace(/\D/g,"");
  if(d.length===13 && d.indexOf("521")===0) d="52"+d.slice(3);
  if(d.length===10) d="52"+d;
  return d;
}
function waLink(text){return "https://wa.me/"+waDigits()+"?text="+encodeURIComponent(text);}
function loadCart(){try{var c=JSON.parse(localStorage.getItem("mc-cart")||"[]");return Array.isArray(c)?c:[];}catch(e){return [];}}
function saveCart(){try{localStorage.setItem("mc-cart",JSON.stringify(cart));}catch(e){}}
function toast(msg){var t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},2600);}
function icon(name){
  var p={bag:'<path d="M5 8h14l-1 12H6L5 8z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
    search:'<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
    x:'<path d="M6 6l12 12M18 6 6 18"/>', plus:'<path d="M12 5v14M5 12h14"/>', minus:'<path d="M5 12h14"/>',
    eye:'<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.5"/>',
    shield:'<path d="M12 3 5 6v6c0 4.5 3 7.5 7 9 4-1.5 7-4.5 7-9V6l-7-3z"/><path d="m9 12 2 2 4-4"/>',
    feather:'<path d="M20 4c-6 0-12 4-13 13l-3 3"/><path d="M7 17h7c3 0 5-3 6-7"/>',
    truck:'<path d="M3 7h11v9H3zM14 10h4l3 3v3h-7"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/>',
    left:'<path d="m15 6-6 6 6 6"/>', right:'<path d="m9 6 6 6-6 6"/>',
    wa:'<path d="M4 20l1.3-4A8 8 0 1 1 8 18.7L4 20z"/><path d="M9 9.5c.3 2 2.5 4.2 4.5 4.5l1-1.2 1.8.8c-.2 1-1 1.7-2 1.6-3-.3-6-3.3-6.3-6.3-.1-1 .6-1.8 1.6-2l.8 1.8L9 9.5z"/>'}[name];
  return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';
}
function stockNote(p){
  if(soldOut(p)) return '<span class="stock out">Agotado</span>';
  var s=stockLeft(p);
  if(s<=3) return '<span class="stock low">'+(s===1?'Última pieza':'Últimas '+s+' piezas')+'</span>';
  return "";
}

/* ---------- envío ---------- */
function freeMin(){return Number(CONFIG.freeShippingMin)||0;}
function hasFreeShipping(total){return freeMin()>0&&total>freeMin();}
function shippingLine(){return "Envíos en "+(CONFIG.shippingArea||"Guadalajara")+(freeMin()>0?" · Envío gratis en compras de más de "+moneyShort(freeMin()):"");}
function announcement(){return CONFIG.announcement||shippingLine();}

/* ---------- datos ---------- */
function loadStore(){
  fetch("/api/store",{cache:"no-store"}).then(function(r){if(!r.ok)throw new Error(r.status);return r.json();})
    .then(function(d){
      Object.keys(d.settings||{}).forEach(function(k){CONFIG[k]=d.settings[k];});
      PRODUCTS=Array.isArray(d.products)?d.products:[];
      MC.setTemplates(CONFIG.templates);
      document.title=CONFIG.storeName+" · Gorros quirúrgicos";
      cleanCart();
    })
    .catch(function(){loadFailed=true;})
    .then(function(){loading=false;render();});
}
/* Quita del carrito lo que ya no existe o se agotó, y ajusta cantidades al stock */
function cleanCart(){
  var used={};
  cart=cart.filter(function(c){
    var p=find(c.id); if(!p||soldOut(p)) return false;
    var left=stockLeft(p)-(used[c.id]||0);
    if(left<=0) return false;
    c.qty=Math.min(c.qty,left); used[c.id]=(used[c.id]||0)+c.qty; return true;
  });
  // une renglones repetidos de versiones anteriores
  var merged=[];cart.forEach(function(c){var m=merged.find(function(x){return x.id===c.id;});if(m)m.qty+=c.qty;else merged.push({id:c.id,qty:c.qty});});
  cart=merged;
  saveCart();
}

/* ---------- carrito ---------- */
function inCart(id){return cart.reduce(function(s,c){return s+(c.id===id?c.qty:0);},0);}
function addToCart(id,qty){
  var p=find(id); if(!p||soldOut(p)) return;
  var room=stockLeft(p)-inCart(id);
  if(room<=0){toast("Ya tienes en la bolsa todas las piezas disponibles.");return;}
  if(qty>room){qty=room;toast("Solo hay "+stockLeft(p)+" disponibles; ajustamos la cantidad.");}
  var it=cart.find(function(c){return c.id===id;});
  if(it) it.qty+=qty; else cart.push({id:id,qty:qty});
  saveCart(); ui.sent=null; ui.cartOpen=true; ui.quick=null; render();
}
function cartLines(){return cart.map(function(c){var p=find(c.id);return p?{c:c,p:p,sub:p.price*c.qty}:null;}).filter(Boolean);}
function cartCount(){return cartLines().reduce(function(s,l){return s+l.c.qty;},0);}
function cartTotal(){return cartLines().reduce(function(s,l){return s+l.sub;},0);}
function orderMessage(){
  var m="Hola, quiero hacer este pedido en "+CONFIG.storeName+":\n\n";
  cartLines().forEach(function(l){
    m+="• "+l.c.qty+" × "+l.p.name+" ("+moneyShort(l.p.price)+" c/u) = "+moneyShort(l.sub)+"\n";
  });
  var t=cartTotal();
  m+="\nSubtotal: "+money(t);
  m+="\nEnvío: "+(hasFreeShipping(t)?"Gratis":"por confirmar");
  if(ui.buyerName.trim()) m+="\nNombre: "+ui.buyerName.trim();
  if(ui.buyerNote.trim()) m+="\nEntrega en: "+ui.buyerNote.trim();
  return m;
}
function singleMessage(p,qty){
  if(soldOut(p)) return "Hola, vi que el "+p.name+" de "+CONFIG.storeName+" está agotado. ¿Cuándo vuelve a haber?";
  var m="Hola, me interesa este gorro de "+CONFIG.storeName+":\n\n• "+qty+" × "+p.name+" ("+moneyShort(p.price)+" c/u) = "+moneyShort(p.price*qty);
  return m+"\n\n¿Está disponible?";
}

/* ---------- render ---------- */
function categories(){
  var used=[];PRODUCTS.forEach(function(p){if(used.indexOf(p.category)<0)used.push(p.category);});
  var order=(CONFIG.categories||[]).filter(function(c){return used.indexOf(c)>=0;});
  used.forEach(function(c){if(order.indexOf(c)<0)order.push(c);});
  return ["Todos"].concat(order);
}
function filtered(){
  var q=ui.q.trim().toLowerCase();
  var list=PRODUCTS.filter(function(p){
    var okC=ui.cat==="Todos"||p.category===ui.cat;
    var hay=(p.name+" "+p.pattern+" "+p.description+" "+p.category).toLowerCase();
    return okC&&(!q||hay.indexOf(q)>=0);
  });
  // los agotados se muestran al final del catálogo
  return list.filter(function(p){return !soldOut(p);}).concat(list.filter(soldOut));
}
/* ---------- carrusel de la portada ---------- */
var hero={i:0,timer:null,paused:false};
function heroSlides(){
  var list=PRODUCTS.filter(function(p){return !soldOut(p);});
  return list.length?list:PRODUCTS.slice(0,1);
}
function carouselHTML(slides){
  if(!slides.length) return '<div class="art">'+capSVG({color:"#3C7F86"})+'</div>';
  if(hero.i>=slides.length) hero.i=0;
  var multi=slides.length>1;
  return '<div class="art carousel" id="hero-car" aria-roledescription="carrusel" aria-label="Diseños disponibles">'+
    slides.map(function(p,i){
      var v0=MC.views(p)[0], art=visual(p,v0);
      return '<div class="slide'+(i===hero.i?' is-on':'')+(MC.isDrawn(v0)?'':' photo')+'" data-a="quick" data-id="'+esc(p.id)+'" role="group" aria-roledescription="diapositiva" aria-label="'+(i+1)+' de '+slides.length+': '+esc(p.name)+'"'+(i===hero.i?'':' aria-hidden="true"')+'>'+art+
        '<div class="caption"><b>'+esc(p.name)+'</b><span>'+esc(p.category)+' · '+moneyShort(p.price)+'</span></div></div>';
    }).join("")+
    (multi?'<button class="car-btn prev" data-a="hero-step" data-d="-1" aria-label="Diseño anterior">'+icon("left")+'</button>'+
      '<button class="car-btn next" data-a="hero-step" data-d="1" aria-label="Siguiente diseño">'+icon("right")+'</button>'+
      '<div class="dots">'+slides.map(function(p,i){return '<button data-a="hero-go" data-i="'+i+'" aria-label="Ver '+esc(p.name)+'"'+(i===hero.i?' aria-current="true"':'')+'></button>';}).join("")+'</div>':'')+
  '</div>';
}
/* cambia de diapositiva sin redibujar toda la página */
function heroShow(i){
  var car=document.getElementById("hero-car"); if(!car) return;
  var sl=car.querySelectorAll(".slide"), dots=car.querySelectorAll(".dots button"), n=sl.length; if(n<2) return;
  hero.i=((i%n)+n)%n;
  sl.forEach(function(el,k){var on=k===hero.i;el.classList.toggle("is-on",on);if(on)el.removeAttribute("aria-hidden");else el.setAttribute("aria-hidden","true");});
  dots.forEach(function(el,k){if(k===hero.i)el.setAttribute("aria-current","true");else el.removeAttribute("aria-current");});
}
function heroStart(){
  if(hero.timer) return;
  hero.timer=setInterval(function(){
    if(hero.paused||document.hidden||ui.quick||ui.cartOpen) return;
    heroShow(hero.i+1);
  },3800);
}
var reduceMotion=window.matchMedia&&window.matchMedia("(prefers-reduced-motion: reduce)").matches;
app.addEventListener("mouseover",function(ev){hero.paused=!!ev.target.closest("#hero-car");});
app.addEventListener("focusin",function(ev){if(ev.target.closest("#hero-car"))hero.paused=true;});
app.addEventListener("focusout",function(ev){if(ev.target.closest("#hero-car"))hero.paused=false;});
(function(){ // deslizar con el dedo en el celular
  var x0=null;
  app.addEventListener("touchstart",function(ev){x0=ev.target.closest("#hero-car")?ev.touches[0].clientX:null;},{passive:true});
  app.addEventListener("touchend",function(ev){
    if(x0===null) return; var dx=ev.changedTouches[0].clientX-x0; x0=null;
    if(Math.abs(dx)>40){heroShow(hero.i+(dx<0?1:-1));hero.swiped=Date.now();}
  });
})();

function heroTitle(t){
  t=esc(t||"");var w=t.split(" ");if(w.length<4)return t;
  var a=Math.floor(w.length*0.45),b=Math.min(w.length,a+2);
  return w.slice(0,a).join(" ")+" <em>"+w.slice(a,b).join(" ")+"</em> "+w.slice(b).join(" ");
}
function render(){
  var s=CONFIG, h="";
  h+='<div class="announce"><div class="wrap">'+esc(announcement())+'</div></div>';
  h+='<header class="top"><div class="wrap">'+
    '<nav class="nav" aria-label="Secciones"><button data-a="view" data-v="shop" aria-current="'+(ui.view==="shop")+'">Colección</button><button data-a="view" data-v="about" aria-current="'+(ui.view==="about")+'">Nosotros</button></nav>'+
    '<div class="logo" data-a="view" data-v="shop"><h1>'+esc(s.storeName)+'</h1><p>'+esc(s.tagline)+'</p></div>'+
    '<div class="actions"><button class="bag-btn" data-a="cart-open" aria-label="Abrir bolsa">'+icon("bag")+'<span class="lbl">Bolsa</span>'+(cartCount()?'<span class="count">'+cartCount()+'</span>':'')+'</button></div>'+
    '</div></header>';
  if(ui.view==="shop"){
    var slides=heroSlides();
    h+='<section class="hero"><div class="wrap"><div><span class="pill"><i></i>'+esc(s.heroBadge)+'</span><h2>'+heroTitle(s.heroTitle)+'</h2><p class="lead">'+esc(s.heroText)+'</p>'+
      '<div class="cta-row"><button class="btn btn-dark" data-a="scroll">Ver catálogo</button><a class="btn btn-line" href="'+esc(waLink("Hola, quiero información sobre sus gorros quirúrgicos."))+'" target="_blank" rel="noopener">'+icon("wa")+' Escríbenos</a></div></div>'+
      '<div class="showcase"><div class="ghost"></div><div class="frame">'+carouselHTML(slides)+'</div></div></div></section>';
    h+='<section class="catalog" id="catalog"><div class="wrap"><div class="cat-head"><div><span class="eyebrow">Catálogo</span><h3>Nuestros gorros</h3></div>'+
      '<div class="filters"><div class="search">'+icon("search")+'<input id="q" type="search" placeholder="Buscar estampado, color…" value="'+esc(ui.q)+'" aria-label="Buscar"></div>'+
      '<div class="chips">'+categories().map(function(c){return '<button class="chip" data-a="cat" data-v="'+esc(c)+'" aria-pressed="'+(ui.cat===c)+'">'+esc(c)+'</button>';}).join("")+'</div></div></div>'+
      '<div id="grid">'+gridHTML()+'</div>'+
      '<div class="benefits"><div>'+icon("shield")+'<h5>Tela antifluido</h5><p>Repele salpicaduras y conserva el tratamiento después de muchos lavados.</p></div>'+
      '<div>'+icon("feather")+'<h5>Cómodo todo el turno</h5><p>Patrón que no aprieta sienes ni frente durante cirugías largas.</p></div>'+
      '<div>'+icon("truck")+'<h5>Envíos en '+esc(s.shippingArea||"Guadalajara")+'</h5><p>'+(freeMin()>0?'Gratis en compras de más de '+moneyShort(freeMin())+'. ':'')+'Coordinamos la entrega contigo por WhatsApp.</p></div></div></div></section>';
  } else {
    h+='<section class="wrap"><div class="about"><span class="eyebrow">Nosotros</span><h3>'+esc(s.aboutTitle)+'</h3><p>'+esc(s.aboutText)+'</p><div class="cta-row" style="justify-content:center"><button class="btn btn-dark" data-a="view" data-v="shop">Ver la colección</button></div></div></section>';
  }
  h+='<footer><div class="wrap"><div><h5>'+esc(s.storeName)+'</h5><small>'+esc(s.tagline)+' · '+new Date().getFullYear()+'</small></div><div class="phone"><span style="color:var(--wa)">'+icon("wa")+'</span><span>WhatsApp: '+esc(s.whatsapp)+'</span></div></div></footer>';
  if(ui.cartOpen) h+=cartHTML();
  if(ui.quick) h+=quickHTML();
  var active=document.activeElement, aid=active&&active.id, pos=aid&&active.selectionStart;
  app.innerHTML=h;
  if(aid){var el=document.getElementById(aid);if(el){el.focus();try{if(pos!=null)el.setSelectionRange(pos,pos);}catch(e){}}}
}
function gridHTML(){
  if(loading) return '<div class="empty"><p>Cargando catálogo…</p></div>';
  if(loadFailed) return '<div class="empty"><p>No pudimos cargar el catálogo.</p><button class="link" data-a="retry">Intentar de nuevo</button></div>';
  if(!PRODUCTS.length) return '<div class="empty"><p>Todavía no hay productos en el catálogo.</p></div>';
  var list=filtered();
  if(!list.length) return '<div class="empty"><p>No encontramos gorros con esa búsqueda.</p><button class="link" data-a="reset">Quitar filtros</button></div>';
  return '<div class="grid">'+list.map(function(p){
    var off=soldOut(p), photo=!MC.isDrawn(MC.views(p)[0]);
    return '<article class="card'+(off?' is-out':'')+'" style="--pc:'+esc(p.color)+'"><div class="vis'+(photo?' photo':'')+'" data-a="quick" data-id="'+esc(p.id)+'">'+(p.tag&&!off?'<span class="tag">'+esc(p.tag)+'</span>':'')+(off?'<span class="soldout">Agotado</span>':'')+visual(p)+'</div>'+
      '<div class="info"><div class="row"><div><span class="eyebrow">'+esc(p.category)+'</span><h4>'+esc(p.name)+'</h4></div><span class="price">'+moneyShort(p.price)+'</span></div>'+
      (p.description?'<p class="desc">'+esc(p.description)+'</p>':'')+
      '<div class="row" style="align-items:center">'+(p.fabric?'<div class="fabric">'+esc(p.fabric)+'</div>':'<span></span>')+stockNote(p)+'</div></div>'+
      '<div class="foot"><button class="btn btn-line" data-a="add" data-id="'+esc(p.id)+'"'+(off?' aria-disabled="true"':'')+'>'+icon("bag")+(off?' Agotado':' Añadir a la bolsa')+'</button>'+
      '<button class="btn btn-line" data-a="quick" data-id="'+esc(p.id)+'" aria-label="Ver detalle de '+esc(p.name)+'">'+icon("eye")+'</button></div></article>';
  }).join("")+'</div>';
}
function cartHTML(){
  var lines=cartLines();
  var body=lines.length?lines.map(function(l){
    var k=esc(l.c.id);
    var full=inCart(l.p.id)>=stockLeft(l.p);
    return '<div class="line-item"><div class="thumb'+(MC.isDrawn(MC.views(l.p)[0])?'':' photo')+'" style="--pc:'+esc(l.p.color)+'">'+visual(l.p)+'</div><div><h5>'+esc(l.p.name)+'</h5><div class="meta">'+moneyShort(l.p.price)+' c/u</div>'+
      '<div class="stepper"><button data-a="qty" data-k="'+k+'" data-d="-1" aria-label="Quitar uno">'+icon("minus")+'</button><span>'+l.c.qty+'</span><button data-a="qty" data-k="'+k+'" data-d="1" aria-label="Agregar uno"'+(full?' disabled':'')+'>'+icon("plus")+'</button></div>'+
      (full&&isFinite(stockLeft(l.p))?'<div class="meta">Máximo disponible</div>':'')+'</div>'+
      '<div style="text-align:right"><div class="price" style="font-size:17px">'+moneyShort(l.sub)+'</div><button class="remove" data-a="rm" data-k="'+k+'">Quitar</button></div></div>';
  }).join(""):(ui.sent?'<div class="sent"><span class="sent-ico">'+icon("wa")+'</span><p>Tu pedido se abrió en WhatsApp.</p><span class="note">Solo falta que lo envíes en el chat. Vaciamos tu bolsa para que puedas hacer otro pedido.</span>'+
    '<a class="btn btn-line" href="'+esc(ui.sent)+'" target="_blank" rel="noopener">'+icon("wa")+' No se abrió, intentar otra vez</a><button class="link" data-a="cart-shop">Seguir viendo gorros</button></div>':
    '<div class="empty" style="margin-top:20px"><p>Tu bolsa está vacía.</p><button class="link" data-a="cart-shop">Ver la colección</button></div>');
  var tot=cartTotal(), free=hasFreeShipping(tot), missing=Math.floor(freeMin()-tot)+1;
  var ship=freeMin()>0?'<div class="ship'+(free?' ok':'')+'"><div class="ship-txt">'+icon("truck")+(free?'<span>Tu envío es <b>gratis</b></span>':'<span>Agrega <b>'+moneyShort(missing)+'</b> más y tu envío es gratis</span>')+'</div>'+
    '<div class="ship-bar"><i style="width:'+Math.min(100,Math.round(tot/freeMin()*100))+'%"></i></div></div>':'';
  var foot=lines.length?'<div class="d-foot">'+ship+
    '<div class="sum"><span>Subtotal</span><span>'+money(tot)+'</span></div>'+
    '<div class="sum"><span>Envío</span><span>'+(free?'Gratis':'Por confirmar')+'</span></div>'+
    '<div class="total"><span>Total</span><span>'+money(tot)+(free?'':' + envío')+'</span></div>'+
    '<div class="field"><label for="buyer-name">Tu nombre (opcional)</label><input id="buyer-name" value="'+esc(ui.buyerName)+'" autocomplete="name"></div>'+
    '<div class="field"><label for="buyer-note">Colonia o dirección de entrega</label><input id="buyer-note" value="'+esc(ui.buyerNote)+'" placeholder="Ej. Providencia, Guadalajara" autocomplete="street-address"></div>'+
    '<a id="wa-order" class="btn btn-wa" data-a="send" href="'+esc(waLink(orderMessage()))+'" target="_blank" rel="noopener">'+icon("wa")+' Pedir por WhatsApp</a>'+
    '<p class="note">Se abre WhatsApp con tu pedido ya escrito; solo tienes que enviarlo. Solo hacemos envíos en '+esc(CONFIG.shippingArea||"Guadalajara")+'; el costo de envío y la forma de pago se confirman por ahí.</p></div>':'';
  return '<div class="scrim" data-a="close-all"></div><aside class="drawer" role="dialog" aria-label="Tu bolsa"><div class="d-head"><h4>Tu bolsa</h4><button class="x" data-a="close-all" aria-label="Cerrar">'+icon("x")+'</button></div><div class="d-body">'+body+'</div>'+foot+'</aside>';
}
function quickHTML(){
  var p=find(ui.quick); if(!p) return "";
  var off=soldOut(p), vs=MC.views(p), cur=vs.indexOf(ui.qv)>=0?ui.qv:vs[0];
  var left=stockLeft(p);
  return '<div class="scrim" data-a="close-all"></div><div class="modal-wrap" data-a="close-bg"><div class="modal" role="dialog" aria-label="'+esc(p.name)+'" style="--pc:'+esc(p.color)+'">'+
    '<button class="x" data-a="close-all" aria-label="Cerrar">'+icon("x")+'</button>'+
    '<div class="gallery"><div class="vis'+(MC.isDrawn(cur)?'':' photo')+'">'+visual(p,cur)+'</div>'+
      '<div class="thumbs" role="tablist" aria-label="Vistas del producto">'+vs.map(function(v){
        return '<button role="tab" data-a="qv" data-v="'+v+'" aria-selected="'+(v===cur)+'" aria-label="'+esc(MC.viewName(v))+'"><span class="th'+(MC.isDrawn(v)?'':' photo')+'">'+visual(p,v)+'</span><small>'+esc(MC.viewName(v))+'</small></button>';
      }).join("")+'</div></div>'+
    '<div class="content"><span class="eyebrow">'+esc(p.category)+'</span><h4>'+esc(p.name)+'</h4><div class="price" style="font-size:24px">'+money(p.price)+'</div>'+
    (p.description?'<p class="desc">'+esc(p.description)+'</p>':'')+
    '<dl class="specs">'+(p.pattern?'<dt>Diseño</dt><dd>'+esc(p.pattern)+'</dd>':'')+(p.fabric?'<dt>Tela</dt><dd>'+esc(p.fabric)+'</dd>':'')+
      '<dt>Existencias</dt><dd>'+(off?'<span class="stock out">Agotado</span>':(isFinite(left)?left+' disponibles':'Disponible'))+'</dd></dl>'+
    (off?'<a id="wa-single" class="btn btn-wa" href="'+esc(waLink(singleMessage(p)))+'" target="_blank" rel="noopener">'+icon("wa")+' Preguntar cuándo vuelve</a>':
    '<div style="display:flex;gap:10px;align-items:center"><div class="stepper" style="margin:0"><button data-a="qq" data-d="-1" aria-label="Menos">'+icon("minus")+'</button><span>'+ui.quickQty+'</span><button data-a="qq" data-d="1" aria-label="Más"'+(ui.quickQty>=left?' disabled':'')+'>'+icon("plus")+'</button></div>'+
    '<button class="btn btn-dark" style="flex:1" data-a="add-quick">Añadir a la bolsa</button></div>'+
    '<a id="wa-single" class="btn btn-wa" href="'+esc(waLink(singleMessage(p,ui.quickQty)))+'" target="_blank" rel="noopener">'+icon("wa")+' Preguntar por WhatsApp</a>'+
    '<p class="note ship-note">'+icon("truck")+' '+esc(shippingLine())+'.</p>')+'</div></div></div>';
}

/* ---------- eventos ---------- */
app.addEventListener("click",function(ev){
  var t=ev.target.closest("[data-a]"); if(!t) return;
  if(t.getAttribute("aria-disabled")==="true"||t.disabled){ev.preventDefault();return;}
  switch(t.dataset.a){
    case "view": ui.view=t.dataset.v; render(); window.scrollTo(0,0); break;
    case "scroll": var c=document.getElementById("catalog"); if(c) c.scrollIntoView({behavior:"smooth"}); break;
    case "cat": ui.cat=t.dataset.v; render(); break;
    case "reset": ui.cat="Todos"; ui.q=""; render(); break;
    case "retry": loading=true; loadFailed=false; render(); loadStore(); break;
    case "add": addToCart(t.dataset.id,1); break;
    case "hero-step": heroShow(hero.i+Number(t.dataset.d)); break;
    case "hero-go": heroShow(Number(t.dataset.i)); break;
    case "quick": if(hero.swiped&&Date.now()-hero.swiped<400) break; ui.quick=t.dataset.id; ui.quickQty=1; ui.qv=null; render(); break;
    case "qv": ui.qv=t.dataset.v; render(); break;
    case "qq": var qp=find(ui.quick); ui.quickQty=Math.max(1,Math.min(qp?stockLeft(qp):99,ui.quickQty+Number(t.dataset.d))); render(); break;
    case "add-quick": addToCart(ui.quick,ui.quickQty); break;
    case "close-bg": if(ev.target===t){ui.quick=null;render();} break;
    case "close-all": ui.cartOpen=false; ui.quick=null; ui.sent=null; render(); break;
    case "send":
      // deja que el enlace abra WhatsApp y después vacía la bolsa
      var href=t.href;
      setTimeout(function(){cart=[];saveCart();ui.sent=href;ui.buyerName="";ui.buyerNote="";render();},400);
      break;
    case "cart-open": ui.cartOpen=true; if(cart.length) ui.sent=null; render(); break;
    case "cart-shop": ui.cartOpen=false; ui.sent=null; ui.view="shop"; render(); break;
    case "qty": var it=cart.find(function(c){return c.id===t.dataset.k;});
      if(it){var d=Number(t.dataset.d),p=find(it.id);
        if(d>0&&p&&inCart(p.id)>=stockLeft(p)){toast("No hay más piezas disponibles.");return;}
        it.qty+=d; if(it.qty<1) cart.splice(cart.indexOf(it),1);}
      saveCart(); render(); break;
    case "rm": cart=cart.filter(function(c){return c.id!==t.dataset.k;}); saveCart(); render(); break;
  }
});
app.addEventListener("input",function(ev){
  var el=ev.target;
  if(el.id==="q"){ui.q=el.value;var g=document.getElementById("grid");if(g)g.innerHTML=gridHTML();return;}
  if(el.id==="buyer-name"||el.id==="buyer-note"){
    if(el.id==="buyer-name")ui.buyerName=el.value;else ui.buyerNote=el.value;
    var w=document.getElementById("wa-order");if(w)w.href=waLink(orderMessage());return;
  }
});
document.addEventListener("keydown",function(ev){if(ev.key==="Escape"&&(ui.quick||ui.cartOpen)){ui.quick=null;ui.cartOpen=false;ui.sent=null;render();}});

render();
loadStore();
if(!reduceMotion) heroStart();
})();
