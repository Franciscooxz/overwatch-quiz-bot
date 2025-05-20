// src/commands/quizrank.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const scoreService = require('../services/ScoreService');

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
      
      // Obtener puntaje del usuario (asumiendo que tienes un método para esto)
      const userScore = await this.getUserScore(userId, scoreService) || 0;
      
      // Crear el embed mejorado
      const embed = new EmbedBuilder()
        .setColor('#F99E1A') // Color naranja de Overwatch
        .setTitle('Ranking del Quiz de Overwatch 2')
        .setDescription(`🏆 **Top Quiz Masters de Overwatch 2** 🏆\n\n${this.formatTopPlayers(topPlayers, userId)}`)
        .setThumbnail('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt5a7c3dc494771b95/6233336c12894d313443adc2/ow2-logo-small.png')
        .setFooter({
          text: `Compite y sube en el ranking contestando más preguntas • hoy a las ${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`,
          iconURL: interaction?.guild?.iconURL?.() || null
        });
      
      // Si el usuario no está en el top, mostrar su posición
      if (!topPlayers.some(player => player.userId === userId) && userScore > 0) {
        // Encontrar la posición del usuario
        const userPosition = await this.getUserPosition(userId, scoreService);
        const medalEmoji = this.getMedalEmoji(userPosition);
        
        // Agregar campo con la información del usuario
        embed.addFields({
          name: 'Tu posición',
          value: `${medalEmoji} <@${userId}>: **${userScore}** pts`
        });
      }
      
      // Crear botón para jugar quiz
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId('play_quiz')
            .setLabel('Jugar Quiz')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('🎮')
        );
      
      // Responder con el embed y el botón
      await interaction.reply({
        embeds: [embed],
        components: [row]
      });
      
      // Configurar collector para el botón
      this.setupButtonCollector(interaction);
      
    } catch (error) {
      console.error('Error al mostrar el ranking:', error);
      await interaction.reply({
        content: 'Ha ocurrido un error al cargar el ranking. Por favor, inténtalo de nuevo más tarde.',
        ephemeral: true
      });
    }
  },
  
  /**
   * Configura el collector para el botón Jugar Quiz
   * @param {Interaction} interaction - Interacción original
   */
  setupButtonCollector(interaction) {
    // Filtro para detectar solo interacciones con el botón "play_quiz"
    const filter = i => i.customId === 'play_quiz';
    
    // Crear collector
    const collector = interaction.channel.createMessageComponentCollector({ 
      filter, 
      time: 3600000 // 1 hora
    });
    
    // Manejar interacciones
    collector.on('collect', async i => {
      try {
        // Responder a la interacción para evitar el error "Interaction failed"
        await i.deferUpdate();
        
        // Ejecutar el comando quiz directamente sin categoría ni dificultad (aleatorio)
        const { client } = interaction;
        const quizCommand = client.commands.get('quiz');
        
        if (!quizCommand) {
          await i.followUp({
            content: "No se pudo encontrar el comando de quiz. Por favor, usa `/quiz` directamente.",
            ephemeral: true
          });
          return;
        }
        
        // Crear una nueva interacción modificada para simular el comando /quiz sin opciones
        const modifiedInteraction = {
          ...i,
          options: {
            getString: () => null // Simula que no se envió ninguna opción
          },
          replied: false,
          deferred: false,
          // Asegurar que los métodos importantes estén disponibles
          reply: i.followUp.bind(i),
          editReply: async (options) => {
            // Si ya hay una respuesta de followUp, editarla
            if (response) {
              return await response.edit(options);
            }
            // Si no hay respuesta, crear una nueva
            else {
              return await i.followUp(options);
            }
          },
          user: i.user,
          channel: i.channel,
          guild: i.guild,
          client: i.client,
          // Para compatibilidad con tu código existente
          deferReply: async () => Promise.resolve(),
          followUp: i.followUp.bind(i)
        };
        
        // Enviar un mensaje inicial para que el usuario sepa que se está iniciando un quiz
        let response = await i.followUp("🎮 **Iniciando quiz aleatorio...**");
        
        // Ejecutar el comando quiz con la interacción modificada
        try {
          await quizCommand.execute(modifiedInteraction);
        } catch (error) {
          console.error('Error al ejecutar quiz aleatorio:', error);
          if (response) {
            await response.edit("❌ Ocurrió un error al iniciar el quiz. Por favor, usa `/quiz` directamente.");
          } else {
            await i.followUp({
              content: "❌ Ocurrió un error al iniciar el quiz. Por favor, usa `/quiz` directamente.",
              ephemeral: true
            });
          }
        }
      } catch (error) {
        console.error('Error en interacción con botón:', error);
        await i.followUp({
          content: "❌ Ocurrió un error inesperado. Por favor, usa `/quiz` directamente.",
          ephemeral: true
        });
      }
    });
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
      
      // Usar <@userId> para mencionar al usuario
      return `${medalEmoji} ${isCurrentUser ? '**' : ''}<@${player.userId}>: **${player.points}** pts${isCurrentUser ? '**' : ''}`;
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
      3: '🥉'
    };
    
    return medals[position] || `\`${position}.\``;
  }
};