// src/utils/embedBuilder.js
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/colors');

/**
 * Crea un embed base con opciones personalizadas
 * @param {Object} options - Opciones del embed
 * @returns {EmbedBuilder} Embed construido
 */
function createBaseEmbed(options = {}) {
  return new EmbedBuilder()
    .setColor(options.color || COLORS.PRIMARY)
    .setTitle(options.title || 'Overwatch 2 Quiz')
    .setDescription(options.description || '')
    .setTimestamp()
    .setFooter({ 
      text: options.footer || 'Overwatch 2 Quiz Bot', 
      iconURL: options.footerIcon 
    });
}

/**
 * Crea un embed para una pregunta del quiz
 * @param {Object} question - Pregunta del quiz
 * @returns {EmbedBuilder} Embed con la pregunta
 */
function createQuizQuestionEmbed(question) {
  // Determinar color según categoría
  let color = COLORS.PRIMARY;
  if (question.categoria.toLowerCase().includes('tanque')) {
    color = COLORS.TANK;
  } else if (question.categoria.toLowerCase().includes('daño')) {
    color = COLORS.DAMAGE;
  } else if (question.categoria.toLowerCase().includes('apoyo')) {
    color = COLORS.SUPPORT;
  }

  // Construir las opciones como texto
  const options = question.opciones.map((option, index) => {
    return `${['A', 'B', 'C', 'D'][index]}) ${option}`;
  }).join('\n');

  return createBaseEmbed({
    title: `Pregunta: ${question.categoria} - ${question.dificultad}`,
    description: `**${question.texto}**\n\n${options}`,
    color: color,
    footer: `Dificultad: ${question.dificultad} | Categoría: ${question.categoria}`
  });
}

/**
 * Actualiza un embed con el resultado de la respuesta
 * @param {EmbedBuilder} embed - Embed original
 * @param {Object} result - Resultado de la respuesta
 * @returns {EmbedBuilder} Embed actualizado
 */
function updateQuizResultEmbed(embed, result) {
  const resultText = result.isCorrect
    ? `✅ **¡Correcto!** Ganaste ${result.points} puntos.`
    : `❌ **Incorrecto.** La respuesta correcta era: ${result.correctAnswer}`;

  const color = result.isCorrect ? COLORS.SUCCESS : COLORS.ERROR;
  
  return embed
    .setColor(color)
    .setDescription(embed.data.description + `\n\n${resultText}`)
    .setFooter({ 
      text: `Total de puntos: ${result.totalScore}`, 
      iconURL: embed.data.footer.icon_url 
    });
}

/**
 * Crea un embed para cuando se agota el tiempo
 * @param {EmbedBuilder} embed - Embed original
 * @param {string} correctAnswer - Respuesta correcta
 * @returns {EmbedBuilder} Embed actualizado
 */
function createTimeoutEmbed(embed, correctAnswer) {
  return embed
    .setColor(COLORS.WARNING)
    .setDescription(embed.data.description + `\n\n⏱️ **¡Tiempo agotado!** La respuesta correcta era: ${correctAnswer}`)
    .setFooter({ 
      text: `No has obtenido puntos`, 
      iconURL: embed.data.footer.icon_url 
    });
}

/**
 * Crea un embed para mostrar el ranking
 * @param {Array} rankingData - Datos del ranking
 * @param {Object} userData - Datos del usuario que solicitó el ranking
 * @returns {EmbedBuilder} Embed con el ranking
 */
function createRankingEmbed(rankingData, userData) {
  const topUsers = rankingData.map((user, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    const userMention = `<@${user.userId}>`;
    return `${medal} ${userMention}: **${user.points}** pts`;
  }).join('\n');

  let description = `**🏆 Top Quiz Masters de Overwatch 2 🏆**\n\n${topUsers}`;
  
  // Añadir información del usuario que pidió el ranking si no está en el top
  if (userData && !rankingData.some(user => user.userId === userData.userId)) {
    description += `\n\n**Tu posición:**\n${userData.position}. <@${userData.userId}>: **${userData.points}** pts`;
  }

  return createBaseEmbed({
    title: 'Ranking del Quiz de Overwatch 2',
    description: description,
    color: COLORS.PRIMARY,
    footer: 'Compite y sube en el ranking contestando más preguntas'
  });
}

module.exports = {
  createBaseEmbed,
  createQuizQuestionEmbed,
  updateQuizResultEmbed,
  createTimeoutEmbed,
  createRankingEmbed
};