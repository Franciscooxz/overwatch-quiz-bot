// src/models/QuizManager.js
const path = require('path');
const { readJsonFile } = require('../utils/fileOperations');
const scoreService = require('../services/ScoreService');
const { DIFFICULTY_POINTS, CATEGORIES } = require('../config/quizConfig');

class QuizManager {
  constructor() {
    this.quizDataPath = path.join(__dirname, '../../data/quizData.json');
    this.quizData = null;
    this.loadQuizData();
  }

  /**
   * Carga los datos del quiz desde el archivo JSON
   */
  async loadQuizData() {
    try {
      this.quizData = await readJsonFile(this.quizDataPath);
      console.log('✅ Datos del quiz cargados correctamente');
    } catch (error) {
      console.error('❌ Error al cargar datos del quiz:', error);
      // Datos por defecto mínimos en caso de error
      this.quizData = {
        categorias: CATEGORIES,
        dificultades: DIFFICULTY_POINTS,
        preguntas: []
      };
    }
  }

  /**
   * Obtiene las categorías disponibles
   * @returns {Array} Lista de categorías
   */
  getCategorias() {
    return this.quizData?.categorias || CATEGORIES;
  }

  /**
   * Obtiene los puntos según la dificultad
   * @param {string} difficulty - Dificultad de la pregunta
   * @returns {number} Puntos
   */
  getDifficultyPoints(difficulty) {
    return DIFFICULTY_POINTS[difficulty.toLowerCase()] || 1;
  }

  /**
   * Obtiene una pregunta aleatoria según filtros
   * @param {string} category - Categoría de la pregunta (opcional)
   * @param {string} difficulty - Dificultad de la pregunta (opcional)
   * @returns {Object|null} Pregunta aleatoria o null si no hay coincidencias
   */
  getRandomQuestion(category, difficulty) {
    if (!this.quizData || !this.quizData.preguntas || this.quizData.preguntas.length === 0) {
      return null;
    }
    
    let filteredQuestions = [...this.quizData.preguntas];
    
    if (category) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.categoria.toLowerCase() === category.toLowerCase()
      );
    }
    
    if (difficulty) {
      filteredQuestions = filteredQuestions.filter(q => 
        q.dificultad.toLowerCase() === difficulty.toLowerCase()
      );
    }
    
    if (filteredQuestions.length === 0) {
      return null;
    }
    
    return filteredQuestions[Math.floor(Math.random() * filteredQuestions.length)];
  }

  /**
   * Verifica si la respuesta es correcta
   * @param {Object} question - Pregunta completa
   * @param {number} selectedIndex - Índice seleccionado por el usuario
   * @returns {boolean} Si la respuesta es correcta
   */
  isCorrectAnswer(question, selectedIndex) {
    return selectedIndex === question.respuestaCorrecta;
  }

  /**
   * Procesa la respuesta de un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} question - Pregunta respondida
   * @param {number} selectedIndex - Índice seleccionado
   * @returns {Promise<Object>} Resultado de la respuesta
   */
  async processAnswer(userId, question, selectedIndex) {
    const isCorrect = this.isCorrectAnswer(question, selectedIndex);
    let updatedScore = 0;
    
    if (isCorrect) {
      const points = this.getDifficultyPoints(question.dificultad);
      updatedScore = await scoreService.updateScore(userId, points);
    }
    
    return {
      isCorrect,
      correctAnswerIndex: question.respuestaCorrecta,
      correctAnswer: question.opciones[question.respuestaCorrecta],
      points: isCorrect ? this.getDifficultyPoints(question.dificultad) : 0,
      totalScore: updatedScore
    };
  }

  /**
   * Recarga los datos del quiz
   * @returns {Promise<boolean>} Si se cargaron correctamente
   */
  async reloadQuizData() {
    try {
      await this.loadQuizData();
      return true;
    } catch (error) {
      console.error('Error al recargar datos del quiz:', error);
      return false;
    }
  }
}

module.exports = new QuizManager();