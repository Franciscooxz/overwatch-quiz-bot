// src/utils/fileOperations.js
const fs = require('fs').promises;
const path = require('path');

/**
 * Lee un archivo JSON y devuelve su contenido
 * @param {string} filePath - Ruta al archivo
 * @param {Object} defaultValue - Valor por defecto si el archivo no existe
 * @returns {Promise<Object>} Contenido del archivo
 */
async function readJsonFile(filePath, defaultValue = {}) {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // Si el archivo no existe o hay error al leerlo, devolver valor por defecto
    return defaultValue;
  }
}

/**
 * Escribe datos en un archivo JSON
 * @param {string} filePath - Ruta al archivo
 * @param {Object} data - Datos a escribir
 * @param {boolean} prettyPrint - Si se formatea el JSON
 * @returns {Promise<void>}
 */
async function writeJsonFile(filePath, data, prettyPrint = true) {
  try {
    // Asegurar que el directorio existe
    const dir = path.dirname(filePath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }

    // Escribir el archivo
    await fs.writeFile(
      filePath,
      JSON.stringify(data, null, prettyPrint ? 2 : 0),
      'utf8'
    );
  } catch (error) {
    console.error('Error al escribir el archivo JSON:', error);
    throw error;
  }
}

module.exports = {
  readJsonFile,
  writeJsonFile
};