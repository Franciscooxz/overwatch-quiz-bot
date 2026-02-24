const path = require('path');
const WorkshopCode = require('../models/WorkshopCode');
const { readJsonFile, writeJsonFile } = require('../utils/fileOperations');

class WorkshopCodeService {
  constructor() {
    this.dataPath = path.join(__dirname, '../../data/workshopData.json');
    this.codes = [];
    this.nextId = 1;
    // Guardamos la promesa de carga para que los métodos puedan esperarla
    this._ready = this._loadCodes();
    // Mutex: cadena de promesas que serializa todas las escrituras a disco
    // evitando que dos operaciones concurrentes sobreescriban datos
    this._writeMutex = Promise.resolve();
  }

  async _loadCodes() {
    try {
      const jsonData = await readJsonFile(this.dataPath, { workshopCodes: [] });
      this.codes = (jsonData.workshopCodes || []).map(code => new WorkshopCode(code));
      this.nextId = this._getNextId();
    } catch (error) {
      console.error('Error al cargar los códigos de workshop:', error);
      this.codes = [];
      this.nextId = 1;
    }
  }

  /**
   * Ejecuta una función de escritura dentro del mutex para evitar race conditions.
   * Cada llamada espera a que la anterior termine antes de ejecutarse.
   * @param {Function} fn - Función async a ejecutar en exclusividad
   * @returns {Promise<any>} Resultado de fn
   */
  _withWriteMutex(fn) {
    this._writeMutex = this._writeMutex
      .then(() => fn())
      .catch(err => {
        console.error('[WorkshopCodeService] Error en operación de escritura:', err);
        throw err;
      });
    return this._writeMutex;
  }

  async _saveCodes() {
    return this._withWriteMutex(async () => {
      try {
        await writeJsonFile(this.dataPath, { workshopCodes: this.codes });
        return true;
      } catch (error) {
        console.error('Error al guardar los códigos de workshop:', error);
        return false;
      }
    });
  }

  _getNextId() {
    return this.codes.length > 0
      ? Math.max(...this.codes.map(code => code.id)) + 1
      : 1;
  }

  async getAllCodes() {
    await this._ready;
    return this.codes;
  }

  async getCodeById(id) {
    await this._ready;
    return this.codes.find(code => code.id === id);
  }

  async getCodeByCode(workshopCode) {
    await this._ready;
    return this.codes.find(code =>
      code.code.toLowerCase() === workshopCode.toLowerCase()
    );
  }

  async searchCodes(term) {
    await this._ready;
    if (!term) return [];
    term = term.toLowerCase();
    return this.codes.filter(code =>
      code.title.toLowerCase().includes(term) ||
      code.description.toLowerCase().includes(term) ||
      code.code.toLowerCase().includes(term) ||
      code.tags.some(tag => tag.toLowerCase().includes(term))
    );
  }

  async getCodesByCategory(category) {
    await this._ready;
    if (!category) return [];
    category = category.toLowerCase();
    return this.codes.filter(code =>
      code.category.toLowerCase() === category ||
      code.subcategory.toLowerCase() === category
    );
  }

  async getCodesByHero(hero) {
    await this._ready;
    if (!hero) return [];
    hero = hero.toLowerCase();
    return this.codes.filter(code =>
      code.heroes.some(h => h.toLowerCase() === hero || h === 'All')
    );
  }

  async getPopularCodes(limit = 10) {
    await this._ready;
    return [...this.codes]
      .sort((a, b) => b.popularity - a.popularity)
      .slice(0, limit);
  }

  async getNewestCodes(limit = 10) {
    await this._ready;
    return [...this.codes]
      .sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded))
      .slice(0, limit);
  }

  async getTopRatedCodes(limit = 10) {
    await this._ready;
    return [...this.codes]
      .filter(code => code.ratings.count >= 3)
      .sort((a, b) => b.ratings.average - a.ratings.average)
      .slice(0, limit);
  }

  async addCode(codeData, submittedById) {
    await this._ready;

    if (await this.getCodeByCode(codeData.code)) {
      return { success: false, message: 'Este código ya existe en la base de datos.' };
    }

    const newCode = new WorkshopCode({
      id: this.nextId,
      ...codeData,
      submittedBy: submittedById,
      dateAdded: new Date().toISOString().split('T')[0],
      lastUpdated: new Date().toISOString().split('T')[0]
    });

    this.codes.push(newCode);
    this.nextId++;

    const saveResult = await this._saveCodes();

    return {
      success: saveResult,
      message: saveResult ? 'Código añadido correctamente.' : 'Error al guardar el código.',
      code: newCode
    };
  }

  async rateCode(workshopCode, rating, userId) {
    await this._ready;

    const code = await this.getCodeByCode(workshopCode);
    if (!code) {
      return { success: false, message: 'Código no encontrado.' };
    }

    rating = Math.max(1, Math.min(5, parseInt(rating)));
    code.addRating(rating);

    const saveResult = await this._saveCodes();

    return {
      success: saveResult,
      message: saveResult ? 'Valoración añadida correctamente.' : 'Error al guardar la valoración.',
      newRating: code.ratings.average,
      totalRatings: code.ratings.count
    };
  }

  async updatePopularity(workshopCode) {
    await this._ready;
    const code = await this.getCodeByCode(workshopCode);
    if (code) {
      code.popularity += 1;
      await this._saveCodes();
    }
  }
}

// Singleton — una sola instancia comparte estado y caché en todo el bot.
// Evita cargar el archivo múltiples veces y garantiza consistencia del nextId.
module.exports = new WorkshopCodeService();
