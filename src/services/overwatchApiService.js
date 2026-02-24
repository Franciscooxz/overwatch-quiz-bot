// src/services/overwatchApiService.js
// Servicio para consumir la OverFast API de Overwatch 2
// https://overfast-api.tekrop.fr/ — sin API key, sin paginación

const BASE_URL = 'https://overfast-api.tekrop.fr';
const LOCALE = 'es-ES'; // Idioma de los datos devueltos por la API
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 horas en milisegundos

class OverwatchApiService {
  constructor() {
    this._cache = {
      heroes: null,            // Array de héroes (lista completa)
      maps: null,              // Array de mapas (lista completa)
      heroDetails: new Map(),  // key (string) -> detalle completo del héroe
      lastUpdated: {
        heroes: 0,
        maps: 0
      }
    };

    // Calentar caché al arrancar
    this._ready = this._warmUp();

    // Refrescar automáticamente cada 6 horas sin bloquear el proceso
    const interval = setInterval(() => this._warmUp(), CACHE_TTL);
    if (interval.unref) interval.unref(); // No bloquear el cierre del proceso
  }

  // ─────────────────────────────────────────────────────────
  // Métodos privados
  // ─────────────────────────────────────────────────────────

  /**
   * Realiza una petición GET a la API con manejo de errores
   * @param {string} endpoint - Ruta del endpoint (ej. '/heroes')
   * @param {number} [timeout=10000] - Timeout en ms
   * @returns {Promise<any|null>} Datos JSON o null si hay error
   */
  async _fetch(endpoint, timeout = 10000) {
    // Añadir locale para obtener los datos en español
    const separator = endpoint.includes('?') ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}locale=${LOCALE}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'OverwatchQuizBot/1.0' }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.error(`[OverwatchAPI] HTTP ${response.status} en ${url}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error(`[OverwatchAPI] Timeout al contactar ${url}`);
      } else {
        console.error(`[OverwatchAPI] Error al contactar ${url}:`, error.message);
      }
      return null;
    }
  }

  /**
   * Calienta la caché cargando héroes y mapas en paralelo
   */
  async _warmUp() {
    console.log('[OverwatchAPI] Cargando datos desde la API...');
    await Promise.all([
      this._fetchHeroes(),
      this._fetchMaps()
    ]);
    console.log(`[OverwatchAPI] Caché lista — ${this._cache.heroes?.length ?? 0} héroes, ${this._cache.maps?.length ?? 0} mapas.`);
  }

  /**
   * Carga la lista completa de héroes en caché
   */
  async _fetchHeroes() {
    const data = await this._fetch('/heroes');
    if (data && Array.isArray(data)) {
      this._cache.heroes = data;
      this._cache.lastUpdated.heroes = Date.now();
    }
  }

  /**
   * Carga la lista completa de mapas en caché
   */
  async _fetchMaps() {
    const data = await this._fetch('/maps');
    if (data && Array.isArray(data)) {
      this._cache.maps = data;
      this._cache.lastUpdated.maps = Date.now();
    }
  }

  // ─────────────────────────────────────────────────────────
  // Métodos públicos — Héroes
  // ─────────────────────────────────────────────────────────

  /**
   * Devuelve la lista completa de héroes (resumen)
   * Cada objeto tiene: key, name, portrait, role, gamemodes
   * @returns {Promise<Array>}
   */
  async getHeroes() {
    await this._ready;
    return this._cache.heroes || [];
  }

  /**
   * Devuelve el detalle completo de un héroe por su key (ej. 'ana', 'soldier-76')
   * Incluye: name, description, role, location, birthday, age, portrait,
   *          hitpoints, abilities, story, backgrounds, stadium_powers
   * Los detalles se cachean individualmente para no repetir peticiones
   * @param {string} key - Clave del héroe
   * @returns {Promise<Object|null>}
   */
  async getHero(key) {
    if (!key) return null;

    // Si ya está en caché devolvemos directamente
    if (this._cache.heroDetails.has(key)) {
      return this._cache.heroDetails.get(key);
    }

    const data = await this._fetch(`/heroes/${encodeURIComponent(key)}`);
    if (data) {
      this._cache.heroDetails.set(key, data);
    }
    return data;
  }

  /**
   * Busca un héroe por nombre (case-insensitive) y devuelve su key
   * @param {string} name - Nombre del héroe
   * @returns {Promise<Object|null>} Objeto de la lista (con key, portrait, etc.)
   */
  async getHeroByName(name) {
    const heroes = await this.getHeroes();
    return heroes.find(h => h.name.toLowerCase() === name.toLowerCase()) || null;
  }

  /**
   * Devuelve la URL del portrait de un héroe por su nombre
   * Útil para enriquecer embeds del quiz con imágenes reales
   * @param {string} name - Nombre del héroe
   * @returns {Promise<string|null>} URL del portrait o null
   */
  async getHeroPortrait(name) {
    const hero = await this.getHeroByName(name);
    return hero?.portrait || null;
  }

  /**
   * Devuelve héroes filtrados por rol
   * @param {string} role - 'tank', 'damage' o 'support'
   * @returns {Promise<Array>}
   */
  async getHeroesByRole(role) {
    const heroes = await this.getHeroes();
    return heroes.filter(h => h.role === role.toLowerCase());
  }

  // ─────────────────────────────────────────────────────────
  // Métodos públicos — Mapas
  // ─────────────────────────────────────────────────────────

  /**
   * Devuelve la lista completa de mapas
   * Cada objeto tiene: key, name, screenshot, location, country_code, gamemodes
   * @returns {Promise<Array>}
   */
  async getMaps() {
    await this._ready;
    return this._cache.maps || [];
  }

  /**
   * Devuelve la URL del screenshot oficial de un mapa por su nombre
   * @param {string} name - Nombre del mapa
   * @returns {Promise<string|null>} URL del screenshot o null
   */
  async getMapScreenshot(name) {
    const maps = await this.getMaps();
    const map = maps.find(m => m.name.toLowerCase() === name.toLowerCase());
    return map?.screenshot || null;
  }

  // ─────────────────────────────────────────────────────────
  // Utilidades
  // ─────────────────────────────────────────────────────────

  /**
   * Indica si la caché está disponible y fresca
   * @returns {boolean}
   */
  isCacheReady() {
    return !!(this._cache.heroes && this._cache.maps);
  }

  /**
   * Devuelve información de estado de la caché (para depuración)
   * @returns {Object}
   */
  getCacheStatus() {
    return {
      heroes: {
        count: this._cache.heroes?.length ?? 0,
        lastUpdated: this._cache.lastUpdated.heroes
          ? new Date(this._cache.lastUpdated.heroes).toISOString()
          : 'never'
      },
      maps: {
        count: this._cache.maps?.length ?? 0,
        lastUpdated: this._cache.lastUpdated.maps
          ? new Date(this._cache.lastUpdated.maps).toISOString()
          : 'never'
      },
      heroDetailsCache: this._cache.heroDetails.size
    };
  }
}

// Singleton — una sola instancia comparte caché en todo el bot
module.exports = new OverwatchApiService();
