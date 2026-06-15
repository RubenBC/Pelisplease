/* =====================================================================
   RubenceCine — app.js  (v0.4)
   Paso 3: perfiles + buscar películas en TMDB y puntuarlas.
   ===================================================================== */
(function () {
  'use strict';

  const app = document.getElementById('app');

  // --- Comprobación de configuración ------------------------------------
  if (typeof CONFIG === 'undefined' || CONFIG.SUPABASE_URL.startsWith('PEGA_')) {
    app.innerHTML =
      '<div class="aviso">Falta configurar Supabase.<br>' +
      'Abre <b>config.js</b> y pega tu <b>Project URL</b> y tu <b>anon key</b>.</div>';
    return;
  }

  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const COLORES = ['#F5B14C','#6CA0F0','#E06CC0','#5FD0A8','#A06CF0','#F0686B','#E8C84A','#5FC7D0'];

  let perfiles = [];
  let usuarioActual = null;

  // --- Utilidades --------------------------------------------------------
  function iniciales(nombre){
    const p = nombre.trim().split(/\s+/);
    return (((p[0]||'')[0]||'') + ((p[1]||'')[0]||'')).toUpperCase() || '?';
  }
  function texto(el){ return (el && el.textContent || '').trim(); }
  function esc(s){ return (s||'').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c])); }
  function cerrarModal(){ document.getElementById('modal-root').innerHTML = ''; }
  function toast(msg){
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.getElementById('toast-root').appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 250); }, 2600);
  }
  function modal(htmlInterior){
    const root = document.getElementById('modal-root');
    root.innerHTML = '<div class="overlay"><div class="modal">' + htmlInterior + '</div></div>';
    root.querySelector('.overlay').addEventListener('click', e => {
      if (e.target.classList.contains('overlay')) cerrarModal();
    });
  }
  function estrellasHTML(n){
    let s = '';
    for (let i = 1; i <= 5; i++) s += `<span class="estrella${i <= n ? ' on' : ''}">★</span>`;
    return s;
  }

  // --- Perfiles ----------------------------------------------------------
  async function cargarPerfiles(){
    app.innerHTML = '<div class="cargando">Cargando…</div>';
    const { data, error } = await sb.from('usuarios').select('*').order('creado_en', { ascending: true });
    if (error){
      app.innerHTML = '<div class="aviso">No se pudo conectar con Supabase.<br>' + error.message + '</div>';
      return;
    }
    perfiles = data || [];
    const ultimo = localStorage.getItem('rc_perfil');
    const u = perfiles.find(p => p.id === ultimo);
    if (u && !u.pin){ entrar(u); return; }
    renderSelector();
  }

  function renderSelector(){
    const tiles = perfiles.map(p => `
      <button class="perfil" data-id="${p.id}">
        <span class="avatar" style="--c:${p.color}">${iniciales(p.nombre)}</span>
        <span class="perfil-nombre">${esc(p.nombre)}${p.pin ? ' <span class="lock">🔒</span>' : ''}</span>
      </button>`).join('');

    app.innerHTML = `
      <section class="picker">
        <header class="marca"><span class="glow"></span><h1>RubenceCine</h1></header>
        <p class="pregunta">¿Quién ve hoy?</p>
        <div class="rejilla">
          ${tiles}
          <button class="perfil nuevo" id="add">
            <span class="avatar mas">+</span><span class="perfil-nombre">Añadir</span>
          </button>
        </div>
        <footer class="pie">${CONFIG.VERSION}</footer>
      </section>`;

    app.querySelectorAll('.perfil[data-id]').forEach(b => {
      b.addEventListener('click', () => {
        const p = perfiles.find(x => x.id === b.dataset.id);
        if (p.pin) pedirPin(p); else entrar(p);
      });
    });
    document.getElementById('add').addEventListener('click', modalNuevoPerfil);
  }

  function modalNuevoPerfil(){
    const swatches = COLORES.map((c, i) =>
      `<button class="swatch${i === 0 ? ' sel' : ''}" style="--c:${c}" data-c="${c}"></button>`).join('');
    modal(`
      <h2>Nuevo perfil</h2>
      <label class="campo-lbl">Nombre</label>
      <div class="input" id="f-nombre" contenteditable="true" data-ph="Tu nombre"></div>
      <label class="campo-lbl">Color</label>
      <div class="swatches">${swatches}</div>
      <label class="campo-lbl">PIN (opcional, 4 dígitos)</label>
      <div class="input pin" id="f-pin" contenteditable="true" inputmode="numeric" data-ph="––––"></div>
      <div class="acciones">
        <button class="btn ghost" id="cancelar">Cancelar</button>
        <button class="btn" id="crear">Crear perfil</button>
      </div>`);
    let color = COLORES[0];
    document.querySelectorAll('.swatch').forEach(s => {
      s.addEventListener('click', () => {
        document.querySelectorAll('.swatch').forEach(x => x.classList.remove('sel'));
        s.classList.add('sel'); color = s.dataset.c;
      });
    });
    document.getElementById('cancelar').addEventListener('click', cerrarModal);
    document.getElementById('crear').addEventListener('click', async () => {
      const nombre = texto(document.getElementById('f-nombre'));
      const pin = texto(document.getElementById('f-pin')).replace(/\D/g, '');
      if (nombre.length < 1){ toast('Pon un nombre'); return; }
      if (pin && pin.length < 4){ toast('El PIN debe tener 4 dígitos'); return; }
      const { data, error } = await sb.from('usuarios')
        .insert({ nombre, color, pin: pin || null }).select().single();
      if (error){ toast('Error al crear: ' + error.message); return; }
      cerrarModal(); perfiles.push(data); renderSelector(); toast('Perfil creado');
    });
  }

  function pedirPin(p){
    modal(`
      <h2>Hola, ${esc(p.nombre)}</h2>
      <label class="campo-lbl">Introduce tu PIN</label>
      <div class="input pin" id="f-pin2" contenteditable="true" inputmode="numeric" data-ph="––––"></div>
      <div class="acciones">
        <button class="btn ghost" id="cancelar">Cancelar</button>
        <button class="btn" id="ok">Entrar</button>
      </div>`);
    document.getElementById('cancelar').addEventListener('click', cerrarModal);
    document.getElementById('ok').addEventListener('click', () => {
      const pin = texto(document.getElementById('f-pin2')).replace(/\D/g, '');
      if (pin === p.pin){ cerrarModal(); entrar(p); }
      else toast('PIN incorrecto');
    });
  }

  // --- Home --------------------------------------------------------------
  function entrar(p){
    usuarioActual = p;
    localStorage.setItem('rc_perfil', p.id);
    renderHome();
  }

  function renderHome(){
    const p = usuarioActual;
    app.innerHTML = `
      <section class="home">
        <header class="home-top">
          <span class="avatar sm" style="--c:${p.color}">${iniciales(p.nombre)}</span>
          <div><p class="hola">Hola,</p><h2>${esc(p.nombre)}</h2></div>
          <button class="btn ghost peque" id="cambiar">Cambiar</button>
        </header>
        <div class="acciones-top">
          <button class="btn" id="buscar-btn">+ Añadir película vista</button>
        </div>
        <h3 class="seccion">Mis películas</h3>
        <div id="mis-pelis"><div class="cargando-inline">Cargando…</div></div>
        <footer class="pie">${CONFIG.VERSION}</footer>
      </section>`;
    document.getElementById('cambiar').addEventListener('click', () => {
      localStorage.removeItem('rc_perfil'); usuarioActual = null; renderSelector();
    });
    document.getElementById('buscar-btn').addEventListener('click', modalBuscar);
    cargarMisPeliculas();
  }

  async function cargarMisPeliculas(){
    const cont = document.getElementById('mis-pelis');
    if (!cont) return;
    const { data, error } = await sb.from('valoraciones')
      .select('puntuacion, peliculas(*)')
      .eq('usuario_id', usuarioActual.id)
      .order('creado_en', { ascending: false });
    if (error){ cont.innerHTML = '<p class="vacio">Error al cargar: ' + esc(error.message) + '</p>'; return; }

    if (!data || !data.length){
      cont.innerHTML = '<p class="vacio">Aún no has puntuado ninguna peli.<br>' +
        'Pulsa <b>Añadir película vista</b> y puntúa unas cuantas (5 o más) ' +
        'para que el sistema empiece a conocerte.</p>';
      return;
    }

    const hint = data.length < 5
      ? `<div class="hint">Llevas ${data.length} de 5. Puntúa unas cuantas más para empezar con buenas recomendaciones.</div>`
      : '';

    cont.innerHTML = hint + '<div class="lista-pelis">' + data.map(v => {
      const m = v.peliculas || {};
      const img = TMDB.poster(m.poster_path);
      return `
        <div class="peli-card">
          ${img ? `<img class="peli-poster" src="${img}" alt="" loading="lazy">`
                : '<div class="peli-poster sinposter">🎬</div>'}
          <div class="peli-info">
            <p class="peli-titulo">${esc(m.titulo)}</p>
            <p class="peli-anio">${m.anio || ''}</p>
            <div class="estrellas">${estrellasHTML(v.puntuacion)}</div>
          </div>
        </div>`;
    }).join('') + '</div>';
  }

  // --- Buscar y puntuar --------------------------------------------------
  function modalBuscar(){
    modal(`
      <h2>Añadir película</h2>
      <label class="campo-lbl">Busca una peli que hayas visto</label>
      <div class="buscador">
        <div class="input" id="q" contenteditable="true" data-ph="Título…"></div>
        <button class="btn peque" id="go">Buscar</button>
      </div>
      <div id="resultados" class="resultados"></div>
      <div class="acciones"><button class="btn ghost" id="cerrar">Cerrar</button></div>`);

    const q   = document.getElementById('q');
    const res = document.getElementById('resultados');
    document.getElementById('cerrar').addEventListener('click', () => { cerrarModal(); cargarMisPeliculas(); });

    async function ejecutar(){
      const query = texto(q);
      if (query.length < 2){ toast('Escribe al menos 2 letras'); return; }
      res.innerHTML = '<div class="cargando-inline">Buscando…</div>';
      try {
        const pelis = await TMDB.buscar(query);
        if (!pelis.length){ res.innerHTML = '<p class="vacio">Sin resultados.</p>'; return; }
        const mapa = {};
        pelis.slice(0, 8).forEach(m => mapa[m.id] = m);

        res.innerHTML = Object.values(mapa).map(m => {
          const img  = TMDB.poster(m.poster_path, 'w185');
          const anio = (m.release_date || '').slice(0, 4);
          return `
            <div class="res-row">
              <img class="res-poster" src="${img}" alt="" loading="lazy">
              <div class="res-info">
                <p class="peli-titulo">${esc(m.title)}</p>
                <p class="peli-anio">${anio}</p>
                <div class="estrellas elegir" data-id="${m.id}">
                  ${[1,2,3,4,5].map(i => `<span class="estrella" data-v="${i}">★</span>`).join('')}
                </div>
              </div>
            </div>`;
        }).join('');

        res.querySelectorAll('.estrellas.elegir').forEach(grp => {
          grp.querySelectorAll('.estrella').forEach(st => {
            st.addEventListener('click', async () => {
              const v = parseInt(st.dataset.v, 10);
              grp.querySelectorAll('.estrella').forEach((x, idx) => x.classList.toggle('on', idx < v));
              await guardarValoracion(mapa[grp.dataset.id], v);
            });
          });
        });
      } catch(e){
        res.innerHTML = '<p class="vacio">Error al buscar en TMDB.<br>Revisa el token (TMDB_KEY) en config.js.</p>';
      }
    }

    document.getElementById('go').addEventListener('click', ejecutar);
    q.addEventListener('keydown', e => { if (e.key === 'Enter'){ e.preventDefault(); ejecutar(); } });
    setTimeout(() => q.focus(), 100);
  }

  async function guardarValoracion(m, puntuacion){
    try {
      let det = {};
      try { det = await TMDB.detalles(m.id); } catch(_) {}
      const generos     = (det.genres || []).map(g => g.name);
      const generos_ids = (det.genres || []).map(g => g.id);
      const keywords    = ((det.keywords && det.keywords.keywords) || []).map(k => k.name);

      const peli = {
        tmdb_id: m.id,
        titulo: m.title,
        titulo_original: m.original_title || null,
        anio: parseInt((m.release_date || '').slice(0, 4), 10) || null,
        generos, generos_ids, keywords,
        poster_path: m.poster_path || null,
        sinopsis: m.overview || null
      };
      const up1 = await sb.from('peliculas').upsert(peli, { onConflict: 'tmdb_id' });
      if (up1.error) throw up1.error;

      const up2 = await sb.from('valoraciones')
        .upsert({ usuario_id: usuarioActual.id, tmdb_id: m.id, puntuacion },
                { onConflict: 'usuario_id,tmdb_id' });
      if (up2.error) throw up2.error;

      toast(m.title + ' · ' + puntuacion + '★');
    } catch(e){
      toast('No se pudo guardar: ' + (e.message || e));
    }
  }

  cargarPerfiles();
})();
