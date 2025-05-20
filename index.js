// Añade esto a tu index.js
const http = require('http');

// Crear un servidor HTTP básico
const server = http.createServer((req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'text/plain');
  res.end('Bot está activo');
});

// Puerto que Render asigna automáticamente
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor HTTP corriendo en puerto ${PORT}`);
});


require('dotenv').config();
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
    console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene una propiedad "data" o "execute" requerida.`);
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
  // Crear un archivo JSON inicial con estructura básica
  const initialData = {
    workshopCodes: []
  };
  fs.writeFileSync(workshopDataPath, JSON.stringify(initialData, null, 2), 'utf8');
  console.log('Archivo inicial de datos de Workshop creado.');
}

// Cargar servicios para el Workshop Code Manager
try {
  const WorkshopCodeService = require('./src/services/workshopCodeService');
  
  // Solo intentar configurar los manejadores si existe el archivo workshop.js
  const workshopCommandPath = path.join(commandsPath, 'workshop.js');
  if (fs.existsSync(workshopCommandPath)) {
    const workshopCommand = require(workshopCommandPath);
    
    // Verificar si tiene la función setupButtonHandlers
    if (typeof workshopCommand.setupButtonHandlers === 'function') {
      const workshopService = new WorkshopCodeService();
      workshopCommand.setupButtonHandlers(client, workshopService);
      console.log('✅ Manejadores de Workshop Code Manager configurados.');
    }
  }
} catch (error) {
  console.error('Error al configurar Workshop Code Manager:', error.message);
  console.log('⚠️ Workshop Code Manager no pudo ser inicializado. Asegúrate de tener todos los archivos necesarios.');
}

// Cargar datos del quiz (código existente)
try {
  console.log('✅ Datos del quiz cargados correctamente');
} catch (error) {
  console.error('Error al cargar datos del quiz:', error);
}

// Evento de inicio
client.once(Events.ClientReady, () => {
  console.log(`¡Bot iniciado como ${client.user.tag}!`);
});

// Manejo de comandos de barra
client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No se encontró el comando ${interaction.commandName}`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ content: 'Hubo un error al ejecutar este comando.', ephemeral: true });
    } else {
      await interaction.reply({ content: 'Hubo un error al ejecutar este comando.', ephemeral: true });
    }
  }
});

// Manejador general de interacciones de componentes (botones, menús, etc.)
client.on(Events.InteractionCreate, async interaction => {
  // Solo procesar interacciones que no sean comandos (ya manejados arriba)
  if (interaction.isChatInputCommand()) return;
  
  // Los manejadores específicos de componentes ya están configurados en setupButtonHandlers
  // Este bloque es para capturar y registrar interacciones no manejadas
  if ((interaction.isButton() || interaction.isStringSelectMenu()) && 
      !interaction.replied && !interaction.deferred) {
    // Ignorar silenciosamente - los manejadores específicos ya deberían procesarlas
  }
});

// Iniciar sesión
client.login(process.env.TOKEN);