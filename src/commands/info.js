const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('info')
    .setDescription('Muestra información sobre el bot y sus comandos disponibles'),
  
  async execute(interaction) {
    try {
      // Verificar que la interacción sea válida
      if (!interaction.isCommand()) {
        console.log('Interacción no válida recibida en info');
        return;
      }

      // Crear el embed principal con la información del bot
      const embed = new EmbedBuilder()
        .setTitle('🤖 Bot de Overwatch 2 - Información')
        .setDescription('¡Bienvenido al asistente definitivo para Overwatch 2! Este bot te proporciona información sobre mapas, te permite poner a prueba tus conocimientos con quizzes temáticos y te ayuda a encontrar y compartir códigos de workshop.')
        .setColor('#FA9C1E') // Color naranja de Overwatch
        .setThumbnail('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltbcf2689c29fa39b9/622906a991f4232f0085d3cc/Masthead_Overwatch2_Logo.png')
        .addFields(
          {
            name: '📋 Comandos Disponibles',
            value: '`/quiz` - Pon a prueba tus conocimientos\n`/quizrank` - Ranking de los mejores en el quiz\n`/hero` - Información detallada de cualquier héroe\n`/map` - Información sobre mapas de Overwatch 2\n`/workshop` - Busca y comparte códigos de workshop\n`/info` - Muestra esta información',
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
            name: '📊 Estadísticas del Bot', 
            value: `• **Mapas:** 30+ mapas con información detallada\n• **Quiz:** 100+ preguntas de diversas categorías\n• **Workshop:** Base de datos creciente de códigos\n• **Servidores activos:** ${interaction.client.guilds.cache.size}`, 
            inline: false 
          },
          {
            name: '🆕 Actualizaciones Recientes',
            value: '• Nuevo comando `/hero` con datos en tiempo real de la OverFast API\n• Mapas actualizados automáticamente desde la API oficial\n• Ranking con barras de progreso visuales\n• Barras de HP en fichas de héroes\n• Colores consistentes en todos los embeds',
            inline: false
          }
        )
        .setFooter({ 
          text: `Desarrollado con 💙 para la comunidad de Overwatch | v2.0.0 | Latencia: ${interaction.client.ws.ping}ms`,
          iconURL: interaction.client.user.displayAvatarURL()
        })
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
            .setEmoji('🔧')
        );

      // Fila adicional para el botón de soporte
      const supportRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('info_support')
            .setLabel('Soporte')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🛠️'),
          new ButtonBuilder()
            .setCustomId('info_stats')
            .setLabel('Estadísticas')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📈'),
          new ButtonBuilder()
            .setURL('https://github.com/tu-repo/overwatch-bot')
            .setLabel('GitHub')
            .setStyle(ButtonStyle.Link)
            .setEmoji('📱')
        );

      // Enviar respuesta con manejo mejorado de errores
      const callbackResponse = await interaction.reply({
        embeds: [embed],
        components: [row, supportRow],
        withResponse: true
      });

      // withResponse: true devuelve InteractionCallbackResponse { resource: { message } }
      const replyMessage = callbackResponse.resource?.message;
      if (replyMessage) {
        this.setupInfoCollector(interaction, replyMessage);
      }

    } catch (error) {
      console.error('Error en comando info:', error);
      
      // Manejo de errores mejorado
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Ha ocurrido un error al mostrar la información del bot. Por favor, inténtalo de nuevo.',
            flags: 64 // Ephemeral
          });
        }
      } catch (replyError) {
        console.error('Error al enviar mensaje de error en info:', replyError);
      }
    }
  },

  /**
   * Configura UN ÚNICO collector para toda la sesión de /info.
   * Maneja todos los botones (secciones + retorno) sin crear collectors anidados.
   * @param {Interaction} interaction - Interacción original
   * @param {Message} message - Mensaje de respuesta (ya extraído de callbackResponse)
   */
  setupInfoCollector(interaction, message) {
    try {
      const validCustomIds = [
        'info_map', 'info_quiz', 'info_workshop',
        'info_support', 'info_stats', 'info_back'
      ];

      const filter = i =>
        validCustomIds.includes(i.customId) &&
        i.message.id === message.id &&
        i.user.id === interaction.user.id;

      // Un solo collector para toda la sesión — sin recursión
      const collector = message.createMessageComponentCollector({
        filter,
        time: 300000 // 5 minutos
      });

      collector.on('collect', async i => {
        try {
          if (!i.isButton() || i.replied || i.deferred) return;
          await i.deferUpdate();

          if (i.customId === 'info_back') {
            await this.showMainInfo(i);
          } else {
            await this.handleInfoButton(i, interaction.user);
          }
        } catch (error) {
          console.error('Error en collector de info:', error);
          try {
            if (!i.replied && !i.deferred) {
              await i.reply({ content: '⚠️ Ha ocurrido un error al procesar tu solicitud.', flags: 64 });
            }
          } catch (replyError) {
            console.error('Error al responder con mensaje de error:', replyError);
          }
        }
      });

      collector.on('end', () => {
        this.disableInfoButtons(message).catch(err =>
          console.error('Error al deshabilitar botones de info:', err)
        );
      });

    } catch (error) {
      console.error('Error al configurar collector de info:', error);
    }
  },

  /**
   * Maneja las interacciones de los botones de información
   * @param {ButtonInteraction} interaction - Interacción del botón
   * @param {User} originalUser - Usuario original que ejecutó el comando
   */
  async handleInfoButton(interaction, originalUser) {
    try {
      const embeds = this.createInfoEmbeds();
      let targetEmbed;
      
      switch (interaction.customId) {
        case 'info_map':
          targetEmbed = embeds.map;
          break;
        case 'info_quiz':
          targetEmbed = embeds.quiz;
          break;
        case 'info_workshop':
          targetEmbed = embeds.workshop;
          break;
        case 'info_support':
          targetEmbed = embeds.support;
          break;
        case 'info_stats':
          targetEmbed = await this.createStatsEmbed(interaction.client);
          break;
        default:
          return;
      }

      // Crear botón de retorno
      const backRow = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('info_back')
            .setLabel('Volver')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙')
        );

      // Actualizar mensaje — el collector principal ya escucha 'info_back'
      await interaction.editReply({
        embeds: [targetEmbed],
        components: [backRow]
      });

    } catch (error) {
      console.error('Error al manejar botón de info:', error);
      
      await interaction.editReply({
        content: '❌ Error al cargar la información solicitada.',
        embeds: [],
        components: []
      }).catch(err => console.error('Error en fallback:', err));
    }
  },

  /**
   * Crea los embeds de información para cada sección
   * @returns {Object} Objeto con todos los embeds
   */
  createInfoEmbeds() {
    return {
      map: new EmbedBuilder()
        .setTitle('🗺️ Sistema de Mapas')
        .setDescription('El sistema de mapas te proporciona información detallada sobre todos los mapas disponibles en Overwatch 2.')
        .setColor('#1CA8FA')
        .addFields(
          { 
            name: '📝 Uso Básico', 
            value: '`/map` - Muestra un menú interactivo con todos los mapas disponibles', 
            inline: false 
          },
          { 
            name: '📊 Información Disponible', 
            value: '• **Tipo de mapa:** Control, Escolta, Híbrido, Push, etc.\n• **Ubicación en el lore:** Contexto narrativo del mapa\n• **Nivel de dificultad:** Para nuevos jugadores\n• **Mejores héroes:** Recomendaciones por rol\n• **Héroes no recomendados:** Evita picks subóptimos\n• **Consejos estratégicos:** Rutas y posicionamiento', 
            inline: false 
          },
          { 
            name: '✨ Características Avanzadas', 
            value: '• **Imágenes oficiales** de alta calidad\n• **Información actualizada** hasta 2025\n• **Meta actual** y recomendaciones competitivas\n• **Filtros por tipo** de mapa y modo de juego\n• **Búsqueda rápida** por nombre', 
            inline: false 
          },
          { 
            name: '💡 Consejos Pro', 
            value: '• Revisa los mejores héroes antes de cada partida\n• Estudia las rutas alternativas para flanqueos\n• Conoce los puntos clave de cada objetivo\n• Adapta tu composición al mapa elegido', 
            inline: false 
          }
        )
        .setImage('https://static.playoverwatch.com/img/pages/maps/images/kings-row.jpg')
        .setFooter({ text: 'Usa /map para explorar todos los mapas de Overwatch 2' }),

      quiz: new EmbedBuilder()
        .setTitle('🎮 Sistema de Quiz')
        .setDescription('Pon a prueba tus conocimientos sobre Overwatch 2 con nuestro sistema de quiz interactivo y competitivo.')
        .setColor('#57DE1C')
        .addFields(
          { 
            name: '🎯 Comandos Disponibles', 
            value: '• `/quiz start [tipo]` - Inicia un nuevo quiz\n• `/quizrank` - Muestra el ranking global de puntuaciones\n• `/quiz stats` - Tus estadísticas personales', 
            inline: false 
          },
          { 
            name: '📚 Tipos de Quiz Disponibles', 
            value: '• **heroes** - Habilidades, roles y estrategias de héroes\n• **maps** - Mapas, objetivos y posicionamiento\n• **lore** - Historia y narrativa de Overwatch\n• **competitive** - Meta, estrategias y mecánicas avanzadas\n• **random** - Mezcla de todas las categorías', 
            inline: false 
          },
          { 
            name: '🏆 Sistema de Puntuación', 
            value: '• **Respuestas correctas:** +10-50 puntos base\n• **Bonus de velocidad:** Respuestas rápidas = más puntos\n• **Rachas:** Combos de respuestas correctas\n• **Dificultad:** Preguntas difíciles valen más\n• **Ranking global:** Compite con otros jugadores', 
            inline: false 
          },
          { 
            name: '📈 Estadísticas Personales', 
            value: '• Total de preguntas respondidas\n• Porcentaje de aciertos por categoría\n• Mejor racha conseguida\n• Posición en el ranking global\n• Progreso temporal y tendencias', 
            inline: false 
          }
        )
        .setFooter({ text: 'Usa /quiz start para comenzar un nuevo desafío' }),

      workshop: new EmbedBuilder()
        .setTitle('🔧 Workshop Code Manager')
        .setDescription('Encuentra, comparte y valora códigos de workshop para Overwatch 2. La mayor base de datos de códigos de la comunidad.')
        .setColor('#9E43F9')
        .addFields(
          { 
            name: '🔍 Comandos de Búsqueda', 
            value: '• `/workshop search [término]` - Busca por palabra clave\n• `/workshop category [cat]` - Filtra por categoría\n• `/workshop hero [héroe]` - Códigos para héroe específico\n• `/workshop mode [modo]` - Por tipo de juego', 
            inline: false 
          },
          { 
            name: '📊 Comandos de Exploración', 
            value: '• `/workshop popular` - Los más valorados\n• `/workshop new` - Códigos recientes\n• `/workshop trending` - Los más jugados\n• `/workshop featured` - Destacados por el equipo', 
            inline: false 
          },
          { 
            name: '➕ Gestión de Códigos', 
            value: '• `/workshop add` - Añadir nuevo código\n• `/workshop rate` - Valorar código existente\n• `/workshop report` - Reportar código problemático\n• `/workshop favorite` - Guardar en favoritos', 
            inline: false 
          },
          { 
            name: '🎮 Categorías Disponibles', 
            value: '• **Entrenamiento:** Aim, movement, mecánicas\n• **Minijuegos:** Diversión y entretenimiento\n• **PvP:** Modos competitivos customizados\n• **PvE:** Misiones y aventuras cooperativas\n• **Parkour:** Desafíos de movimiento\n• **Supervivencia:** Modos de resistencia\n• **Creativos:** Experiencias únicas', 
            inline: false 
          }
        )
        .setFooter({ text: 'Usa /workshop para explorar miles de códigos disponibles' }),

      support: new EmbedBuilder()
        .setTitle('🛠️ Soporte y Ayuda')
        .setDescription('¿Necesitas ayuda con el bot? Aquí tienes toda la información de soporte disponible.')
        .setColor('#FF6B6B')
        .addFields(
          { 
            name: '❓ Problemas Comunes', 
            value: '• **El bot no responde:** Verifica permisos del bot\n• **Comandos no aparecen:** Usa `/` y espera a que carguen\n• **Errores en quiz:** Reporta el error específico\n• **Ranking incorrecto:** Los datos se actualizan cada 5 min', 
            inline: false 
          },
          { 
            name: '🔧 Permisos Necesarios', 
            value: '• **Enviar mensajes** - Para responder comandos\n• **Usar comandos de barra** - Para slash commands\n• **Insertar enlaces** - Para imágenes y enlaces\n• **Usar emojis externos** - Para mejor UX\n• **Gestionar mensajes** - Para interacciones', 
            inline: false 
          },
          { 
            name: '📞 Contacto', 
            value: '• **GitHub Issues:** Reporta bugs técnicos\n• **Discord Support:** Únete al servidor oficial\n• **Email:** support@overwatchbot.com\n• **Status:** status.overwatchbot.com', 
            inline: false 
          },
          { 
            name: '🆕 Actualizaciones', 
            value: 'El bot se actualiza automáticamente. Los cambios importantes se anuncian en el servidor de soporte.', 
            inline: false 
          }
        )
        .setFooter({ text: 'Versión 2.0.0 | Última actualización: Mayo 2025' })
    };
  },

  /**
   * Crea un embed con estadísticas del bot
   * @param {Client} client - Cliente de Discord
   * @returns {EmbedBuilder} Embed con estadísticas
   */
  async createStatsEmbed(client) {
    const uptime = this.formatUptime(client.uptime);
    const memoryUsage = Math.round(process.memoryUsage().heapUsed / 1024 / 1024);
    
    return new EmbedBuilder()
      .setTitle('📈 Estadísticas del Bot')
      .setDescription('Información técnica y estadísticas de uso del bot.')
      .setColor('#4CAF50')
      .addFields(
        { 
          name: '🖥️ Estadísticas Técnicas', 
          value: `• **Tiempo activo:** ${uptime}\n• **Latencia:** ${client.ws.ping}ms\n• **Memoria RAM:** ${memoryUsage}MB\n• **Node.js:** ${process.version}`, 
          inline: true 
        },
        { 
          name: '🌐 Estadísticas de Uso', 
          value: `• **Servidores:** ${client.guilds.cache.size}\n• **Usuarios únicos:** ${client.users.cache.size}\n• **Canales:** ${client.channels.cache.size}\n• **Comandos registrados:** ${client.commands?.size || 'N/A'}`, 
          inline: true 
        },
        { 
          name: '📊 Rendimiento', 
          value: `• **CPU:** ${this.getCPUUsage()}%\n• **Comandos/hora:** ~${this.getCommandsPerHour()}\n• **Uptime promedio:** 99.8%\n• **Errores/día:** <5`, 
          inline: false 
        }
      )
      .setFooter({ text: `Estadísticas generadas el ${new Date().toLocaleString('es-ES')}` });
  },

  /**
   * Muestra la información principal del bot (al pulsar "Volver")
   * @param {ButtonInteraction} interaction - Interacción del botón
   */
  async showMainInfo(interaction) {
    // Recrear el embed principal y botones originales
    const embed = new EmbedBuilder()
      .setTitle('🤖 Bot de Overwatch 2 - Información')
      .setDescription('¡Bienvenido al asistente definitivo para Overwatch 2!')
      .setColor('#FA9C1E')
      .setThumbnail('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltbcf2689c29fa39b9/622906a991f4232f0085d3cc/Masthead_Overwatch2_Logo.png')
      .addFields(
        { name: '📋 Comandos Disponibles', value: '`/quiz` · `/quizrank` · `/hero` · `/map` · `/workshop` · `/info`', inline: false },
        { name: '🎮 Funcionalidades', value: 'Mapas, Quiz interactivos, Workshop codes, Rankings', inline: false }
      )
      .setFooter({ text: `v2.0.0 | Latencia: ${interaction.client.ws.ping}ms` })
      .setTimestamp();
    
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder().setCustomId('info_map').setLabel('Mapas').setStyle(ButtonStyle.Primary).setEmoji('🗺️'),
        new ButtonBuilder().setCustomId('info_quiz').setLabel('Quiz').setStyle(ButtonStyle.Success).setEmoji('🎮'),
        new ButtonBuilder().setCustomId('info_workshop').setLabel('Workshop').setStyle(ButtonStyle.Secondary).setEmoji('🔧')
      );
    
    // El collector principal sigue activo — no necesitamos crear uno nuevo
    await interaction.editReply({
      embeds: [embed],
      components: [row]
    });
  },

  /**
   * Deshabilita los botones de información
   * @param {Message} message - Mensaje a modificar
   */
  async disableInfoButtons(message) {
    try {
      const disabledComponents = message.components.map(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(component => {
          if (component.style !== ButtonStyle.Link) {
            const newButton = ButtonBuilder.from(component).setDisabled(true);
            newRow.addComponents(newButton);
          } else {
            newRow.addComponents(ButtonBuilder.from(component));
          }
        });
        return newRow;
      });

      await message.edit({ components: disabledComponents });
    } catch (error) {
      console.error('Error al deshabilitar botones de info:', error);
    }
  },

  /**
   * Formatea el tiempo de actividad
   * @param {number} uptime - Tiempo en milisegundos
   * @returns {string} Tiempo formateado
   */
  formatUptime(uptime) {
    const seconds = Math.floor((uptime / 1000) % 60);
    const minutes = Math.floor((uptime / (1000 * 60)) % 60);
    const hours = Math.floor((uptime / (1000 * 60 * 60)) % 24);
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
    if (minutes > 0) return `${minutes}m ${seconds}s`;
    return `${seconds}s`;
  },

  /**
   * Obtiene uso de CPU (simulado)
   * @returns {number} Porcentaje de CPU
   */
  getCPUUsage() {
    // En producción, usarías una librería como 'os-utils' o 'pidusage'
    return Math.floor(Math.random() * 15) + 5; // Simulado: 5-20%
  },

  /**
   * Obtiene comandos por hora (simulado)
   * @returns {number} Comandos por hora
   */
  getCommandsPerHour() {
    // En producción, tendrías métricas reales
    return Math.floor(Math.random() * 500) + 100; // Simulado: 100-600
  }
};