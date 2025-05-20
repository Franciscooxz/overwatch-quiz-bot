// src/services/ScoreService.js
const path = require('path');
const { readJsonFile, writeJsonFile } = require('../utils/fileOperations');

class ScoreService {
  constructor() {
    this.scoresPath = path.join(__dirname, '../../data/quizPoints.json');
  }

  /**
   * Obtiene todas las puntuaciones
   * @returns {Promise<Object>} Objeto con las puntuaciones
   */
  async getAllScores() {
    return await readJsonFile(this.scoresPath, {});
  }

  /**
   * Obtiene la puntuación de un usuario específico
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} Puntuación del usuario
   */
  async getUserScore(userId) {
    const scores = await this.getAllScores();
    return scores[userId] || 0;
  }

  /**
   * Actualiza la puntuación de un usuario
   * @param {string} userId - ID del usuario
   * @param {number} points - Puntos a añadir
   * @returns {Promise<number>} Puntuación total después de actualizar
   */
  async updateScore(userId, points) {
    const scores = await this.getAllScores();
    
    if (!scores[userId]) {
      scores[userId] = points;
    } else {
      scores[userId] += points;
    }
    
    await this.#saveScores(scores);
    return scores[userId];
  }

  /**
   * Obtiene el ranking de puntuaciones
   * @param {number} limit - Límite de usuarios a mostrar
   * @returns {Promise<Array>} Array ordenado de puntuaciones
   */
  async getRanking(limit = 10) {
    const scores = await this.getAllScores();
    
    return Object.entries(scores)
      .map(([userId, points]) => ({ userId, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  /**
   * Guarda las puntuaciones en el archivo
   * @param {Object} scores - Objeto con las puntuaciones
   * @returns {Promise<void>}
   */
  async #saveScores(scores) {
    try {
      await writeJsonFile(this.scoresPath, scores);
    } catch (error) {
      console.error('Error al guardar puntuaciones:', error);
    }
  }
}

module.exports = new ScoreService();