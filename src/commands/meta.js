// src/commands/meta.js
// Comando /meta [rol] [region]
// Muestra los héroes más jugados y con mejor win rate en el meta
// competitivo actual, usando datos en tiempo real de la OverFast API.
// Los datos se actualizan cada hora en el servidor de la API.

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const overwatchApi = require('../services/overwatchApiService');
const { COLORS } = require('../config/colors');
const { createProgressBar } = require('../utils/embedBuilder');

// ─────────────────────────────────────────────────────────
// Constantes de presentación
// ─────────────────────────────────────────────────────────

const ROLE_EMOJIS = {
  tank:    '🛡️',
  damage:  '⚔️',
  support: '🩺'
};

const ROLE_COLORS = {
  tank:    COLORS.TANK,
  damage:  COLORS.DAMAGE,
  support: COLORS.SUPPORT
};

const ROLE_NAMES_ES = {
  tank:    'Tanque',
  damage:  'Daño',
  support: 'Apoyo'
};

const REGION_LABELS = {
  'americas':     '🌎 Américas',
  'europe':       '🌍 Europa',
  'asia-pacific': '🌏 Asia-Pacífico'
};

// ─────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────

/**
 * Emoji indicador de win rate:
 * 🟢 fuerte (≥52%) · 🟡 equilibrado (48–52%) · 🔴 débil (<48%)
 * @param {number} winrate
 * @returns {string}
 */
function winrateIcon(winrate) {
  if (winrate >= 52) return '🟢';
  if (winrate >= 48) return '🟡';
  return '🔴';
}

// ─────────────────────────────────────────────────────────
// Módulo del comando
// ─────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('meta')
    .setDescription('Muestra los héroes más jugados en el meta competitivo actual')
    .addStringOption(option =>
      option
        .setName('rol')
        .setDescription('Filtrar por rol (opcional — por defecto muestra todos)')
        .setRequired(false)
        .addChoices(
          { name: '🛡️ Tanque',  value: 'tank'    },
          { name: '⚔️ Daño',    value: 'damage'  },
          { name: '🩺 Apoyo',   value: 'support' }
        )
    )
    .addStringOption(option =>
      option
        .setName('region')
        .setDescription('Región del servidor (opcional — por defecto global)')
        .setRequired(false)
        .addChoices(
          { name: '🌎 Américas',    value: 'americas'     },
          { name: '🌍 Europa',      value: 'europe'       },
          { name: '🌏 Asia-Pacífico', value: 'asia-pacific' }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const role   = interaction.options.getString('rol');
    const region = interaction.options.getString('region');

    try {
      // Obtener stats y lista de héroes en paralelo para cruzar nombres/portraits
      const [heroStats, allHeroes] = await Promise.all([
        overwatchApi.getHeroStats({
          gamemode: 'competitive',
          platform: 'pc',
          role:   role   || undefined,
          region: region || undefined
        }),
        overwatchApi.getHeroes()
      ]);

      if (!heroStats || heroStats.length === 0) {
        return await interaction.editReply({
          content: [
            '❌ No se pudieron obtener estadísticas del meta en este momento.',
            'La OverFast API puede estar temporalmente no disponible.',
            'Inténtalo de nuevo en unos minutos.'
          ].join('\n')
        });
      }

      // Mapa de key → { name, portrait } para cruzar con los stats
      const heroInfoMap = new Map(
        (allHeroes || []).map(h => [h.key, { name: h.name, portrait: h.portrait }])
      );

      const embed = this.createMetaEmbed(heroStats, heroInfoMap, role, region);
      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('[Meta] Error al obtener el meta:', error);
      try {
        await interaction.editReply({
          content: '❌ Error inesperado al obtener el meta. Inténtalo de nuevo más tarde.'
        });
      } catch (_) {}
    }
  },

  /**
   * Construye el embed del meta competitivo
   * @param {Array}  heroStats   - Array de { hero, pickrate, winrate }
   * @param {Map}    heroInfoMap - Mapa hero key → { name, portrait }
   * @param {string|null} role   - Rol filtrado (o null)
   * @param {string|null} region - Región filtrada (o null)
   * @returns {EmbedBuilder}
   */
  createMetaEmbed(heroStats, heroInfoMap, role, region) {
    // Ordenar por pick rate de mayor a menor y tomar el top 10
    const sorted = [...heroStats]
      .sort((a, b) => b.pickrate - a.pickrate)
      .slice(0, 10);

    const maxPickrate = sorted[0]?.pickrate || 1;

    // ── Cabecera del embed ───────────────────────────────
    const roleLabel   = role
      ? `${ROLE_EMOJIS[role]} ${ROLE_NAMES_ES[role]}`
      : 'Todos los roles';
    const regionLabel = region ? REGION_LABELS[region] : '🌐 Global';
    const color       = role ? ROLE_COLORS[role] : COLORS.PRIMARY;

    // ── Lista de héroes ──────────────────────────────────
    const lines = sorted.map((stat, index) => {
      const info     = heroInfoMap.get(stat.hero);
      const heroName = info?.name || this._formatHeroKey(stat.hero);
      const bar      = createProgressBar(stat.pickrate, maxPickrate, 10);
      const wIcon    = winrateIcon(stat.winrate);
      const pos      = index + 1;
      const medal    = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : `**${pos}.**`;

      return (
        `${medal} **${heroName}**\n` +
        `╰ \`${bar}\` **${stat.pickrate.toFixed(1)}%** pick · ${wIcon} **${stat.winrate.toFixed(1)}%** win`
      );
    });

    // ── Leyenda de colores ───────────────────────────────
    const legend = '🟢 > 52% win  ·  🟡 48–52%  ·  🔴 < 48%';

    // ── Sección de mejores winrates (top 3 independiente del pickrate) ──
    const topWinrate = [...heroStats]
      .sort((a, b) => b.winrate - a.winrate)
      .slice(0, 3)
      .map(stat => {
        const name = heroInfoMap.get(stat.hero)?.name || this._formatHeroKey(stat.hero);
        return `${winrateIcon(stat.winrate)} **${name}** ${stat.winrate.toFixed(1)}%`;
      })
      .join('  ·  ');

    return new EmbedBuilder()
      .setTitle(`📊 Meta Competitivo — ${roleLabel}`)
      .setDescription(
        `**Región:** ${regionLabel} · **Plataforma:** PC Ranked\n\n` +
        lines.join('\n') +
        `\n\n${legend}`
      )
      .addFields({
        name:   '🏆 Mejor Win Rate (Top 3)',
        value:  topWinrate || '*Sin datos*',
        inline: false
      })
      .setColor(color)
      .setFooter({ text: 'Datos de Ranked PC · OverFast API · Actualizado cada hora' })
      .setTimestamp();
  },

  /**
   * Convierte una hero key en nombre legible de fallback
   * ej: 'soldier-76' → 'Soldier-76', 'wrecking-ball' → 'Wrecking-Ball'
   * (solo usado si la caché de héroes no está disponible)
   * @param {string} key
   * @returns {string}
   */
  _formatHeroKey(key) {
    return key
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('-');
  }
};
