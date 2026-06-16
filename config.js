/* =====================================================================
   RubenceCine — Configuración
   EDITA SOLO ESTE ARCHIVO con tus datos. El resto no hace falta tocarlo.
   ===================================================================== */
const CONFIG = {
  VERSION: 'v0.7',

  // --- Supabase ---------------------------------------------------------
  SUPABASE_URL: 'https://gucyvkcsbwxprbfdcfha.supabase.co',
  SUPABASE_ANON_KEY: 'sb_publishable_t32NKHn4L03LjMuyvGIXfQ_QJv5PGu5',

  // --- TMDB (token de lectura v4, Bearer) -------------------------------
  TMDB_KEY: 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiIzZDIxYTllN2QyYjViYjM3YzQ4Mzg3ZjAwZjQxYjhhMiIsIm5iZiI6MTc4MTU1NTcyNi45MDMsInN1YiI6IjZhMzA2MjBlNjIxZjBlNWUwY2Q0YzIzOCIsInNjb3BlcyI6WyJhcGlfcmVhZCJdLCJ2ZXJzaW9uIjoxfQ.6Hrssu1zsK3jge4eE2bPO8R424Bq1DxWuvcYB5pk4dc',

  // --- Edge Function de Gemini ------------------------------------------
  // OJO: el identificador real de la función es "swift-worker" (lo asignó Supabase).
  EDGE_FUNCTION_URL: 'https://gucyvkcsbwxprbfdcfha.supabase.co/functions/v1/swift-worker'
};
