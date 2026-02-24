# 🎮 Overwatch Quiz Bot

Bot de Discord para la comunidad de **Overwatch 2** en español. Incluye un sistema de trivia interactivo con puntuación y rachas, comandos de información sobre héroes y mapas, estadísticas del meta competitivo, perfiles de jugador y seguimiento del Overwatch World Cup 2026.

---

## ✨ Características

| Módulo | Descripción |
|---|---|
| 🧠 **Quiz** | Preguntas por categoría y dificultad con temporizador y puntuación |
| 🏆 **Ranking** | Tabla de líderes global, estadísticas personales y rachas |
| 🦸 **Héroes** | Información detallada de cualquier héroe (rol, habilidades, lore) |
| 🗺️ **Mapas** | Lista de mapas por modo de juego con screenshots oficiales |
| 📊 **Meta** | Pick rate y win rate del meta competitivo en tiempo real |
| 👤 **Perfiles** | Rangos competitivos de cualquier jugador (perfil público) |
| 🔧 **Workshop** | Códigos de taller destacados de la comunidad |
| 🌍 **Mundial** | Información completa del Overwatch World Cup 2026 |

---

## 📋 Comandos

| Comando | Descripción | Opciones |
|---|---|---|
| `/quiz` | Inicia una pregunta de trivia | `categoria`, `dificultad` |
| `/quizrank` | Tabla de líderes y estadísticas | — |
| `/hero` | Información de un héroe | `heroe` (nombre) |
| `/mapa` | Lista de mapas | `modo` (filtro opcional) |
| `/meta` | Meta competitivo actual | `rol`, `region` |
| `/perfil` | Perfil competitivo de un jugador | `jugador` (BattleTag) |
| `/workshop` | Códigos de taller | — |
| `/mundial` | Información del OWWC 2026 | — |

---

## 🚀 Instalación

### Requisitos previos

- **Node.js** 18 o superior
- **npm** 8 o superior
- Una aplicación de Discord creada en el [Portal de Desarrolladores](https://discord.com/developers/applications)

### Pasos

```bash
# 1. Clona el repositorio
git clone https://github.com/tu-usuario/overwatch-quiz-bot.git
cd overwatch-quiz-bot

# 2. Instala las dependencias
npm install

# 3. Crea el archivo de variables de entorno
cp .env.example .env
# Edita .env con tus valores

# 4. Registra los comandos en Discord
npm run deploy

# 5. Inicia el bot
npm start
```

### Variables de entorno (`.env`)

```env
# Token del bot de Discord
DISCORD_TOKEN=tu_token_aqui

# ID de la aplicación (Client ID)
CLIENT_ID=tu_client_id_aqui

# ID del servidor donde registrar los comandos (opcional — vacío = global)
GUILD_ID=tu_guild_id_aqui
```

### Scripts disponibles

| Script | Descripción |
|---|---|
| `npm start` | Inicia el bot en producción |
| `npm run dev` | Inicia con nodemon (recarga automática) |
| `npm run deploy` | Registra/actualiza los slash commands en Discord |

---

## 🏗️ Arquitectura del proyecto

```
overwatch-quiz-bot/
│
├── data/                        # Datos persistentes y estáticos
│   ├── quizData.json            # Banco de preguntas del quiz
│   ├── quizScores.json          # Puntuaciones globales (auto-generado)
│   ├── quizStats.json           # Estadísticas detalladas (auto-generado)
│   ├── workshopData.json        # Códigos de taller
│   └── mundialData.json         # Datos del OWWC 2026 ⬅ editable
│
├── src/
│   ├── commands/                # Slash commands de Discord
│   │   ├── quiz.js              # /quiz — trivia interactiva
│   │   ├── quizrank.js          # /quizrank — ranking y estadísticas
│   │   ├── hero.js              # /hero — información de héroes
│   │   ├── mapa.js              # /mapa — información de mapas
│   │   ├── meta.js              # /meta — meta competitivo
│   │   ├── perfil.js            # /perfil — perfiles de jugadores
│   │   ├── workshop.js          # /workshop — códigos de taller
│   │   └── mundial.js           # /mundial — OWWC 2026
│   │
│   ├── models/
│   │   └── QuizManager.js       # Lógica del quiz y sesiones activas
│   │
│   ├── services/
│   │   ├── overwatchApiService.js  # Cliente de la OverFast API
│   │   ├── ScoreService.js         # Puntuaciones y ranking
│   │   └── StatsService.js         # Estadísticas detalladas y rachas
│   │
│   ├── utils/
│   │   └── fileOperations.js    # Lectura/escritura JSON con mutex
│   │
│   └── config/
│       └── colors.js            # Paleta de colores de embeds
│
├── deploy-commands.js           # Script de registro de comandos
├── index.js                     # Punto de entrada del bot
├── package.json
└── .env                         # Variables de entorno (no incluir en git)
```

---

## 🌐 API utilizada

El bot consume la **[OverFast API](https://overfast-api.tekrop.fr/)** — una API gratuita y sin autenticación que expone datos oficiales de Overwatch 2.

| Endpoint | Uso |
|---|---|
| `GET /heroes` | Lista completa de héroes |
| `GET /heroes/{key}` | Detalle de un héroe (habilidades, lore, stats) |
| `GET /heroes/stats` | Pick rate y win rate del meta competitivo |
| `GET /maps` | Lista de mapas con screenshots |
| `GET /players?name=` | Búsqueda de jugadores por BattleTag |
| `GET /players/{id}/summary` | Perfil y rangos competitivos de un jugador |

> ℹ️ Los datos de héroe y mapa se cachean localmente durante **6 horas**. Los datos de jugador se consultan en tiempo real.

---

## 🧠 Formato de preguntas del quiz

Las preguntas se almacenan en `data/quizData.json` con la siguiente estructura:

```json
{
  "pregunta": "¿Cuál es el rol de Ana?",
  "opciones": ["Tank", "Support", "Damage", "Flex"],
  "respuestaCorrecta": 1,
  "categoria": "heroes",
  "dificultad": "facil",
  "explicacion": "Ana es una Support especializada en curación a distancia.",
  "heroe": "Ana"
}
```

| Campo | Tipo | Descripción |
|---|---|---|
| `pregunta` | string | Texto de la pregunta |
| `opciones` | string[] | Array de 4 respuestas posibles |
| `respuestaCorrecta` | number | Índice (0–3) de la respuesta correcta |
| `categoria` | string | Categoría temática (`heroes`, `mapas`, `lore`, etc.) |
| `dificultad` | string | `facil`, `medio` o `dificil` |
| `explicacion` | string | Explicación mostrada tras responder |
| `heroe` *(opcional)* | string | Nombre del héroe — activa el portrait en el embed |

---

## 🌍 Actualizar datos del Mundial

El comando `/mundial` lee `data/mundialData.json` en cada uso, por lo que **no es necesario reiniciar el bot** para actualizar equipos o fechas.

Edita únicamente ese archivo cuando:
- Se confirmen nuevos equipos clasificados
- Cambien las fechas de alguna fase
- Se anuncie el prize pool oficial

```json
{
  "_lastUpdated": "2026-02-24",
  "teams": {
    "confirmed": [
      { "name": "Arabia Saudita", "flag": "🇸🇦", "seed": "Campeón OWWC 2023" }
    ]
  }
}
```

---

## 🛠️ Tecnologías

- **[discord.js](https://discord.js.org/)** v14 — librería principal de Discord
- **[@discordjs/builders](https://github.com/discordjs/discord.js/tree/main/packages/builders)** — constructores de comandos
- **[OverFast API](https://overfast-api.tekrop.fr/)** — datos de Overwatch 2
- **Node.js** — entorno de ejecución
- **JSON** — almacenamiento ligero de datos

---

## 📄 Licencia

MIT — úsalo, modifícalo y compártelo libremente.
