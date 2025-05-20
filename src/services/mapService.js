const fs = require('fs');
const path = require('path');
const Map = require('../models/Map');

class MapService {
  constructor() {
    this.mapsPath = path.join(__dirname, '../../data/mapData.json');
    this.maps = this._loadMaps();
  }

  _loadMaps() {
    try {
      const data = fs.readFileSync(this.mapsPath, 'utf8');
      const mapsData = JSON.parse(data);
      return mapsData.map(mapData => new Map(mapData));
    } catch (error) {
      console.error('Error al cargar los mapas:', error);
      return [];
    }
  }

  getAllMaps() {
    return this.maps;
  }

  getMapById(id) {
    return this.maps.find(map => map.id === id);
  }

  getMapsByType(type) {
    return Map.filterByType(this.maps, type);
  }

  getMapsByDifficulty(difficulty) {
    return Map.filterByDifficulty(this.maps, difficulty);
  }

  getMapsByBestHero(heroName) {
    return Map.filterByBestHero(this.maps, heroName);
  }

  getMapsByLocation(location) {
    return Map.filterByLocation(this.maps, location);
  }

  // Obtener mapas por año de lanzamiento
  getMapsByReleaseYear(year) {
    return this.maps.filter(map => 
      map.releaseDate && map.releaseDate.startsWith(year)
    );
  }

  // Obtener los mapas más recientes (último año)
  getRecentMaps() {
    const currentYear = new Date().getFullYear();
    return this.getMapsByReleaseYear(currentYear.toString());
  }

  // Método para obtener todos los tipos de mapas únicos
  getMapTypes() {
    const types = new Set();
    this.maps.forEach(map => types.add(map.type));
    return Array.from(types);
  }

  // Método para obtener todos los niveles de dificultad únicos
  getDifficultyLevels() {
    const difficulties = new Set();
    this.maps.forEach(map => difficulties.add(map.difficulty));
    return Array.from(difficulties);
  }
}

module.exports = MapService;