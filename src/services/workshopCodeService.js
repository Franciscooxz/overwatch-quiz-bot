const fs = require('fs');
const path = require('path');
const WorkshopCode = require('../models/WorkshopCode');

class WorkshopCodeService {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data/workshopData.json');
    this.codes = this._loadCodes();
    this.nextId = this._getNextId();
  }

  _loadCodes() {
    try {
      const data = fs.readFileSync(this.dataPath, 'utf8');
      const jsonData = JSON.parse(data);
      return jsonData.workshopCodes.map(code => new WorkshopCode(code));
    } catch (error) {
      console.error('Error al cargar los códigos de workshop:', error);
      return [];
    }
  }

  _saveCodes() {
    try {
      const data = {
        workshopCodes: this.codes
      };
      fs.writeFileSync(this.dataPath, JSON.stringify(data, null, 2), 'utf8');
      return true;
    } catch (error) {
      console.error('Error al guardar los códigos de workshop:', error);
      return false;
    }
  }

  _getNextId() {
    return this.codes.length > 0 
      ? Math.max(...this.codes.map(code => code.id)) + 1 
      : 1;
  }

  getAllCodes() {
    return this.codes;
  }

  getCodeById(id) {
    return this.codes.find(code => code.id === id);
  }

  getCodeByCode(workshopCode) {
    return this.codes.find(code => 
      code.code.toLowerCase() === workshopCode.toLowerCase()
    );
  }

  searchCodes(term) {
    if (!term) return [];
    term = term.toLowerCase();
    
    return this.codes.filter(code => 
      code.title.toLowerCase().includes(term) ||
      code.description.toLowerCase().includes(term) ||
      code.code.toLowerCase().includes(term) ||
      code.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  getCodesByCategory(category) {
    if (!category) return [];
    category = category.toLowerCase();
    
    return this.codes.filter(code => 
      code.category.toLowerCase() === category ||
      code.subcategory.toLowerCase() === category
    );
  }

  getCodesByHero(hero) {
    if (!hero) return [];
    hero = hero.toLowerCase();
    
    return this.codes.filter(code => 
      code.heroes.some(h => h.toLowerCase() === hero || h === 'All')
    );
  }

  getPopularCodes(limit = 10) {
    return [...this.codes]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  getNewestCodes(limit = 10) {
    return [...this.codes]
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      .slice(0, limit);
  }

  getTopRatedCodes(limit = 10) {
    return [...this.codes]
      .filter(code => code.ratings.count >= 3) // Al menos 3 valoraciones
      .sort((a, b) => b.ratings.average - a.ratings.average)
      .slice(0, limit);
  }

  addCode(codeData, submittedById) {
    // Verificar si el código ya existe
    if (this.getCodeByCode(codeData.code)) {
      return { success: false, message: 'Este código ya existe en la base de datos.' };
    }
    
    // Crear nuevo código
    const newCode = new WorkshopCode({
      id: this.nextId,
      ...codeData,
      submittedBy: submittedById,
      dateAdded: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    });
    
    // Añadir a la colección
    this.codes.push(newCode);
    this.nextId++;
    
    // Guardar cambios
    const saveResult = this._saveCodes();
    
    return { 
      success: saveResult, 
      message: saveResult ? 'Código añadido correctamente.' : 'Error al guardar el código.',
      code: newCode
    };
  }

  rateCode(workshopCode, rating, userId) {
    // Buscar el código
    const code = this.getCodeByCode(workshopCode);
    if (!code) {
      return { success: false, message: 'Código no encontrado.' };
    }
    
    // Asegurarse de que la valoración es válida (1-5)
    rating = Math.max(1, Math.min(5, parseInt(rating)));
    
    // Añadir valoración
    code.addRating(rating);
    
    // Guardar cambios
    const saveResult = this._saveCodes();
    
    return { 
      success: saveResult, 
      message: saveResult ? 'Valoración añadida correctamente.' : 'Error al guardar la valoración.',
      newRating: code.ratings.average,
      totalRatings: code.ratings.count
    };
  }

  updatePopularity(workshopCode) {
    const code = this.getCodeByCode(workshopCode);
    if (code) {
      code.popularity += 1;
      this._saveCodes();
    }
  }
}

module.exports = WorkshopCodeService;