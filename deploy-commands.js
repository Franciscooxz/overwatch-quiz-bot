// deploy-commands.js
require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];
const commandsPath = path.join(__dirname, 'src/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);
  
  if ('data' in command) {
    commands.push(command.data.toJSON());
  } else if (command.prepareCommand) {
    // Intentar preparar el comando si tiene este método
    const preparedData = command.prepareCommand();
    commands.push(preparedData.toJSON());
  } else {
    console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene una propiedad "data" requerida.`);
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`Iniciando registro de ${commands.length} comandos.`);
    
    // Asegúrate de que CLIENT_ID y GUILD_ID son strings, no undefined
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;
    
    if (!clientId) {
      throw new Error('CLIENT_ID no está definido en el archivo .env');
    }
    
    // Si GUILD_ID está definido, registra comandos a nivel de servidor
    if (guildId) {
      await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands },
      );
      console.log(`Comandos registrados en el servidor ${guildId}`);
    } else {
      // Si no, registra comandos globalmente
      await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands },
      );
      console.log('Comandos registrados globalmente');
    }
  } catch (error) {
    console.error(error);
  }
})();