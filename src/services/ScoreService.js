// src/services/ScoreService.js
// Gestiona las puntuaciones del quiz con:
//   - Validación de entradas para evitar datos corruptos
//   - Mutex de escritura para evitar race conditions cuando varios
//     usuarios responden simultáneamente

const path = require('path');
const { readJsonFile, writeJsonFile } = require('../utils/fileOperations');

class ScoreService {
  constructor() {
    this.scoresPath = path.join(__dirname, '../../data/quizPoints.json');
    // Mutex: cadena de promesas que serializa todas las escrituras a disco.
    // Cuando dos usuarios responden al mismo tiempo, la segunda operación
    // espera a que la primera termine, evitando que se sobreescriban datos.
    this._writeMutex = Promise.resolve();
  }

  // ─────────────────────────────────────────────────────────
  // Mutex interno
  // ─────────────────────────────────────────────────────────

  /**
   * Ejecuta fn dentro del mutex (exclusión mutua secuencial).
   * @param {Function} fn - Función async a ejecutar en solitario
   * @returns {Promise<any>}
   */
  _withWriteMutex(fn) {
    this._writeMutex = this._writeMutex
      .then(() => fn())
      .catch(err => {
        console.error('[ScoreService] Error en operación de escritura:', err);
        throw err;
      });
    return this._writeMutex;
  }

  // ─────────────────────────────────────────────────────────
  // Lectura
  // ─────────────────────────────────────────────────────────

  /**
   * Obtiene todas las puntuaciones
   * @returns {Promise<Object>} Mapa userId → points
   */
  async getAllScores() {
    return await readJsonFile(this.scoresPath, {});
  }

  /**
   * Obtiene la puntuación de un usuario
   * @param {string} userId
   * @returns {Promise<number>}
   */
  async getUserScore(userId) {
    if (!userId || typeof userId !== 'string') return 0;
    const scores = await this.getAllScores();
    return scores[userId] || 0;
  }

  /**
   * Devuelve el ranking ordenado de mayor a menor puntuación
   * @param {number} limit - Máximo de usuarios a devolver
   * @returns {Promise<Array<{userId: string, points: number}>>}
   */
  async getRanking(limit = 10) {
    const scores = await this.getAllScores();
    return Object.entries(scores)
      .map(([userId, points]) => ({ userId, points }))
      .sort((a, b) => b.points - a.points)
      .slice(0, limit);
  }

  /**
   * Obtiene la posición (1-based) de un usuario en el ranking global
   * @param {string} userId
   * @returns {Promise<number>} Posición o 0 si no tiene puntuación
   */
  async getUserPosition(userId) {
    if (!userId || typeof userId !== 'string') return 0;
    const scores = await this.getAllScores();
    const sorted = Object.entries(scores)
      .sort(([, a], [, b]) => b - a);
    const idx = sorted.findIndex(([id]) => id === userId);
    return idx >= 0 ? idx + 1 : 0;
  }

  // ─────────────────────────────────────────────────────────
  // Escritura (serializada por mutex)
  // ─────────────────────────────────────────────────────────

  /**
   * Suma puntos a un usuario de forma segura (sin race conditions)
   * @param {string} userId - ID del usuario de Discord
   * @param {number} points - Puntos a sumar (debe ser > 0)
   * @returns {Promise<number>} Puntuación total actualizada
   */
  async updateScore(userId, points) {
    // ── Validación de entradas ──────────────────────────────
    if (!userId || typeof userId !== 'string') {
      console.error('[ScoreService] updateScore: userId inválido:', userId);
      return 0;
    }
    if (typeof points !== 'number' || isNaN(points) || points <= 0) {
      console.error('[ScoreService] updateScore: points inválido:', points);
      return await this.getUserScore(userId);
    }

    // ── Escritura serializada ──────────────────────────────
    return this._withWriteMutex(async () => {
      const scores = await this.getAllScores();
      scores[userId] = (scores[userId] || 0) + points;
      await this.#saveScores(scores);
      return scores[userId];
    });
  }

  // ─────────────────────────────────────────────────────────
  // Persistencia
  // ─────────────────────────────────────────────────────────

  /**
   * Escribe las puntuaciones en disco
   * @param {Object} scores
   */
  async #saveScores(scores) {
    try {
      await writeJsonFile(this.scoresPath, scores);
    } catch (error) {
      console.error('[ScoreService] Error al guardar puntuaciones:', error);
      throw error; // Re-lanzar para que el mutex lo capture
    }
  }
}

module.exports = new ScoreService();
