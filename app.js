/* =====================================================================
   RubenceCine — app.js  (v0.1)
   Paso 2: selector de perfiles tipo Netflix + conexión con Supabase.
   (Sin TMDB ni Gemini todavía.)
   ===================================================================== */
(function () {
  'use strict';

  const app = document.getElementById('app');

  // --- Comprobación de configuración ------------------------------------
  if (!window.CONFIG || CONFIG.SUPABASE_URL.startsWith('PEGA_')) {
    app.innerHTML =
      '<div class="aviso">Falta configurar Supabase.<br>' +
      'Abre <b>config.js</b> y pega tu <b>Project URL</b> y tu <b>anon key</b>.</div>';
    return;
  }

  const sb = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

  // Paleta para los avatares (coincide con la del modal de crear perfil)
  const COLORES = ['#F5B14C','#6CA0F0','#E06CC0','#5FD0A8','#A06CF0','#F0686B','#E8C84A','#5FC7D0'];

  let perfiles = [];

  // --- Utilidades --------------------------------------------------------
  function iniciales(nombre){
    const p = nombre.trim().split(/\s+/);
    return (((p[0]||'')[0]||'') + ((p[1]||'')[0]||'')).toUpperCase() || '?';
  }
  function texto(el){ return (el && el.textContent || '').trim(); }
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

  // --- Carga y render de perfiles ---------------------------------------
  async function cargarPerfiles(){
    app.innerHTML = '<div class="cargando">Cargando…</div>';
    const { data, error } = await sb.from('usuarios').select('*').order('creado_en', { ascending: true });
    if (error){
      app.innerHTML = '<div class="aviso">No se pudo conectar con Supabase.<br>' + error.message + '</div>';
      return;
    }
    perfiles = data || [];

    // ¿Auto-entrar con el último perfil usado en este dispositivo? (solo si no tiene PIN)
    const ultimo = localStorage.getItem('rc_perfil');
    const u = perfiles.find(p => p.id === ultimo);
    if (u && !u.pin){ entrar(u); return; }

    renderSelector();
  }

  function renderSelector(){
    const tiles = perfiles.map(p => `
      <button class="perfil" data-id="${p.id}">
        <span class="avatar" style="--c:${p.color}">${iniciales(p.nombre)}</span>
        <span class="perfil-nombre">${p.nombre}${p.pin ? ' <span class="lock">🔒</span>' : ''}</span>
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

  // --- Crear perfil ------------------------------------------------------
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

      cerrarModal();
      perfiles.push(data);
      renderSelector();
      toast('Perfil creado');
    });
  }

  // --- Pedir PIN ---------------------------------------------------------
  function pedirPin(p){
    modal(`
      <h2>Hola, ${p.nombre}</h2>
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

  // --- Entrar a la app (de momento, pantalla placeholder) ----------------
  function entrar(p){
    localStorage.setItem('rc_perfil', p.id);
    app.innerHTML = `
      <section class="home">
        <header class="home-top">
          <span class="avatar sm" style="--c:${p.color}">${iniciales(p.nombre)}</span>
          <div><p class="hola">Hola,</p><h2>${p.nombre}</h2></div>
          <button class="btn ghost peque" id="cambiar">Cambiar</button>
        </header>
        <div class="placeholder">
          <p>Aquí aparecerán tus recomendaciones.</p>
          <p class="tenue">Siguiente paso: conectar TMDB y puntuar tus primeras películas.</p>
        </div>
        <footer class="pie">${CONFIG.VERSION}</footer>
      </section>`;
    document.getElementById('cambiar').addEventListener('click', () => {
      localStorage.removeItem('rc_perfil');
      renderSelector();
    });
  }

  cargarPerfiles();
})();
