// src/commands/quizrank.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const scoreService = require('../services/ScoreService');

// Crear un mapa de mensajes de ranking activos para un mejor control
const activeRankings = new Map();

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quizrank')
    .setDescription('Muestra el ranking del quiz de Overwatch 2'),
  
  async execute(interaction) {
    try {
      // Verificar si la interacción sigue siendo válida
      if (!interaction.isCommand()) {
        console.log('Interacción no válida recibida');
        return;
      }

      // Obtener los datos del usuario actual
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      // Obtener los datos de ranking (top 10 jugadores)
      const topPlayers = await this.getTopPlayers(scoreService, 10);
      
      // Obtener puntaje del usuario
      const userScore = await this.getUserScore(userId, scoreService) || 0;
      
      // Crear el embed mejorado
      const embed = this.createRankingEmbed(topPlayers, userId, userScore, interaction);
      
      // Crear botones para el ranking
      const row = this.createActionButtons();
      
      // Responder con el embed y los botones usando la nueva sintaxis
      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        // Usar withResponse en lugar de fetchReply (Discord.js v14+)
        withResponse: true
      });
      
      // Guardar la referencia del mensaje para control posterior
      if (reply) {
        activeRankings.set(reply.id, {
          userId: interaction.user.id,
          messageId: reply.id,
          channelId: interaction.channelId,
          guildId: interaction.guildId,
          timestamp: Date.now()
        });
        
        // Configurar collector para los botones
        this.setupButtonCollector(interaction, reply);
      }
      
      // Limpiar rankings antiguos (más de 1 hora)
      this.cleanupOldRankings();
      
    } catch (error) {
      console.error('Error al mostrar el ranking:', error);
      
      // Manejo de errores mejorado con verificación de estado de interacción
      try {
        if (!interaction.replied && !interaction.deferred) {
          await interaction.reply({
            content: 'Ha ocurrido un error al cargar el ranking. Por favor, inténtalo de nuevo más tarde.',
            flags: 64 // Ephemeral flag
          });
        } else if (interaction.deferred) {
          await interaction.editReply({
            content: 'Ha ocurrido un error al cargar el ranking. Por favor, inténtalo de nuevo más tarde.'
          });
        }
      } catch (replyError) {
        console.error('Error al enviar mensaje de error:', replyError);
      }
    }
  },
  
  /**
   * Limpia rankings antiguos del mapa de control
   */
  cleanupOldRankings() {
    const now = Date.now();
    const ONE_HOUR = 3600000;
    
    for (const [id, data] of activeRankings.entries()) {
      if (now - data.timestamp > ONE_HOUR) {
        activeRankings.delete(id);
      }
    }
  },
  
  /**
   * Crea un embed mejorado para el ranking
   * @param {Array} topPlayers - Lista de jugadores mejor puntuados
   * @param {string} userId - ID del usuario actual
   * @param {number} userScore - Puntuación del usuario actual
   * @param {Interaction} interaction - Objeto de interacción
   * @returns {EmbedBuilder} Embed con el ranking
   */
  createRankingEmbed(topPlayers, userId, userScore, interaction) {
    // Crear embed base con diseño mejorado
    const embed = new EmbedBuilder()
      .setColor('#F99E1A') // Color naranja de Overwatch
      .setTitle('🏆 Ranking del Quiz de Overwatch 2')
      .setDescription(`${this.getRandomMotivationalPhrase()}\n\n${this.formatTopPlayers(topPlayers, userId)}`)
      .setThumbnail('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt5a7c3dc494771b95/6233336c12894d313443adc2/ow2-logo-small.png')
      .setFooter({
        text: `Actualizado • ${new Date().toLocaleTimeString()} • ${this.formatDate(new Date())}`,
        iconURL: interaction?.guild?.iconURL?.() || undefined
      });
    
    // Agregar estadísticas generales si hay jugadores
    if (topPlayers.length > 0) {
      // Calcular total de puntos y media
      const totalPoints = topPlayers.reduce((sum, player) => sum + player.points, 0);
      const averagePoints = Math.round(totalPoints / topPlayers.length);
      
      embed.addFields({
        name: '📈 Estadísticas',
        value: `**Total participantes:** ${topPlayers.length}\n**Puntuación media:** ${averagePoints} pts`,
        inline: true
      });
    }
    
    return embed;
  },
  
  /**
   * Crea botones de acción para el ranking
   * @returns {ActionRowBuilder} Fila con botones
   */
  createActionButtons() {
    const row = new ActionRowBuilder()
      .addComponents(
        new ButtonBuilder()
          .setCustomId('play_quiz')
          .setLabel('Jugar Quiz')
          .setStyle(ButtonStyle.Danger)
          .setEmoji('🎮')
      )
      .addComponents(
        new ButtonBuilder()
          .setCustomId('view_my_stats')
          .setLabel('Mis Estadísticas')
          .setStyle(ButtonStyle.Success)
          .setEmoji('📋')
      );
    
    return row;
  },
  
  /**
   * Configura el collector para los botones con manejo mejorado de errores
   * @param {Interaction} interaction - Interacción original
   * @param {Message} reply - Mensaje de respuesta
   */
  setupButtonCollector(interaction, reply) {
    try {
      // Filtro para detectar interacciones con los botones
      const filter = i => {
        // Verificar si es uno de nuestros botones
        const validCustomId = i.customId === 'play_quiz' || i.customId === 'view_my_stats';
        
        // Si estamos en el mensaje correcto
        return validCustomId && i.message.id === reply.id;
      };
      
      // Crear collector sobre el mensaje específico con tiempo reducido
      const collector = reply.createMessageComponentCollector({ 
        filter, 
        time: 300000 // 5 minutos (en lugar de 1 hora)
      });
      
      // Manejar interacciones
      collector.on('collect', async i => {
        try {
          // Verificar que la interacción sigue siendo válida
          if (!i.isButton()) {
            console.log('Interacción no es un botón');
            return;
          }

          // Detener el collector actual para evitar problemas
          collector.stop();
          
          // Verificar si ya fue respondida
          if (i.replied || i.deferred) {
            console.log('Interacción ya fue procesada');
            return;
          }

          // Hacer deferUpdate INMEDIATAMENTE
          await i.deferUpdate();
          
          // Manejar según el tipo de botón
          if (i.customId === 'play_quiz') {
            await this.handleQuizButton(i, interaction);
          } 
          else if (i.customId === 'view_my_stats') {
            await this.handleStatsButton(i, interaction);
          }
          
        } catch (error) {
          console.error('Error en interacción con botón:', error);
          
          // Intentar mostrar un mensaje de error si es posible
          try {
            if (!i.replied && !i.deferred) {
              await i.reply({
                content: `⚠️ Ha ocurrido un error al procesar tu solicitud. Por favor, usa \`/quizrank\` nuevamente.`,
                flags: 64 // Ephemeral
              });
            }
          } catch (replyError) {
            console.error('No se pudo enviar mensaje de error:', replyError);
          }
        }
      });

      // Manejar fin del collector
      collector.on('end', collected => {
        console.log(`Collector terminado. Interacciones procesadas: ${collected.size}`);
        // Opcional: deshabilitar botones cuando expire
        this.disableButtons(reply).catch(err => {
          console.error('Error al deshabilitar botones:', err);
        });
      });

    } catch (error) {
      console.error('Error al configurar collector:', error);
    }
  },

  /**
   * Deshabilita los botones de un mensaje
   * @param {Message} message - Mensaje a modificar
   */
  async disableButtons(message) {
    try {
      if (!message || !message.components) return;

      const disabledComponents = message.components.map(row => {
        const newRow = new ActionRowBuilder();
        row.components.forEach(component => {
          const newButton = ButtonBuilder.from(component)
            .setDisabled(true);
          newRow.addComponents(newButton);
        });
        return newRow;
      });

      await message.edit({
        components: disabledComponents
      });
    } catch (error) {
      console.error('Error al deshabilitar botones:', error);
    }
  },
  
  /**
   * Maneja el botón de "Jugar Quiz" con manejo mejorado
   * @param {ButtonInteraction} i - Interacción del botón
   * @param {Interaction} originalInteraction - Interacción original del comando
   */
  async handleQuizButton(i, originalInteraction) {
    try {
      // Obtener el comando quiz
      const { client } = originalInteraction;
      const quizCommand = client.commands.get('quiz');
      
      if (!quizCommand) {
        await i.editReply({
          content: "❌ No se pudo encontrar el comando de quiz. Por favor, usa `/quiz` directamente.",
          embeds: [],
          components: []
        });
        return;
      }
      
      // Actualizar mensaje con "cargando..."
      await i.editReply({
        content: "🎮 **Iniciando quiz...**",
        embeds: [],
        components: []
      });
      
      // Simular interacción para el quiz usando un enfoque más seguro
      const simulatedInteraction = this.createSimulatedInteraction(i, originalInteraction);
      
      // Ejecutar el comando quiz
      await quizCommand.execute(simulatedInteraction);
      
    } catch (error) {
      console.error('Error al ejecutar quiz desde botón:', error);
      
      try {
        await i.editReply({
          content: "❌ Ocurrió un error al iniciar el quiz. Por favor, usa `/quiz` directamente.",
          embeds: [],
          components: []
        });
      } catch (editError) {
        console.error('Error al mostrar mensaje de error:', editError);
      }
    }
  },

  /**
   * Crea una interacción simulada más robusta
   * @param {ButtonInteraction} buttonInteraction - Interacción del botón
   * @param {Interaction} originalInteraction - Interacción original
   * @returns {Object} Interacción simulada
   */
  createSimulatedInteraction(buttonInteraction, originalInteraction) {
    return {
      user: buttonInteraction.user,
      channel: buttonInteraction.channel,
      guild: buttonInteraction.guild,
      client: buttonInteraction.client,
      
      // Propiedades necesarias
      isCommand: () => true,
      replied: false,
      deferred: false,
      
      // Opciones simuladas
      options: {
        getString: () => null,
        getInteger: () => null,
        getBoolean: () => null
      },
      
      // Métodos simulados
      reply: async (options) => {
        try {
          return await buttonInteraction.editReply(options);
        } catch (err) {
          console.error('Error en reply simulado:', err);
          throw err;
        }
      },
      
      editReply: async (options) => {
        try {
          return await buttonInteraction.editReply(options);
        } catch (err) {
          console.error('Error en editReply simulado:', err);
          throw err;
        }
      },
      
      deferReply: async () => {
        // Ya hicimos deferUpdate, no necesitamos hacer nada más
        return Promise.resolve();
      },
      
      followUp: async (options) => {
        try {
          return await buttonInteraction.channel.send(options);
        } catch (err) {
          console.error('Error en followUp simulado:', err);
          throw err;
        }
      }
    };
  },
  
  /**
   * Maneja el botón de "Ver Estadísticas"
   * @param {ButtonInteraction} i - Interacción del botón
   * @param {Interaction} originalInteraction - Interacción original del comando
   */
  async handleStatsButton(i, originalInteraction) {
    try {
      const userId = i.user.id;
      const username = i.user.username;
      
      // Obtener estadísticas del usuario
      const userStats = await this.getUserStats(userId, scoreService);
      
      // Crear embed para estadísticas del usuario
      const embed = new EmbedBuilder()
        .setColor('#43B581') // Verde
        .setTitle(`📊 Estadísticas de ${username}`)
        .setThumbnail(i.user.displayAvatarURL())
        .setDescription(`Resumen de tu desempeño en el Quiz de Overwatch 2.`);
      
      // Formatear estadísticas
      const statsText = this.formatUserStats(userStats);
      
      embed.addFields({
        name: '🌐 Tus Estadísticas',
        value: statsText,
        inline: false
      });
      
      // Mensaje motivacional
      embed.addFields({
        name: '💪 ¡Sigue mejorando!',
        value: this.getRandomMotivationalPhrase(),
        inline: false
      });
      
      // Crear botones para estadísticas
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('new_quiz')
            .setLabel('Jugar Quiz')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🎮'),
          new ButtonBuilder()
            .setCustomId('back_ranking')
            .setLabel('Volver al Ranking')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🔙')
        );
      
      // Actualizar el mensaje con las estadísticas
      await i.editReply({
        content: null,
        embeds: [embed],
        components: [row]
      });
      
      // Configurar nuevo collector para estos botones
      this.setupStatsButtonCollector(i, originalInteraction);
      
    } catch (error) {
      console.error('Error al mostrar estadísticas del usuario:', error);
      
      try {
        await i.editReply({
          content: "❌ Ocurrió un error al cargar tus estadísticas. Por favor, intenta de nuevo más tarde.",
          embeds: [],
          components: []
        });
      } catch (editError) {
        console.error('Error al mostrar mensaje de error de estadísticas:', editError);
      }
    }
  },

  /**
   * Configura collector para botones de estadísticas
   * @param {ButtonInteraction} statsInteraction - Interacción de estadísticas
   * @param {Interaction} originalInteraction - Interacción original
   */
  async setupStatsButtonCollector(statsInteraction, originalInteraction) {
    try {
      const message = await statsInteraction.fetchReply();
      
      const filter = i => 
        (i.customId === 'new_quiz' || i.customId === 'back_ranking') &&
        i.message.id === message.id &&
        i.user.id === statsInteraction.user.id;
      
      const collector = message.createMessageComponentCollector({
        filter,
        time: 300000 // 5 minutos
      });
      
      collector.on('collect', async interaction => {
        try {
          collector.stop();
          
          if (interaction.replied || interaction.deferred) return;
          
          await interaction.deferUpdate();
          
          if (interaction.customId === 'new_quiz') {
            await this.handleQuizButton(interaction, originalInteraction);
          } 
          else if (interaction.customId === 'back_ranking') {
            await this.showRanking(interaction, originalInteraction);
          }
          
        } catch (error) {
          console.error('Error en collector de estadísticas:', error);
        }
      });
      
    } catch (error) {
      console.error('Error al configurar collector de estadísticas:', error);
    }
  },

  /**
   * Obtiene estadísticas del usuario de forma segura
   * @param {string} userId - ID del usuario
   * @param {Object} scoreService - Servicio de puntuaciones
   * @returns {Object} Estadísticas del usuario
   */
  async getUserStats(userId, scoreService) {
    try {
      // Intentar obtener estadísticas detalladas
      if (scoreService.getUserDetailedStats && typeof scoreService.getUserDetailedStats === 'function') {
        return await scoreService.getUserDetailedStats(userId);
      }
      
      // Alternativa: construir estadísticas básicas
      const globalScore = await this.getUserScore(userId, scoreService) || 0;
      const globalPosition = await this.getUserPosition(userId, scoreService) || 0;
      
      return {
        global: {
          score: globalScore,
          position: globalPosition
        },
        totalAnswered: 0,
        correctAnswers: 0,
        streak: 0,
        bestStreak: 0
      };
      
    } catch (error) {
      console.error('Error al obtener estadísticas del usuario:', error);
      return {
        global: { score: 0, position: 0 },
        totalAnswered: 0,
        correctAnswers: 0,
        streak: 0,
        bestStreak: 0
      };
    }
  },

  /**
   * Formatea las estadísticas del usuario
   * @param {Object} userStats - Estadísticas del usuario
   * @returns {string} Texto formateado
   */
  formatUserStats(userStats) {
    let statsText = '';
    
    if (userStats.global?.score) {
      statsText += `**Puntuación total:** ${userStats.global.score} pts\n`;
    }
    if (userStats.global?.position) {
      const medalEmoji = this.getMedalEmoji(userStats.global.position);
      statsText += `**Posición en ranking:** ${medalEmoji} #${userStats.global.position}\n`;
    }
    if (userStats.totalAnswered) {
      statsText += `**Preguntas respondidas:** ${userStats.totalAnswered}\n`;
    }
    if (userStats.correctAnswers && userStats.totalAnswered) {
      const percentage = Math.round((userStats.correctAnswers / userStats.totalAnswered) * 100);
      statsText += `**Respuestas correctas:** ${userStats.correctAnswers} (${percentage}%)\n`;
    }
    if (userStats.streak) {
      statsText += `**Racha actual:** ${userStats.streak}\n`;
    }
    if (userStats.bestStreak) {
      statsText += `**Mejor racha:** ${userStats.bestStreak}`;
    }
    
    return statsText || 'No hay estadísticas disponibles todavía. ¡Juega algunos quiz para ver tus resultados!';
  },
  
  /**
   * Muestra el ranking nuevamente
   * @param {ButtonInteraction} i - Interacción del botón
   * @param {Interaction} originalInteraction - Interacción original del comando
   */
  async showRanking(i, originalInteraction) {
    try {
      const userId = i.user.id;
      
      // Obtener nueva información para el ranking
      const topPlayers = await this.getTopPlayers(scoreService, 10);
      const userScore = await this.getUserScore(userId, scoreService) || 0;
      
      // Crear el embed actualizado
      const embed = this.createRankingEmbed(topPlayers, userId, userScore, originalInteraction);
      
      // Crear botones para el ranking
      const row = this.createActionButtons();
      
      // Actualizar el mensaje con el ranking
      await i.editReply({
        content: null,
        embeds: [embed],
        components: [row]
      });
      
      // Configurar un nuevo collector
      const updatedMessage = await i.fetchReply();
      this.setupButtonCollector(originalInteraction, updatedMessage);
      
    } catch (error) {
      console.error('Error al volver al ranking:', error);
      
      try {
        await i.editReply({
          content: "❌ Ocurrió un error al cargar el ranking. Por favor, usa `/quizrank` nuevamente.",
          embeds: [],
          components: []
        });
      } catch (editError) {
        console.error('Error al mostrar mensaje de error de ranking:', editError);
      }
    }
  },
  
  /**
   * Obtiene los jugadores con mayor puntaje
   * @param {Object} scoreService - Servicio de puntuaciones
   * @param {number} limit - Límite de jugadores a mostrar
   * @returns {Array} Lista de jugadores ordenados por puntaje
   */
  async getTopPlayers(scoreService, limit = 10) {
    try {
      // Si existe getRanking, usarlo
      if (scoreService.getRanking && typeof scoreService.getRanking === 'function') {
        return await scoreService.getRanking(limit);
      }
      
      // Alternativa: construir el ranking manualmente
      if (scoreService.getAllScores && typeof scoreService.getAllScores === 'function') {
        const allScores = await scoreService.getAllScores();
        
        // Convertir a array y ordenar
        const players = Object.entries(allScores)
          .map(([userId, points]) => ({ userId, points }))
          .sort((a, b) => b.points - a.points)
          .slice(0, limit);
        
        return players;
      }
      
      // Si no hay datos, devolver array vacío
      return [];
    } catch (error) {
      console.error('Error al obtener top players:', error);
      return [];
    }
  },
  
  /**
   * Obtiene el puntaje de un usuario
   * @param {string} userId - ID del usuario
   * @param {Object} scoreService - Servicio de puntuaciones
   * @returns {number} Puntaje del usuario
   */
  async getUserScore(userId, scoreService) {
    try {
      // Verificar si existe el método getUserScore
      if (scoreService.getUserScore && typeof scoreService.getUserScore === 'function') {
        return await scoreService.getUserScore(userId);
      }
      
      // Alternativa usando getAllScores
      if (scoreService.getAllScores && typeof scoreService.getAllScores === 'function') {
        const allScores = await scoreService.getAllScores();
        return allScores[userId] || 0;
      }
      
      // En caso de que ninguno esté disponible
      return 0;
    } catch (error) {
      console.error('Error al obtener puntaje:', error);
      return 0;
    }
  },
  
  /**
   * Obtiene la posición del usuario en el ranking
   * @param {string} userId - ID del usuario
   * @param {Object} scoreService - Servicio de puntuaciones
   * @returns {number} Posición del usuario en el ranking
   */
  async getUserPosition(userId, scoreService) {
    try {
      // Si existe un método específico para obtener posición
      if (scoreService.getUserPosition && typeof scoreService.getUserPosition === 'function') {
        return await scoreService.getUserPosition(userId);
      }
      
      // Obtener todos los puntajes
      const allScores = await scoreService.getAllScores();
      
      // Convertir a array, ordenar y encontrar posición
      const allPlayers = Object.entries(allScores)
        .map(([id, points]) => ({ userId: id, points }))
        .sort((a, b) => b.points - a.points);
      
      const position = allPlayers.findIndex(player => player.userId === userId);
      
      return position >= 0 ? position + 1 : 0;
    } catch (error) {
      console.error('Error al obtener posición del usuario:', error);
      return 0;
    }
  },
  
  /**
   * Formatea la lista de jugadores para mostrar en el embed
   * @param {Array} players - Lista de jugadores
   * @param {string} currentUserId - ID del usuario actual
   * @returns {string} Texto formateado para mostrar en el embed
   */
  formatTopPlayers(players, currentUserId) {
    if (!players || players.length === 0) {
      return 'No hay jugadores en el ranking todavía. ¡Sé el primero en jugar!';
    }
    
    return players.map((player, index) => {
      const position = index + 1;
      const medalEmoji = this.getMedalEmoji(position);
      const isCurrentUser = player.userId === currentUserId;
      
      // Formato mejorado con emojis y destacado para el usuario actual
      let userDisplay = `<@${player.userId}>`;
      
      // Agregar un indicador para el usuario actual
      if (isCurrentUser) {
        userDisplay = `**${userDisplay} (Tú)**`;
      }
      
      // Mostrar puntuación con formato
      const pointsDisplay = `**${player.points}** pts`;
      
      // Combinar todo
      return `${medalEmoji} ${userDisplay}: ${pointsDisplay}${player.streak ? ` 🔥 Racha: ${player.streak}` : ''}`;
    }).join('\n\n');
  },
  
  /**
   * Devuelve un emoji según la posición
   * @param {number} position - Posición del jugador
   * @returns {string} Emoji correspondiente
   */
  getMedalEmoji(position) {
    const medals = {
      1: '🥇',
      2: '🥈',
      3: '🥉',
      4: '4️⃣',
      5: '5️⃣',
      6: '6️⃣',
      7: '7️⃣',
      8: '8️⃣',
      9: '9️⃣',
      10: '🔟'
    };
    
    return medals[position] || `\`${position}.\``;
  },
  
  /**
   * Formatea la fecha en formato legible
   * @param {Date} date - Fecha a formatear
   * @returns {string} Fecha formateada
   */
  formatDate(date) {
    const options = { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric'
    };
    
    return date.toLocaleDateString('es-ES', options);
  },
  
  /**
   * Devuelve una frase motivacional aleatoria
   * @returns {string} Frase motivacional
   */
  getRandomMotivationalPhrase() {
    const phrases = [
      "🌟 ¡Demuestra tus conocimientos de Overwatch 2 y alcanza la cima!",
      "🚀 ¡Cada pregunta te acerca más a la gloria en el mundo de Overwatch!",
      "💪 ¡El conocimiento es poder! ¿Cuánto sabes realmente sobre OW2?",
      "🏆 ¡Los héroes nunca mueren... y los expertos en OW2 tampoco!",
      "🔥 ¡El mundo necesita héroes... y también expertos en Overwatch 2!",
      "⚔️ ¡Compite con otros jugadores y demuestra quién sabe más!",
      "🛡️ ¡Protege tu rango respondiendo correctamente!",
      "🎯 ¡Apunta a la cima del ranking y conviértete en leyenda!",
      "🌍 ¡El futuro pertenece a quienes conocen mejor Overwatch 2!",
      "✨ ¡Brilla con tu conocimiento y alcanza nuevas alturas!"
    ];
    
    return phrases[Math.floor(Math.random() * phrases.length)];
  }
};