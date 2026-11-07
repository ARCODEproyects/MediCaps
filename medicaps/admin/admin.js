(function(){
"use strict";
var esc=MC.esc, visual=MC.visual, soldOut=MC.soldOut;
var SWATCHES=["#5E8C8A","#3C7F86","#4F7FA8","#3B4A6B","#4A5D4E","#7FA88F","#C66A84","#B5654B","#C8945F","#7B5C8E","#2C3A40","#D9DEE0"];
var KEY="mc-admin-pass";
var pass=null; try{pass=sessionStorage.getItem(KEY);}catch(e){}
var saved=null, draft=null;
var ui={tab:"products",editing:null,confirmDel:null,status:null,busy:false,uploading:null,loginError:"",loading:false,newCat:""};
var app=document.getElementById("app");

function clone(o){return JSON.parse(JSON.stringify(o));}
function dirty(){return draft&&JSON.stringify(draft)!==JSON.stringify(saved);}
function moneyShort(n){return "$"+Number(n||0).toLocaleString("es-MX",{maximumFractionDigits:2});}
function uid(prefix){return prefix+Date.now().toString(36)+Math.random().toString(36).slice(2,7);}
function icon(n){var p={plus:'<path d="M12 5v14M5 12h14"/>',minus:'<path d="M5 12h14"/>',out:'<path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10"/>',ext:'<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>',up:'<path d="M12 19V5M6 11l6-6 6 6"/>'}[n];return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">'+p+'</svg>';}
function toast(msg){var t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(function(){t.remove();},2800);}
function cats(){return draft.settings.categories;}
function countIn(c){return draft.products.filter(function(p){return p.category===c;}).length;}
function changed(){ui.status=null;}

/* Asegura que los datos tengan los campos nuevos (por si vienen de la versión anterior) */
function normalize(d){
  d.settings=d.settings||{};
  var list=Array.isArray(d.settings.categories)?d.settings.categories.slice():[];
  d.products.forEach(function(p){
    if(list.indexOf(p.category)<0) list.push(p.category);
    if(p.stock===undefined) p.stock=p.available===false?0:null;
    delete p.available;
    if(p.patternImage===undefined) p.patternImage="";
    if(!p.imageMode) p.imageMode=p.image?"photo":"pattern";
    if(!p.patternFit) p.patternFit="cover";
  });
  d.settings.categories=list;
  return d;
}

function api(method,url,body,type){
  var h={"authorization":"Bearer "+pass};
  if(type) h["content-type"]=type;
  return fetch(url,{method:method,headers:h,body:body,cache:"no-store"}).then(function(r){
    return r.json().catch(function(){return {};}).then(function(d){
      if(r.status===401){logout("Tu sesión expiró o la contraseña cambió. Entra de nuevo.");throw new Error("401");}
      if(!r.ok) throw new Error(d.error||("Error "+r.status));
      return d;
    });
  });
}

/* ---------- sesión ---------- */
function login(p){
  ui.loginError="";ui.loading=true;render();
  pass=p;
  fetch("/api/login",{method:"POST",headers:{"authorization":"Bearer "+p}}).then(function(r){
    return r.json().catch(function(){return {};}).then(function(d){
      if(!r.ok) throw new Error(d.error||"No se pudo entrar.");
      try{sessionStorage.setItem(KEY,p);}catch(e){}
      return loadStore();
    });
  }).catch(function(e){pass=null;ui.loading=false;ui.loginError=e.message==="Failed to fetch"?"No hay conexión con el servidor.":e.message;render();});
}
function logout(msg){pass=null;saved=null;draft=null;try{sessionStorage.removeItem(KEY);}catch(e){}ui.loginError=msg||"";ui.loading=false;render();}
function loadStore(){
  return fetch("/api/store",{cache:"no-store"}).then(function(r){return r.json();}).then(function(d){
    saved=normalize(d);draft=clone(saved);ui.loading=false;ui.status=null;render();
  });
}

/* ---------- guardar ---------- */
function publish(){
  ui.busy=true;ui.status={kind:"",text:"Publicando…"};render();
  api("PUT","/api/store",JSON.stringify(draft),"application/json").then(function(){
    saved=clone(draft);ui.status={kind:"ok",text:"Publicado. La tienda ya muestra los cambios (puede tardar hasta un minuto)."};
  }).catch(function(e){if(e.message!=="401")ui.status={kind:"err",text:e.message};})
  .then(function(){ui.busy=false;render();});
}

/* Reduce la foto y la convierte a JPG para que cargue rápido */
function resizeImage(file,max){
  return new Promise(function(resolve,reject){
    var img=new Image(),url=URL.createObjectURL(file);
    img.onload=function(){
      var w=img.naturalWidth,h=img.naturalHeight,s=Math.min(1,max/Math.max(w,h));
      var c=document.createElement("canvas");c.width=Math.round(w*s);c.height=Math.round(h*s);
      var ctx=c.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(img,0,0,c.width,c.height);
      URL.revokeObjectURL(url);
      c.toBlob(function(b){b?resolve(b):reject(new Error("No se pudo procesar la foto."));},"image/jpeg",0.85);
    };
    img.onerror=function(){URL.revokeObjectURL(url);reject(new Error("Ese archivo no parece una imagen."));};
    img.src=url;
  });
}
function uploadPhoto(file,slot){
  ui.uploading=slot;render();
  resizeImage(file,slot==="patternImage"?1000:1200)
  .then(function(blob){return api("PUT","/api/images/"+uid("img-"),blob,"image/jpeg");})
  .then(function(d){
    if(!ui.editing) return;
    ui.editing[slot]=d.url;
    ui.editing.imageMode=slot==="image"?"photo":"pattern";
    toast(slot==="image"?"Foto del gorro lista.":"Diseño aplicado al gorro.");
  })
  .catch(function(e){if(e.message!=="401")toast(e.message);})
  .then(function(){ui.uploading=null;render();});
}

/* ---------- vistas ---------- */
function render(){
  if(!pass||!draft){app.innerHTML=loginHTML();var i=document.getElementById("pw");if(i&&!ui.loading)i.focus();return;}
  var active=document.activeElement,aid=active&&active.id,pos=aid&&active.selectionStart;
  app.innerHTML=adminHTML();
  if(aid){var el=document.getElementById(aid);if(el){el.focus();try{if(pos!=null)el.setSelectionRange(pos,pos);}catch(e){}}}
}
function loginHTML(){
  return '<main class="login"><form id="login-form" class="login-card">'+
    '<span class="eyebrow">Acceso privado</span><h1>Administrar tienda</h1>'+
    '<p class="note">Solo la persona que sube los productos tiene la contraseña.</p>'+
    '<div class="field"><label for="pw">Contraseña</label><input id="pw" type="password" autocomplete="current-password" required></div>'+
    (ui.loginError?'<p class="error" role="alert">'+esc(ui.loginError)+'</p>':'')+
    '<button class="btn btn-dark" type="submit"'+(ui.loading?' aria-disabled="true"':'')+'>'+(ui.loading?'Entrando…':'Entrar')+'</button>'+
    '<a class="link" href="/" style="align-self:center">Ir a la tienda</a></form></main>';
}
function adminHTML(){
  var d=dirty(),st=ui.status;
  var stCls=st?st.kind:(d?"dirty":""),stTxt=st?st.text:(d?"Tienes cambios sin publicar":"Todo está publicado");
  var out=draft.products.filter(soldOut).length;
  var h='<header class="adm-top"><div class="wrap"><div><span class="eyebrow">Panel privado</span><h1>'+esc(draft.settings.storeName)+'</h1></div>'+
    '<div class="adm-actions"><a class="mini" href="/" target="_blank" rel="noopener">'+icon("ext")+' Ver tienda</a><button class="mini" data-a="logout">'+icon("out")+' Salir</button></div></div></header>';
  h+='<main class="wrap adm-main"><div class="tabs" role="tablist">'+
    '<button role="tab" data-a="tab" data-v="products" aria-selected="'+(ui.tab==="products")+'">Productos ('+draft.products.length+')</button>'+
    '<button role="tab" data-a="tab" data-v="cats" aria-selected="'+(ui.tab==="cats")+'">Categorías ('+cats().length+')</button>'+
    '<button role="tab" data-a="tab" data-v="settings" aria-selected="'+(ui.tab==="settings")+'">Datos de la tienda</button></div>';
  if(ui.tab==="products") h+=ui.editing?editorHTML():listHTML(out);
  else if(ui.tab==="cats") h+=catsHTML();
  else h+=settingsHTML();
  h+='</main>';
  h+='<div class="publish-bar"><div class="wrap"><div class="status '+stCls+'" role="status"><i></i>'+esc(stTxt)+'</div>'+
    '<div class="adm-actions"><button class="btn btn-line" data-a="discard"'+(d&&!ui.busy?'':' aria-disabled="true"')+'>Descartar</button>'+
    '<button class="btn btn-dark" data-a="publish"'+(d&&!ui.busy&&!ui.editing?'':' aria-disabled="true"')+'>'+(ui.busy?'Publicando…':'Publicar cambios')+'</button></div></div></div>';
  return h;
}
function stockCell(p,i){
  var v=p.stock===null?'—':p.stock;
  return '<div class="stock-ctl" title="Existencias"><button class="mini sq" data-a="stk" data-i="'+i+'" data-d="-1" aria-label="Restar una pieza"'+(p.stock===0||p.stock===null?' disabled':'')+'>'+icon("minus")+'</button>'+
    '<input id="stk-'+i+'" class="stk-in" data-stk="'+i+'" inputmode="numeric" value="'+v+'" aria-label="Existencias de '+esc(p.name)+'">'+
    '<button class="mini sq" data-a="stk" data-i="'+i+'" data-d="1" aria-label="Sumar una pieza">'+icon("plus")+'</button></div>';
}
function listHTML(out){
  var h='<div class="list-head"><button class="btn btn-dark" data-a="new">'+icon("plus")+' Agregar producto</button>'+
    (out?'<span class="stock out">'+out+' agotado'+(out>1?'s':'')+'</span>':'')+'</div>'+
    '<p class="note">Existencias: escribe cuántas piezas tienes. Con <b>0</b> se marca como agotado pero sigue en el catálogo. Con <b>—</b> no se lleva conteo.</p>';
  if(!draft.products.length) return h+'<p class="note">No hay productos. Agrega el primero.</p>';
  return h+draft.products.map(function(p,i){
    var del=ui.confirmDel===p.id;
    return '<div class="adm-row'+(soldOut(p)?' is-out':'')+'"><div class="thumb'+(MC.usesPhoto(p)?' photo':'')+'" style="--pc:'+esc(p.color)+'">'+visual(p)+'</div>'+
      '<div style="min-width:0"><b>'+esc(p.name)+(soldOut(p)?'<span class="badge out">Agotado</span>':'')+'</b><small>'+moneyShort(p.price)+' · '+esc(p.category)+'</small></div>'+
      stockCell(p,i)+
      '<div class="adm-actions">'+(del?'<button class="mini" data-a="del-no">No</button><button class="mini danger" data-a="del-yes" data-id="'+esc(p.id)+'">Sí, eliminar</button>':
        '<button class="mini sq" data-a="up" data-i="'+i+'" aria-label="Subir en el catálogo"'+(i===0?' disabled':'')+'>'+icon("up")+'</button>'+
        '<button class="mini" data-a="edit" data-id="'+esc(p.id)+'">Editar</button><button class="mini danger" data-a="del" data-id="'+esc(p.id)+'">Eliminar</button>')+'</div></div>';
  }).join("");
}
function photoSlot(slot,title,help){
  var p=ui.editing, url=p[slot], busy=ui.uploading===slot;
  var thumb=slot==="patternImage"?(url?'<img src="'+esc(url)+'" alt="">':'<span class="ph">Sin diseño</span>'):(url?'<img src="'+esc(url)+'" alt="">':'<span class="ph">Sin foto</span>');
  return '<div class="slot"><div class="slot-thumb">'+thumb+'</div><div class="slot-body"><b>'+title+'</b><span class="note">'+help+'</span>'+
    '<label class="mini file-btn" for="e-'+slot+'">'+(busy?'Subiendo…':(url?'Cambiar':'Subir'))+'</label><input id="e-'+slot+'" class="file-in" type="file" accept="image/*" data-slot="'+slot+'"'+(ui.uploading?' disabled':'')+'>'+
    (url?'<button class="mini" data-a="rm-photo" data-slot="'+slot+'">Quitar</button>':'')+'</div></div>';
}
function editorHTML(){
  var p=ui.editing;
  function f(k,label,type,extra){return '<div class="field"><label for="e-'+k+'">'+label+'</label><input id="e-'+k+'" data-e="'+k+'" type="'+(type||"text")+'" value="'+esc(p[k]==null?"":p[k])+'"'+(extra||"")+'></div>';}
  var both=MC.hasBoth(p);
  return '<div class="editor">'+
    '<div class="preview-col"><span class="eyebrow">Así se verá</span><div class="preview'+(MC.usesPhoto(p)?' photo':'')+'" style="--pc:'+esc(p.color)+'">'+visual(p)+(soldOut(p)?'<span class="soldout">Agotado</span>':'')+'</div>'+
      (both?'<div class="field"><label>Imagen principal en la tienda</label><div class="seg"><button data-a="mode" data-v="pattern" aria-pressed="'+(p.imageMode!=="photo")+'">Gorro con diseño</button><button data-a="mode" data-v="photo" aria-pressed="'+(p.imageMode==="photo")+'">Foto del gorro</button></div><span class="note">El cliente puede ver las dos en el detalle.</span></div>':'')+
      (p.patternImage&&!MC.usesPhoto(p)?'<div class="field"><label>Cómo acomodar el diseño</label><div class="seg"><button data-a="fit" data-v="cover" aria-pressed="'+(p.patternFit!=="tile")+'">Llenar el gorro</button><button data-a="fit" data-v="tile" aria-pressed="'+(p.patternFit==="tile")+'">Repetir como tela</button></div></div>':'')+
    '</div>'+
    '<div class="form">'+
    '<span class="eyebrow">'+(p._new?'Nuevo producto':'Editar producto')+'</span>'+
    f("name","Nombre","text",' maxlength="120"')+
    '<div class="two">'+f("price","Precio ("+esc(draft.settings.currency)+")","number",' min="0" step="1" inputmode="decimal"')+
      f("stock","Existencias (vacío = sin conteo)","number",' min="0" step="1" inputmode="numeric" placeholder="Sin conteo"')+'</div>'+
    '<div class="field"><label for="e-category">Categoría</label><select id="e-category" data-e="category">'+cats().map(function(c){return '<option'+(c===p.category?' selected':'')+'>'+esc(c)+'</option>';}).join("")+'</select>'+
      '<span class="note">Para crear o renombrar categorías usa la pestaña Categorías.</span></div>'+
    '<div class="field"><label>Imágenes</label><div class="slots">'+
      photoSlot("patternImage","Diseño o estampado","Sube la foto de la tela o el dibujo. Se acomoda sola a la forma del gorro.")+
      photoSlot("image","Foto del gorro","Una foto real del gorro terminado.")+
    '</div></div>'+
    '<div class="field"><label>Color base del gorro</label><div class="swatches">'+SWATCHES.map(function(c){return '<button class="swatch" style="background:'+c+'" data-a="color" data-v="'+c+'" aria-pressed="'+(p.color===c)+'" aria-label="Color '+c+'"></button>';}).join("")+
      '<input id="e-color" type="color" value="'+esc(p.color)+'" aria-label="Otro color" class="color-in"></div><span class="note">Se ve cuando no hay diseño, y en las orillas del gorro.</span></div>'+
    '<div class="field"><label for="e-description">Descripción</label><textarea id="e-description" data-e="description" rows="3">'+esc(p.description)+'</textarea></div>'+
    '<div class="two">'+f("pattern","Nombre del diseño")+f("fabric","Tela")+'</div>'+
    f("tag","Etiqueta (ej. Nuevo, Más vendido)")+
    '<div class="two"><button class="btn btn-line" data-a="edit-cancel">Cancelar</button><button class="btn btn-dark" data-a="edit-save"'+(ui.uploading?' aria-disabled="true"':'')+'>Guardar producto</button></div>'+
  '</div></div>';
}
function catsHTML(){
  var list=cats();
  var h='<div class="form"><p class="note">El orden de aquí es el orden de los filtros en la tienda. Si cambias el nombre, se actualiza en todos sus productos.</p>'+
    '<form id="cat-form" class="cat-add"><input id="new-cat" placeholder="Nueva categoría, ej. Pediatría" value="'+esc(ui.newCat)+'" maxlength="60" aria-label="Nombre de la nueva categoría"><button class="btn btn-dark" type="submit">'+icon("plus")+' Agregar</button></form>';
  if(!list.length) return h+'<p class="note">Todavía no hay categorías.</p></div>';
  h+=list.map(function(c,i){
    var n=countIn(c);
    return '<div class="cat-row"><input id="cat-'+i+'" data-cat="'+i+'" value="'+esc(c)+'" maxlength="60" aria-label="Nombre de la categoría">'+
      '<small>'+n+' producto'+(n===1?'':'s')+'</small>'+
      '<div class="adm-actions"><button class="mini sq" data-a="cat-up" data-i="'+i+'" aria-label="Subir"'+(i===0?' disabled':'')+'>'+icon("up")+'</button>'+
      '<button class="mini danger" data-a="cat-del" data-i="'+i+'"'+(n?' disabled title="Primero cambia sus productos a otra categoría"':'')+'>Eliminar</button></div></div>';
  }).join("");
  return h+'<p class="note">Solo puedes eliminar una categoría cuando ya no tiene productos.</p></div>';
}
function settingsHTML(){
  var s=draft.settings;
  function f(k,label,area){return '<div class="field"><label for="s-'+k+'">'+label+'</label>'+(area?'<textarea id="s-'+k+'" data-s="'+k+'" rows="4">'+esc(s[k])+'</textarea>':'<input id="s-'+k+'" data-s="'+k+'" value="'+esc(s[k])+'">')+'</div>';}
  return '<div class="form">'+f("storeName","Nombre de la tienda")+f("tagline","Frase bajo el logo")+
    '<div class="two">'+f("whatsapp","Número de WhatsApp (donde llegan los pedidos)")+f("currency","Moneda")+'</div>'+
    f("announcement","Barra de anuncio (vacía para ocultarla)")+f("heroBadge","Etiqueta de portada")+f("heroTitle","Título de portada")+f("heroText","Texto de portada",true)+
    f("aboutTitle","Título de “Nosotros”")+f("aboutText","Texto de “Nosotros”",true)+'</div>';
}

/* ---------- eventos ---------- */
app.addEventListener("submit",function(ev){
  ev.preventDefault();
  if(ev.target.id==="login-form"){var v=document.getElementById("pw").value;if(v)login(v);}
  if(ev.target.id==="cat-form"){
    var name=ui.newCat.trim(); if(!name) return;
    if(cats().indexOf(name)>=0){toast("Esa categoría ya existe.");return;}
    cats().push(name); ui.newCat=""; changed(); render(); toast("Categoría agregada.");
  }
});
app.addEventListener("click",function(ev){
  var t=ev.target.closest("[data-a]");if(!t)return;
  if(t.getAttribute("aria-disabled")==="true"||t.disabled){ev.preventDefault();return;}
  var i=Number(t.dataset.i), a;
  switch(t.dataset.a){
    case "logout": logout(); break;
    case "tab": ui.tab=t.dataset.v; ui.editing=null; ui.confirmDel=null; render(); break;
    case "new":
      if(!cats().length) cats().push("General");
      ui.editing={_new:true,id:uid("p"),name:"",category:cats()[0],price:0,stock:null,color:SWATCHES[0],pattern:"",fabric:"",description:"",tag:"Nuevo",image:"",patternImage:"",imageMode:"pattern",patternFit:"cover"};
      render(); window.scrollTo(0,0); break;
    case "edit": ui.editing=clone(draft.products.find(function(p){return p.id===t.dataset.id;})); render(); window.scrollTo(0,0); break;
    case "edit-cancel": ui.editing=null; render(); break;
    case "edit-save":
      var e=ui.editing;
      if(!String(e.name).trim()){toast("Ponle un nombre al producto.");return;}
      e.name=String(e.name).trim(); e.price=Math.max(0,Number(e.price)||0);
      e.stock=(e.stock===null||e.stock==="")?null:Math.max(0,Math.floor(Number(e.stock))||0);
      var isNew=e._new; delete e._new;
      if(isNew) draft.products.push(e); else draft.products=draft.products.map(function(p){return p.id===e.id?e:p;});
      ui.editing=null; changed(); render(); toast("Guardado. Dale Publicar cambios para que lo vean tus clientes."); break;
    case "color": ui.editing.color=t.dataset.v; render(); break;
    case "mode": ui.editing.imageMode=t.dataset.v; render(); break;
    case "fit": ui.editing.patternFit=t.dataset.v; render(); break;
    case "rm-photo": ui.editing[t.dataset.slot]=""; ui.editing.imageMode=ui.editing.patternImage?"pattern":"photo"; render(); break;
    case "stk": var p=draft.products[i]; p.stock=Math.max(0,(p.stock===null?0:p.stock)+Number(t.dataset.d)); changed(); render(); break;
    case "up": if(i>0){a=draft.products; var x=a[i]; a[i]=a[i-1]; a[i-1]=x; changed(); render();} break;
    case "del": ui.confirmDel=t.dataset.id; render(); break;
    case "del-no": ui.confirmDel=null; render(); break;
    case "del-yes": draft.products=draft.products.filter(function(p){return p.id!==t.dataset.id;}); ui.confirmDel=null; changed(); render(); break;
    case "cat-up": if(i>0){a=cats(); var y=a[i]; a[i]=a[i-1]; a[i-1]=y; changed(); render();} break;
    case "cat-del": if(!countIn(cats()[i])){cats().splice(i,1); changed(); render();} break;
    case "discard": draft=clone(saved); ui.editing=null; changed(); render(); break;
    case "publish": publish(); break;
  }
});
app.addEventListener("input",function(ev){
  var el=ev.target;
  if(el.id==="new-cat"){ui.newCat=el.value;return;}
  if(el.dataset.s){draft.settings[el.dataset.s]=el.value;changed();return;}
  if(el.dataset.e&&ui.editing){ui.editing[el.dataset.e]=el.value;}
});
app.addEventListener("change",function(ev){
  var el=ev.target;
  if(el.dataset.s){render();return;}
  if(el.dataset.stk!==undefined){
    var p=draft.products[Number(el.dataset.stk)], v=el.value.trim();
    p.stock=(v===""||v==="—"||v==="-")?null:Math.max(0,Math.floor(Number(v))||0);
    changed(); render(); return;
  }
  if(el.dataset.cat!==undefined){
    var idx=Number(el.dataset.cat), old=cats()[idx], nu=el.value.trim();
    if(!nu||nu===old){render();return;}
    if(cats().indexOf(nu)>=0){toast("Ya existe una categoría con ese nombre.");render();return;}
    cats()[idx]=nu;
    draft.products.forEach(function(p){if(p.category===old)p.category=nu;});
    changed(); render(); toast("Categoría renombrada."); return;
  }
  if(!ui.editing)return;
  if(el.id==="e-color"){ui.editing.color=el.value;render();}
  else if(el.id==="e-category"){ui.editing.category=el.value;}
  else if(el.id==="e-stock"){var v=el.value.trim();ui.editing.stock=v===""?null:Math.max(0,Math.floor(Number(v))||0);render();}
  else if(el.dataset.slot&&el.files&&el.files[0]){uploadPhoto(el.files[0],el.dataset.slot);}
});
window.addEventListener("beforeunload",function(ev){if(dirty()){ev.preventDefault();ev.returnValue="";}});

if(pass){ui.loading=true;render();loadStore().catch(function(){logout("No se pudo cargar la tienda.");});}
else render();
})();
