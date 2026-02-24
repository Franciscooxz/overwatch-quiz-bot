// src/config/colors.js
// Paleta de colores centralizada del bot.
// TODOS los archivos deben importar desde aquí — nunca hex hardcodeados.
// Los valores son números hexadecimales (0xRRGGBB) compatibles con EmbedBuilder.setColor()

module.exports = {
  COLORS: {
    // ── Marca Overwatch ──────────────────────────────────────
    PRIMARY:   0xFA9C1E,  // Naranja OW — color principal del bot
    SECONDARY: 0x43484C,  // Gris oscuro OW

    // ── Estados ─────────────────────────────────────────────
    SUCCESS:   0x43B581,  // Verde  — respuesta correcta, apoyo
    ERROR:     0xF04747,  // Rojo   — respuesta incorrecta, daño
    WARNING:   0xFAA61A,  // Amarillo — aviso, dificultad media
    INFO:      0x4A90E2,  // Azul   — tanque, información
    PURPLE:    0x9B59B6,  // Púrpura — dificultad experto
    GRAY:      0x747F8D,  // Gris   — timeout, inactivo

    // ── Roles de héroes ─────────────────────────────────────
    TANK:    0x4A90E2,  // Azul
    DAMAGE:  0xF04747,  // Rojo
    SUPPORT: 0x43B581,  // Verde

    // ── Dificultad del quiz ──────────────────────────────────
    DIFFICULTY: {
      'fácil':   0x43B581,  // Verde
      'media':   0xFAA61A,  // Amarillo
      'difícil': 0xF04747,  // Rojo
      'experto': 0x9B59B6   // Púrpura
    },

    // ── Tipos de mapa ───────────────────────────────────────
    MAP_TYPE: {
      'Control':           0xFF9900,
      'Escolta':           0x0099FF,
      'Híbrido':           0x9900FF,
      'Empuje':            0x00CC66,
      'Clash':             0xFF6600,
      'Flashpoint':        0xFF3399,
      'Estadio':           0xFFCC00,
      'Duelo':             0xFF3366,
      'Duelo por equipos': 0xCC3366
    }
  }
};
