// src/commands/map.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
// Singleton: ya no se crea 'new MapService()' en cada ejecución
const mapService = require('../services/mapService');

// Emojis por héroe para el embed de mapa
const HERO_ICONS = {
  // Tanques
  'Reinhardt': '🛡️', 'Winston': '🦍', 'D.Va': '🤖', 'Orisa': '🐎',
  'Wrecking Ball': '🐹', 'Zarya': '💪', 'Sigma': '🧠', 'Roadhog': '🐷',
  'Doomfist': '👊', 'Ramattra': '🐉', 'Mauga': '🔥', 'Junker Queen': '👑',
  // DPS
  'Soldier: 76': '🔫', 'Reaper': '💀', 'Tracer': '⏱️', 'Genji': '🥷',
  'Hanzo': '🏹', 'Cassidy': '🤠', 'Ashe': '🔥', 'Widowmaker': '🕸️',
  'Junkrat': '💣', 'Mei': '❄️', 'Bastion': '⚙️', 'Symmetra': '🔷',
  'Torbjörn': '🔨', 'Pharah': '🚀', 'Echo': '🦋', 'Sojourn': '⚡',
  'Sombra': '💻', 'Venture': '⛏️',
  // Apoyo
  'Mercy': '👼', 'Lúcio': '🎵', 'Ana': '💉', 'Moira': '🧪',
  'Brigitte': '🔧', 'Zenyatta': '🧘', 'Baptiste': '💊', 'Kiriko': '🦊',
  'Illari': '☀️', 'Lifeweaver': '🌸', 'Juno': '🛸'
};

// Colores por tipo de mapa
const TYPE_COLORS = {
  'Control':           '#FF9900',
  'Escolta':           '#0099FF',
  'Híbrido':           '#9900FF',
  'Empuje':            '#00CC66',
  'Clash':             '#FF6600',
  'Flashpoint':        '#FF3399',
  'Estadio':           '#FFCC00',
  'Duelo':             '#FF3366',
  'Duelo por equipos': '#CC3366',
  'Arcade':            '#66CCFF'
};

// Iconos de dificultad
const DIFFICULTY_ICONS = {
  'Baja':       '⭐',
  'Media':      '⭐⭐',
  'Media-Alta': '⭐⭐⭐',
  'Alta':       '⭐⭐⭐⭐'
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Muestra información sobre mapas de Overwatch 2'),

  async execute(interaction) {
    try {
      // El singleton ya tiene los mapas cargados desde el arranque
      const maps = await mapService.getAllMaps();

      if (maps.length === 0) {
        await interaction.reply({
          content: 'No se encontraron mapas en la base de datos.',
          ephemeral: true
        });
        return;
      }

      // Agrupar mapas por tipo para mostrarlos ordenados
      const mapsByType = {};
      maps.forEach(map => {
        if (!mapsByType[map.type]) mapsByType[map.type] = [];
        mapsByType[map.type].push(map);
      });

      // Construir opciones del menú (máximo 25 — límite de Discord)
      const options = [];
      Object.keys(mapsByType).sort().forEach(type => {
        mapsByType[type]
          .sort((a, b) => a.name.localeCompare(b.name))
          .forEach(map => {
            if (options.length >= 25) return;
            options.push({
              label: map.name,
              description: `${map.type} · ${map.location || 'Ubicación desconocida'}`,
              value: map.id.toString()
            });
          });
      });

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId('map_select')
        .setPlaceholder('Selecciona un mapa para ver su información')
        .addOptions(options);

      const row = new ActionRowBuilder().addComponents(selectMenu);

      await interaction.reply({
        content: `🗺️ **${interaction.user.username}** quiere ver información sobre un mapa. ¡Elige uno!`,
        components: [row]
      });

      // FIX: collector acotado al mensaje de respuesta (no a todo el canal)
      // FIX: filtro por usuario — solo quien ejecutó el comando puede seleccionar
      const replyMessage = await interaction.fetchReply();
      const filter = i =>
        i.customId === 'map_select' &&
        i.user.id === interaction.user.id;

      const collector = replyMessage.createMessageComponentCollector({
        filter,
        time: 60000
      });

      collector.on('collect', async i => {
        try {
          const selectedMapId = parseInt(i.values[0]);
          const selectedMap = await mapService.getMapById(selectedMapId);

          if (!selectedMap) {
            await i.update({ content: '❌ No se encontró ese mapa.', components: [] });
            return;
          }

          const embed = this.createMapEmbed(selectedMap, i.user);

          // Recreamos el menú para que el usuario pueda seguir eligiendo
          const newRow = new ActionRowBuilder()
            .addComponents(
              new StringSelectMenuBuilder()
                .setCustomId('map_select')
                .setPlaceholder('Selecciona otro mapa')
                .addOptions(options)
            );

          await i.update({
            content: `🗺️ **${i.user.username}** ha seleccionado **${selectedMap.name}**`,
            embeds: [embed],
            components: [newRow]
          });
        } catch (error) {
          console.error('[Map] Error al procesar selección:', error);
          try {
            await i.update({ content: '❌ Error al cargar el mapa.', components: [] });
          } catch (_) {}
        }
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            content: 'ℹ️ Selección de mapa expirada. Usa `/map` de nuevo.',
            components: []
          }).catch(() => {});
        } else {
          interaction.editReply({ components: [] }).catch(() => {});
        }
      });

    } catch (error) {
      console.error('[Map] Error al ejecutar comando:', error);
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: '❌ Ha ocurrido un error al cargar los mapas. Inténtalo de nuevo.',
            ephemeral: true
          });
        }
      } catch (_) {}
    }
  },

  /**
   * Crea el embed de detalle para un mapa
   * @param {Object} map - Mapa seleccionado
   * @param {User} user - Usuario de Discord que solicitó el mapa
   * @returns {EmbedBuilder}
   */
  createMapEmbed(map, user) {
    const color = TYPE_COLORS[map.type] || '#FF9900';
    const difficultyIcon = DIFFICULTY_ICONS[map.difficulty] || '❓';

    const embed = new EmbedBuilder()
      .setTitle(`🗺️ ${map.name}`)
      .setColor(color)
      .setTimestamp()
      .setFooter({
        text: `Solicitado por ${user.username} · Usa /map para ver otros mapas`
      });

    if (map.description) {
      embed.setDescription(`*${map.description}*`);
    }

    if (map.imageUrl) {
      embed.setImage(map.imageUrl);
    }

    // Información general con campos inline para compactar el diseño
    embed.addFields(
      { name: '🎮 Tipo',       value: map.type || 'Desconocido',     inline: true },
      { name: '📍 Ubicación',  value: map.location || 'Desconocida', inline: true },
      { name: '⭐ Dificultad', value: difficultyIcon,                inline: true }
    );

    if (map.releaseDate) {
      const formatted = map.getFormattedReleaseDate
        ? map.getFormattedReleaseDate()
        : map.releaseDate;
      embed.addFields({ name: '📅 Lanzamiento', value: formatted, inline: true });
    }

    if (map.bestHeroes && map.bestHeroes.length > 0) {
      const formatted = map.bestHeroes
        .map(h => `${HERO_ICONS[h] || '👤'} ${h}`)
        .join(' · ');
      embed.addFields({ name: '✅ Héroes recomendados', value: formatted, inline: false });
    }

    if (map.worstHeroes && map.worstHeroes.length > 0) {
      embed.addFields({
        name: '❌ Héroes no recomendados',
        value: map.worstHeroes.join(' · '),
        inline: false
      });
    }

    if (map.additionalInfo) {
      embed.addFields({ name: '📝 Detalles adicionales', value: map.additionalInfo, inline: false });
    }

    return embed;
  }
};
