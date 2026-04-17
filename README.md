# GymTracker - Aplicación de Seguimiento de Entrenamientos

Una aplicación web completa para rastrear tus entrenamientos de gimnasio, ejercicios, cardio y progreso.

## Características

- 🏋️ **Seguimiento de ejercicios**: Registra series, repeticiones y peso
- 📊 **Estadísticas**: Gráficos de progreso por músculo y ejercicio
- 📅 **Plantillas de entrenamiento**: Push, Pull, Legs y personalizadas
- 🏃 **Cardio**: Running, ciclismo, natación, remo con estimación de calorías
- 👤 **Perfil físico**: Altura, peso, edad, frecuencia cardíaca
- 📤 **Exportar/Importar**: Guarda tus datos en JSON o Excel
- 💾 **Almacenamiento híbrido**: Local (navegador) o servidor (SQLite)

## Modos de Funcionamiento

### Modo Local (por defecto)
La app funciona sin necesidad de servidor. Los datos se guardan en el navegador (localStorage).

### Modo Servidor (con base de datos SQLite)
Para persistir datos en el servidor y acceder desde múltiples dispositivos.

## Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/gym-tracker.git
cd gym-tracker

# Instalar dependencias
npm install
```

## Ejecución en Modo Local

```bash
# Desarrollo
npm run dev

# Producción
npm run build
npm run preview
```

## Ejecución con Servidor (SQLite)

### 1. Instalar tsx para ejecutar TypeScript:
```bash
npm install -g tsx
```

### 2. Compilar el frontend:
```bash
npm run build
```

### 3. Ejecutar el servidor:
```bash
tsx server/index.ts
```

### 4. Abrir en el navegador:
```
http://localhost:3001
```

## Estructura del Proyecto

```
├── src/
│   ├── components/     # Componentes React
│   ├── data/          # Datos de ejercicios predefinidos
│   ├── hooks/         # Custom hooks (useStorage, useHybridStorage)
│   ├── types/         # TypeScript types
│   ├── contexts/      # React contexts
│   └── api/           # Cliente API para comunicación con servidor
├── server/
│   ├── index.ts       # Servidor Express
│   ├── database.ts    # Configuración SQLite
│   └── routes/        # Rutas API
└── public/            # Archivos estáticos
```

## API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | /api/users/login | Login/registro con username |
| GET | /api/users/:id/profile | Obtener perfil físico |
| PUT | /api/users/:id/profile | Actualizar perfil |
| GET | /api/exercises/:userId | Obtener ejercicios custom |
| POST | /api/exercises/:userId | Crear ejercicio |
| PUT | /api/exercises/:userId/:id | Actualizar ejercicio |
| DELETE | /api/exercises/:userId/:id | Eliminar ejercicio |
| GET | /api/workouts/:userId | Obtener entrenamientos |
| POST | /api/workouts/:userId | Guardar entrenamiento |
| GET | /api/cardio/:userId | Obtener sesiones cardio |
| POST | /api/cardio/:userId | Guardar sesión cardio |
| GET | /api/templates/:userId | Obtener plantillas |
| POST | /api/templates/:userId | Crear plantilla |

## Despliegue

### Opción 1: Solo Frontend (Vercel, Netlify)
La app funciona en modo local (localStorage).

```bash
npm run build
# Subir carpeta 'dist' al hosting
```

### Opción 2: Full-Stack (Railway, Render, VPS)
Con base de datos SQLite en el servidor.

```bash
# En el servidor
npm install
npm run build
tsx server/index.ts
```

## Tecnologías

- **Frontend**: React, TypeScript, Vite, Tailwind CSS
- **Gráficos**: Recharts
- **Backend** (opcional): Express, better-sqlite3
- **Iconos**: Lucide React

## Licencia

MIT
