const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder } = require('discord.js');
const MapService = require('../services/mapService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('map')
    .setDescription('Muestra información sobre mapas de Overwatch 2'),
  
  async execute(interaction) {
    const mapService = new MapService();
    const maps = mapService.getAllMaps();
    
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
      if (!mapsByType[map.type]) {
        mapsByType[map.type] = [];
      }
      mapsByType[map.type].push(map);
    });

    // Crear opciones para el menú desplegable, agrupadas por tipo
    const options = [];
    Object.keys(mapsByType).sort().forEach(type => {
      // Añadir separador para cada tipo
      if (options.length > 0) {
        options.push({
          label: `---- ${type} ----`,
          description: `Categoría: ${type}`,
          value: `category_${type}`,
          default: false
        });
      }
      
      // Añadir mapas de este tipo
      mapsByType[type].sort((a, b) => a.name.localeCompare(b.name)).forEach(map => {
        options.push({
          label: map.name,
          description: `${map.type} - ${map.location}`,
          value: map.id.toString()
        });
      });
    });

    // Crear menú desplegable con los mapas
    const row = new ActionRowBuilder()
      .addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('map_select')
          .setPlaceholder('Selecciona un mapa')
          .addOptions(options.slice(0, 25)) // Discord tiene un límite de 25 opciones
      );
    
    // El mensaje inicial ahora es visible para todos
    await interaction.reply({
      content: `${interaction.user} quiere ver información sobre un mapa de Overwatch 2. ¡Selecciona uno!`,
      components: [row],
      ephemeral: false // Hacemos que sea visible para todos
    });
    
    // Configurar colector para manejar la selección
    const filter = i => i.customId === 'map_select';
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });
    
    collector.on('collect', async i => {
      const selectedValue = i.values[0];
      
      // Verificar si es una categoría o un mapa
      if (selectedValue.startsWith('category_')) {
        await i.update({
          content: `${i.user} seleccionó la categoría ${selectedValue.replace('category_', '')}. Por favor, selecciona un mapa específico.`,
          components: [row]
        });
        return;
      }
      
      const selectedMapId = parseInt(selectedValue);
      const selectedMap = mapService.getMapById(selectedMapId);
      
      if (selectedMap) {
        // Definir colores basados en el tipo de mapa
        const typeColors = {
          'Control': '#FF9900',       // Naranja
          'Escolta': '#0099FF',       // Azul
          'Híbrido': '#9900FF',       // Púrpura
          'Empuje': '#00CC66',        // Verde
          'Clash': '#FF6600',         // Naranja oscuro
          'Estadio': '#FFCC00',       // Amarillo
          'Duelo': '#FF3366',         // Rosa
          'Arcade': '#66CCFF'         // Azul claro
        };
        
        const mapColor = typeColors[selectedMap.type] || '#FF9900';
        
        // Crear un icono para la dificultad
        let difficultyIcon = '⭐';
        switch(selectedMap.difficulty) {
          case 'Baja':
            difficultyIcon = '⭐';
            break;
          case 'Media':
            difficultyIcon = '⭐⭐';
            break;
          case 'Media-Alta':
            difficultyIcon = '⭐⭐⭐';
            break;
          case 'Alta':
            difficultyIcon = '⭐⭐⭐⭐';
            break;
        }
        
        // Crear embed principal con la información del mapa
        const embed = new EmbedBuilder()
          .setTitle(`🗺️ ${selectedMap.name}`)
          .setDescription(`*${selectedMap.description}*`)
          .setColor(mapColor)
          .setImage(selectedMap.imageUrl)
          .addFields(
            { 
              name: '📊 Información general', 
              value: `**Tipo:** ${selectedMap.type}\n**Ubicación:** ${selectedMap.location}\n**Dificultad:** ${difficultyIcon}\n**Lanzamiento:** ${selectedMap.getFormattedReleaseDate() || 'Desconocido'}`, 
              inline: false 
            }
          );
        
        // Añadir bloque de héroes recomendados
        if (selectedMap.bestHeroes && selectedMap.bestHeroes.length > 0) {
          const heroIcons = {
            // Tanques
            'Reinhardt': '🛡️',
            'Winston': '🦍',
            'D.Va': '🤖',
            'Orisa': '🐎',
            'Wrecking Ball': '🐹',
            'Zarya': '💪',
            'Sigma': '🧠',
            'Roadhog': '🐷',
            'Doomfist': '👊',
            
            // DPS
            'Soldier: 76': '🔫',
            'Reaper': '💀',
            'Tracer': '⏱️',
            'Genji': '🥷',
            'Hanzo': '🏹',
            'Cassidy': '🤠',
            'Ashe': '🔥',
            'Widowmaker': '🕸️',
            'Junkrat': '💣',
            'Mei': '❄️',
            'Bastion': '🤖',
            'Symmetra': '🔷',
            'Torbjörn': '🔨',
            'Pharah': '🚀',
            'Echo': '🦋',
            'Sojourn': '⚡',
            'Freja': '🏹',
            'Aqua': '💧',
            
            // Apoyo
            'Mercy': '👼',
            'Lucio': '🎵',
            'Ana': '💉',
            'Moira': '🧪',
            'Brigitte': '🛡️',
            'Zenyatta': '🧘',
            'Baptiste': '💊',
            'Kiriko': '🦊'
          };
          
          const bestHeroesFormatted = selectedMap.bestHeroes.map(hero => {
            const icon = heroIcons[hero] || '👤';
            return `${icon} ${hero}`;
          }).join(' | ');
          
          embed.addFields({ 
            name: '✅ Héroes recomendados', 
            value: bestHeroesFormatted, 
            inline: false 
          });
        }
        
        // Añadir bloque de héroes no recomendados
        if (selectedMap.worstHeroes && selectedMap.worstHeroes.length > 0) {
          const worstHeroesFormatted = selectedMap.worstHeroes.join(' | ');
          
          embed.addFields({ 
            name: '❌ Héroes no recomendados', 
            value: worstHeroesFormatted, 
            inline: false 
          });
        }
        
        // Añadir información adicional si está disponible
        if (selectedMap.additionalInfo) {
          embed.addFields({ 
            name: '📝 Detalles adicionales', 
            value: selectedMap.additionalInfo, 
            inline: false 
          });
        }
        
        // Añadir footer con info del comando y quién lo solicitó
        embed.setFooter({ 
          text: `Solicitado por ${i.user.tag} | Usa /map para ver otros mapas`,
        });
        
        // Añadir timestamp
        embed.setTimestamp();

        // Mantenemos el menú desplegable para que otros usuarios puedan seleccionar mapas
        const newRow = new ActionRowBuilder()
          .addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('map_select')
              .setPlaceholder('Selecciona otro mapa')
              .addOptions(options.slice(0, 25))
          );

        await i.update({
          content: `${i.user} ha seleccionado **${selectedMap.name}**`,
          embeds: [embed],
          components: [newRow]
        });
      }
    });
    
    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.editReply({
          content: 'No se seleccionó ningún mapa. Comando expirado.',
          components: [],
        });
      } else {
        // Si hubo interacciones, solo eliminamos el menú
        interaction.editReply({
          components: []
        }).catch(console.error);
      }
    });
  }
};