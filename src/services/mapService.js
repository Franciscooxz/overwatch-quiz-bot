// src/services/mapService.js
// Carga los mapas combinando la OverFast API (fuente primaria, datos oficiales y screenshots)
// con el archivo JSON local (enriquecimiento: bestHeroes, worstHeroes, difficulty, description…)
// Si la API no está disponible, usa el JSON local como fallback completo.

const path = require('path');
const MapModel = require('../models/Map');
const { readJsonFile } = require('../utils/fileOperations');
const overwatchApi = require('./overwatchApiService');

// Mapeo de gamemode de la API → tipo de mapa en español (usado en los embeds)
const GAMEMODE_TO_TYPE = {
  control:      'Control',
  escort:       'Escolta',
  hybrid:       'Híbrido',
  push:         'Empuje',
  clash:        'Clash',
  flashpoint:   'Flashpoint',
  stadium:      'Estadio',
  deathmatch:   'Duelo',
  team_deathmatch: 'Duelo por equipos'
};

class MapService {
  constructor() {
    this.mapsPath = path.join(__dirname, '../../data/mapData.json');
    this.maps = [];
    // Guardamos la promesa de carga para que los métodos puedan esperarla
    this._ready = this._loadMaps();
  }

  /**
   * Carga los mapas combinando API + JSON local.
   * Estrategia:
   *   1. Cargar JSON local (siempre — necesario para datos de enriquecimiento)
   *   2. Intentar la API (lista oficial + screenshots)
   *   3. Merging: para cada mapa de la API, buscar su gemelo local y mezclar datos
   *   4. Si la API falla → usar solo datos locales
   */
  async _loadMaps() {
    // ── Paso 1: datos locales ──────────────────────────────
    let localMaps = [];
    try {
      const mapsData = await readJsonFile(this.mapsPath, []);
      localMaps = Array.isArray(mapsData) ? mapsData : [];
      console.log(`[MapService] ${localMaps.length} mapas cargados desde datos locales.`);
    } catch (error) {
      console.error('[MapService] Error al cargar datos locales de mapas:', error);
    }

    // ── Paso 2: intentar API ───────────────────────────────
    try {
      const apiMaps = await overwatchApi.getMaps();

      if (apiMaps && apiMaps.length > 0) {
        // ── Paso 3: merge ──────────────────────────────────
        this.maps = apiMaps.map((apiMap, index) => {
          // Buscar datos locales por nombre (coincidencia exacta, luego parcial)
          const localData = localMaps.find(l =>
            l.name && l.name.toLowerCase() === apiMap.name.toLowerCase()
          ) || localMaps.find(l =>
            l.name && apiMap.name.toLowerCase().includes(l.name.toLowerCase())
          );

          // Determinar el tipo a partir de los gamemodes de la API
          let type = localData?.type || 'Desconocido';
          if (apiMap.gamemodes && apiMap.gamemodes.length > 0) {
            const apiType = GAMEMODE_TO_TYPE[apiMap.gamemodes[0]];
            if (apiType) type = apiType;
          }

          return new MapModel({
            id:             localData?.id   || (index + 1),
            name:           apiMap.name,
            type,
            // La API tiene location en formato "Ciudad, País" — preferimos ese
            location:       apiMap.location || localData?.location || 'Desconocido',
            description:    localData?.description    || '',
            bestHeroes:     localData?.bestHeroes     || [],
            worstHeroes:    localData?.worstHeroes    || [],
            difficulty:     localData?.difficulty     || 'Media',
            releaseDate:    localData?.releaseDate    || null,
            additionalInfo: localData?.additionalInfo || '',
            // Screenshot oficial de la API tiene prioridad sobre el del JSON
            imageUrl:       apiMap.screenshot || localData?.imageUrl || null
          });
        });

        console.log(`[MapService] ${this.maps.length} mapas cargados combinando API + datos locales.`);
        return; // Salimos sin llegar al fallback
      }
    } catch (error) {
      console.error('[MapService] Error al cargar mapas desde la API:', error);
    }

    // ── Paso 4: fallback — solo datos locales ──────────────
    console.warn('[MapService] Usando datos locales como fallback (API no disponible).');
    this.maps = localMaps.map(mapData => new MapModel(mapData));
  }

  // ─────────────────────────────────────────────────────────
  // Métodos públicos de consulta
  // ─────────────────────────────────────────────────────────

  async getAllMaps() {
    await this._ready;
    return this.maps;
  }

  async getMapById(id) {
    await this._ready;
    return this.maps.find(map => map.id === id);
  }

  async getMapsByType(type) {
    await this._ready;
    return MapModel.filterByType(this.maps, type);
  }

  async getMapsByDifficulty(difficulty) {
    await this._ready;
    return MapModel.filterByDifficulty(this.maps, difficulty);
  }

  async getMapsByBestHero(heroName) {
    await this._ready;
    return MapModel.filterByBestHero(this.maps, heroName);
  }

  async getMapsByLocation(location) {
    await this._ready;
    return MapModel.filterByLocation(this.maps, location);
  }

  async getMapsByReleaseYear(year) {
    await this._ready;
    return this.maps.filter(map =>
      map.releaseDate && map.releaseDate.startsWith(year)
    );
  }

  async getRecentMaps() {
    const currentYear = new Date().getFullYear();
    return this.getMapsByReleaseYear(currentYear.toString());
  }

  async getMapTypes() {
    await this._ready;
    const types = new Set();
    this.maps.forEach(map => types.add(map.type));
    return Array.from(types);
  }

  async getDifficultyLevels() {
    await this._ready;
    const difficulties = new Set();
    this.maps.forEach(map => difficulties.add(map.difficulty));
    return Array.from(difficulties);
  }
}

// Singleton — una sola instancia carga los mapas una vez al arrancar
// y los mantiene en memoria para todas las consultas posteriores.
module.exports = new MapService();
