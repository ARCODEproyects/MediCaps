/* Editor de plantillas con foto.
   Sube una foto del maniquí con un buff liso claro, marca la tela con la varita
   y el pincel, y guarda. Se dibuja en su propia capa para que los canvas no se
   pierdan cuando el panel se vuelve a dibujar. */
(function(){
"use strict";
var esc=MC.esc;
var MAX=1000;                // tamaño máximo de la foto (px)
var TEAL="rgba(60,127,134,1)";

var st=null;   // estado del editor abierto
var root=null;

function sampleFabric(){
  // tela de prueba: rayas y puntos, por si todavía no hay diseños
  var c=document.createElement("canvas");c.width=c.height=240;var x=c.getContext("2d");
  x.fillStyle="#1E2B30";x.fillRect(0,0,240,240);
  for(var i=-240;i<480;i+=40){x.fillStyle="#3C7F86";x.beginPath();x.moveTo(i,0);x.lineTo(i+20,0);x.lineTo(i+260,240);x.lineTo(i+240,240);x.fill();}
  x.fillStyle="#F2C14E";for(var yy=20;yy<240;yy+=40)for(var xx=20;xx<240;xx+=40){x.beginPath();x.arc(xx,yy,6,0,7);x.fill();}
  return c;
}

function open(opts){
  // opts: {template?, file?, products, onSave(tpl, blobs)}
  st={tool:"wand",size:28,tol:80,undo:[],preview:false,name:"",tpl:opts.template||null,opts:opts,photo:null,file:opts.file||null};
  st.name=st.tpl?st.tpl.name:"";
  root=document.createElement("div");root.className="tpl-ed";root.setAttribute("role","dialog");root.setAttribute("aria-label","Editor de plantilla");
  root.innerHTML=
    '<div class="tpl-box">'+
      '<header class="tpl-head"><div><span class="eyebrow">Plantilla con foto</span><h2>'+(st.tpl?'Editar plantilla':'Nueva plantilla')+'</h2></div>'+
        '<button class="mini" data-t="close">Cancelar</button></header>'+
      '<div class="tpl-body">'+
        '<div class="tpl-stage"><div class="tpl-wrap" id="tp-wrap"><canvas id="tp-photo"></canvas><canvas id="tp-mask"></canvas><canvas id="tp-prev" hidden></canvas></div>'+
          '<p class="note" id="tp-msg">Cargando foto…</p></div>'+
        '<aside class="tpl-side">'+
          '<div class="field"><label for="tp-name">Nombre de la vista</label><input id="tp-name" maxlength="40" placeholder="Ej. En la cabeza, De frente, Extendido" value="'+esc(st.name)+'"></div>'+
          '<ol class="tpl-steps"><li>Elige <b>Varita</b> y da clic sobre la tela. Se marca toda la zona del mismo color.</li><li>Si faltó algo, usa el <b>Pincel</b>; si se marcó de más, el <b>Borrador</b>.</li><li>Dale <b>Ver prueba</b> para ver cómo queda un diseño.</li></ol>'+
          '<div class="seg tools" role="group" aria-label="Herramienta">'+
            '<button data-t="tool" data-v="wand" aria-pressed="true">Varita</button><button data-t="tool" data-v="brush" aria-pressed="false">Pincel</button><button data-t="tool" data-v="erase" aria-pressed="false">Borrador</button></div>'+
          '<div class="field" id="tp-tol-f"><label for="tp-tol">Sensibilidad de la varita: <b id="tp-tol-v">80</b></label><input id="tp-tol" type="range" min="20" max="160" value="80"></div>'+
          '<div class="field" id="tp-size-f" hidden><label for="tp-size">Tamaño del pincel: <b id="tp-size-v">28</b></label><input id="tp-size" type="range" min="4" max="120" value="28"></div>'+
          '<div class="tpl-row"><button class="mini" data-t="undo">Deshacer</button><button class="mini" data-t="clear">Borrar todo</button><button class="mini" data-t="holes">Rellenar huecos</button><button class="mini" data-t="invert">Invertir</button></div>'+
          '<button class="btn btn-line" data-t="preview" id="tp-prev-btn">Ver prueba</button>'+
          '<p class="note"><b>Para la foto:</b> buff liso blanco o gris claro, buena luz y un <b>fondo de color</b> que no sea blanco (una pared o tela de color). Así la varita distingue la tela del fondo.</p><p class="note">Si la varita se pasa al fondo, baja la sensibilidad. Si no agarra los pliegues, súbela o da otro clic en la parte que faltó.</p>'+
        '</aside>'+
      '</div>'+
      '<footer class="tpl-foot"><span class="note" id="tp-status"></span><button class="btn btn-dark" data-t="save" id="tp-save" aria-disabled="true">Guardar plantilla</button></footer>'+
    '</div>';
  document.body.appendChild(root);
  document.body.style.overflow="hidden";
  root.addEventListener("click",onClick);
  root.addEventListener("input",onInput);
  bindCanvas();
  load();
}

function close(){
  if(!root) return;
  root.remove();root=null;st=null;document.body.style.overflow="";
}

function $(id){return document.getElementById(id);}
function msg(t){var m=$("tp-msg");if(m)m.textContent=t;}

function load(){
  var srcPhoto=st.file?URL.createObjectURL(st.file):st.tpl.photo;
  MC.loadImg(srcPhoto).then(function(img){
    var s=Math.min(1,MAX/Math.max(img.naturalWidth,img.naturalHeight));
    var w=Math.round(img.naturalWidth*s),h=Math.round(img.naturalHeight*s);
    var pc=$("tp-photo"),mc=$("tp-mask"),vc=$("tp-prev");
    [pc,mc,vc].forEach(function(c){c.width=w;c.height=h;});
    var px=pc.getContext("2d",{willReadFrequently:true});
    px.fillStyle="#fff";px.fillRect(0,0,w,h);px.drawImage(img,0,0,w,h);
    st.photo=pc;st.w=w;st.h=h;
    // copia suavizada solo para la varita: quita el ruido de la cámara y del JPEG
    var sc=document.createElement("canvas");sc.width=w;sc.height=h;var sx=sc.getContext("2d",{willReadFrequently:true});
    if("filter" in sx) sx.filter="blur("+Math.max(1,w/700)+"px)";
    sx.drawImage(pc,0,0);st.pdata=sx.getImageData(0,0,w,h).data;
    st.bg=bgColors(st.pdata,w,h);
    st.mctx=mc.getContext("2d",{willReadFrequently:true});
    if(st.tpl&&!st.file){
      return MC.loadImg(st.tpl.mask).then(function(m){st.mctx.drawImage(m,0,0,w,h);recolor();refresh();});
    }
    refresh();
  }).catch(function(){msg("No se pudo abrir la foto. Prueba con otra imagen JPG o PNG.");});
}

/* colores del fondo: promedio de cada esquina de la foto */
function bgColors(d,w,h){
  var out=[],k=Math.max(4,Math.round(Math.min(w,h)*0.03));
  [[0,0],[w-k,0],[0,h-k],[w-k,h-k]].forEach(function(c){
    var r=0,g=0,b=0,n=0;
    for(var y=c[1];y<c[1]+k;y++)for(var x=c[0];x<c[0]+k;x++){var i=(y*w+x)*4;r+=d[i];g+=d[i+1];b+=d[i+2];n++;}
    out.push([r/n,g/n,b/n]);
  });
  return out;
}
function nearBg(d,p,lim){
  for(var i=0;i<st.bg.length;i++){var c=st.bg[i],a=d[p]-c[0],b=d[p+1]-c[1],e=d[p+2]-c[2];if(a*a+b*b+e*e<lim)return true;}
  return false;
}

/* deja la máscara con un solo color (por si se cargó una guardada) */
function recolor(){
  var d=st.mctx.getImageData(0,0,st.w,st.h),a=d.data;
  for(var i=0;i<a.length;i+=4){var v=a[i+3]>100?255:0;a[i]=60;a[i+1]=127;a[i+2]=134;a[i+3]=v;}
  st.mctx.putImageData(d,0,0);
}
function coverage(){
  var a=st.mctx.getImageData(0,0,st.w,st.h).data,n=0;
  for(var i=3;i<a.length;i+=16) if(a[i]>128) n++;
  return n/(a.length/16);
}
function refresh(){
  var cov=coverage();
  msg(cov?"Tela marcada: "+Math.round(cov*100)+"% de la foto.":"Da clic sobre la tela con la varita para marcarla.");
  var ok=cov>0.01;
  $("tp-save").setAttribute("aria-disabled",ok?"false":"true");
  if(st.preview) drawPreview();
}
function pushUndo(){
  st.undo.push(st.mctx.getImageData(0,0,st.w,st.h));
  if(st.undo.length>8) st.undo.shift();
}

/* ---------- varita ----------
   Avanza de pixel en pixel mientras el cambio con el vecino sea suave (sigue sombras
   y pliegues) y se detiene en las orillas, donde el color cambia de golpe. */
function wand(ix,iy){
  var w=st.w,h=st.h,pd=st.pdata;
  var md=st.mctx.getImageData(0,0,w,h),m=md.data;
  var seen=new Uint8Array(w*h);
  var p0=(iy*w+ix)*4,r0=pd[p0],g0=pd[p0+1],b0=pd[p0+2];
  var big=Math.min(250,st.tol*2.2), tol=big*big*3; // qué tan distinto del punto de inicio (sombras incluidas)
  var step=Math.max(8,st.tol/5); step=step*step*3; // qué tan brusco puede ser el cambio entre vecinos
  var stack=[iy*w+ix,iy*w+ix];
  var bgLim=26*26*3, useBg=!nearBg(pd,p0,bgLim); // si diste clic en el fondo, no lo excluye
  while(stack.length){
    var from=stack.pop(),idx=stack.pop();
    if(seen[idx]) continue;
    var p=idx*4,q=from*4;
    var dr=pd[p]-r0,dg=pd[p+1]-g0,db=pd[p+2]-b0;
    if(dr*dr+dg*dg+db*db>tol) continue;
    var er=pd[p]-pd[q],eg=pd[p+1]-pd[q+1],eb=pd[p+2]-pd[q+2];
    if(er*er+eg*eg+eb*eb>step) continue;
    if(useBg&&nearBg(pd,p,bgLim)) continue;
    seen[idx]=1;
    m[p]=60;m[p+1]=127;m[p+2]=134;m[p+3]=255;
    var x=idx%w,y=(idx/w)|0;
    if(x>0&&!seen[idx-1])stack.push(idx-1,idx);
    if(x<w-1&&!seen[idx+1])stack.push(idx+1,idx);
    if(y>0&&!seen[idx-w])stack.push(idx-w,idx);
    if(y<h-1&&!seen[idx+w])stack.push(idx+w,idx);
  }
  st.mctx.putImageData(md,0,0);
  fillHoles(0.015);
}

/* Rellena los huecos dentro de la tela (pliegues muy oscuros, brillos, estampado)
   que no estén conectados con la orilla de la foto. maxFrac = tamaño máximo del hueco. */
function fillHoles(maxFrac){
  var w=st.w,h=st.h,md=st.mctx.getImageData(0,0,w,h),m=md.data,n=w*h;
  var lab=new Uint8Array(n),i,stack=[];
  for(i=0;i<n;i++) if(m[i*4+3]>128) lab[i]=1;           // 1 = tela
  // 2 = fondo conectado a la orilla
  for(var x=0;x<w;x++){stack.push(x,(h-1)*w+x);} for(var y=0;y<h;y++){stack.push(y*w,y*w+w-1);}
  while(stack.length){i=stack.pop();if(lab[i])continue;lab[i]=2;var cx=i%w,cy=(i/w)|0;
    if(cx>0)stack.push(i-1);if(cx<w-1)stack.push(i+1);if(cy>0)stack.push(i-w);if(cy<h-1)stack.push(i+w);}
  var limit=maxFrac*n,filled=0;
  for(i=0;i<n;i++){
    if(lab[i]) continue;
    var comp=[],s=[i];lab[i]=3;
    while(s.length){var j=s.pop();comp.push(j);var jx=j%w,jy=(j/w)|0;
      if(jx>0&&!lab[j-1]){lab[j-1]=3;s.push(j-1);} if(jx<w-1&&!lab[j+1]){lab[j+1]=3;s.push(j+1);}
      if(jy>0&&!lab[j-w]){lab[j-w]=3;s.push(j-w);} if(jy<h-1&&!lab[j+w]){lab[j+w]=3;s.push(j+w);}}
    if(comp.length<=limit){for(var k=0;k<comp.length;k++){var pp=comp[k]*4;m[pp]=60;m[pp+1]=127;m[pp+2]=134;m[pp+3]=255;}filled+=comp.length;}
  }
  st.mctx.putImageData(md,0,0);
  return filled;
}

/* ---------- pincel y borrador ---------- */
function bindCanvas(){
  var mc=$("tp-mask"),down=false,last=null;
  function pos(e){var r=mc.getBoundingClientRect();return {x:(e.clientX-r.left)*st.w/r.width,y:(e.clientY-r.top)*st.h/r.height};}
  function line(a,b){
    var c=st.mctx;c.save();
    c.globalCompositeOperation=st.tool==="erase"?"destination-out":"source-over";
    c.strokeStyle=TEAL;c.fillStyle=TEAL;c.lineCap="round";c.lineJoin="round";c.lineWidth=st.size;
    c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();
    c.beginPath();c.arc(b.x,b.y,st.size/2,0,7);c.fill();c.restore();
  }
  mc.addEventListener("pointerdown",function(e){
    if(!st||!st.photo||st.preview) return;
    e.preventDefault();
    var p=pos(e);
    pushUndo();
    if(st.tool==="wand"){
      var x=Math.max(0,Math.min(st.w-1,Math.round(p.x))),y=Math.max(0,Math.min(st.h-1,Math.round(p.y)));
      wand(x,y);refresh();return;
    }
    down=true;last=p;mc.setPointerCapture(e.pointerId);line(p,p);
  });
  mc.addEventListener("pointermove",function(e){if(!down)return;var p=pos(e);line(last,p);last=p;});
  function up(){if(down){down=false;refresh();}}
  mc.addEventListener("pointerup",up);mc.addEventListener("pointercancel",up);
}

function drawPreview(){
  var vc=$("tp-prev"),x=vc.getContext("2d");
  var prods=(st.opts.products||[]).filter(function(p){return p.patternImage;});
  var p=prods[0];
  var go=function(pat,color,fit){x.drawImage(MC.composite(st.photo,$("tp-mask"),{color:color,pattern:pat,fit:fit}),0,0);};
  if(p) MC.loadImg(p.patternImage).then(function(img){go(img,p.color,p.patternFit);}).catch(function(){go(sampleFabric(),"#1E2B30","tile");});
  else go(sampleFabric(),"#1E2B30","tile");
}

function setTool(v){
  st.tool=v;
  root.querySelectorAll('[data-t="tool"]').forEach(function(b){b.setAttribute("aria-pressed",b.dataset.v===v?"true":"false");});
  $("tp-tol-f").hidden=v!=="wand";$("tp-size-f").hidden=v==="wand";
  $("tp-mask").style.cursor=v==="wand"?"crosshair":"cell";
}
function setPreview(on){
  st.preview=on;
  $("tp-prev").hidden=!on;$("tp-mask").style.opacity=on?"0":"";
  $("tp-prev-btn").textContent=on?"Volver a marcar":"Ver prueba";
  if(on) drawPreview();
}

function onInput(e){
  var t=e.target;
  if(t.id==="tp-name") st.name=t.value;
  if(t.id==="tp-tol"){st.tol=Number(t.value);$("tp-tol-v").textContent=t.value;}
  if(t.id==="tp-size"){st.size=Number(t.value);$("tp-size-v").textContent=t.value;}
}
function onClick(e){
  var b=e.target.closest("[data-t]");if(!b||!st)return;
  if(b.getAttribute("aria-disabled")==="true") return;
  switch(b.dataset.t){
    case "close": close(); break;
    case "tool": if(st.preview) setPreview(false); setTool(b.dataset.v); break;
    case "undo": if(st.undo.length){st.mctx.putImageData(st.undo.pop(),0,0);refresh();} break;
    case "clear": pushUndo(); st.mctx.clearRect(0,0,st.w,st.h); refresh(); break;
    case "invert":
      pushUndo();
      var d=st.mctx.getImageData(0,0,st.w,st.h),a=d.data;
      for(var i=0;i<a.length;i+=4){a[i]=60;a[i+1]=127;a[i+2]=134;a[i+3]=a[i+3]>128?0:255;}
      st.mctx.putImageData(d,0,0);refresh(); break;
    case "holes": pushUndo(); fillHoles(0.08); refresh(); break;
    case "preview": setPreview(!st.preview); break;
    case "save": save(); break;
  }
}

function toBlob(canvas,type,q){return new Promise(function(res,rej){canvas.toBlob(function(b){b?res(b):rej(new Error("No se pudo preparar la imagen."));},type,q);});}

function save(){
  var name=(st.name||"").trim();
  if(!name){$("tp-name").focus();$("tp-status").textContent="Ponle nombre a la vista, ej. En la cabeza.";return;}
  var btn=$("tp-save");btn.setAttribute("aria-disabled","true");btn.textContent="Guardando…";
  // máscara en blanco y negro con transparencia
  var out=document.createElement("canvas");out.width=st.w;out.height=st.h;
  var ox=out.getContext("2d");ox.drawImage($("tp-mask"),0,0);
  var jobs=[toBlob(out,"image/png")];
  if(st.file) jobs.push(toBlob(st.photo,"image/jpeg",0.9));
  Promise.all(jobs).then(function(b){
    return st.opts.onSave({id:st.tpl?st.tpl.id:null,name:name,keepPhoto:st.tpl&&!st.file?st.tpl.photo:null},{mask:b[0],photo:b[1]||null});
  }).then(function(){close();})
  .catch(function(err){btn.setAttribute("aria-disabled","false");btn.textContent="Guardar plantilla";$("tp-status").textContent=err.message||"No se pudo guardar.";});
}

document.addEventListener("keydown",function(e){if(e.key==="Escape"&&root)close();});

window.TplEditor={open:open,close:close};
})();
