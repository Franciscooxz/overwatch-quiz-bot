require('dotenv').config();

const http = require('http');

// Crear un servidor HTTP básico (keep-alive para Render.com)
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Bot está activo');
});

// Puerto que Render asigna automáticamente (ahora disponible porque dotenv ya cargó)
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor HTTP corriendo en puerto ${PORT}`);
});

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');

// Crear cliente de Discord
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions
  ]
});

// Colección para almacenar comandos
client.commands = new Collection();

// Cargar comandos
const commandsPath = path.join(__dirname, 'src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  // Preparar comando si tiene este método
  if (command.prepareCommand) {
    command.data = command.prepareCommand();
  }

  // Guardar comando en la colección
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  } else {
    console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene "data" o "execute".`);
  }
}

// Asegurar que exista el directorio de datos para archivos JSON
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log('Directorio de datos creado.');
}

// Comprobar si existe el archivo de datos de workshop
const workshopDataPath = path.join(dataDir, 'workshopData.json');
if (!fs.existsSync(workshopDataPath)) {
  fs.writeFileSync(workshopDataPath, JSON.stringify({ workshopCodes: [] }, null, 2), 'utf8');
  console.log('Archivo inicial de datos de Workshop creado.');
}

// Configurar manejadores de botones del Workshop
// FIX: ahora usamos el singleton en lugar de 'new WorkshopCodeService()'
try {
  const workshopCommandPath = path.join(commandsPath, 'workshop.js');
  if (fs.existsSync(workshopCommandPath)) {
    const workshopCommand = require(workshopCommandPath);
    if (typeof workshopCommand.setupButtonHandlers === 'function') {
      workshopCommand.setupButtonHandlers(client); // Sin 'new' — el módulo usa su propio singleton
      console.log('✅ Manejadores de Workshop Code Manager configurados.');
    }
  }
} catch (error) {
  console.error('Error al configurar Workshop Code Manager:', error.message);
  console.log('⚠️ Workshop Code Manager no pudo ser inicializado.');
}

// Inicializar la OverFast API Service (carga caché en background al arrancar)
try {
  require('./src/services/overwatchApiService');
  console.log('✅ OverFast API Service inicializado.');
} catch (error) {
  console.error('⚠️ Error al inicializar OverFast API Service:', error.message);
}

// Cargar datos del quiz
try {
  console.log('✅ Datos del quiz cargados correctamente');
} catch (error) {
  console.error('Error al cargar datos del quiz:', error);
}

// ─────────────────────────────────────────────────────────
// Evento de inicio
// ─────────────────────────────────────────────────────────
client.once(Events.ClientReady, () => {
  console.log(`¡Bot iniciado como ${client.user.tag}!`);
});

// ─────────────────────────────────────────────────────────
// Autocomplete (antes que los comandos — mismo evento, distinto guard)
// ─────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isAutocomplete()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command?.autocomplete) return;

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    console.error(`[Autocomplete] Error en /${interaction.commandName}:`, error);
  }
});

// ─────────────────────────────────────────────────────────
// Comandos de barra — con error handler mejorado
// ─────────────────────────────────────────────────────────
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`[Commands] Comando no encontrado: /${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    // Log detallado: qué comando, qué usuario, qué error
    console.error(
      `[Commands] Error en /${interaction.commandName}` +
      ` | Usuario: ${interaction.user?.tag}` +
      ` | Guild: ${interaction.guildId}`,
      error
    );

    const errorMessage = '❌ Ha ocurrido un error al ejecutar este comando. Inténtalo de nuevo.';

    try {
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    } catch (replyError) {
      // La interacción puede haber expirado (>3s sin respuesta) — no hay nada que hacer
      if (!replyError.message?.includes('Unknown interaction')) {
        console.error('[Commands] Error al enviar mensaje de error:', replyError);
      }
    }
  }
});

// ─────────────────────────────────────────────────────────
// Iniciar sesión
// ─────────────────────────────────────────────────────────
client.login(process.env.TOKEN);
