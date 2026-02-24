const { SlashCommandBuilder } = require('@discordjs/builders');
const { ActionRowBuilder, StringSelectMenuBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
// Singleton: una sola instancia comparte caché y estado en todo el bot
const workshopService = require('../services/workshopCodeService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('workshop')
    .setDescription('Gestiona y encuentra códigos de Workshop para Overwatch 2')
    .addSubcommand(subcommand =>
      subcommand
        .setName('search')
        .setDescription('Busca códigos de workshop')
        .addStringOption(option =>
          option.setName('término')
            .setDescription('Término de búsqueda')
            .setRequired(true)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('category')
        .setDescription('Busca códigos por categoría')
        .addStringOption(option =>
          option.setName('categoría')
            .setDescription('Categoría a buscar')
            .setRequired(true)
            .addChoices(
              { name: 'Entrenamiento', value: 'Entrenamiento' },
              { name: 'Minijuegos', value: 'Minijuegos' },
              { name: 'PvP', value: 'PvP' },
              { name: 'PvE', value: 'PvE' },
              { name: 'Parkour', value: 'Parkour' },
              { name: 'Supervivencia', value: 'Supervivencia' },
              { name: 'Otros', value: 'Otros' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('hero')
        .setDescription('Busca códigos para un héroe específico')
        .addStringOption(option =>
          option.setName('héroe')
            .setDescription('Héroe a buscar')
            .setRequired(true)
            .addChoices(
              { name: 'Todos los héroes', value: 'All' },
              { name: 'Ana', value: 'Ana' },
              { name: 'Ashe', value: 'Ashe' },
              { name: 'Baptiste', value: 'Baptiste' },
              // Añadir todos los héroes aquí
              { name: 'Zenyatta', value: 'Zenyatta' }
            )))
    .addSubcommand(subcommand =>
      subcommand
        .setName('popular')
        .setDescription('Muestra los códigos más populares'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('new')
        .setDescription('Muestra los códigos más recientes'))
    .addSubcommand(subcommand =>
      subcommand
        .setName('add')
        .setDescription('Añade un nuevo código de workshop')
        .addStringOption(option =>
          option.setName('código')
            .setDescription('Código del workshop')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('título')
            .setDescription('Título del modo de juego')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('categoría')
            .setDescription('Categoría del modo')
            .setRequired(true)
            .addChoices(
              { name: 'Entrenamiento', value: 'Entrenamiento' },
              { name: 'Minijuegos', value: 'Minijuegos' },
              { name: 'PvP', value: 'PvP' },
              { name: 'PvE', value: 'PvE' },
              { name: 'Parkour', value: 'Parkour' },
              { name: 'Supervivencia', value: 'Supervivencia' },
              { name: 'Otros', value: 'Otros' }
            ))
        .addStringOption(option =>
          option.setName('descripción')
            .setDescription('Descripción del modo')
            .setRequired(true))
        .addStringOption(option =>
          option.setName('autor')
            .setDescription('Creador del modo (battlenet o discord)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('héroes')
            .setDescription('Héroes para los que está diseñado (separados por comas)')
            .setRequired(false))
        .addStringOption(option =>
          option.setName('etiquetas')
            .setDescription('Etiquetas para mejorar la búsqueda (separadas por comas)')
            .setRequired(false)))
    .addSubcommand(subcommand =>
      subcommand
        .setName('rate')
        .setDescription('Valora un código de workshop')
        .addStringOption(option =>
          option.setName('código')
            .setDescription('Código del workshop')
            .setRequired(true))
        .addIntegerOption(option =>
          option.setName('valoración')
            .setDescription('Valoración de 1 a 5 estrellas')
            .setRequired(true)
            .addChoices(
              { name: '⭐', value: 1 },
              { name: '⭐⭐', value: 2 },
              { name: '⭐⭐⭐', value: 3 },
              { name: '⭐⭐⭐⭐', value: 4 },
              { name: '⭐⭐⭐⭐⭐', value: 5 }
            ))),
  
  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    switch (subcommand) {
      case 'search':
        await handleSearch(interaction, workshopService);
        break;
      case 'category':
        await handleCategory(interaction, workshopService);
        break;
      case 'hero':
        await handleHero(interaction, workshopService);
        break;
      case 'popular':
        await handlePopular(interaction, workshopService);
        break;
      case 'new':
        await handleNew(interaction, workshopService);
        break;
      case 'add':
        await handleAdd(interaction, workshopService);
        break;
      case 'rate':
        await handleRate(interaction, workshopService);
        break;
    }
  }
};

// Función para mostrar resultados de búsqueda
async function displayResults(interaction, codes, title) {

  if (codes.length === 0) {
    await interaction.reply({
      content: 'No se encontraron códigos que coincidan con tu búsqueda.',
      ephemeral: true
    });
    return;
  }
  
  // Si hay muchos resultados, limitamos a 25 para el menú
  const displayCodes = codes.slice(0, 25);
  
  // Crear menú desplegable
  const row = new ActionRowBuilder()
    .addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('workshop_select')
        .setPlaceholder('Selecciona un código')
        .addOptions(displayCodes.map(code => ({
          label: code.title.length > 25 ? code.title.substring(0, 22) + '...' : code.title,
          description: `${code.code} | ${code.category}`,
          value: code.id.toString()
        })))
    );
  
  await interaction.reply({
    content: `${title} (${codes.length} resultados)`,
    components: [row],
    ephemeral: false
  });

  // Obtener el mensaje enviado para scopear el collector solo a ese mensaje
  const replyMessage = await interaction.fetchReply();
  const filter = i => i.customId === 'workshop_select' && i.user.id === interaction.user.id;
  const collector = replyMessage.createMessageComponentCollector({ filter, time: 60000 });
  
  collector.on('collect', async i => {
    const selectedId = parseInt(i.values[0]);
    const selectedCode = await workshopService.getCodeById(selectedId);

    if (selectedCode) {
      // Incrementar popularidad
      await workshopService.updatePopularity(selectedCode.code);
      
      // Crear embed
      const embed = createCodeEmbed(selectedCode);
      
      // Botones: copiar código y valorar
      const buttons = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`copy_${selectedCode.code}`)
            .setLabel(`Copiar código: ${selectedCode.code}`)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`rate_${selectedCode.code}`)
            .setLabel('Valorar')
            .setStyle(ButtonStyle.Secondary),
        );
      
      await i.update({
        content: null,
        embeds: [embed],
        components: [buttons]
      });
    }
  });
  
  collector.on('end', collected => {
    if (collected.size === 0) {
      interaction.editReply({
        content: 'Búsqueda de códigos expirada.',
        components: []
      }).catch(console.error);
    }
  });
}

// Función para crear un embed para un código
function createCodeEmbed(code) {
  // Definir colores por categoría
  const categoryColors = {
    'Entrenamiento': '#FF9900',
    'Minijuegos': '#00CCFF',
    'PvP': '#FF3366',
    'PvE': '#33CC33',
    'Parkour': '#9933FF',
    'Supervivencia': '#FF6600',
    'Otros': '#999999'
  };
  
  const color = categoryColors[code.category] || '#FF9900';
  
  // Crear string para mostrar la valoración
  let ratingStars = '';
  const fullStars = Math.floor(code.ratings.average);
  const halfStar = code.ratings.average - fullStars >= 0.5;
  
  for (let i = 0; i < 5; i++) {
    if (i < fullStars) {
      ratingStars += '⭐';
    } else if (i === fullStars && halfStar) {
      ratingStars += '✨'; // Usando otro emoji para "media estrella"
    } else {
      ratingStars += '☆';
    }
  }
  
  // Formatear fecha
  const dateAdded = new Date(code.dateAdded).toLocaleDateString('es-ES', {
    year: 'numeric', month: 'long', day: 'numeric'
  });
  
  // Crear embed
  const embed = new EmbedBuilder()
    .setTitle(`🎮 ${code.title}`)
    .setDescription(code.getFormattedDescription ? code.getFormattedDescription() : (code.description || 'Sin descripción'))
    .setColor(color)
    .addFields(
      { name: '📋 Código', value: `\`${code.code}\``, inline: true },
      { name: '🏷️ Categoría', value: code.category, inline: true },
      { name: '👤 Autor', value: code.author || 'Desconocido', inline: true },
      { name: '⭐ Valoración', value: `${ratingStars} (${code.ratings.average.toFixed(1)}/5 de ${code.ratings.count} votos)`, inline: false }
    );
  
  // Añadir campos adicionales si existen
  if (code.heroes && code.heroes.length > 0 && code.heroes[0] !== 'All') {
    embed.addFields({ 
      name: '🦸 Héroes', 
      value: code.getFormattedHeroes ? code.getFormattedHeroes() : code.heroes.join(', '), 
      inline: false 
    });
  }
  
  if (code.tags && code.tags.length > 0) {
    embed.addFields({ 
      name: '🔖 Etiquetas', 
      value: code.getFormattedTags ? code.getFormattedTags() : code.tags.map(tag => `#${tag}`).join(' '), 
      inline: false 
    });
  }
  
  // Añadir fecha y fuente
  embed.addFields({ name: '📅 Añadido', value: dateAdded, inline: true });
  
  if (code.sourceUrl) {
    embed.addFields({ name: '🔗 Fuente', value: `[${code.source || 'Ver más'}](${code.sourceUrl})`, inline: true });
  }
  
  // Añadir imagen si existe
  if (code.imageUrl) {
    embed.setImage(code.imageUrl);
  }
  
  // Añadir footer
  embed.setFooter({ 
    text: `Usa /workshop para explorar más códigos | ID: ${code.id}`
  });
  
  return embed;
}

// Manejador para búsqueda
async function handleSearch(interaction, workshopService) {
  const searchTerm = interaction.options.getString('término');
  const results = await workshopService.searchCodes(searchTerm);
  
  if (results.length === 0) {
    await interaction.reply({
      content: `No se encontraron códigos para el término "${searchTerm}".`,
      ephemeral: true
    });
    return;
  }
  
  await displayResults(interaction, results, `Resultados para: "${searchTerm}"`);
}

// Manejador para búsqueda por categoría
async function handleCategory(interaction, workshopService) {
  const category = interaction.options.getString('categoría');
  const results = await workshopService.getCodesByCategory(category);
  
  if (results.length === 0) {
    await interaction.reply({
      content: `No se encontraron códigos en la categoría "${category}".`,
      ephemeral: true
    });
    return;
  }
  
  await displayResults(interaction, results, `Códigos de la categoría: ${category}`);
}

// Manejador para búsqueda por héroe
async function handleHero(interaction, workshopService) {
  const hero = interaction.options.getString('héroe');
  const results = await workshopService.getCodesByHero(hero);
  
  if (results.length === 0) {
    await interaction.reply({
      content: `No se encontraron códigos para el héroe "${hero}".`,
      ephemeral: true
    });
    return;
  }
  
  await displayResults(interaction, results, `Códigos para ${hero === 'All' ? 'todos los héroes' : hero}`);
}

// Manejador para mostrar códigos populares
async function handlePopular(interaction, workshopService) {
  const popularCodes = await workshopService.getPopularCodes(10);
  
  if (popularCodes.length === 0) {
    await interaction.reply({
      content: 'No hay códigos disponibles en la base de datos.',
      ephemeral: true
    });
    return;
  }
  
  await displayResults(interaction, popularCodes, '🔥 Códigos más populares');
}

// Manejador para mostrar códigos nuevos
async function handleNew(interaction, workshopService) {
  const newCodes = await workshopService.getNewestCodes(10);
  
  if (newCodes.length === 0) {
    await interaction.reply({
      content: 'No hay códigos disponibles en la base de datos.',
      ephemeral: true
    });
    return;
  }
  
  await displayResults(interaction, newCodes, '✨ Códigos más recientes');
}

// Manejador para añadir un nuevo código
async function handleAdd(interaction, workshopService) {
  // Obtener datos del formulario
  const code = interaction.options.getString('código').toUpperCase();
  const title = interaction.options.getString('título');
  const category = interaction.options.getString('categoría');
  const description = interaction.options.getString('descripción');
  const author = interaction.options.getString('autor') || interaction.user.tag;
  
  // Procesar héroes (opcional)
  let heroes = ['All'];
  const heroesInput = interaction.options.getString('héroes');
  if (heroesInput) {
    heroes = heroesInput.split(',').map(h => h.trim());
  }
  
  // Procesar etiquetas (opcional)
  let tags = [];
  const tagsInput = interaction.options.getString('etiquetas');
  if (tagsInput) {
    tags = tagsInput.split(',').map(t => t.trim().toLowerCase());
  }
  
  // Validar el código (debe ser alfanumérico y de longitud adecuada)
  if (!/^[A-Z0-9]{5,6}$/.test(code)) {
    await interaction.reply({
      content: 'El código debe tener entre 5 y 6 caracteres alfanuméricos.',
      ephemeral: true
    });
    return;
  }
  
  // Comprobar si el código ya existe
  const existingCode = await workshopService.getCodeByCode(code);
  if (existingCode) {
    await interaction.reply({
      content: `El código ${code} ya existe en la base de datos.`,
      ephemeral: true
    });
    return;
  }
  
  // Preparar datos para el nuevo código
  const newCodeData = {
    code,
    title,
    author,
    description,
    category,
    heroes,
    tags,
    difficulty: 'Media', // Valor por defecto
    submittedBy: interaction.user.id
  };
  
  // Añadir el código
  const result = await workshopService.addCode(newCodeData, interaction.user.id);
  
  if (result.success) {
    // Crear embed para mostrar el código añadido
    const embed = createCodeEmbed(result.code);
    
    await interaction.reply({
      content: `¡Código añadido correctamente! Gracias por contribuir, ${interaction.user}.`,
      embeds: [embed],
      ephemeral: false
    });
  } else {
    await interaction.reply({
      content: `Error al añadir el código: ${result.message}`,
      ephemeral: true
    });
  }
}

// Manejador para valorar un código
async function handleRate(interaction, workshopService) {
  const code = interaction.options.getString('código').toUpperCase();
  const rating = interaction.options.getInteger('valoración');
  
  // Comprobar si el código existe
  const workshopCode = await workshopService.getCodeByCode(code);
  if (!workshopCode) {
    await interaction.reply({
      content: `No se encontró ningún código "${code}" en la base de datos.`,
      ephemeral: true
    });
    return;
  }
  
  // Registrar la valoración
  const result = await workshopService.rateCode(code, rating, interaction.user.id);
  
  if (result.success) {
    // Crear mensaje con las estrellas visuales
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= rating ? '⭐' : '☆';
    }
    
    await interaction.reply({
      content: `Has valorado el código "${workshopCode.title}" (${code}) con ${stars}.\nValoración actual: ${result.newRating.toFixed(1)}/5 (${result.totalRatings} votos)`,
      ephemeral: false
    });
  } else {
    await interaction.reply({
      content: `Error al valorar el código: ${result.message}`,
      ephemeral: true
    });
  }
}

// Configurar manejadores de botones para el copiar código
// El parámetro workshopService se mantiene por compatibilidad con index.js
// pero el módulo ya usa el singleton directamente
function setupButtonHandlers(client) {
  client.on('interactionCreate', async interaction => {
    if (!interaction.isButton()) return;
    
    const { customId } = interaction;
    
    // Manejar botón de copiar código
    if (customId.startsWith('copy_')) {
      const code = customId.replace('copy_', '');
      
      await interaction.reply({
        content: `Código copiado: \`${code}\`\nPuedes usarlo en Overwatch 2 en el menú "Workshop" (Taller) usando la opción "Import Code" (Importar código).`,
        ephemeral: true
      });
    }
    
    // Manejar botón de valorar
    if (customId.startsWith('rate_')) {
      const code = customId.replace('rate_', '');
      const workshopCode = await workshopService.getCodeByCode(code);
      
      if (!workshopCode) {
        await interaction.reply({
          content: `Error: Código no encontrado.`,
          ephemeral: true
        });
        return;
      }
      
      // Crear opciones de valoración con botones
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`rate_${code}_1`)
            .setLabel('⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rate_${code}_2`)
            .setLabel('⭐⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rate_${code}_3`)
            .setLabel('⭐⭐⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rate_${code}_4`)
            .setLabel('⭐⭐⭐⭐')
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`rate_${code}_5`)
            .setLabel('⭐⭐⭐⭐⭐')
            .setStyle(ButtonStyle.Secondary)
        );
      
      await interaction.reply({
        content: `Valora el código "${workshopCode.title}" (${code}):`,
        components: [row],
        ephemeral: true
      });
    }
    
    // Manejar selección de valoración
    if (customId.match(/^rate_[A-Z0-9]{5,6}_[1-5]$/)) {
      const [, code, ratingStr] = customId.split('_');
      const rating = parseInt(ratingStr);
      
      // Registrar la valoración
      const result = await workshopService.rateCode(code, rating, interaction.user.id);
      
      if (result.success) {
        // Crear mensaje con las estrellas visuales
        let stars = '';
        for (let i = 1; i <= 5; i++) {
          stars += i <= rating ? '⭐' : '☆';
        }
        
        await interaction.update({
          content: `¡Gracias por tu valoración! Has valorado el código con ${stars}.\nValoración actual: ${result.newRating.toFixed(1)}/5 (${result.totalRatings} votos)`,
          components: []
        });
      } else {
        await interaction.update({
          content: `Error al valorar el código: ${result.message}`,
          components: []
        });
      }
    }
  });
}

module.exports.setupButtonHandlers = setupButtonHandlers;