class WorkshopCode {
  constructor(data) {
    this.id = data.id;
    this.code = data.code;
    this.title = data.title;
    this.author = data.author || 'Desconocido';
    this.description = data.description || '';
    this.category = data.category || 'Otros';
    this.subcategory = data.subcategory || '';
    this.heroes = data.heroes || ['All'];
    this.difficulty = data.difficulty || 'Media';
    this.ratings = data.ratings || { average: 0, count: 0 };
    this.dateAdded = data.dateAdded || new Date().toISOString().split('T')[0];
    this.lastUpdated = data.lastUpdated || this.dateAdded;
    this.imageUrl = data.imageUrl || null;
    this.source = data.source || 'User Submitted';
    this.sourceUrl = data.sourceUrl || '';
    this.tags = data.tags || [];
    this.popularity = data.popularity || 0;
    this.submittedBy = data.submittedBy || null; // Discord user ID
  }

  // Método para añadir una calificación
  addRating(rating) {
    const currentTotal = this.ratings.average * this.ratings.count;
    this.ratings.count += 1;
    this.ratings.average = (currentTotal + rating) / this.ratings.count;
    this.lastUpdated = new Date().toISOString().split('T')[0];
  }

  // Método para formatear la descripción para Discord
  getFormattedDescription() {
    return this.description.length > 250 
      ? `${this.description.substring(0, 247)}...` 
      : this.description;
  }

  // Método para obtener tags formateados
  getFormattedTags() {
    return this.tags.map(tag => `#${tag}`).join(' ');
  }

  // Método para obtener héroes formateados
  getFormattedHeroes() {
    return this.heroes.join(', ');
  }
}

module.exports = WorkshopCode;