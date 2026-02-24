// src/commands/perfil.js
// Comando /perfil jugador:<BattleTag>
// Muestra el perfil competitivo real de un jugador de Overwatch 2
// usando la OverFast API (los datos se obtienen de las páginas de Blizzard).
//
// REQUISITO: El jugador debe tener el perfil PÚBLICO en el juego:
//   Opciones → Social → Carrera → Visibilidad del perfil → Pública

const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder } = require('discord.js');
const overwatchApi = require('../services/overwatchApiService');
const { COLORS } = require('../config/colors');

// ─────────────────────────────────────────────────────────
// Constantes de presentación
// ─────────────────────────────────────────────────────────

const DIVISION_EMOJIS = {
  bronze:       '🥉',
  silver:       '🥈',
  gold:         '🥇',
  platinum:     '💎',
  diamond:      '💠',
  master:       '💜',
  grandmaster:  '🏆',
  ultimate:     '⚡'
};

const DIVISION_NAMES_ES = {
  bronze:      'Bronce',
  silver:      'Plata',
  gold:        'Oro',
  platinum:    'Platino',
  diamond:     'Diamante',
  master:      'Master',
  grandmaster: 'Gran Maestro',
  ultimate:    'Último'
};

// Color del embed según el rango más alto encontrado
const DIVISION_COLORS = {
  bronze:      0xCD7F32,
  silver:      0xC0C0C0,
  gold:        0xFFD700,
  platinum:    0x00B8D4,
  diamond:     0x4A90E2,
  master:      0x9B59B6,
  grandmaster: 0xFF6B00,
  ultimate:    0xFF0000
};

// Jerarquía de divisiones de mayor a menor
const DIVISION_ORDER = [
  'ultimate', 'grandmaster', 'master',
  'diamond', 'platinum', 'gold', 'silver', 'bronze'
];

// ─────────────────────────────────────────────────────────
// Utilidades
// ─────────────────────────────────────────────────────────

/**
 * Devuelve la división más alta de una lista
 * @param {string[]} divisions
 * @returns {string|null}
 */
function getHighestDivision(divisions) {
  for (const div of DIVISION_ORDER) {
    if (divisions.includes(div)) return div;
  }
  return null;
}

/**
 * Formatea un objeto de rango en texto legible
 * ej: { division: 'diamond', tier: 2, role_rank: 3450 } → "💠 Diamante 2 (3450 SR)"
 * @param {Object|null} rankData
 * @returns {string}
 */
function formatRank(rankData) {
  if (!rankData?.division) return '*Sin clasificar*';
  const emoji = DIVISION_EMOJIS[rankData.division] || '❓';
  const name  = DIVISION_NAMES_ES[rankData.division] || rankData.division;
  const tier  = rankData.tier ? ` ${rankData.tier}` : '';
  const sr    = rankData.role_rank ? ` *(${rankData.role_rank} SR)*` : '';
  return `${emoji} **${name}${tier}**${sr}`;
}

// ─────────────────────────────────────────────────────────
// Módulo del comando
// ─────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('perfil')
    .setDescription('Muestra el perfil competitivo de un jugador de Overwatch 2')
    .addStringOption(option =>
      option
        .setName('jugador')
        .setDescription('BattleTag del jugador (ej: TeKrop#2217 o TeKrop-2217)')
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const rawInput  = interaction.options.getString('jugador').trim();
    // La API espera el # reemplazado por - (ej: TeKrop#2217 → TeKrop-2217)
    const playerName = rawInput.replace('#', '-');

    try {
      // ── Paso 1: Buscar el player_id ──────────────────────
      const searchResults = await overwatchApi.searchPlayer(playerName);

      if (!searchResults || searchResults.length === 0) {
        return await interaction.editReply({
          content: [
            `❌ No se encontró ningún jugador con el nombre **${rawInput}**.`,
            '',
            '**Posibles causas:**',
            '• El BattleTag está mal escrito (distingue mayúsculas)',
            '• El perfil es **privado** — actívalo en el juego:',
            '  *Opciones → Social → Carrera → Visibilidad del perfil → Pública*',
            '• El jugador no ha jugado partidas recientemente'
          ].join('\n')
        });
      }

      // Si hay múltiples coincidencias, usar la primera y avisar
      const player   = searchResults[0];
      const playerId = player.player_id;
      const extraMsg = searchResults.length > 1
        ? `\n> ⚠️ Se encontraron **${searchResults.length}** jugadores con ese nombre. Mostrando el primero.`
        : '';

      // ── Paso 2: Obtener resumen completo del perfil ──────
      const summary = await overwatchApi.getPlayerSummary(playerId);

      if (!summary) {
        return await interaction.editReply({
          content: [
            `❌ No se pudo obtener el perfil de **${rawInput}**.`,
            'El perfil puede ser **privado** o la API está temporalmente no disponible.'
          ].join('\n')
        });
      }

      // ── Paso 3: Construir y enviar el embed ──────────────
      const embed = this.createProfileEmbed(summary, rawInput, playerId);
      await interaction.editReply({
        content: extraMsg || null,
        embeds:  [embed]
      });

    } catch (error) {
      console.error('[Perfil] Error al obtener perfil:', error);
      try {
        await interaction.editReply({
          content: '❌ Error inesperado al obtener el perfil. Inténtalo de nuevo más tarde.'
        });
      } catch (_) {}
    }
  },

  /**
   * Construye el embed del perfil del jugador
   * @param {Object} summary  - Datos del summary de la API
   * @param {string} rawInput - BattleTag original del usuario
   * @param {string} playerId - player_id de la API
   * @returns {EmbedBuilder}
   */
  createProfileEmbed(summary, rawInput, playerId) {
    const pc = summary.competitive?.pc;

    // Determinar color según rango más alto en PC
    const divisions = ['tank', 'damage', 'support']
      .map(role => pc?.[role]?.division)
      .filter(Boolean);
    const topDivision = getHighestDivision(divisions);
    const color = topDivision ? DIVISION_COLORS[topDivision] : COLORS.PRIMARY;

    const embed = new EmbedBuilder()
      .setTitle(`🎮 ${summary.username || rawInput}`)
      .setColor(color)
      .setThumbnail(summary.avatar || null)
      .setFooter({
        text: `OverFast API • ${playerId} • El perfil debe ser público en el juego`
      })
      .setTimestamp();

    // ── Endorsement ──────────────────────────────────────
    if (summary.endorsement) {
      const endorseLevel = typeof summary.endorsement === 'object'
        ? summary.endorsement.level
        : summary.endorsement;
      if (endorseLevel) {
        embed.setDescription(`⭐ Nivel de Endorsement: **${endorseLevel}**`);
      }
    }

    // ── Título del jugador (cosmético) ───────────────────
    if (summary.title) {
      embed.setDescription(
        (embed.data.description ? embed.data.description + '\n' : '') +
        `🏷️ Título: *${summary.title}*`
      );
    }

    // ── Rangos competitivos en PC ────────────────────────
    if (pc) {
      const season = pc.season ? `Temporada ${pc.season}` : 'Competitivo';
      embed.addFields({ name: `🏆 ${season} — PC`, value: '\u200B', inline: false });

      const roles = [
        { key: 'tank',    label: '🛡️ Tanque' },
        { key: 'damage',  label: '⚔️ Daño'   },
        { key: 'support', label: '🩺 Apoyo'   }
      ];

      let hasAnyRank = false;
      for (const { key, label } of roles) {
        const rankData = pc[key];
        if (rankData?.division) {
          embed.addFields({
            name:   label,
            value:  formatRank(rankData),
            inline: true
          });
          hasAnyRank = true;
        }
      }

      if (!hasAnyRank) {
        embed.addFields({
          name:   '📋 Estado',
          value:  '*Este jugador no tiene rangos competitivos esta temporada.*',
          inline: false
        });
      }
    } else {
      // Sin datos de PC
      embed.addFields({
        name:  '📋 Sin datos competitivos',
        value: [
          'Este jugador no tiene datos de ranked disponibles.',
          '*Asegúrate de que el perfil sea **público** en el juego.*'
        ].join('\n'),
        inline: false
      });
    }

    // ── Rangos en consola (si existen) ──────────────────
    const console_ = summary.competitive?.console;
    if (console_ && Object.values(console_).some(r => r?.division)) {
      const consoleSeason = console_.season ? `Temporada ${console_.season}` : 'Competitivo';
      embed.addFields({ name: `🎮 ${consoleSeason} — Consola`, value: '\u200B', inline: false });

      const roles = [
        { key: 'tank',    label: '🛡️ Tanque' },
        { key: 'damage',  label: '⚔️ Daño'   },
        { key: 'support', label: '🩺 Apoyo'   }
      ];
      for (const { key, label } of roles) {
        if (console_[key]?.division) {
          embed.addFields({
            name:   label,
            value:  formatRank(console_[key]),
            inline: true
          });
        }
      }
    }

    return embed;
  }
};
