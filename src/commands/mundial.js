// src/commands/mundial.js
// Comando /mundial — información completa sobre el Overwatch World Cup 2026
//
// Los datos se leen de data/mundialData.json para poder actualizar equipos
// y fechas sin tocar el código. Solo edita ese archivo cuando haya novedades.

const { SlashCommandBuilder } = require('@discordjs/builders');
const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle
} = require('discord.js');
const path = require('path');
const { readJsonFile } = require('../utils/fileOperations');
const { COLORS } = require('../config/colors');

// ─────────────────────────────────────────────────────────
// Constantes
// ─────────────────────────────────────────────────────────

const DATA_PATH = path.join(__dirname, '../../data/mundialData.json');

// Color temático del OWWC
const OWWC_COLOR  = 0xFA9C1E; // Naranja Overwatch
const OWCS_COLOR  = 0x4A90E2; // Azul OWCS
const TEAMS_COLOR = 0x43B581; // Verde equipos

// ─────────────────────────────────────────────────────────
// Utilidades de fecha
// ─────────────────────────────────────────────────────────

/**
 * Detecta la fase actual del torneo según la fecha de hoy.
 * Devuelve el índice de la fase activa, o -1 si aún no ha empezado o ya terminó.
 * @param {Array} phases
 * @returns {{ current: Object|null, next: Object|null, currentIndex: number }}
 */
function detectCurrentPhase(phases) {
  const now = new Date();
  for (let i = 0; i < phases.length; i++) {
    const start = new Date(phases[i].startDate);
    const end   = new Date(phases[i].endDate);
    end.setHours(23, 59, 59); // Incluir el último día completo
    if (now >= start && now <= end) {
      return {
        current:      phases[i],
        next:         phases[i + 1] || null,
        currentIndex: i
      };
    }
  }
  // No estamos en ninguna fase — buscar la siguiente
  const next = phases.find(p => new Date(p.startDate) > now);
  return { current: null, next: next || null, currentIndex: -1 };
}

/**
 * Calcula los días que faltan hasta una fecha.
 * @param {string} dateStr - ISO date string (YYYY-MM-DD)
 * @returns {number} Días restantes (positivo = futuro, negativo = pasado)
 */
function daysUntil(dateStr) {
  const target = new Date(dateStr);
  const now    = new Date();
  const diff   = target - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Formatea una fecha en español legible.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('es-ES', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

// ─────────────────────────────────────────────────────────
// Constructores de embeds
// ─────────────────────────────────────────────────────────

/**
 * Embed principal: resumen del torneo y fase actual
 */
function buildOverviewEmbed(data) {
  const { tournament, phases } = data;
  const { current, next, currentIndex } = detectCurrentPhase(phases);

  // ── Estado actual ────────────────────────────────────
  let statusSection = '';
  if (current) {
    statusSection =
      `**🔴 EN CURSO:** ${current.emoji} ${current.name}\n` +
      `> ${current.description}\n` +
      `> Termina el **${formatDate(current.endDate)}**`;
    if (next) {
      const days = daysUntil(next.startDate);
      statusSection += `\n\n**⏭️ Próxima fase:** ${next.emoji} ${next.name} — en **${days} días**`;
    }
  } else if (next) {
    const days = daysUntil(next.startDate);
    statusSection =
      `**⏳ Próxima fase:** ${next.emoji} ${next.name}\n` +
      `> Comienza el **${formatDate(next.startDate)}** (en **${days} días**)`;
  } else {
    statusSection = '🏁 *El torneo ha concluido.*';
  }

  // ── Progreso del torneo ─────────────────────────────
  const completed = currentIndex >= 0 ? currentIndex : phases.findIndex(p => new Date(p.startDate) > new Date());
  const progress  = phases.map((p, i) => {
    if (i < completed)      return `✅ ~~${p.emoji} ${p.name}~~`;
    if (i === (currentIndex >= 0 ? currentIndex : -1)) return `🔴 **${p.emoji} ${p.name}** ← Ahora`;
    return `⬜ ${p.emoji} ${p.name}`;
  }).join('\n');

  // Días hasta la gran final
  const finalPhase = phases[phases.length - 1];
  const daysToFinal = daysUntil(finalPhase.startDate);

  return new EmbedBuilder()
    .setTitle('🌍 Overwatch World Cup 2026')
    .setDescription(
      `**${tournament.edition}**\n` +
      `📍 ${tournament.location}\n` +
      `👥 ${tournament.teams} equipos | Formato: ${tournament.format}\n\n` +
      `${statusSection}`
    )
    .addFields(
      {
        name:   '📅 Hoja de Ruta',
        value:  progress,
        inline: false
      },
      {
        name:   '⏱️ Cuenta regresiva',
        value:  daysToFinal > 0
          ? `Faltan **${daysToFinal} días** para la Gran Final (${formatDate(finalPhase.startDate)})`
          : '¡La Gran Final ya está en curso o ha concluido!',
        inline: false
      }
    )
    .setColor(OWWC_COLOR)
    .setFooter({
      text: `Overwatch World Cup 2026 • Datos actualizados al ${data._lastUpdated}`
    })
    .setTimestamp();
}

/**
 * Embed de calendario OWCS + OWWC
 */
function buildScheduleEmbed(data) {
  const { owcsSchedule } = data;
  const now = new Date();

  const lines = owcsSchedule.map(event => {
    const start    = new Date(event.start);
    const end      = new Date(event.end);
    const isPast   = end < now;
    const isCurrent = start <= now && end >= now;
    const days     = daysUntil(event.start);

    let status = '';
    if (isPast)       status = '✅';
    else if (isCurrent) status = '🔴';
    else              status = days <= 14 ? '🟡' : '⬜';

    const prize = event.prize && event.prize !== 'TBA' ? ` · 💰 ${event.prize}` : '';
    const countdown = !isPast && !isCurrent ? ` *(en ${days}d)*` : '';

    return (
      `${status} ${event.emoji} **${event.name}**${countdown}\n` +
      `╰ ${formatDate(event.start)} – ${formatDate(event.end)} · 🌐 ${event.region}${prize}`
    );
  }).join('\n\n');

  return new EmbedBuilder()
    .setTitle('📅 Calendario OWCS + OWWC 2026')
    .setDescription(lines)
    .addFields({
      name:  '🔑 Leyenda',
      value: '✅ Finalizado · 🔴 En curso · 🟡 Próximo (≤14 días) · ⬜ Futuro',
      inline: false
    })
    .setColor(OWCS_COLOR)
    .setFooter({ text: 'OWCS = Overwatch Champions Series (ruta hacia el OWWC)' })
    .setTimestamp();
}

/**
 * Embed de equipos participantes
 */
function buildTeamsEmbed(data) {
  const { teams } = data;

  // Confirmados
  const confirmedList = teams.confirmed.map(t =>
    `${t.flag} **${t.name}** — *${t.seed}*`
  ).join('\n');

  // Invitados pendientes de confirmación
  const invitedList = teams.invited.slice(0, 10).map(t =>
    `${t.flag} ${t.name}`
  ).join('  ·  ');

  return new EmbedBuilder()
    .setTitle('🌍 Equipos — Overwatch World Cup 2026')
    .setDescription(
      `**${teams.confirmed.length + teams.invited.length} de 16** lugares asignados\n` +
      `*(${teams.wildcardSpots} plazas Wildcard aún por definir vía Conference Cups)*`
    )
    .addFields(
      {
        name:   `✅ Confirmados (${teams.confirmed.length})`,
        value:  confirmedList || '*Ninguno aún*',
        inline: false
      },
      {
        name:   `📋 Invitados — pendiente de roster oficial (${teams.invited.length})`,
        value:  invitedList || '*TBA*',
        inline: false
      },
      {
        name:   `🎟️ Wildcard (${teams.wildcardSpots} plazas)`,
        value:  teams.wildcardNote,
        inline: false
      }
    )
    .setColor(TEAMS_COLOR)
    .setFooter({ text: 'Los rosters de jugadores se anunciarán en primavera de 2026' })
    .setTimestamp();
}

// ─────────────────────────────────────────────────────────
// Módulo del comando
// ─────────────────────────────────────────────────────────

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mundial')
    .setDescription('Información completa sobre el Overwatch World Cup 2026'),

  async execute(interaction) {
    // Cargar datos frescos del JSON en cada uso (permite actualizaciones sin reiniciar)
    const data = await readJsonFile(DATA_PATH, null);

    if (!data) {
      return await interaction.reply({
        content: '❌ No se pudieron cargar los datos del Mundial. Inténtalo más tarde.',
        ephemeral: true
      });
    }

    const overviewEmbed = buildOverviewEmbed(data);
    const row = this.buildButtons();

    const response = await interaction.reply({
      embeds:      [overviewEmbed],
      components:  [row],
      withResponse: true
    });

    const replyMessage = response.resource?.message;
    if (replyMessage) {
      this.setupCollector(interaction, replyMessage, data);
    }
  },

  /**
   * Construye la fila de botones de navegación
   */
  buildButtons(active = 'overview') {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('mundial_overview')
        .setLabel('Resumen')
        .setEmoji('🌍')
        .setStyle(active === 'overview' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(active === 'overview'),
      new ButtonBuilder()
        .setCustomId('mundial_schedule')
        .setLabel('Calendario')
        .setEmoji('📅')
        .setStyle(active === 'schedule' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(active === 'schedule'),
      new ButtonBuilder()
        .setCustomId('mundial_teams')
        .setLabel('Equipos')
        .setEmoji('🌍')
        .setStyle(active === 'teams' ? ButtonStyle.Primary : ButtonStyle.Secondary)
        .setDisabled(active === 'teams'),
      new ButtonBuilder()
        .setLabel('Liquipedia')
        .setEmoji('🔗')
        .setStyle(ButtonStyle.Link)
        .setURL('https://liquipedia.net/overwatch/Overwatch_World_Cup/2026')
    );
  },

  /**
   * Configura el collector de botones (5 minutos de vida)
   */
  setupCollector(interaction, message, data) {
    const collector = message.createMessageComponentCollector({
      filter: i => i.customId.startsWith('mundial_') && i.message.id === message.id,
      time:   300_000 // 5 minutos
    });

    collector.on('collect', async i => {
      try {
        await i.deferUpdate();

        let embed;
        let active;

        if (i.customId === 'mundial_overview') {
          embed  = buildOverviewEmbed(data);
          active = 'overview';
        } else if (i.customId === 'mundial_schedule') {
          embed  = buildScheduleEmbed(data);
          active = 'schedule';
        } else if (i.customId === 'mundial_teams') {
          embed  = buildTeamsEmbed(data);
          active = 'teams';
        }

        if (embed) {
          await i.editReply({
            embeds:     [embed],
            components: [this.buildButtons(active)]
          });
        }
      } catch (error) {
        console.error('[Mundial] Error en botón:', error);
      }
    });

    collector.on('end', () => {
      // Deshabilitar botones interactivos al expirar
      const disabledRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mundial_overview').setLabel('Resumen').setEmoji('🌍').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('mundial_schedule').setLabel('Calendario').setEmoji('📅').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('mundial_teams').setLabel('Equipos').setEmoji('🌍').setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setLabel('Liquipedia').setEmoji('🔗').setStyle(ButtonStyle.Link).setURL('https://liquipedia.net/overwatch/Overwatch_World_Cup/2026')
      );
      message.edit({ components: [disabledRow] }).catch(() => {});
    });
  }
};
