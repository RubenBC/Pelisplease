/* =====================================================================
   RubenceCine — tmdb.js  (v0.4)
   Acceso a The Movie Database (TMDB). Solo lectura.
   ===================================================================== */
const TMDB = (() => {
  const BASE = 'https://api.themoviedb.org/3';
  const IMG  = 'https://image.tmdb.org/t/p/';
  const headers = {
    accept: 'application/json',
    Authorization: 'Bearer ' + CONFIG.TMDB_KEY
  };

  async function pedir(path, params = {}) {
    const url = new URL(BASE + path);
    url.searchParams.set('language', 'es-ES');
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    const r = await fetch(url.toString(), { headers });
    if (!r.ok) throw new Error('TMDB ' + r.status);
    return r.json();
  }

  return {
    // Buscar películas por texto (solo las que tienen carátula)
    async buscar(query) {
      const d = await pedir('/search/movie', { query, include_adult: 'false', page: '1' });
      return (d.results || []).filter(m => m.poster_path);
    },
    // Detalles + palabras clave de una peli
    async detalles(id) {
      return pedir('/movie/' + id, { append_to_response: 'keywords' });
    },
    // URL de la carátula (size: w185, w342, w500…)
    poster(path, size = 'w342') {
      return path ? IMG + size + path : null;
    }
  };
})();
