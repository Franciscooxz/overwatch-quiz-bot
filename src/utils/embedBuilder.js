// src/utils/embedBuilder.js
const { EmbedBuilder } = require('discord.js');
const { COLORS } = require('../config/colors');

// ─────────────────────────────────────────────────────────
// Utilidades visuales
// ─────────────────────────────────────────────────────────

/**
 * Genera una barra de progreso visual con caracteres Unicode.
 * Ejemplo: createProgressBar(75, 100, 10) → '███████░░░'
 * @param {number} value  - Valor actual
 * @param {number} max    - Valor máximo (denominador)
 * @param {number} length - Longitud total de la barra en caracteres (default 10)
 * @returns {string} Barra de progreso (caracteres █ y ░)
 */
function createProgressBar(value, max, length = 10) {
  if (!max || max <= 0) return '░'.repeat(length);
  const ratio = Math.min(Math.max(value / max, 0), 1);
  const filled = Math.round(ratio * length);
  const empty = length - filled;
  return '█'.repeat(filled) + '░'.repeat(empty);
}

// ─────────────────────────────────────────────────────────
// Constructores de embeds
// ─────────────────────────────────────────────────────────

/**
 * Crea un embed base con opciones personalizadas
 * @param {Object} options - Opciones del embed
 * @returns {EmbedBuilder}
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
 * @returns {EmbedBuilder}
 */
function createQuizQuestionEmbed(question) {
  let color = COLORS.PRIMARY;
  if (question.categoria?.toLowerCase().includes('tanque'))  color = COLORS.TANK;
  else if (question.categoria?.toLowerCase().includes('daño'))  color = COLORS.DAMAGE;
  else if (question.categoria?.toLowerCase().includes('apoyo')) color = COLORS.SUPPORT;

  const options = question.opciones
    .map((option, index) => `${['A', 'B', 'C', 'D'][index]}) ${option}`)
    .join('\n');

  return createBaseEmbed({
    title: `Pregunta: ${question.categoria} - ${question.dificultad}`,
    description: `**${question.texto}**\n\n${options}`,
    color,
    footer: `Dificultad: ${question.dificultad} | Categoría: ${question.categoria}`
  });
}

/**
 * Actualiza un embed con el resultado de la respuesta
 * @param {EmbedBuilder} embed  - Embed original
 * @param {Object}       result - Resultado de la respuesta
 * @returns {EmbedBuilder}
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
      iconURL: embed.data.footer?.icon_url
    });
}

/**
 * Crea un embed para cuando se agota el tiempo
 * @param {EmbedBuilder} embed         - Embed original
 * @param {string}       correctAnswer - Respuesta correcta
 * @returns {EmbedBuilder}
 */
function createTimeoutEmbed(embed, correctAnswer) {
  return embed
    .setColor(COLORS.GRAY)
    .setDescription(
      embed.data.description +
      `\n\n⏱️ **¡Tiempo agotado!** La respuesta correcta era: ${correctAnswer}`
    )
    .setFooter({
      text: 'No has obtenido puntos',
      iconURL: embed.data.footer?.icon_url
    });
}

/**
 * Crea un embed de ranking con barras visuales de progreso.
 * @param {Array}  rankingData - Array de { userId, points }
 * @param {Object} userData    - { userId, points, position } del usuario que pidió el ranking
 * @returns {EmbedBuilder}
 */
function createRankingEmbed(rankingData, userData) {
  const medals = ['🥇', '🥈', '🥉'];
  const maxPoints = rankingData[0]?.points || 1;

  const topUsers = rankingData.map((user, index) => {
    const medal = medals[index] ?? `\`${index + 1}.\``;
    const bar = createProgressBar(user.points, maxPoints, 12);
    const isUser = userData && user.userId === userData.userId;
    const mention = isUser
      ? `**<@${user.userId}> ← Tú**`
      : `<@${user.userId}>`;
    return `${medal} ${mention}\n╰ \`${bar}\` **${user.points} pts**`;
  }).join('\n');

  let description = `**🏆 Top Quiz Masters de Overwatch 2 🏆**\n\n${topUsers}`;

  if (userData && !rankingData.some(u => u.userId === userData.userId)) {
    const bar = createProgressBar(userData.points, maxPoints, 12);
    description +=
      `\n\n**Tu posición:**\n\`${userData.position}.\` <@${userData.userId}>\n` +
      `╰ \`${bar}\` **${userData.points} pts**`;
  }

  return createBaseEmbed({
    title: '🏆 Ranking del Quiz de Overwatch 2',
    description,
    color: COLORS.PRIMARY,
    footer: 'Compite y sube en el ranking contestando más preguntas'
  });
}

// ─────────────────────────────────────────────────────────
// Exports
// ─────────────────────────────────────────────────────────
module.exports = {
  createProgressBar,
  createBaseEmbed,
  createQuizQuestionEmbed,
  updateQuizResultEmbed,
  createTimeoutEmbed,
  createRankingEmbed
};
