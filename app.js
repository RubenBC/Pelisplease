/* =====================================================================
   RubenceCine — app.js  (v0.9)
   Recomendaciones: botones Guardar / No la he visto + estrellas abajo.
   Pestañas: Descubrir · Mis pelis · Guardadas · Por ver.
   ===================================================================== */
(function () {
  'use strict';

  const app = document.getElementById('app');

  if (typeof CONFIG === 'undefined' || CONFIG.SUPABASE_URL.startsWith('PEGA_')) {
    app.innerHTML = '<div class="aviso">Falta configurar Supabase.<br>Abre <b>config.js</b>.</div>';
    return;
  }

  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const COLORES = ['#F5B14C','#6CA0F0','#E06CC0','#5FD0A8','#A06CF0','#F0686B','#E8C84A','#5FC7D0'];
  const TEMAS = ['Cualquiera','Terror','Ciencia ficción','Fantasía','Comedia','Drama','Acción','Thriller','Animación','Aventura'];

  let perfiles = [];
  let usuarioActual = null;
  let tabActual = 'descubrir';
  let temaActual = '';

  // --- Utilidades --------------------------------------------------------
  function iniciales(n){ const p=n.trim().split(/\s+/); return (((p[0]||'')[0]||'')+((p[1]||'')[0]||'')).toUpperCase()||'?'; }
  function texto(el){ return (el && el.textContent || '').trim(); }
  function esc(s){ return (s||'').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
  function cerrarModal(){ document.getElementById('modal-root').innerHTML = ''; }
  function toast(msg){
    const t=document.createElement('div'); t.className='toast'; t.textContent=msg;
    document.getElementById('toast-root').appendChild(t);
    requestAnimationFrame(()=>t.classList.add('show'));
    setTimeout(()=>{ t.classList.remove('show'); setTimeout(()=>t.remove(),250); },2600);
  }
  function modal(html){
    const root=document.getElementById('modal-root');
    root.innerHTML='<div class="overlay"><div class="modal">'+html+'</div></div>';
    root.querySelector('.overlay').addEventListener('click',e=>{ if(e.target.classList.contains('overlay')) cerrarModal(); });
  }
  function estrellasHTML(n){ let s=''; for(let i=1;i<=5;i++) s+=`<span class="estrella${i<=n?' on':''}">★</span>`; return s; }
  function estrellasElegir(){ return '<div class="estrellas elegir">'+[1,2,3,4,5].map(n=>`<span class="estrella" data-v="${n}">★</span>`).join('')+'</div>'; }
  function pintarEstrellas(grp, val){ grp.querySelectorAll('.estrella').forEach((x,idx)=>x.classList.toggle('on', idx<val)); }

  // --- Perfiles ----------------------------------------------------------
  async function cargarPerfiles(){
    app.innerHTML='<div class="cargando">Cargando…</div>';
    const { data, error } = await sb.from('usuarios').select('*').order('creado_en',{ascending:true});
    if(error){ app.innerHTML='<div class="aviso">No se pudo conectar con Supabase.<br>'+esc(error.message)+'</div>'; return; }
    perfiles=data||[];
    const ultimo=localStorage.getItem('rc_perfil');
    const u=perfiles.find(p=>p.id===ultimo);
    if(u && !u.pin){ entrar(u); return; }
    renderSelector();
  }

  function renderSelector(){
    const tiles=perfiles.map(p=>`
      <button class="perfil" data-id="${p.id}">
        <span class="avatar" style="--c:${p.color}">${iniciales(p.nombre)}</span>
        <span class="perfil-nombre">${esc(p.nombre)}${p.pin?' <span class="lock">🔒</span>':''}</span>
      </button>`).join('');
    app.innerHTML=`
      <section class="picker">
        <header class="marca"><span class="glow"></span><h1>RubenceCine</h1></header>
        <p class="pregunta">¿Quién ve hoy?</p>
        <div class="rejilla">${tiles}
          <button class="perfil nuevo" id="add"><span class="avatar mas">+</span><span class="perfil-nombre">Añadir</span></button>
        </div>
        <footer class="pie">${CONFIG.VERSION}</footer>
      </section>`;
    app.querySelectorAll('.perfil[data-id]').forEach(b=>b.addEventListener('click',()=>{
      const p=perfiles.find(x=>x.id===b.dataset.id); if(p.pin) pedirPin(p); else entrar(p);
    }));
    document.getElementById('add').addEventListener('click',modalNuevoPerfil);
  }

  function modalNuevoPerfil(){
    const sw=COLORES.map((c,i)=>`<button class="swatch${i===0?' sel':''}" style="--c:${c}" data-c="${c}"></button>`).join('');
    modal(`<h2>Nuevo perfil</h2>
      <label class="campo-lbl">Nombre</label>
      <div class="input" id="f-nombre" contenteditable="true" data-ph="Tu nombre"></div>
      <label class="campo-lbl">Color</label><div class="swatches">${sw}</div>
      <label class="campo-lbl">PIN (opcional, 4 dígitos)</label>
      <div class="input pin" id="f-pin" contenteditable="true" inputmode="numeric" data-ph="––––"></div>
      <div class="acciones"><button class="btn ghost" id="cancelar">Cancelar</button><button class="btn" id="crear">Crear perfil</button></div>`);
    let color=COLORES[0];
    document.querySelectorAll('.swatch').forEach(s=>s.addEventListener('click',()=>{
      document.querySelectorAll('.swatch').forEach(x=>x.classList.remove('sel')); s.classList.add('sel'); color=s.dataset.c;
    }));
    document.getElementById('cancelar').addEventListener('click',cerrarModal);
    document.getElementById('crear').addEventListener('click',async()=>{
      const nombre=texto(document.getElementById('f-nombre'));
      const pin=texto(document.getElementById('f-pin')).replace(/\D/g,'');
      if(nombre.length<1){ toast('Pon un nombre'); return; }
      if(pin && pin.length<4){ toast('El PIN debe tener 4 dígitos'); return; }
      const {data,error}=await sb.from('usuarios').insert({nombre,color,pin:pin||null}).select().single();
      if(error){ toast('Error al crear: '+error.message); return; }
      cerrarModal(); perfiles.push(data); renderSelector(); toast('Perfil creado');
    });
  }

  function pedirPin(p){
    modal(`<h2>Hola, ${esc(p.nombre)}</h2>
      <label class="campo-lbl">Introduce tu PIN</label>
      <div class="input pin" id="f-pin2" contenteditable="true" inputmode="numeric" data-ph="––––"></div>
      <div class="acciones"><button class="btn ghost" id="cancelar">Cancelar</button><button class="btn" id="ok">Entrar</button></div>`);
    document.getElementById('cancelar').addEventListener('click',cerrarModal);
    document.getElementById('ok').addEventListener('click',()=>{
      const pin=texto(document.getElementById('f-pin2')).replace(/\D/g,'');
      if(pin===p.pin){ cerrarModal(); entrar(p); } else toast('PIN incorrecto');
    });
  }

  // --- Home con pestañas -------------------------------------------------
  function entrar(p){ usuarioActual=p; localStorage.setItem('rc_perfil',p.id); tabActual='descubrir'; renderHome(); }

  function renderHome(){
    const p=usuarioActual;
    app.innerHTML=`
      <section class="home">
        <header class="home-top">
          <span class="avatar sm" style="--c:${p.color}">${iniciales(p.nombre)}</span>
          <div><p class="hola">Hola,</p><h2>${esc(p.nombre)}</h2></div>
          <button class="btn ghost peque" id="cambiar">Cambiar</button>
        </header>
        <nav class="tabs cuatro">
          <button class="tab" data-t="descubrir">Descubrir</button>
          <button class="tab" data-t="mis">Mis pelis</button>
          <button class="tab" data-t="guardadas">Guardadas</button>
          <button class="tab" data-t="porver">Por ver</button>
        </nav>
        <div id="vista"></div>
        <footer class="pie">${CONFIG.VERSION}</footer>
      </section>`;
    document.getElementById('cambiar').addEventListener('click',()=>{
      localStorage.removeItem('rc_perfil'); usuarioActual=null; renderSelector();
    });
    app.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',()=>{ tabActual=t.dataset.t; renderTab(); }));
    renderTab();
  }

  function renderTab(){
    app.querySelectorAll('.tab').forEach(t=>t.classList.toggle('activo', t.dataset.t===tabActual));
    const v=document.getElementById('vista');
    if(tabActual==='descubrir') vistaDescubrir(v);
    else if(tabActual==='mis') vistaMisPelis(v);
    else if(tabActual==='guardadas') vistaLista(v,'guardadas');
    else vistaLista(v,'por_ver');
  }

  // --- Descubrir ---------------------------------------------------------
  function vistaDescubrir(v){
    const chips=TEMAS.map(t=>{ const val=t==='Cualquiera'?'':t;
      return `<button class="chip${val===temaActual?' sel':''}" data-t="${val}">${t}</button>`; }).join('');
    v.innerHTML=`
      <p class="seccion">¿Qué te apetece hoy?</p>
      <div class="chips">${chips}</div>
      <button class="btn recomendar-btn" id="reco">✨ Recomiéndame</button>
      <div id="recs"></div>`;
    v.querySelectorAll('.chip').forEach(c=>c.addEventListener('click',()=>{
      temaActual=c.dataset.t; v.querySelectorAll('.chip').forEach(x=>x.classList.remove('sel')); c.classList.add('sel');
    }));
    document.getElementById('reco').addEventListener('click',pedirRecomendaciones);
  }

  async function pedirRecomendaciones(){
    const recs=document.getElementById('recs');
    if(!CONFIG.EDGE_FUNCTION_URL){ recs.innerHTML='<p class="vacio">Falta EDGE_FUNCTION_URL en config.js.</p>'; return; }
    recs.innerHTML='<div class="cargando-inline">Pensando recomendaciones…</div>';

    const { data: vals, error } = await sb.from('valoraciones')
      .select('puntuacion, peliculas(titulo,anio,generos)')
      .eq('usuario_id', usuarioActual.id);
    if(error){ recs.innerHTML='<p class="vacio">Error: '+esc(error.message)+'</p>'; return; }
    const perfil=(vals||[]).filter(x=>x.peliculas).map(x=>({
      titulo:x.peliculas.titulo, anio:x.peliculas.anio, puntuacion:x.puntuacion,
      generos:(x.peliculas.generos||[]).join(', ')
    }));
    if(perfil.length<3){ recs.innerHTML='<p class="vacio">Puntúa al menos 3-5 pelis en <b>Mis pelis</b> para que las recomendaciones tengan base.</p>'; return; }

    const vistos=perfil.map(p=>p.titulo);
    const { data: g1 } = await sb.from('guardadas').select('peliculas(titulo)').eq('usuario_id',usuarioActual.id);
    const { data: g2 } = await sb.from('por_ver').select('peliculas(titulo)').eq('usuario_id',usuarioActual.id);
    const guardados=[...(g1||[]),...(g2||[])].filter(g=>g.peliculas).map(g=>g.peliculas.titulo);
    const excluir=[...vistos,...guardados];

    let out;
    try{
      const r=await fetch(CONFIG.EDGE_FUNCTION_URL,{ method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ perfil, tema: temaActual, excluir, n: 6 }) });
      out=await r.json();
    }catch(e){ recs.innerHTML='<p class="vacio">No se pudo contactar con la función.<br>'+esc(String(e))+'</p>'; return; }
    if(out.error){ recs.innerHTML='<p class="vacio">Error de la IA: '+esc(out.error)+'</p>'; return; }
    const lista=out.recomendaciones||[];
    if(!lista.length){ recs.innerHTML='<p class="vacio">La IA no devolvió nada. Prueba otra vez.</p>'; return; }

    recs.innerHTML='<div class="cargando-inline">Buscando carátulas…</div>';
    const buscadas=await Promise.all(lista.map(async rec=>{
      try{ const m=await TMDB.buscarUna(rec.titulo, rec.anio); return m?{m,motivo:rec.motivo}:null; }catch(_){ return null; }
    }));
    const vistosSet=new Set(vistos.map(t=>t.toLowerCase()));
    const finales=buscadas.filter(x=>x && !vistosSet.has((x.m.title||'').toLowerCase()));
    if(!finales.length){ recs.innerHTML='<p class="vacio">No encontré carátulas para las sugerencias. Prueba de nuevo.</p>'; return; }

    const mapa={};
    finales.forEach((x,i)=>mapa[i]=x);
    recs.innerHTML='<p class="rec-nota"><b>Guarda</b> las que quieras ver. Si <b>no la has visto</b> y quizá la veas, ponla en <b>Por ver</b>. Y si <b>ya la viste</b>, púntuala abajo.</p>'
      +'<div class="lista-recs">'+finales.map((x,i)=>recCardHTML(x.m,x.motivo,i)).join('')+'</div>';

    recs.querySelectorAll('.rec-card').forEach(card=>{
      const {m,motivo}=mapa[card.dataset.i];
      card.querySelector('.guardar-btn').addEventListener('click',async()=>{ await guardarEnLista(m,motivo,'guardadas'); card.remove(); });
      card.querySelector('.porver-btn').addEventListener('click',async()=>{ await guardarEnLista(m,motivo,'por_ver'); card.remove(); });
      card.querySelectorAll('.estrellas.elegir .estrella').forEach(st=>st.addEventListener('click',async()=>{
        const val=parseInt(st.dataset.v,10);
        pintarEstrellas(st.parentElement, val);
        await guardarValoracion(m, val);
        card.classList.add('hecha');
        setTimeout(()=>card.remove(), 850);
      }));
    });
  }

  function recCardHTML(m,motivo,i){
    const img=TMDB.poster(m.poster_path,'w185');
    const anio=(m.release_date||'').slice(0,4);
    return `<div class="rec-card" data-i="${i}">
      ${img?`<img class="peli-poster" src="${img}" loading="lazy" alt="">`:'<div class="peli-poster sinposter">🎬</div>'}
      <div class="peli-info">
        <p class="peli-titulo">${esc(m.title)}</p>
        <p class="peli-anio">${anio}</p>
        <p class="motivo">${esc(motivo||'')}</p>
        <div class="rec-actions sec">
          <button class="mini-btn guardar-btn">＋ Guardar</button>
          <button class="mini-btn porver-btn">👁 No la he visto</button>
        </div>
        <div class="rec-rate-row"><span class="rate-lbl">Si ya la viste:</span>${estrellasElegir()}</div>
      </div></div>`;
  }

  // --- Mis pelis ---------------------------------------------------------
  function vistaMisPelis(v){
    v.innerHTML=`<button class="btn ancho" id="buscar-btn">+ Añadir película vista</button>
      <h3 class="seccion">Mis películas</h3><div id="mis-pelis"><div class="cargando-inline">Cargando…</div></div>`;
    document.getElementById('buscar-btn').addEventListener('click',modalBuscar);
    cargarMisPeliculas();
  }

  async function cargarMisPeliculas(){
    const cont=document.getElementById('mis-pelis'); if(!cont) return;
    const {data,error}=await sb.from('valoraciones').select('puntuacion, peliculas(*)')
      .eq('usuario_id',usuarioActual.id).order('creado_en',{ascending:false});
    if(error){ cont.innerHTML='<p class="vacio">Error: '+esc(error.message)+'</p>'; return; }
    if(!data||!data.length){ cont.innerHTML='<p class="vacio">Aún no has puntuado ninguna peli.<br>Pulsa <b>Añadir película vista</b> y puntúa 5 o más.</p>'; return; }
    cont.innerHTML='<div class="lista-pelis">'+data.map(v=>{
      const m=v.peliculas||{}; const img=TMDB.poster(m.poster_path);
      return `<div class="peli-card">
        ${img?`<img class="peli-poster" src="${img}" loading="lazy" alt="">`:'<div class="peli-poster sinposter">🎬</div>'}
        <div class="peli-info"><p class="peli-titulo">${esc(m.titulo)}</p><p class="peli-anio">${m.anio||''}</p>
        <div class="estrellas">${estrellasHTML(v.puntuacion)}</div></div></div>`;
    }).join('')+'</div>';
  }

  function modalBuscar(){
    modal(`<h2>Añadir película</h2>
      <label class="campo-lbl">Busca una peli que hayas visto</label>
      <div class="buscador"><div class="input" id="q" contenteditable="true" data-ph="Título…"></div><button class="btn peque" id="go">Buscar</button></div>
      <div id="resultados" class="resultados"></div>
      <div class="acciones"><button class="btn ghost" id="cerrar">Cerrar</button></div>`);
    const q=document.getElementById('q'); const res=document.getElementById('resultados');
    document.getElementById('cerrar').addEventListener('click',()=>{ cerrarModal(); cargarMisPeliculas(); });
    async function ejecutar(){
      const query=texto(q); if(query.length<2){ toast('Escribe al menos 2 letras'); return; }
      res.innerHTML='<div class="cargando-inline">Buscando…</div>';
      try{
        const pelis=await TMDB.buscar(query);
        if(!pelis.length){ res.innerHTML='<p class="vacio">Sin resultados.</p>'; return; }
        const mapa={}; pelis.slice(0,8).forEach(m=>mapa[m.id]=m);
        res.innerHTML=Object.values(mapa).map(m=>{
          const img=TMDB.poster(m.poster_path,'w185'); const anio=(m.release_date||'').slice(0,4);
          return `<div class="res-row"><img class="res-poster" src="${img}" loading="lazy" alt="">
            <div class="res-info"><p class="peli-titulo">${esc(m.title)}</p><p class="peli-anio">${anio}</p>
            <div class="estrellas elegir" data-id="${m.id}">${[1,2,3,4,5].map(i=>`<span class="estrella" data-v="${i}">★</span>`).join('')}</div></div></div>`;
        }).join('');
        res.querySelectorAll('.estrellas.elegir').forEach(grp=>grp.querySelectorAll('.estrella').forEach(st=>st.addEventListener('click',async()=>{
          const val=parseInt(st.dataset.v,10);
          pintarEstrellas(grp, val);
          await guardarValoracion(mapa[grp.dataset.id], val);
        })));
      }catch(e){ res.innerHTML='<p class="vacio">Error al buscar en TMDB.<br>Revisa el token en config.js.</p>'; }
    }
    document.getElementById('go').addEventListener('click',ejecutar);
    q.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); ejecutar(); } });
    setTimeout(()=>q.focus(),100);
  }

  // --- Lista genérica: Guardadas / Por ver ------------------------------
  async function vistaLista(v, tabla){
    v.innerHTML='<div class="cargando-inline">Cargando…</div>';
    const {data,error}=await sb.from(tabla).select('id,motivo,peliculas(*)')
      .eq('usuario_id',usuarioActual.id).order('creado_en',{ascending:false});
    if(error){ v.innerHTML='<p class="vacio">Error: '+esc(error.message)+'</p>'; return; }
    if(!data||!data.length){
      v.innerHTML = tabla==='guardadas'
        ? '<p class="vacio">No tienes nada en <b>Guardadas</b>.<br>Pulsa <b>Guardar</b> en una recomendación.</p>'
        : '<p class="vacio">No tienes nada en <b>Por ver</b>.<br>Pulsa <b>No la he visto</b> en una recomendación y revísala cuando la veas.</p>';
      return;
    }
    const mapa={}; data.forEach(g=>mapa[g.id]=g);
    v.innerHTML='<p class="rec-nota">Cuando la veas, púntuala abajo (pasa a Mis pelis). O quítala si ya no te interesa.</p><div class="lista-recs">'+data.map(g=>{
      const m=g.peliculas||{}; const img=TMDB.poster(m.poster_path,'w185');
      return `<div class="rec-card" data-id="${g.id}">
        ${img?`<img class="peli-poster" src="${img}" loading="lazy" alt="">`:'<div class="peli-poster sinposter">🎬</div>'}
        <div class="peli-info"><p class="peli-titulo">${esc(m.titulo)}</p><p class="peli-anio">${m.anio||''}</p>
        ${g.motivo?`<p class="motivo">${esc(g.motivo)}</p>`:''}
        <div class="rec-rate-row"><span class="rate-lbl">Puntuar:</span>${estrellasElegir()}<button class="mini-btn tenue quitar-btn">Quitar</button></div>
        </div></div>`;
    }).join('')+'</div>';
    v.querySelectorAll('.rec-card').forEach(card=>{
      const g=mapa[card.dataset.id]; const tmdb=g.peliculas?g.peliculas.tmdb_id:null;
      card.querySelectorAll('.estrellas.elegir .estrella').forEach(st=>st.addEventListener('click',async()=>{
        const val=parseInt(st.dataset.v,10);
        pintarEstrellas(st.parentElement, val);
        const ok=await valorarCacheada(tmdb, val);
        if(ok){ await borrarDe(tabla, g.id); card.classList.add('hecha'); setTimeout(()=>card.remove(),850); toast('Puntuada · pasa a Mis pelis'); }
      }));
      card.querySelector('.quitar-btn').addEventListener('click',async()=>{ await borrarDe(tabla, g.id); card.remove(); toast('Quitada'); });
    });
  }

  // --- Guardar / puntuar -------------------------------------------------
  async function guardarValoracion(m, puntuacion){
    try{
      let det={}; try{ det=await TMDB.detalles(m.id); }catch(_){}
      const peli={ tmdb_id:m.id, titulo:m.title, titulo_original:m.original_title||null,
        anio:parseInt((m.release_date||'').slice(0,4),10)||null,
        generos:(det.genres||[]).map(g=>g.name), generos_ids:(det.genres||[]).map(g=>g.id),
        keywords:((det.keywords&&det.keywords.keywords)||[]).map(k=>k.name),
        poster_path:m.poster_path||null, sinopsis:m.overview||null };
      const up1=await sb.from('peliculas').upsert(peli,{onConflict:'tmdb_id'}); if(up1.error) throw up1.error;
      const up2=await sb.from('valoraciones').upsert({usuario_id:usuarioActual.id,tmdb_id:m.id,puntuacion},{onConflict:'usuario_id,tmdb_id'}); if(up2.error) throw up2.error;
      toast(m.title+' · '+puntuacion+'★');
    }catch(e){ toast('No se pudo guardar: '+(e.message||e)); }
  }

  async function guardarEnLista(m, motivo, tabla){
    try{
      const peli={ tmdb_id:m.id, titulo:m.title, titulo_original:m.original_title||null,
        anio:parseInt((m.release_date||'').slice(0,4),10)||null,
        poster_path:m.poster_path||null, sinopsis:m.overview||null };
      const up1=await sb.from('peliculas').upsert(peli,{onConflict:'tmdb_id'}); if(up1.error) throw up1.error;
      const up2=await sb.from(tabla).upsert({usuario_id:usuarioActual.id,tmdb_id:m.id,motivo:motivo||null},{onConflict:'usuario_id,tmdb_id'}); if(up2.error) throw up2.error;
      toast((tabla==='guardadas'?'Guardada: ':'En Por ver: ')+m.title);
    }catch(e){ toast('No se pudo guardar: '+(e.message||e)); }
  }

  async function valorarCacheada(tmdb_id, puntuacion){
    if(!tmdb_id){ toast('Error: peli sin id'); return false; }
    const {error}=await sb.from('valoraciones').upsert({usuario_id:usuarioActual.id,tmdb_id,puntuacion},{onConflict:'usuario_id,tmdb_id'});
    if(error){ toast('Error: '+error.message); return false; }
    return true;
  }
  async function borrarDe(tabla, id){ await sb.from(tabla).delete().eq('id',id); }

  cargarPerfiles();
})();
