# 🎮 Valorant Discord Bot

<div align="center">

![Valorant Bot Logo](https://via.placeholder.com/400x200/FF4655/FFFFFF?text=VALORANT+BOT)

**El bot de Discord más completo para Valorant**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-4.9+-blue.svg)](https://www.typescriptlang.org/)
[![Discord.js](https://img.shields.io/badge/discord.js-v14-7289da.svg)](https://discord.js.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0+-2D3748.svg)](https://www.prisma.io/)

[🚀 Invitar Bot](#-instalación-rápida) • [📖 Documentación](#-características) • [💬 Soporte](#-soporte) • [🤝 Contribuir](#-contribución)

</div>

## 📑 Tabla de Contenidos

- [✨ Características](#-características)
- [🚀 Instalación Rápida](#-instalación-rápida)
- [⚙️ Configuración Detallada](#️-configuración-detallada)
- [🎯 Comandos Disponibles](#-comandos-disponibles)
- [🏗️ Arquitectura](#️-arquitectura)
- [🐳 Docker Deployment](#-docker-deployment)
- [🔧 Desarrollo](#-desarrollo)
- [📊 Monitoreo](#-monitoreo)
- [🤝 Contribución](#-contribución)
- [📜 Licencia](#-licencia)

## ✨ Características

### 🧠 Sistema de Quiz Interactivo
- **Preguntas dinámicas** sobre agentes, mapas, economía, armas y esports
- **4 niveles de dificultad** con puntuación progresiva
- **Sistema de rachas** y bonificaciones por velocidad
- **Categorías especializadas** para aprendizaje dirigido

### 👤 Perfiles y Progresión
- **Sistema de niveles** con experiencia y puntos
- **Perfiles personalizables** con estadísticas detalladas
- **Generación de imágenes** automática de perfiles
- **Vinculación con cuentas** de Valorant (opcional)

### 🏆 Sistema de Logros
- **+50 logros únicos** en diferentes categorías
- **Sistema de rareza** (Común, Raro, Épico, Legendario)
- **Progreso en tiempo real** y notificaciones automáticas
- **Logros especiales** por dedicación y habilidad

### ⚔️ Clanes y Guerras
- **Creación y gestión de clanes** con hasta 50 miembros
- **Sistema de roles** (Líder, Oficial, Miembro)
- **Guerras competitivas** entre clanes
- **Rankings de clanes** y contribuciones individuales

### 📊 Rankings Globales
- **Rankings múltiples**: Global, Semanal, Mensual, por Categoría
- **Comparativas de servidores** y filtros personalizados
- **Estadísticas avanzadas** de usuarios y clanes
- **Leaderboards dinámicos** con cambios en tiempo real

### 🎯 Estadísticas de Valorant
- **Integración con APIs oficiales** y no oficiales
- **Estadísticas de jugadores** en tiempo real
- **Historial de partidas** con análisis detallado
- **Información de rangos** y MMR

### 💰 Simulador de Economía
- **Calculadora de compras** inteligente
- **Simulaciones de rondas** con recomendaciones
- **Guías económicas** interactivas
- **Análisis de loadouts** optimizados

### 🌐 Dashboard Web
- **Panel de administración** completo
- **Gestión de preguntas** y categorías
- **Monitoreo en tiempo real** del bot
- **Configuración visual** de opciones

## 🚀 Instalación Rápida

### Método 1: Script Automático (Recomendado)

```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/valorant-discord-bot.git
cd valorant-discord-bot

# 2. Ejecutar configuración automática
node scripts/setup.js

# 3. Iniciar el bot
npm run dev
```

### Método 2: Docker (Producción)

```bash
# 1. Clonar y configurar
git clone https://github.com/tu-usuario/valorant-discord-bot.git
cd valorant-discord-bot

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Iniciar con Docker Compose
docker-compose up -d

# 4. Ver logs
docker-compose logs -f valorant-bot
```

### Método 3: Instalación Manual

```bash
# 1. Prerequisitos
node --version # Debe ser >= 18.0.0
npm --version  # Última versión

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos
cp .env.example .env
# Configurar DATABASE_URL en .env

# 4. Configurar Prisma
npx prisma generate
npx prisma db push

# 5. Compilar y ejecutar
npm run build
npm start
```

## ⚙️ Configuración Detallada

### 🔑 Variables de Entorno Obligatorias

```env
# Discord Bot Configuration
DISCORD_TOKEN=tu_token_del_bot_aqui
DISCORD_CLIENT_ID=tu_client_id_aqui

# Database
DATABASE_URL=postgresql://usuario:password@localhost:5432/valorant_bot

# Security Secrets (generar con crypto.randomBytes(64).toString('hex'))
JWT_SECRET=tu_jwt_secret_super_seguro
SESSION_SECRET=tu_session_secret_super_seguro
```

### 🔧 Variables Opcionales

```env
# API Keys
HENRIK_API_KEY=tu_clave_henrik_api           # Para estadísticas de Valorant
REDIS_URL=redis://localhost:6379             # Cache (opcional)

# Development
NODE_ENV=development                         # o 'production'
LOG_LEVEL=info                              # error, warn, info, debug
TEST_GUILD_ID=tu_servidor_de_pruebas
DEVELOPER_IDS=tu_discord_id,otro_dev_id

# Web Dashboard
WEB_PORT=3000
WEB_BASE_URL=http://localhost:3000

# Webhooks para notificaciones (opcional)
ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/...
INFO_WEBHOOK_URL=https://discord.com/api/webhooks/...
```

### 🏠 Configuración del Servidor Discord

#### Permisos Requeridos del Bot:
- ✅ **Enviar Mensajes**
- ✅ **Usar Comandos de Barra**
- ✅ **Insertar Enlaces**
- ✅ **Adjuntar Archivos**
- ✅ **Leer el Historial de Mensajes**
- ✅ **Añadir Reacciones**
- ✅ **Usar Emojis Externos**
- ✅ **Gestionar Mensajes** (para quiz interactivos)

#### Configuración de Intents:
El bot requiere los siguientes intents en el Discord Developer Portal:
- ✅ **GUILD_MESSAGES**
- ✅ **MESSAGE_CONTENT**
- ✅ **GUILD_MEMBERS**
- ✅ **GUILD_MESSAGE_REACTIONS**

## 🎯 Comandos Disponibles

### 🧠 Quiz y Aprendizaje

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/quiz` | Responder preguntas sobre Valorant | `/quiz categoria:agentes dificultad:medio` |
| `/quiz categoria:mapas cantidad:5` | Quiz específico de mapas | `/quiz categoria:economia tiempo:45` |

### 👤 Perfil y Progreso

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/perfil` | Ver tu perfil o el de otro usuario | `/perfil usuario:@amigo imagen:true` |
| `/perfil detallado:true` | Ver perfil con información extendida | `/perfil imagen:true` |

### 📊 Rankings y Estadísticas

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/ranking` | Ver clasificaciones | `/ranking tipo:global limite:20` |
| `/ranking tipo:semanal servidor:true` | Ranking semanal del servidor | `/ranking tipo:clanes` |
| `/stats` | Estadísticas de Valorant | `/stats usuario:TuNombre tag:1234` |

### ⚔️ Clanes

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/clan crear` | Crear un nuevo clan | `/clan crear nombre:"Los Mejores" tag:BEST` |
| `/clan info` | Ver información de clan | `/clan info clan:Dragones` |
| `/clan unirse` | Unirse a un clan | `/clan unirse clan:BEST` |
| `/clan guerra` | Gestionar guerras | `/clan guerra accion:declarar objetivo:Enemigos` |

### 💰 Economía

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/economia simulador` | Simular situaciones económicas | `/economia simulador creditos:3000 ronda:5` |
| `/economia calculadora` | Calcular costo de loadouts | `/economia calculadora` |
| `/economia guia` | Guía de economía | `/economia armas categoria:rifles` |

### ⚙️ Utilidades

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/help` | Ayuda y documentación | `/help comando:quiz` |
| `/help categoria:clanes` | Ayuda por categoría | `/help` |

### 👑 Administrativos (Solo Desarrolladores)

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `/admin stats` | Estadísticas del bot | `/admin backup` |
| `/admin reload` | Recargar servicios | `/admin maintenance activar:true` |

## 🏗️ Arquitectura

### 📂 Estructura del Proyecto

```
valorant-discord-bot/
├── 📁 src/                     # Código fuente TypeScript
│   ├── 📁 commands/            # Comandos de Discord organizados por categoría
│   │   ├── 📁 quiz/           # Comandos de quiz
│   │   ├── 📁 profile/        # Comandos de perfil
│   │   ├── 📁 ranking/        # Comandos de rankings
│   │   ├── 📁 clan/           # Comandos de clanes
│   │   ├── 📁 stats/          # Comandos de estadísticas
│   │   ├── 📁 admin/          # Comandos administrativos
│   │   └── 📁 utility/        # Comandos de utilidad
│   ├── 📁 events/             # Manejadores de eventos de Discord
│   ├── 📁 services/           # Lógica de negocio y servicios
│   │   ├── 📄 UserService.ts      # Gestión de usuarios
│   │   ├── 📄 QuizService.ts      # Sistema de quiz
│   │   ├── 📄 AchievementService.ts # Sistema de logros
│   │   ├── 📄 ClanService.ts      # Gestión de clanes
│   │   └── 📄 ValorantApiService.ts # APIs de Valorant
│   ├── 📁 database/           # Configuración de base de datos
│   ├── 📁 utils/              # Utilidades compartidas
│   ├── 📁 types/              # Definiciones de TypeScript
│   ├── 📁 config/             # Configuración del bot
│   └── 📄 index.ts            # Punto de entrada principal
├── 📁 prisma/                 # Esquemas y migraciones de base de datos
├── 📁 scripts/                # Scripts de configuración y utilidades
├── 📁 docker/                 # Configuración de Docker
├── 📁 logs/                   # Archivos de log
├── 📄 package.json            # Dependencias y scripts
├── 📄 tsconfig.json           # Configuración de TypeScript
├── 📄 .env.example            # Plantilla de variables de entorno
├── 📄 Dockerfile              # Configuración de contenedor
├── 📄 docker-compose.yml      # Stack completo con servicios
└── 📄 README.md               # Esta documentación
```

### 🔄 Flujo de Datos

```mermaid
graph TB
    A[Discord User] --> B[Discord.js]
    B --> C[Command Handler]
    C --> D[Service Layer]
    D --> E[Database/Prisma]
    D --> F[External APIs]
    D --> G[Cache/Redis]
    
    subgraph "External Services"
        F1[Henrik Valorant API]
        F2[Valorant-API.com]
        F3[Discord Webhooks]
    end
    
    F --> F1
    F --> F2
    F --> F3
```

### 🎛️ Stack Tecnológico

#### Core
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.0+
- **Discord Library**: Discord.js v14
- **Database ORM**: Prisma 5.0+

#### Base de Datos
- **Primary**: PostgreSQL 15+ (Recomendado)
- **Development**: SQLite (Alternativa)
- **Cache**: Redis 7+ (Opcional)

#### APIs Externas
- **Henrik's Unofficial Valorant API**: Estadísticas de jugadores
- **Valorant-API.com**: Datos estáticos del juego
- **Riot Games API**: Datos oficiales (futuro)

#### Deployment
- **Containerization**: Docker & Docker Compose
- **Process Manager**: PM2 (opcional)
- **Reverse Proxy**: Nginx (producción)
- **Monitoring**: Prometheus + Grafana (opcional)

## 🐳 Docker Deployment

### Configuración Básica

```bash
# 1. Clonar repositorio
git clone https://github.com/tu-usuario/valorant-discord-bot.git
cd valorant-discord-bot

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus configuraciones

# 3. Iniciar servicios básicos
docker-compose up -d valorant-bot postgres redis

# 4. Ver logs en tiempo real
docker-compose logs -f valorant-bot
```

### Configuración de Producción

```bash
# 1. Iniciar stack completo con monitoring
docker-compose --profile production up -d

# 2. Configurar certificados SSL (si usas nginx)
# Colocar certificados en ./docker/nginx/ssl/

# 3. Verificar estado de servicios
docker-compose ps
```

### Variables de Entorno para Docker

```env
# Archivo .env para Docker
POSTGRES_PASSWORD=tu_password_super_seguro
GRAFANA_PASSWORD=admin_password_seguro
WEB_BASE_URL=https://tu-dominio.com
DISCORD_CLIENT_SECRET=tu_client_secret_aqui
```

### Comandos Útiles de Docker

```bash
# Ver logs específicos
docker-compose logs -f postgres
docker-compose logs -f redis

# Ejecutar comandos en el contenedor
docker-compose exec valorant-bot npm run db:studio

# Backup de base de datos
docker-compose exec postgres pg_dump -U valorant_user valorant_bot > backup.sql

# Restaurar backup
docker-compose exec postgres psql -U valorant_user valorant_bot < backup.sql

# Reiniciar servicios
docker-compose restart valorant-bot

# Actualizar imagen del bot
docker-compose build valorant-bot
docker-compose up -d valorant-bot
```

## 🔧 Desarrollo

### 🛠️ Setup de Desarrollo

```bash
# 1. Fork y clonar el repositorio
git clone https://github.com/tu-usuario/valorant-discord-bot.git
cd valorant-discord-bot

# 2. Instalar dependencias
npm install

# 3. Configurar base de datos de desarrollo
npm run db:generate
npm run db:push

# 4. Iniciar en modo desarrollo
npm run dev

# 5. Abrir Prisma Studio (opcional)
npm run db:studio
```

### 📝 Scripts Disponibles

```bash
# Desarrollo
npm run dev          # Iniciar con recarga automática
npm run build        # Compilar TypeScript
npm run start        # Iniciar versión compilada

# Base de datos
npm run db:generate  # Generar cliente Prisma
npm run db:push      # Aplicar cambios de esquema
npm run db:migrate   # Crear migración
npm run db:studio    # Abrir interfaz visual
npm run db:reset     # Resetear base de datos (¡CUIDADO!)

# Calidad de código
npm run lint         # Verificar linting
npm run format       # Formatear código
npm run test         # Ejecutar tests (cuando estén disponibles)

# Utilidades
npm run clean        # Limpiar archivos build
npm run logs         # Ver logs recientes
```

### 🎨 Convenciones de Código

#### Estructura de Comandos
```typescript
// src/commands/categoria/comando.ts
import { SlashCommandBuilder, CommandInteraction } from 'discord.js';
import { SlashCommand, CommandCategory } from '@/types';

const comando: SlashCommand = {
  data: new SlashCommandBuilder()
    .setName('comando')
    .setDescription('Descripción del comando'),
  
  category: CommandCategory.CATEGORIA,
  cooldown: 5,
  
  async execute(interaction: CommandInteraction): Promise<void> {
    // Implementación del comando
  }
};

export default comando;
```

#### Estructura de Servicios
```typescript
// src/services/MiServicio.ts
export class MiServicio {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async metodoPublico(): Promise<any> {
    // Implementación
  }

  private metodoPrivado(): void {
    // Lógica interna
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
```

### 🧪 Testing (Futuro)

```bash
# Ejecutar tests unitarios
npm run test

# Ejecutar tests de integración
npm run test:integration

# Coverage de código
npm run test:coverage

# Tests en modo watch
npm run test:watch
```

## 📊 Monitoreo

### 📈 Métricas Disponibles

#### Bot Metrics
- Comandos ejecutados por minuto
- Usuarios activos
- Guilds conectados
- Tiempo de respuesta promedio
- Errores por comando

#### Sistema Metrics
- Uso de memoria
- CPU utilizado
- Uptime del bot
- Conexiones de base de datos
- Cache hit rate (Redis)

### 🔍 Logs

#### Estructura de Logs
```
logs/
├── bot-2024-01-15.log     # Logs diarios del bot
├── error-2024-01-15.log   # Solo errores
└── access-2024-01-15.log  # Logs de acceso web
```

#### Niveles de Log
- **ERROR**: Errores críticos que requieren atención
- **WARN**: Advertencias que podrían ser problemáticas
- **INFO**: Información general del funcionamiento
- **DEBUG**: Información detallada para desarrollo

### 📊 Dashboard de Grafana

Si has habilitado monitoring, puedes acceder a:
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090

### 🚨 Alertas y Notificaciones

#### Webhooks de Discord
Configure webhooks para recibir notificaciones automáticas:

```env
# Webhook para errores críticos
ERROR_WEBHOOK_URL=https://discord.com/api/webhooks/123/abc

# Webhook para información general
INFO_WEBHOOK_URL=https://discord.com/api/webhooks/456/def
```

#### Tipos de Alertas
- 🔴 **Errores críticos**: Fallos del bot, conexión DB perdida
- 🟡 **Advertencias**: Alta carga, APIs lentas
- 🟢 **Información**: Bot iniciado, mantenimiento completado

## 🤝 Contribución

### 🌟 ¿Cómo Contribuir?

1. **Fork** el repositorio
2. Crear una **rama feature** (`git checkout -b feature/nueva-funcionalidad`)
3. **Commit** tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. **Push** a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir un **Pull Request**

### 📋 Guía de Contribución

#### Tipos de Contribuciones Bienvenidas
- 🐛 **Bug fixes**: Corrección de errores
- ✨ **Nuevas características**: Comandos, funcionalidades
- 📝 **Documentación**: Mejoras en README, comentarios
- 🎨 **UI/UX**: Mejoras en embeds, interfaz web
- 🔧 **Refactoring**: Optimizaciones de código
- 🧪 **Tests**: Agregar pruebas unitarias/integración

#### Preguntas de Quiz
¿Tienes ideas para preguntas? ¡Contribuye agregándolas!

```typescript
// Ejemplo de pregunta en src/database/questions/agentes.ts
{
  question: '¿Cuál es la habilidad definitiva de Sage?',
  type: 'MULTIPLE_CHOICE',
  difficulty: 'EASY',
  optionA: 'Resurrection',
  optionB: 'Barrier Orb',
  optionC: 'Slow Orb',
  optionD: 'Healing Orb',
  correctAnswer: 'A',
  explanation: 'Resurrection permite a Sage revivir a un aliado caído.',
  category: 'Agentes'
}
```

### 🎯 Roadmap

#### v1.1 - Mejoras Core
- [ ] Sistema de torneos automatizados
- [ ] Integración con Riot Games API oficial
- [ ] Dashboard web completo
- [ ] Sistema de recompensas premium

#### v1.2 - Funcionalidades Avanzadas
- [ ] Análisis de demos de Valorant
- [ ] Sistema de coaching/mentorías
- [ ] Integración con Twitch
- [ ] Bot de voz para callouts

#### v1.3 - Escalabilidad
- [ ] Sharding para múltiples instancias
- [ ] API pública para terceros
- [ ] Plugins de comunidad
- [ ] Localización multi-idioma

### 🐛 Reportar Bugs

Para reportar un bug, crea un issue con:

1. **Descripción clara** del problema
2. **Pasos para reproducir** el error
3. **Comportamiento esperado** vs actual
4. **Screenshots** si aplica
5. **Información del entorno** (OS, Node.js version, etc.)

## 📞 Soporte

### 💬 Canales de Soporte

- **GitHub Issues**: [Reportar bugs y solicitar características](https://github.com/tu-usuario/valorant-discord-bot/issues)
- **Discord Server**: [Únete a la comunidad](https://discord.gg/tu-servidor)
- **Email**: soporte@tu-dominio.com

### ❓ FAQ

**P: ¿El bot es gratuito?**
R: Sí, el bot es completamente gratuito y open source.

**P: ¿Necesito una API key de Riot Games?**
R: No es obligatoria, pero recomendamos usar Henrik's API para mejor funcionalidad.

**P: ¿Funciona en hosting gratuito?**
R: Sí, puedes usar servicios como Railway, Heroku o DigitalOcean.

**P: ¿Puedo modificar el código?**
R: Absolutamente, bajo la licencia MIT puedes modificar y distribuir el código.

**P: ¿Cómo agrego más preguntas de quiz?**
R: Puedes usar el comando `/admin quiz create` o editar directamente la base de datos.

## 📜 Licencia

Este proyecto está licenciado bajo la [Licencia MIT](LICENSE).

```
MIT License

Copyright (c) 2024 Tu Nombre

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Agradecimientos

- **Riot Games** por crear Valorant
- **Henrik** por su increíble API no oficial
- **Discord.js** por la excelente librería
- **Prisma** por simplificar la gestión de base de datos
- **La comunidad de Valorant** por el feedback y sugerencias

---

<div align="center">

**¿Te gustó el proyecto? ¡Dale una ⭐ en GitHub!**

[⬆ Volver al inicio](#-valorant-discord-bot)

</div>
