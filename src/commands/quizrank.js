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
      
      // Responder con el embed y los botones
      const reply = await interaction.reply({
        embeds: [embed],
        components: [row],
        fetchReply: true // Importante: obtener el mensaje de respuesta
      });
      
      // Guardar la referencia del mensaje para control posterior
      activeRankings.set(reply.id, {
        userId: interaction.user.id,
        messageId: reply.id,
        channelId: interaction.channelId,
        guildId: interaction.guildId,
        timestamp: Date.now()
      });
      
      // Configurar collector para los botones
      this.setupButtonCollector(interaction, reply);
      
      // Limpiar rankings antiguos (más de 1 hora)
      this.cleanupOldRankings();
      
    } catch (error) {
      console.error('Error al mostrar el ranking:', error);
      await interaction.reply({
        content: 'Ha ocurrido un error al cargar el ranking. Por favor, inténtalo de nuevo más tarde.',
        ephemeral: true
      }).catch(console.error);
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
        iconURL: interaction?.guild?.iconURL?.() || null
      })
      .setImage('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt94e4f408edc8bebf/62aa9a573737c86bf5b1160c/header_overwatch2_logo.jpg');
    
    // Si el usuario no está en el top, mostrar su posición
    if (!topPlayers.some(player => player.userId === userId) && userScore > 0) {
      // Encontrar la posición del usuario
      this.getUserPosition(userId, scoreService).then(userPosition => {
        if (userPosition > 0) {
          const medalEmoji = this.getMedalEmoji(userPosition);
          
          // Agregar campo con la información del usuario
          embed.addFields({
            name: '📊 Tu posición en el ranking',
            value: `${medalEmoji} <@${userId}>: **${userScore}** pts (Posición #${userPosition})`
          });
        }
      }).catch(error => {
        console.error('Error al obtener posición del usuario:', error);
      });
    }
    
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
   * Configura el collector para los botones
   * @param {Interaction} interaction - Interacción original
   * @param {Message} reply - Mensaje de respuesta
   */
  setupButtonCollector(interaction, reply) {
    // Filtro para detectar interacciones con los botones
    const filter = i => {
      // Verificar si es uno de nuestros botones
      const validCustomId = i.customId === 'play_quiz' || i.customId === 'view_my_stats';
      
      // Si estamos en el mensaje correcto
      return validCustomId && i.message.id === reply.id;
    };
    
    // Crear collector sobre el mensaje específico (más confiable)
    const collector = reply.createMessageComponentCollector({ 
      filter, 
      time: 3600000 // 1 hora
    });
    
    // Manejar interacciones
    collector.on('collect', async i => {
      try {
        // Detener el collector actual para evitar problemas
        collector.stop();
        
        // CRUCIAL: Primero hacer deferUpdate
        await i.deferUpdate().catch(err => {
          // Sólo registrar errores no relacionados con interacciones ya reconocidas
          if (err.code !== 40060) { // 40060 es "Interaction has already been acknowledged"
            console.error('Error al usar deferUpdate:', err);
          }
        });
        
        // Actualizar mensaje con "cargando..."
        try {
          await i.editReply({
            content: i.customId === 'play_quiz' ? "🎮 **Iniciando quiz...**" : "📊 **Cargando estadísticas...**",
            embeds: [],
            components: []
          });
        } catch (error) {
          console.error('Error al actualizar mensaje con cargando:', error);
          // No bloqueamos la ejecución, continuamos
        }
        
        // Manejar según el tipo de botón
        if (i.customId === 'play_quiz') {
          // Iniciar quiz en nueva interacción para evitar problemas
          await this.handleQuizButton(i, interaction);
        } 
        else if (i.customId === 'view_my_stats') {
          await this.handleStatsButton(i, interaction);
        }
      } catch (error) {
        console.error('Error en interacción con botón:', error);
        // Intentar mostrar un mensaje de error al usuario
        try {
          await interaction.channel.send({
            content: `⚠️ Ha ocurrido un error al procesar tu solicitud, ${interaction.user}. Por favor, intenta de nuevo usando \`/quizrank\` o \`/quiz\`.`,
            ephemeral: true
          }).catch(() => {}); // Silenciar errores adicionales
        } catch (e) {
          // Ignorar errores adicionales
        }
      }
    });
  },
  
/**
 * Maneja el botón de "Jugar Quiz"
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
    
    // Crear una interacción falsa basada en la interacción del botón
    const fakeInteraction = {
      user: i.user,
      channel: i.channel,
      guild: i.guild,
      client: i.client,
      
      // Opciones simuladas
      options: {
        getString: () => null // Simula que no se envió ninguna opción
      },
      
      // Métodos simulados
      reply: async (options) => {
        try {
          // Reemplazar el mensaje actual con la respuesta real del quiz
          return await i.editReply(options);
        } catch (err) {
          console.error('Error al responder con quiz simulado:', err);
          return null;
        }
      },
      
      editReply: async (options) => {
        try {
          return await i.editReply(options);
        } catch (err) {
          console.error('Error al editar quiz simulado:', err);
          return null;
        }
      },
      
      // Métodos adicionales que pueden ser necesarios
      deferReply: async () => Promise.resolve(),
      followUp: async (options) => {
        try {
          return await i.channel.send(options);
        } catch (err) {
          console.error('Error en followUp simulado:', err);
          return null;
        }
      }
    };
    
    // Ejecutar el comando quiz con la interacción simulada
    await quizCommand.execute(fakeInteraction);
    
  } catch (error) {
    console.error('Error al ejecutar quiz desde botón:', error);
    
    // Mostrar mensaje de error
    await i.editReply({
      content: "❌ Ocurrió un error al iniciar el quiz. Por favor, usa `/quiz` directamente.",
      embeds: [],
      components: []
    }).catch(() => {}); // Silenciamos errores adicionales
  }
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
      
      // Verificar si el servicio tiene un método para obtener estadísticas detalladas
      let userStats = null;
      
      if (scoreService.getUserDetailedStats && typeof scoreService.getUserDetailedStats === 'function') {
        userStats = await scoreService.getUserDetailedStats(userId);
      } else {
        // Alternativa: construir estadísticas básicas
        const globalScore = await this.getUserScore(userId, scoreService) || 0;
        const globalPosition = await this.getUserPosition(userId, scoreService) || 0;
        
        userStats = {
          global: {
            score: globalScore,
            position: globalPosition
          },
          // Valores que pueden no estar disponibles
          totalAnswered: 0,
          correctAnswers: 0,
          streak: 0,
          bestStreak: 0
        };
      }
      
      // Crear embed para estadísticas del usuario
      const embed = new EmbedBuilder()
        .setColor('#43B581') // Verde
        .setTitle(`📊 Estadísticas de ${username}`)
        .setThumbnail(i.user.displayAvatarURL())
        .setDescription(`Resumen de tu desempeño en el Quiz de Overwatch 2.`);
      
      // Estadísticas globales
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
      if (userStats.correctAnswers) {
        const percentage = userStats.totalAnswered > 0 
          ? Math.round((userStats.correctAnswers / userStats.totalAnswered) * 100) 
          : 0;
        statsText += `**Respuestas correctas:** ${userStats.correctAnswers} (${percentage}%)\n`;
      }
      if (userStats.streak) {
        statsText += `**Racha actual:** ${userStats.streak}\n`;
      }
      if (userStats.bestStreak) {
        statsText += `**Mejor racha:** ${userStats.bestStreak}`;
      }
      
      embed.addFields({
        name: '🌐 Tus Estadísticas',
        value: statsText || 'No hay estadísticas disponibles todavía. ¡Juega algunos quiz para ver tus resultados!',
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
      }).catch(err => {
        console.error('Error al mostrar estadísticas:', err);
      });
      
      // Crear un nuevo collector para estos botones
      const newMessage = await i.fetchReply().catch(() => null);
      if (!newMessage) return;
      
      const filter = interaction => 
        (interaction.customId === 'new_quiz' || 
         interaction.customId === 'back_ranking') &&
        interaction.message.id === newMessage.id;
      
      const collector = newMessage.createMessageComponentCollector({
        filter,
        time: 600000 // 10 minutos
      });
      
      collector.on('collect', async interaction => {
        try {
          // Detener el collector actual
          collector.stop();
          
          // Reconocer la interacción
          await interaction.deferUpdate().catch(err => {
            if (err.code !== 40060) {
              console.error('Error en deferUpdate de botones de estadísticas:', err);
            }
          });
          
          if (interaction.customId === 'new_quiz') {
            // Iniciar nuevo quiz
            await this.handleQuizButton(interaction, originalInteraction);
          } 
          else if (interaction.customId === 'back_ranking') {
            // Mostrar el ranking de nuevo
            await this.showRanking(interaction, originalInteraction);
          }
        } catch (error) {
          console.error('Error en interacción con botones de estadísticas:', error);
        }
      });
    } catch (error) {
      console.error('Error al mostrar estadísticas del usuario:', error);
      
      // Intentar mostrar un mensaje de error
      try {
        await i.editReply({
          content: "❌ Ocurrió un error al cargar tus estadísticas. Por favor, intenta de nuevo más tarde.",
          embeds: [],
          components: []
        }).catch(() => {});
      } catch (e) {
        // Ignorar errores adicionales
      }
    }
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
      }).catch(err => {
        console.error('Error al mostrar ranking actualizado:', err);
      });
      
      // Configurar un nuevo collector para este mensaje actualizado
      const updatedMessage = await i.fetchReply().catch(() => null);
      if (updatedMessage) {
        this.setupButtonCollector(originalInteraction, updatedMessage);
      }
    } catch (error) {
      console.error('Error al volver al ranking:', error);
      
      // Intentar mostrar un mensaje de error
      try {
        await i.editReply({
          content: "❌ Ocurrió un error al cargar el ranking. Por favor, usa `/quizrank` nuevamente.",
          embeds: [],
          components: []
        }).catch(() => {});
      } catch (e) {
        // Ignorar errores adicionales
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