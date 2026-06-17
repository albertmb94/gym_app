# GymTracker - Aplicación de Seguimiento de Entrenamientos

Aplicación web completa para rastrear entrenamientos de fuerza, ejercicios, cardio y progreso.

## Características

- 🏋️ **Seguimiento de ejercicios**: Registra series, repeticiones y peso
- 📊 **Estadísticas**: Gráficos de progreso por músculo y ejercicio
- 📅 **Plantillas de entrenamiento**: Push, Pull, Legs y personalizadas
- 🏃 **Cardio**: Running, ciclismo, natación, remo con estimación de calorías
- 👤 **Perfil físico**: Altura, peso, edad, frecuencia cardíaca
- 📤 **Exportar/Importar**: Guarda tus datos en JSON
- 💾 **Almacenamiento híbrido**: Local (navegador) o servidor (Turso + Vercel)

## Modos de Funcionamiento

### Modo Local (por defecto)
La app funciona sin necesidad de servidor. Los datos se guardan en el navegador (`localStorage`).

### Modo Servidor (sincronización entre dispositivos)
Para persistir datos en el servidor y acceder desde múltiples dispositivos, despliega el backend serverless en Vercel con una base de datos Turso.

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/gym_app.git
cd gym_app

# Instalar dependencias
npm install
```

## Ejecución en Modo Local

```bash
# Desarrollo
npm run dev

# Type check
npm run typecheck

# Producción
npm run build
npm run preview
```

## Despliegue Full-Stack en Vercel

1. Crea un proyecto en [Vercel](https://vercel.com) y conecta el repositorio.
2. Crea una base de datos en [Turso](https://turso.tech) y obtén:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
3. Configura las variables de entorno en Vercel:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ALLOWED_ORIGIN`: dominio de tu despliegue frontend (p. ej. `https://gym-app.vercel.app`)
4. Despliega. La función serverless expone los endpoints bajo `/api/*`.

## Estructura del Proyecto

```
├── api/
│   └── index.ts          # Función serverless Express (Vercel)
├── src/
│   ├── components/       # Componentes React
│   ├── data/             # Datos de ejercicios predefinidos
│   ├── hooks/            # Custom hooks (useStorage)
│   ├── lib/              # Sincronización con servidor, utilidades
│   ├── types/            # TypeScript types
│   └── contexts/         # React contexts
├── dist/                 # Build de Vite
└── public/               # Archivos estáticos
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | /api/health | Estado del servidor y base de datos |
| GET | /api/data/:username | Obtener blob de datos del usuario |
| PUT | /api/data/:username | Guardar blob de datos del usuario |

`GET` y `PUT /api/data/:username` requieren una clave de sincronización en la cabecera `Authorization: Bearer <token>`. La primera escritura de un dispositivo define la clave; los demás dispositivos deben usar la misma clave.

## Tecnologías

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS
- **Backend**: Express serverless con `@vercel/node`
- **Base de datos**: Turso (LibSQL)
- **Gráficos**: Recharts
- **Mapas**: Leaflet
- **Iconos**: Lucide React

## Licencia

MIT
