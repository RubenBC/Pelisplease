/* =====================================================================
   RubenceCine — tmdb.js  (v1.4)
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
    // Ficha completa: detalles + plataformas (España) + tráiler
    async ficha(id) {
      const d = await pedir('/movie/' + id, { append_to_response: 'watch/providers' });
      // Tráiler: intenta vídeos en español y, si no hay, en inglés
      let vids = [];
      try { const a = await pedir('/movie/' + id + '/videos'); vids = a.results || []; } catch (_) {}
      if (!vids.length) {
        try {
          const url = new URL(BASE + '/movie/' + id + '/videos');
          url.searchParams.set('language', 'en-US');
          const r = await fetch(url.toString(), { headers });
          const j = await r.json(); vids = j.results || [];
        } catch (_) {}
      }
      d.videos = { results: vids };
      return d;
    },
    poster(path, size = 'w342') {
      return path ? IMG + size + path : null;
    },
    providerLogo(path, size = 'w45') {
      return path ? IMG + size + path : null;
    }
  };
})();
