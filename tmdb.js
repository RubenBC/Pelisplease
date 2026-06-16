/* =====================================================================
   RubenceCine — tmdb.js  (v0.5)
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
    async buscar(query) {
      const d = await pedir('/search/movie', { query, include_adult: 'false', page: '1' });
      return (d.results || []).filter(m => m.poster_path);
    },
    // Mejor coincidencia para un título (usa el año si se conoce)
    async buscarUna(titulo, anio) {
      const res = await this.buscar(titulo);
      if (!res.length) return null;
      if (anio) {
        const m = res.find(r => (r.release_date || '').slice(0, 4) === String(anio));
        if (m) return m;
      }
      return res[0];
    },
    async detalles(id) {
      return pedir('/movie/' + id, { append_to_response: 'keywords' });
    },
    poster(path, size = 'w342') {
      return path ? IMG + size + path : null;
    }
  };
})();
