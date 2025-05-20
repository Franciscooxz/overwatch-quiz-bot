class Map {
  constructor(data) {
    this.id = data.id;
    this.name = data.name;
    this.type = data.type;
    this.location = data.location;
    this.description = data.description;
    this.bestHeroes = data.bestHeroes || [];
    this.worstHeroes = data.worstHeroes || [];
    this.difficulty = data.difficulty || "Media";
    this.releaseDate = data.releaseDate;
    this.additionalInfo = data.additionalInfo || "";
    this.imageUrl = data.imageUrl || null;
  }

  getBestHeroesString() {
    return this.bestHeroes.join(', ');
  }

  getWorstHeroesString() {
    return this.worstHeroes.join(', ');
  }

  // Método para obtener el año de lanzamiento
  getReleaseYear() {
    return this.releaseDate ? this.releaseDate.split('-')[0] : 'Desconocido';
  }

  // Método para formatear la fecha
  getFormattedReleaseDate() {
    if (!this.releaseDate) return 'Fecha desconocida';
    
    const [year, month, day] = this.releaseDate.split('-');
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${parseInt(day)} de ${monthNames[parseInt(month) - 1]} de ${year}`;
  }

  // Método para obtener mapas por tipo
  static filterByType(maps, type) {
    return maps.filter(map => map.type === type);
  }

  // Método para obtener mapas por dificultad
  static filterByDifficulty(maps, difficulty) {
    return maps.filter(map => map.difficulty === difficulty);
  }

  // Método para buscar mapas que incluyan a un héroe específico como mejor opción
  static filterByBestHero(maps, heroName) {
    return maps.filter(map => 
      map.bestHeroes.some(hero => hero.toLowerCase().includes(heroName.toLowerCase()))
    );
  }

  // Método para buscar mapas por ubicación
  static filterByLocation(maps, location) {
    return maps.filter(map => 
      map.location.toLowerCase().includes(location.toLowerCase())
    );
  }
}

module.exports = Map;