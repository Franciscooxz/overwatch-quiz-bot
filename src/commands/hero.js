// src/commands/hero.js
// Comando /hero — muestra información detallada sobre un héroe de Overwatch 2
// Usa autocomplete para buscar entre los 65+ héroes disponibles
// Los datos se obtienen en tiempo real desde la OverFast API

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const overwatchApi = require('../services/overwatchApiService');
const { COLORS } = require('../config/colors');
const { createProgressBar } = require('../utils/embedBuilder');

// ─────────────────────────────────────────────────────────
// Utilidades de presentación
// ─────────────────────────────────────────────────────────

const ROLE_EMOJIS = {
  support: '🩺',
  tank: '🛡️',
  damage: '⚔️'
};

const ROLE_NAMES_ES = {
  support: 'Apoyo',
  tank: 'Tanque',
  damage: 'Daño'
};

// Mapeado desde colors.js para consistencia con el resto del bot
const ROLE_COLORS = {
  support: COLORS.SUPPORT,
  tank:    COLORS.TANK,
  damage:  COLORS.DAMAGE
};

/**
 * Devuelve el emoji del rol
 * @param {string} role
 * @returns {string}
 */
function getRoleEmoji(role) {
  return ROLE_EMOJIS[role] || '🦸';
}

/**
 * Construye el embed completo para un héroe
 * @param {Object} hero - Datos del héroe desde /heroes/{key}
 * @returns {EmbedBuilder}
 */
function createHeroEmbed(hero) {
  const roleEmoji = getRoleEmoji(hero.role);
  const color = ROLE_COLORS[hero.role] || '#FF9900';
  const roleName = ROLE_NAMES_ES[hero.role] || hero.role || 'Desconocido';

  // Descripción truncada a 300 chars para no desbordar el embed
  const description = hero.description
    ? (hero.description.length > 300
        ? hero.description.substring(0, 297) + '...'
        : hero.description)
    : '*Sin descripción disponible.*';

  const embed = new EmbedBuilder()
    .setTitle(`${roleEmoji} ${hero.name}`)
    .setDescription(description)
    .setColor(color)
    .setThumbnail(hero.portrait || null);

  // ── Campos de datos básicos ──────────────────────────────
  embed.addFields({ name: '🎭 Rol', value: roleName, inline: true });

  if (hero.location) {
    embed.addFields({ name: '📍 Origen', value: hero.location, inline: true });
  }

  if (hero.age) {
    embed.addFields({ name: '🎂 Edad', value: `${hero.age} años`, inline: true });
  }

  // ── Puntos de vida con barras visuales ──────────────────
  if (hero.hitpoints) {
    const hp = hero.hitpoints;
    const total = hp.total || 1;
    const lines = [];

    if (hp.health  > 0) lines.push(`❤️ Vida      \`${createProgressBar(hp.health,  total, 10)}\` **${hp.health}**`);
    if (hp.shields > 0) lines.push(`🔵 Escudos   \`${createProgressBar(hp.shields, total, 10)}\` **${hp.shields}**`);
    if (hp.armor   > 0) lines.push(`🟡 Armadura  \`${createProgressBar(hp.armor,   total, 10)}\` **${hp.armor}**`);
    lines.push(`💪 **Total: ${hp.total}**`);

    embed.addFields({
      name: '💓 Puntos de vida',
      value: lines.join('\n'),
      inline: false
    });
  }

  // ── Habilidades (primeras 4 para no saturar) ─────────────
  if (hero.abilities && hero.abilities.length > 0) {
    const toShow = hero.abilities.slice(0, 4);
    const abilitiesText = toShow.map(a => {
      const desc = a.description
        ? (a.description.length > 90
            ? a.description.substring(0, 87) + '...'
            : a.description)
        : '';
      return `🔹 **${a.name}**${desc ? ` — ${desc}` : ''}`;
    }).join('\n');

    embed.addFields({
      name: `🎮 Habilidades (${hero.abilities.length} en total, mostrando 4)`,
      value: abilitiesText || 'No disponible',
      inline: false
    });
  }

  // ── Footer y timestamp ───────────────────────────────────
  embed
    .setFooter({ text: 'Datos de la OverFast API | Usa /hero para ver otros héroes' })
    .setTimestamp();

  return embed;
}

// ─────────────────────────────────────────────────────────
// Módulo del comando
// ─────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('hero')
    .setDescription('Muestra información detallada sobre un héroe de Overwatch 2')
    .addStringOption(option =>
      option
        .setName('nombre')
        .setDescription('Nombre del héroe (empieza a escribir para buscar)')
        .setRequired(true)
        .setAutocomplete(true)
    ),

  /**
   * Manejador de autocomplete — se llama mientras el usuario escribe
   * Filtra héroes por nombre y devuelve hasta 25 coincidencias
   */
  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const heroes = await overwatchApi.getHeroes();

      // Si la caché aún no está lista, devolvemos vacío para no bloquear
      if (!heroes || heroes.length === 0) {
        return await interaction.respond([]);
      }

      const choices = heroes
        .filter(h => h.name.toLowerCase().includes(focusedValue))
        .slice(0, 25)
        .map(h => ({
          name: `${getRoleEmoji(h.role)} ${h.name}`,
          value: h.key
        }));

      await interaction.respond(choices);
    } catch (error) {
      console.error('[Hero] Error en autocomplete:', error);
      // Discord requiere una respuesta aunque sea vacía
      try { await interaction.respond([]); } catch (_) {}
    }
  },

  /**
   * Ejecución principal del comando
   */
  async execute(interaction) {
    // Diferimos la respuesta porque la petición a la API puede tardar
    await interaction.deferReply();

    const heroKey = interaction.options.getString('nombre');

    try {
      const heroDetail = await overwatchApi.getHero(heroKey);

      if (!heroDetail) {
        await interaction.editReply({
          content: [
            '❌ No se pudo obtener información sobre ese héroe.',
            'La OverFast API puede estar temporalmente no disponible.',
            'Vuelve a intentarlo en unos minutos.'
          ].join('\n')
        });
        return;
      }

      const embed = createHeroEmbed(heroDetail);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[Hero] Error al ejecutar comando:', error);
      try {
        await interaction.editReply({
          content: '❌ Ha ocurrido un error inesperado al obtener los datos del héroe. Por favor, inténtalo de nuevo.'
        });
      } catch (_) {}
    }
  }
};
