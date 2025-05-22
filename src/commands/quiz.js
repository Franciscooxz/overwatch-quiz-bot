// src/commands/quiz.js
const { SlashCommandBuilder } = require('@discordjs/builders');
const { 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle, 
  EmbedBuilder,
  ComponentType 
} = require('discord.js');
const quizManager = require('../models/QuizManager');
const { 
  createQuizQuestionEmbed, 
  updateQuizResultEmbed, 
  createTimeoutEmbed 
} = require('../utils/embedBuilder');

// Tiempo de respuesta fijo en 30 segundos
const ANSWER_TIMEOUT = 30000;

// Definir emojis de letras aquí para que estén disponibles en todo el módulo
const LETTER_EMOJIS = ['🇦', '🇧', '🇨', '🇩'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('quiz')
    .setDescription('Juega al quiz de Overwatch 2')
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoría de preguntas')
        .setRequired(false)
        .addChoices(
          { name: 'Héroes', value: 'héroes' },
          { name: 'Habilidades', value: 'habilidades' },
          { name: 'Mapas', value: 'mapas' },
          { name: 'Historia', value: 'historia' },
          { name: 'Actualizaciones', value: 'actualizaciones' },
          { name: 'Competitivo', value: 'competitivo' }
        )
    )
    .addStringOption(option =>
      option.setName('dificultad')
        .setDescription('Nivel de dificultad')
        .setRequired(false)
        .addChoices(
          { name: 'Fácil', value: 'fácil' },
          { name: 'Media', value: 'media' },
          { name: 'Difícil', value: 'difícil' },
          { name: 'Experto', value: 'experto' }
        )
    ),
  
  async execute(interaction) {
    try {
      const categoria = interaction.options.getString('categoria');
      const dificultad = interaction.options.getString('dificultad');
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      // Verificar si el usuario ya tiene un quiz activo
      if (quizManager.getActiveGame && typeof quizManager.getActiveGame === 'function') {
        const activeGame = quizManager.getActiveGame(userId);
        if (activeGame) {
          return interaction.reply({
            content: "Ya tienes un quiz en progreso. ¡Termínalo antes de iniciar uno nuevo!",
            ephemeral: true
          });
        }
      }
      
      // Obtener pregunta aleatoria con los filtros
      const pregunta = quizManager.getRandomQuestion(categoria, dificultad);
      
      // Si no hay preguntas que cumplan los filtros
      if (!pregunta) {
        return interaction.reply({
          content: "No hay preguntas disponibles con esos filtros. ¡Intenta con otras opciones!",
          ephemeral: true
        });
      }
      
      // Crear el embed con la pregunta (ahora mejorado)
      const embed = this.createEnhancedEmbed(pregunta, username, categoria, dificultad, interaction);
      
      // Crear botones para las opciones
      const row = this.createOptionsButtons(pregunta);
      
      // Crear mensaje con temporizador y embed combinados
      const timerMessage = `⏱️ **${interaction.user.username}** tienes **30 segundos** para responder esta pregunta de Overwatch 2!`;
      
      // Enviar mensaje con temporizador y el embed
      await interaction.reply({
        content: timerMessage,
        embeds: [embed],
        components: [row]
      });
      
      // Registrar que este usuario tiene un juego activo
      if (quizManager.registerActiveGame && typeof quizManager.registerActiveGame === 'function') {
        quizManager.registerActiveGame(userId, pregunta.id);
      }
      
      // Configurar el collector para respuestas
      await this.setupResponseCollector(interaction, pregunta, embed, row, userId, categoria, dificultad);
    } catch (error) {
      console.error('Error al ejecutar comando quiz:', error);
      await interaction.reply({
        content: "Ha ocurrido un error al iniciar el quiz. Por favor, inténtalo de nuevo más tarde.",
        ephemeral: true
      });
    }
  },
  
  /**
   * Crea un embed mejorado para la pregunta con diseño visual avanzado
   * @param {Object} question - Pregunta completa
   * @param {string} username - Nombre del usuario
   * @param {string} categoria - Categoría seleccionada
   * @param {string} dificultad - Dificultad seleccionada
   * @param {Interaction} interaction - Interacción original
   * @returns {EmbedBuilder} Embed mejorado
   */
  createEnhancedEmbed(question, username, categoria, dificultad, interaction) {
    // Si hay una función existente, la usamos
    if (typeof createQuizQuestionEmbed === 'function') {
      return createQuizQuestionEmbed(question);
    }
    
    // Si no, creamos uno nuevo con diseño mejorado
    const difficultyColors = {
      'fácil': '#43B581',      // Verde
      'media': '#FAA61A',      // Amarillo
      'difícil': '#F04747',    // Rojo
      'experto': '#9B59B6'     // Púrpura
    };
    
    const difficultyEmojis = {
      'fácil': '🟢',
      'media': '🟡',
      'difícil': '🔴',
      'experto': '⚡'
    };
    
    const categoryEmojis = {
      'héroes': '👥',
      'habilidades': '✨',
      'mapas': '🗺️',
      'historia': '📚',
      'actualizaciones': '🔄',
      'competitivo': '🏆'
    };
    
    // Determinar el color según la dificultad o usar color predeterminado
    let color = '#5865F2'; // Color predeterminado (azul Discord)
    if (question.dificultad && difficultyColors[question.dificultad.toLowerCase()]) {
      color = difficultyColors[question.dificultad.toLowerCase()];
    }
    
    // Construir etiquetas de información
    let difficultyLabel = '';
    if (question.dificultad) {
      const emoji = question.dificultad.toLowerCase() in difficultyEmojis ? 
                    difficultyEmojis[question.dificultad.toLowerCase()] : 
                    '❓';
      difficultyLabel = `${emoji} ${question.dificultad}`;
    }
    
    let categoryLabel = '';
    if (question.categoria) {
      const emoji = question.categoria.toLowerCase() in categoryEmojis ? 
                   categoryEmojis[question.categoria.toLowerCase()] : 
                   '📋';
      categoryLabel = `${emoji} ${question.categoria}`;
    }
    
    // Crear el embed base con diseño mejorado
    const embed = new EmbedBuilder()
      .setColor(color)
      .setTitle(`${categoryEmojis[question.categoria.toLowerCase()] || '❓'} Pregunta de Overwatch 2`)
      .setDescription(`**${question.pregunta || question.texto}**`)
      .addFields(
        { name: LETTER_EMOJIS[0], value: question.opciones[0], inline: true },
        { name: LETTER_EMOJIS[1], value: question.opciones[1], inline: true },
        { name: '\u200B', value: '\u200B', inline: false }, // Separador invisible
        { name: LETTER_EMOJIS[2], value: question.opciones[2], inline: true },
        { name: LETTER_EMOJIS[3], value: question.opciones[3], inline: true }
      )
      .setFooter({
        text: `Quiz para ${username} • ${difficultyLabel} • ${categoryLabel}`.trim(),
        iconURL: interaction?.user?.displayAvatarURL?.() || null
      })
      .setTimestamp();
    
    // Imagen según la categoría - Imágenes más actualizadas y de alta calidad
    const categoryImages = {
      'héroes': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt0b41403bf33c96db/647e32b97b34ae6f50df26ae/Mauga_Social.jpg',
      'habilidades': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt60db75e6beb3d789/6466a7fa7b34ae67e0d37d4a/OW2_Mercy_16x9_Web.jpg',
      'mapas': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltde07aed43e044696/64266ca7b57bc765c567c87d/Antarctica-Banner.jpg',
      'historia': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt86c3f3986652c944/643fb36bb28d204b83fb4e2a/OW2_S4_PR_Kit_Banner_Storm_Rising.jpg',
      'actualizaciones': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt3aaa3c3dc96c824b/653bf2c2f4fa8d7ac3ec6a1d/OW2_Season-7_Game-Features_WotN-Banner_16-9.jpg',
      'competitivo': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt5241faed0f5a9aca/6516d7f244a6e87cc31c0182/OW2_SC2023_Comp-Updates_Header_16-9.jpg'
    };
    
    // Seleccionar imagen según la categoría
    if (question.categoria && categoryImages[question.categoria.toLowerCase()]) {
      embed.setImage(categoryImages[question.categoria.toLowerCase()]);
    } else {
      // Imagen por defecto de Overwatch 2
      embed.setImage('https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt94e4f408edc8bebf/62aa9a573737c86bf5b1160c/header_overwatch2_logo.jpg');
    }
    
    // Agregar thumbnail específico para la dificultad
    const difficultyThumbnails = {
      'fácil': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt0dca8c81f6343fa5/62a3855a8dce4d7c6f17d4bf/OW2_Hero_DVA_Tile.png',
      'media': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/bltcff0402db4ab5bf0/62a3858bfd7aa57c7e0d74b9/OW2_Hero_Genji_Tile.png',
      'difícil': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt86be0b18e23dc4ae/62a385e1fd7aa57c7e0d74c3/OW2_Hero_Pharah_Tile.png',
      'experto': 'https://blz-contentstack-images.akamaized.net/v3/assets/blt9c12f249ac15c7ec/blt7dcc1464017af809/62a3862cca891230bfb1c7bd/OW2_Hero_Widowmaker_Tile.png'
    };
    
    if (question.dificultad && difficultyThumbnails[question.dificultad.toLowerCase()]) {
      embed.setThumbnail(difficultyThumbnails[question.dificultad.toLowerCase()]);
    }
    
    // Si la pregunta tiene una imagen específica, reemplazar la imagen genérica
    if (question.imagen) {
      embed.setImage(question.imagen);
    }
    
    return embed;
  },
  
  /**
   * Crea los botones de opciones para una pregunta con estilo mejorado
   * @param {Object} question - Pregunta completa
   * @returns {ActionRowBuilder} Fila con botones
   */
  createOptionsButtons(question) {
    const row = new ActionRowBuilder();
    const labels = ['A', 'B', 'C', 'D'];
    
    question.opciones.forEach((opcion, index) => {
      row.addComponents(
        new ButtonBuilder()
          .setCustomId(`quiz_${question.id}_${index}`)
          .setLabel(labels[index])
          .setEmoji(LETTER_EMOJIS[index])
          .setStyle(ButtonStyle.Primary) // Todos azules (Primary)
      );
    });
    
    return row;
  },
  
  /**
   * Configura el collector para las respuestas con mejor manejo de errores
   * @param {Interaction} interaction - Interacción original
   * @param {Object} question - Pregunta completa
   * @param {EmbedBuilder} embed - Embed de la pregunta
   * @param {ActionRowBuilder} row - Fila con botones
   * @param {string} userId - ID del usuario que inició el comando
   * @param {string} categoria - Categoría de la pregunta
   * @param {string} dificultad - Dificultad de la pregunta
   */
  async setupResponseCollector(interaction, question, embed, row, userId, categoria, dificultad) {
    // Filtro avanzado para garantizar que solo el usuario que inició el quiz pueda responder
    const filter = i => {
      // Verificar si es un botón de respuesta
      const isAnswerButton = i.customId.startsWith(`quiz_${question.id}`);
      
      // Verificar si es el botón de continuar
      const isContinueButton = i.customId === `quiz_continue_${question.id}`;
      
      // Verificar si es el usuario correcto
      const isCorrectUser = i.user.id === userId;
      
      // Si alguien más intenta responder o continuar, le informamos que no puede
      if ((isAnswerButton || isContinueButton) && !isCorrectUser) {
        i.reply({ 
          content: `Solo ${interaction.user.username} puede interactuar con este quiz.`, 
          ephemeral: true 
        });
        return false;
      }
      
      return (isAnswerButton || isContinueButton) && isCorrectUser;
    };
    
    try {
      const collector = interaction.channel.createMessageComponentCollector({
        filter,
        time: ANSWER_TIMEOUT,
        componentType: ComponentType.Button
      });
      
      collector.on('collect', async i => {
        try {
          // Verificar si es el botón de continuar
          if (i.customId === `quiz_continue_${question.id}`) {
            // Obtener la siguiente dificultad (rotación) manteniendo la categoría
            const nextDifficulty = this.getNextDifficulty(dificultad);
            
            // Iniciar nuevo quiz con la misma categoría y la siguiente dificultad
            await this.startNewQuiz(i, categoria, nextDifficulty);
            collector.stop();
            return;
          }
          
          // Si llegamos aquí, es un botón de respuesta
          // Obtener el índice seleccionado
          const selectedIndex = parseInt(i.customId.split('_')[2]);
          
          // Actualizar botones según la respuesta
          this.updateButtons(row, question.respuestaCorrecta, selectedIndex);
          
          // Procesar la respuesta
          const result = await quizManager.processAnswer(
            userId,
            question,
            selectedIndex
          );
          
          // Actualizar el embed con el resultado
          if (typeof updateQuizResultEmbed === 'function') {
            updateQuizResultEmbed(embed, result);
          } else {
            this.updateResultEmbed(embed, result, question, selectedIndex);
          }
          
          // Crear fila de botones de navegación mejorados
          const continueRow = new ActionRowBuilder()
            .addComponents(
              new ButtonBuilder()
                .setCustomId(`quiz_continue_${question.id}`)
                .setLabel(`Siguiente pregunta (${this.getNextDifficultyDisplay(dificultad)})`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('▶️')
            );
          
          // Eliminar el mensaje de temporizador y actualizar con el embed y botones
          await i.update({
            content: null, // Eliminar el mensaje de temporizador
            embeds: [embed],
            components: [row, continueRow] // Agregar fila con botón de continuar
          });
          
          // Liberar el estado de juego activo
          if (quizManager.clearActiveGame && typeof quizManager.clearActiveGame === 'function') {
            quizManager.clearActiveGame(userId);
          }
          
          // Establecer un nuevo tiempo para el botón de continuar
          setTimeout(async () => {
            try {
              // Verificar si el collector ya está cerrado
              if (collector.ended) return;
              
              // Si no, cerrar el collector
              collector.stop();
            } catch (error) {
              console.error('Error al finalizar collector tras respuesta:', error);
            }
          }, 60000); // 1 minuto para decidir si continuar
          
        } catch (error) {
          console.error('Error al procesar respuesta:', error);
          await i.reply({
            content: "Ha ocurrido un error al procesar tu respuesta.",
            ephemeral: true
          });
        }
      });
      
      collector.on('end', async collected => {
        try {
          // Si no se interactuó con ningún botón (timeout)
          if (collected.size === 0) {
            // Si el usuario no respondió a tiempo
            this.updateButtons(row, question.respuestaCorrecta);
            
            // Actualizar embed para timeout
            if (typeof createTimeoutEmbed === 'function') {
              createTimeoutEmbed(embed, question.opciones[question.respuestaCorrecta]);
            } else {
              this.createTimeoutEmbed(embed, question, question.respuestaCorrecta);
            }
            
            // Actualizar el mensaje eliminando el texto de temporizador
            await interaction.editReply({
              content: null, // Eliminar el mensaje de temporizador
              embeds: [embed],
              components: [row]
            });
            
            // Liberar el estado de juego activo
            if (quizManager.clearActiveGame && typeof quizManager.clearActiveGame === 'function') {
              quizManager.clearActiveGame(userId);
            }
            
            // Mensaje adicional sobre tiempo agotado
            await interaction.channel.send({
              content: `⌛ **¡Se acabó el tiempo, ${interaction.user.username}!** La respuesta correcta era **${question.opciones[question.respuestaCorrecta]}**`,
              allowedMentions: { parse: [] } // Evitar menciones
            });
          }
          // Si se respondió pero no se dio a continuar, no hacemos nada extra
        } catch (error) {
          console.error('Error en el evento end del collector:', error);
        }
      });
    } catch (error) {
      console.error('Error al configurar collector:', error);
      await interaction.channel.send("Ha ocurrido un error inesperado con el quiz.");
    }
  },
  
  /**
   * Inicia un nuevo quiz con categoría y dificultad especificadas
   * @param {ButtonInteraction} interaction - Interacción del botón
   * @param {string} categoria - Categoría de la pregunta
   * @param {string} dificultad - Dificultad de la pregunta
   */
  async startNewQuiz(interaction, categoria, dificultad) {
    try {
      const userId = interaction.user.id;
      const username = interaction.user.username;
      
      // Mensaje temporal animado mientras se carga la siguiente pregunta
      await interaction.update({
        content: "🔄 **Preparando siguiente pregunta...**",
        embeds: [],
        components: []
      });
      
      // Obtener pregunta aleatoria con los filtros
      const pregunta = quizManager.getRandomQuestion(categoria, dificultad);
      
      // Si no hay preguntas que cumplan los filtros
      if (!pregunta) {
        return interaction.editReply({
          content: `No hay más preguntas disponibles de dificultad **${dificultad}** en la categoría **${categoria}**. ¡Intenta con otras opciones!`,
          embeds: [],
          components: []
        });
      }
      
      // Crear el embed con la nueva pregunta
      const embed = this.createEnhancedEmbed(pregunta, username, categoria, dificultad, interaction);
      
      // Crear botones para las opciones
      const row = this.createOptionsButtons(pregunta);
      
      // Crear mensaje con temporizador y embed combinados
      const timerMessage = `⏱️ **${username}** tienes **30 segundos** para responder esta pregunta de Overwatch 2!`;
      
      // Actualizar mensaje con nueva pregunta
      await interaction.editReply({
        content: timerMessage,
        embeds: [embed],
        components: [row]
      });
      
      // Registrar que este usuario tiene un juego activo
      if (quizManager.registerActiveGame && typeof quizManager.registerActiveGame === 'function') {
        quizManager.registerActiveGame(userId, pregunta.id);
      }
      
      // Configurar el collector para respuestas de la nueva pregunta
      await this.setupResponseCollector(interaction, pregunta, embed, row, userId, categoria, dificultad);
      
    } catch (error) {
      console.error('Error al iniciar nuevo quiz:', error);
      await interaction.editReply({
        content: "Ha ocurrido un error al cargar la siguiente pregunta. Por favor, intenta con `/quiz` directamente.",
        embeds: [],
        components: []
      });
    }
  },
  
  /**
   * Obtiene la siguiente dificultad en rotación
   * @param {string} currentDifficulty - Dificultad actual
   * @returns {string} Siguiente dificultad
   */
  getNextDifficulty(currentDifficulty) {
    const difficulties = ['fácil', 'media', 'difícil', 'experto'];
    
    // Si no hay dificultad actual, elegir aleatoriamente
    if (!currentDifficulty) {
      const randomIndex = Math.floor(Math.random() * difficulties.length);
      return difficulties[randomIndex];
    }
    
    // Encontrar el índice de la dificultad actual
    const currentIndex = difficulties.findIndex(
      diff => diff.toLowerCase() === currentDifficulty.toLowerCase()
    );
    
    // Si no se encuentra, elegir aleatoriamente
    if (currentIndex === -1) {
      const randomIndex = Math.floor(Math.random() * difficulties.length);
      return difficulties[randomIndex];
    }
    
    // Obtener la siguiente dificultad (o volver al principio)
    const nextIndex = (currentIndex + 1) % difficulties.length;
    return difficulties[nextIndex];
  },
  
  /**
   * Obtiene un texto formateado para mostrar la siguiente dificultad
   * @param {string} currentDifficulty - Dificultad actual
   * @returns {string} Texto de siguiente dificultad
   */
  getNextDifficultyDisplay(currentDifficulty) {
    const nextDifficulty = this.getNextDifficulty(currentDifficulty);
    
    const difficultyEmojis = {
      'fácil': '🟢',
      'media': '🟡',
      'difícil': '🔴',
      'experto': '⚡'
    };
    
    const emoji = difficultyEmojis[nextDifficulty] || '❓';
    
    // Convertir primera letra a mayúscula
    const formattedDifficulty = nextDifficulty.charAt(0).toUpperCase() + nextDifficulty.slice(1);
    
    return `${emoji} ${formattedDifficulty}`;
  },
  
  /**
   * Actualiza los botones según la respuesta con estilos mejorados
   * @param {ActionRowBuilder} row - Fila con botones
   * @param {number} correctIndex - Índice de la respuesta correcta
   * @param {number} selectedIndex - Índice seleccionado (opcional)
   */
  updateButtons(row, correctIndex, selectedIndex = null) {
    const labels = ['A', 'B', 'C', 'D'];
    const resultEmojis = {
      correct: '✅',
      incorrect: '❌'
    };
    
    row.components.forEach((button, index) => {
      // Deshabilitar todos los botones
      button.setDisabled(true);
      
      // Cambiar estilo según el resultado
      if (index === correctIndex) {
        button.setStyle(ButtonStyle.Success);
        button.setEmoji(resultEmojis.correct);
      } else if (selectedIndex !== null && index === selectedIndex) {
        button.setStyle(ButtonStyle.Danger);
        button.setEmoji(resultEmojis.incorrect);
      } else {
        button.setStyle(ButtonStyle.Secondary);
        button.setEmoji(LETTER_EMOJIS[index]); // Usar la constante global
      }
    });
  },
  
  /**
   * Actualiza el embed con el resultado (función de respaldo)
   * @param {EmbedBuilder} embed - Embed de la pregunta
   * @param {Object} result - Resultado del procesamiento
   * @param {Object} question - Pregunta original
   * @param {number} selectedIndex - Índice seleccionado
   */
  updateResultEmbed(embed, result, question, selectedIndex) {
    const isCorrect = selectedIndex === question.respuestaCorrecta;
    
    if (isCorrect) {
      embed.setColor('#43B581'); // Verde para respuesta correcta
      embed.setTitle('✅ ¡Respuesta Correcta!');
      
      // Agregar un mensaje motivacional para respuesta correcta
      embed.addFields({
        name: '🌟 ¡Buen trabajo!',
        value: `Has elegido correctamente: **${question.opciones[question.respuestaCorrecta]}**`,
        inline: false
      });
    } else {
      embed.setColor('#F04747'); // Rojo para respuesta incorrecta
      embed.setTitle('❌ Respuesta Incorrecta');
      
      // Agregar campo para mostrar la respuesta correcta con diseño mejorado
      embed.addFields({
        name: '💡 Respuesta Correcta',
        value: `La respuesta correcta era: **${question.opciones[question.respuestaCorrecta]}**`,
        inline: false
      });
    }
    
    // Agregar explicación si existe
    if (question.explicacion) {
      embed.addFields({
        name: '📝 Explicación',
        value: question.explicacion,
        inline: false
      });
    }
    
    // Agregar estadísticas si existen en el resultado con mejor presentación
    if (result && result.stats) {
      let statsText = '';
      
      if (result.stats.totalAnswered) {
        statsText += `📊 **Preguntas respondidas:** ${result.stats.totalAnswered}\n`;
      }
      
      if (result.stats.correctAnswers) {
        const percentage = result.stats.totalAnswered > 0 
          ? Math.round((result.stats.correctAnswers / result.stats.totalAnswered) * 100) 
          : 0;
        statsText += `✅ **Respuestas correctas:** ${result.stats.correctAnswers} (${percentage}%)\n`;
      }
      
      if (result.stats.streak) {
        statsText += `🔥 **Racha actual:** ${result.stats.streak}`;
      }
      
      if (statsText) {
        embed.addFields({
          name: '📈 Estadísticas',
          value: statsText,
          inline: false
        });
      }
    }
  },
  
  /**
   * Crea un embed para cuando se agota el tiempo (función de respaldo)
   * @param {EmbedBuilder} embed - Embed de la pregunta
   * @param {Object} question - Pregunta original
   * @param {number} correctIndex - Índice de la respuesta correcta
   */
  createTimeoutEmbed(embed, question, correctIndex) {
    embed.setColor('#747F8D'); // Gris para timeout
    embed.setTitle('⌛ ¡Tiempo Agotado!');
    
    // Agregar campo para mostrar la respuesta correcta con diseño mejorado
    embed.addFields({
      name: '💡 Respuesta Correcta',
      value: `La respuesta correcta era: **${question.opciones[correctIndex]}**`,
      inline: false
    });
    
    // Agregar explicación si existe
    if (question.explicacion) {
      embed.addFields({
        name: '📝 Explicación',
        value: question.explicacion,
        inline: false
      });
    }
    
    // Agregar mensaje de ánimo
    embed.addFields({
      name: '🌠 ¡Sigue intentando!',
      value: 'La próxima vez tendrás más suerte. ¡Cada pregunta es una oportunidad para aprender!',
      inline: false
    });
  }
};