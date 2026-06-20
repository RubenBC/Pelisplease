# RubenceCine — Registro de cambios

App de recomendaciones de cine tipo juego: puntúas pelis, una IA (Gemini) te
recomienda según tus gustos, con datos y carátulas de TMDB. Perfiles tipo
Netflix sobre Supabase.

> Cómo usar este archivo: cada vez que cambies algo, añade una entrada nueva
> ARRIBA del todo con su número de versión. Recuerda que la versión también se
> sube en `config.js` (VERSION) y en las rutas `?v=` de `index.html` para
> refrescar la caché.

---

## v1.4 — Ficha de la peli + Dónde verla
- Tocar una carátula o título abre la ficha de la película: póster grande, año,
  duración, géneros, sinopsis (en español) y botón de tráiler (YouTube).
- Sección "Dónde verla en España": plataformas de streaming, alquiler o compra
  (datos de TMDB + JustWatch), con enlace a JustWatch.
- Archivos: `app.js`, `tmdb.js`, `styles.css`, `index.html`, `config.js`.

## v1.3 — Recomendaciones que no se cortan
- El proceso de recomendar ya no se interrumpe al cambiar de pestaña o salir a
  otra app: el estado se guarda en memoria y se ve al volver a "Descubrir".
- El botón muestra "✨ Pensando…" y se bloquea mientras trabaja.
- Las recomendaciones gestionadas (guardar / por ver / puntuar) desaparecen y el
  resto permanece aunque cambies de pestaña.
- Archivos: `app.js`, `index.html`.

## v1.2 — Mitigación de errores 429 (opcional, no desplegada)
- Edge Function: cambio de modelo a `gemini-2.5-flash-lite` (límites gratuitos
  más altos) y reintento automático si Gemini responde 429.
- App: mensaje claro ante 429 y botón bloqueado mientras piensa.
- (No aplicada al quedar un único usuario; disponible por si se reactiva.)

## v1.1 — Edición de perfil segura
- La edición de perfiles sale del selector y pasa a estar dentro de la cuenta
  (menú ⋮): un perfil con PIN solo lo edita quien entra con su PIN.
- Menú ⋮ con: Editar mi perfil · ¿Cómo funciona? · Cambiar de perfil.
- Archivos: `app.js`, `styles.css`, `config.js`, `index.html`.

## v1.0 — Perfiles avanzados
- Avatares con temática cinéfila (🎬 🍿 👽 👻 🤖 🐉 🕵️ 🦸 🎭…), además del color.
- Editar perfil: nombre, avatar, color y PIN (poner/cambiar/quitar) y eliminar.
  Válido para todos los perfiles, incluido Rubén.
- Mensaje de bienvenida al crear un perfil + botón de ayuda para releerlo.
- Base de datos: nueva columna `usuarios.avatar`.

## v0.9 — Rediseño de recomendaciones + "Por ver"
- Cada recomendación: botones Guardar y No la he visto, y estrellas abajo para
  puntuar si ya la viste.
- Cuarta pestaña "Por ver" (separada de Guardadas).
- Base de datos: nueva tabla `por_ver`.

## v0.8 — Puntuar opt-in (sustituida)
- Las estrellas se ocultaban tras "Ya la he visto". Reemplazado en v0.9.

## v0.7 — Mejoras de puntuación
- Las estrellas se rellenan en amarillo al puntuar (feedback visual).
- Botón "No me interesa" en recomendaciones (descartar para no repetir).
- Base de datos: nueva tabla `descartadas`.

## v0.6 — Conexión con la IA corregida
- Corregida la URL de la Edge Function (el identificador real era
  `swift-worker`, no `recomendar`).

## v0.5 — Recomendaciones con IA (Gemini)
- Edge Function en Supabase que llama a Gemini protegiendo la clave en un secreto
  del servidor.
- Pestañas: Descubrir · Mis pelis · Guardadas.
- Las sugerencias de la IA se casan con TMDB para mostrar carátula y verificar
  que existen; se pueden puntuar o guardar.
- Archivo nuevo: Edge Function `recomendar` (`index.ts`).

## v0.4 — Catálogo TMDB
- Buscar películas en TMDB y puntuarlas con estrellas; tarjetas con carátula.
- Datos (géneros, keywords) cacheados en Supabase para construir el perfil.
- Archivo nuevo: `tmdb.js`.

## v0.3 — Corrección del arranque
- Arreglado el aviso "Falta configurar Supabase" que salía siempre: la
  comprobación usaba `window.CONFIG` y debía usar `typeof CONFIG`.

## v0.2 — Cache-busting
- Subida de versión en las rutas `?v=` para forzar recarga en el móvil.

## v0.1 — Cimientos
- Selector de perfiles tipo Netflix con avatares (iniciales), colores y PIN
  opcional, sobre Supabase (modelo multiusuario sin login real).
- Estructura PWA: `index.html`, `config.js`, `styles.css`, `app.js`.
- Base de datos inicial: tablas `usuarios`, `peliculas`, `valoraciones`,
  `guardadas`.

---

## Arquitectura (referencia rápida)
- **Frontend:** PWA en GitHub Pages (HTML/CSS/JS, sin frameworks).
- **Base de datos y backend:** Supabase (tablas + Edge Function `swift-worker`).
- **Catálogo de cine:** TMDB (token v4) — datos, carátulas y disponibilidad
  (JustWatch).
- **IA de recomendaciones:** Google Gemini (vía Edge Function, clave en secreto
  `GEMINI_API_KEY`).
- **Tablas:** usuarios, peliculas, valoraciones, guardadas, por_ver, descartadas.
