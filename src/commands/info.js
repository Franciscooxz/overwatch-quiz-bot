const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Muestra información sobre el bot y sus comandos disponibles'),
  
  async execute(interaction) {
    // Crear el embed principal con la información del bot
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot de Overwatch 2 - Información')
      .setDescription('¡Bienvenido al asistente definitivo para Overwatch 2! Este bot te proporciona información sobre mapas, te permite poner a prueba tus conocimientos con quizzes temáticos y te ayuda a encontrar y compartir códigos de workshop.')
      .setColor('#FA9C1E') // Color naranja de Overwatch
      .setThumbnail('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltbcf2689c29fa39b9/622906a991f4232f0085d3cc/Masthead_Overwatch2_Logo.png')
      .addFields(
        { 
          name: '📋 Comandos Disponibles', 
          value: '`/map` - Información sobre mapas de Overwatch 2\n`/quiz` - Pon a prueba tus conocimientos\n`/quizrank` - Ranking de los mejores en el quiz\n`/workshop` - Busca y comparte códigos de workshop', 
          inline: false 
        },
        { 
          name: '🗺️ Sistema de Mapas', 
          value: 'Accede a información detallada sobre todos los mapas de Overwatch 2, incluyendo los mejores héroes para cada mapa, estrategias recomendadas y más.', 
          inline: false 
        },
        { 
          name: '🎮 Sistema de Quiz', 
          value: 'Pon a prueba tus conocimientos sobre Overwatch con preguntas sobre héroes, mapas, lore y mecánicas de juego. ¡Compite por estar en lo más alto del ranking!', 
          inline: false 
        },
        { 
          name: '🔧 Workshop Code Manager', 
          value: 'Encuentra, comparte y valora códigos de workshop para modos personalizados, entrenamientos de aim, minijuegos y mucho más.', 
          inline: false 
        },
        { 
          name: '📊 Estadísticas', 
          value: '• Mapas: 30+ mapas con información detallada\n• Quiz: 100+ preguntas de diversas categorías\n• Workshop: Creciente base de datos de códigos', 
          inline: false 
        },
        { 
          name: '🆕 Actualizaciones Recientes', 
          value: '• Nuevos mapas de Overwatch 2\n• Sistema de Workshop Code Manager\n• Mejoras en la presentación visual', 
          inline: false 
        }
      )
      .setFooter({ text: 'Desarrollado con 💙 para la comunidad de Overwatch | v1.0.0' })
      .setTimestamp();

    // Crear botones para acceso rápido a los comandos principales
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('info_map')
          .setLabel('Mapas')
          .setStyle(ButtonStyle.Primary)
          .setEmoji('🗺️'),
        new ButtonBuilder()
          .setCustomId('info_quiz')
          .setLabel('Quiz')
          .setStyle(ButtonStyle.Success)
          .setEmoji('🎮'),
        new ButtonBuilder()
          .setCustomId('info_workshop')
          .setLabel('Workshop')
          .setStyle(ButtonStyle.Secondary)
          .setEmoji('🔧'),
        new ButtonBuilder()
          .setURL('https://discord.com/api/oauth2/authorize?client_id=TU_CLIENT_ID&permissions=274878221376&scope=bot%20applications.commands')
          .setLabel('Invitar Bot')
          .setStyle(ButtonStyle.Link)
          .setEmoji('➕')
      );

    // Enviar respuesta
    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: false // Visible para todos en el canal
    });

    // Configurar colector para los botones
    const filter = i => i.customId.startsWith('info_') && i.user.id === interaction.user.id;
    const collector = interaction.channel.createMessageComponentCollector({ filter, time: 60000 });

    collector.on('collect', async i => {
      if (i.customId === 'info_map') {
        // Crear embed de información sobre el comando map
        const mapEmbed = new EmbedBuilder()
          .setTitle('🗺️ Sistema de Mapas')
          .setDescription('El sistema de mapas te proporciona información detallada sobre todos los mapas disponibles en Overwatch 2.')
          .setColor('#1CA8FA') // Azul
          .addFields(
            { name: 'Uso Básico', value: '`/map` - Muestra un menú con todos los mapas disponibles', inline: false },
            { name: 'Información Disponible', value: '• Tipo de mapa (Control, Escolta, Híbrido, etc.)\n• Ubicación en el lore\n• Dificultad\n• Mejores héroes para el mapa\n• Héroes no recomendados\n• Información estratégica', inline: false },
            { name: 'Características', value: '• Imágenes oficiales de los mapas\n• Información actualizada hasta 2025\n• Recomendaciones basadas en meta actual', inline: false },
            { name: 'Tip', value: 'Revisa los mejores héroes para cada mapa antes de jugar para mejorar tus posibilidades de victoria.', inline: false }
          )
          .setImage('https://static.playoverwatch.com/img/pages/maps/images/kings-row.jpg')
          .setFooter({ text: 'Usa /map para explorar todos los mapas de Overwatch 2' });

        await i.update({ embeds: [mapEmbed], components: [row] });
      } 
      else if (i.customId === 'info_quiz') {
        // Crear embed de información sobre el comando quiz
        const quizEmbed = new EmbedBuilder()
          .setTitle('🎮 Sistema de Quiz')
          .setDescription('Pon a prueba tus conocimientos sobre Overwatch 2 con nuestro sistema de quiz interactivo.')
          .setColor('#57DE1C') // Verde
          .addFields(
            { name: 'Comandos Disponibles', value: '`/quiz start [tipo]` - Inicia un nuevo quiz\n`/quizrank` - Muestra el ranking de puntuaciones', inline: false },
            { name: 'Tipos de Quiz', value: '• **heroes** - Preguntas sobre habilidades y roles\n• **maps** - Preguntas sobre mapas y objetivos\n• **lore** - Preguntas sobre la historia de Overwatch\n• **random** - Mezcla de todas las categorías', inline: false },
            { name: 'Sistema de Puntuación', value: 'Cada respuesta correcta suma puntos. El tiempo de respuesta también influye en la puntuación final. Las mejores puntuaciones se guardan en el ranking global.', inline: false },
            { name: 'Tip', value: 'Practica con diferentes categorías para convertirte en un verdadero experto en Overwatch 2.', inline: false }
          )
          .setFooter({ text: 'Usa /quiz start para comenzar un nuevo desafío' });

        await i.update({ embeds: [quizEmbed], components: [row] });
      }
      else if (i.customId === 'info_workshop') {
        // Crear embed de información sobre el comando workshop
        const workshopEmbed = new EmbedBuilder()
          .setTitle('🔧 Workshop Code Manager')
          .setDescription('Encuentra y comparte códigos de workshop para Overwatch 2.')
          .setColor('#9E43F9') // Púrpura
          .addFields(
            { name: 'Comandos Disponibles', value: 
              '`/workshop search [término]` - Busca códigos por palabra clave\n' +
              '`/workshop category [categoría]` - Filtra por categoría\n' +
              '`/workshop hero [héroe]` - Busca códigos para un héroe específico\n' +
              '`/workshop popular` - Muestra los códigos más populares\n' +
              '`/workshop new` - Muestra los códigos más recientes\n' +
              '`/workshop add` - Añade un nuevo código\n' +
              '`/workshop rate` - Valora un código existente', 
              inline: false 
            },
            { name: 'Categorías Disponibles', value: '• Entrenamiento\n• Minijuegos\n• PvP\n• PvE\n• Parkour\n• Supervivencia\n• Otros', inline: false },
            { name: 'Características', value: '• Valoraciones de la comunidad\n• Instrucciones detalladas\n• Compatibilidad con Overwatch 2\n• Búsqueda por héroe', inline: false },
            { name: 'Tip', value: 'Valora los códigos que uses para ayudar a otros jugadores a encontrar los mejores.', inline: false }
          )
          .setFooter({ text: 'Usa /workshop para explorar todos los códigos disponibles' });

        await i.update({ embeds: [workshopEmbed], components: [row] });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        // Opcional: Puedes elegir si quieres modificar el mensaje cuando expire el collector
        // En este caso decidimos no hacerlo para mantener la información visible
      }
    });
  }
};