// src/services/StatsService.js
// Gestiona las estadísticas detalladas del quiz:
//   - Total de preguntas respondidas y acertadas (precisión global y por categoría)
//   - Racha actual y mejor racha personal
//   - Timestamp de la última respuesta (para futura limitación de velocidad)
//
// Los datos se guardan en data/quizStats.json de forma independiente a
// quizPoints.json (puntuación), manteniendo retrocompatibilidad total.

const path = require('path');
const { readJsonFile, writeJsonFile } = require('../utils/fileOperations');

class StatsService {
  constructor() {
    this.statsPath = path.join(__dirname, '../../data/quizStats.json');
    // Mutex idéntico al de ScoreService — serializa escrituras concurrentes
    this._writeMutex = Promise.resolve();
  }

  // ─────────────────────────────────────────────────────────
  // Mutex interno
  // ─────────────────────────────────────────────────────────

  _withWriteMutex(fn) {
    this._writeMutex = this._writeMutex
      .then(() => fn())
      .catch(err => {
        console.error('[StatsService] Error en operación de escritura:', err);
        throw err;
      });
    return this._writeMutex;
  }

  // ─────────────────────────────────────────────────────────
  // Estructura de datos por defecto
  // ─────────────────────────────────────────────────────────

  /**
   * Objeto vacío de estadísticas para un usuario nuevo.
   * @returns {Object}
   */
  _defaultStats() {
    return {
      totalAnswered:  0,   // Total de preguntas respondidas (correctas + incorrectas)
      totalCorrect:   0,   // Total de respuestas correctas
      currentStreak:  0,   // Racha de aciertos consecutivos actual
      bestStreak:     0,   // Mejor racha conseguida alguna vez
      byCategory:     {},  // { [categoría]: { total: N, correct: N } }
      lastPlayed:     null // ISO string del último momento que respondió
    };
  }

  // ─────────────────────────────────────────────────────────
  // Lectura
  // ─────────────────────────────────────────────────────────

  /**
   * Devuelve el mapa completo de stats (userId → statsObj).
   * @returns {Promise<Object>}
   */
  async getAllStats() {
    return await readJsonFile(this.statsPath, {});
  }

  /**
   * Devuelve las estadísticas de un usuario específico.
   * Si no tiene historial, devuelve los valores por defecto.
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getUserStats(userId) {
    if (!userId || typeof userId !== 'string') return this._defaultStats();
    const stats = await this.getAllStats();
    // Merge con defaults por si existen campos nuevos no persistidos aún
    return stats[userId]
      ? { ...this._defaultStats(), ...stats[userId] }
      : this._defaultStats();
  }

  /**
   * Devuelve el top de jugadores ordenado por mejor racha.
   * @param {number} limit
   * @returns {Promise<Array<{userId, bestStreak, currentStreak}>>}
   */
  async getTopStreaks(limit = 10) {
    const stats = await this.getAllStats();
    return Object.entries(stats)
      .map(([userId, s]) => ({
        userId,
        bestStreak:    s.bestStreak    || 0,
        currentStreak: s.currentStreak || 0
      }))
      .sort((a, b) => b.bestStreak - a.bestStreak)
      .slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────
  // Escritura (serializada por mutex)
  // ─────────────────────────────────────────────────────────

  /**
   * Registra el resultado de una respuesta y actualiza las estadísticas.
   * Devuelve el objeto de stats actualizado del usuario.
   *
   * @param {string}  userId    - ID del usuario de Discord
   * @param {string}  category  - Categoría de la pregunta (ej. "Héroes")
   * @param {boolean} isCorrect - Si respondió correctamente
   * @returns {Promise<Object>} Stats actualizadas del usuario
   */
  async recordAnswer(userId, category, isCorrect) {
    if (!userId || typeof userId !== 'string') return this._defaultStats();

    return this._withWriteMutex(async () => {
      const stats = await this.getAllStats();

      // Inicializar si es la primera vez que juega
      if (!stats[userId]) stats[userId] = this._defaultStats();

      const s = stats[userId];

      // ── Contadores globales ──────────────────────────────
      s.totalAnswered = (s.totalAnswered || 0) + 1;
      s.lastPlayed = new Date().toISOString();

      // ── Contadores por categoría ─────────────────────────
      if (!s.byCategory) s.byCategory = {};
      if (!s.byCategory[category]) s.byCategory[category] = { total: 0, correct: 0 };
      s.byCategory[category].total++;

      // ── Racha y precisión ────────────────────────────────
      if (isCorrect) {
        s.totalCorrect   = (s.totalCorrect   || 0) + 1;
        s.currentStreak  = (s.currentStreak  || 0) + 1;
        s.byCategory[category].correct++;

        // Actualizar mejor racha si la actual la supera
        if (s.currentStreak > (s.bestStreak || 0)) {
          s.bestStreak = s.currentStreak;
        }
      } else {
        // Respuesta incorrecta: rompe la racha
        s.currentStreak = 0;
      }

      await writeJsonFile(this.statsPath, stats);
      return { ...s };
    });
  }
}

module.exports = new StatsService();
