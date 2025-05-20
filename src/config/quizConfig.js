// src/config/quizConfig.js
module.exports = {
  // Puntos según dificultad
  DIFFICULTY_POINTS: {
    'fácil': 1,
    'media': 2,
    'difícil': 3,
    'experto': 5
  },
  // Tiempo de respuesta en milisegundos (15 segundos)
  ANSWER_TIMEOUT: 15000,
  // Máximo de jugadores en el ranking
  MAX_RANKING_PLAYERS: 10,
  // Categorías de preguntas
  CATEGORIES: [
    'Héroes', 
    'Mapas', 
    'Habilidades', 
    'Historia', 
    'Competitivo', 
    'Actualizaciones'
  ],
  // Roles para categorizar héroes
  ROLES: [
    'Tanque',
    'Daño',
    'Apoyo'
  ]
};