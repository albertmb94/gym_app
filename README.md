# GymTracker Pro

Aplicación web completa para registrar entrenamientos de fuerza, cardio y progreso personal. Estética **Liquid Glass** estilo Apple con un solo acento (`#0A84FF`).

## Características

- 🏋️ **Entrenamientos**: series, repeticiones, peso, RPE, warm-up, autosave
- 🏃 **Cardio**: running, ciclismo, natación, remo, elíptica, HIIT + GPX con mapa
- 📅 **Plantillas + plan semanal** con sugerencia inteligente de cargas
- 📊 **Estadísticas**: gráficos por ejercicio, músculo, calorías (Recharts)
- 👤 **Perfil físico**: altura, peso, edad, FC, IMC
- 🌗 **Tema dark/light** con auto-detección del sistema + toggle manual
- 🔄 **Sincronización opcional** con Turso (Vercel serverless)
- 💾 **Almacenamiento local** por defecto (localStorage) — funciona 100% offline
- 🌐 **Bilingüe**: español e inglés
- ♿ **Accesible**: roles ARIA, focus visible, focus trap en dialogs/sheets, prefers-reduced-motion, prefers-reduced-transparency

## Stack

- **Frontend**: React 19, TypeScript 5.9, Vite 7, Tailwind 4
- **Routing**: React Router 7
- **UI**: Liquid Glass (3 niveles: glass-1, glass-2, glass-tint)
- **Tipografía**: Inter Variable
- **Gráficos**: Recharts (lazy)
- **Mapas**: Leaflet (lazy)
- **API**: Express serverless en `/api/*` con Turso (LibSQL)
- **Tests**: Vitest + Testing Library

## Liquid Glass

El sistema de diseño está basado en la estética **Liquid Glass** de Apple con tres niveles de vidrio:

| Nivel | Uso | Ejemplo |
|---|---|---|
| `glass-1` | Cards, contenedores de contenido | Home cards, History, Stats |
| `glass-2` | Header sticky, bottom nav, dialogs | Shell, Dialog, Sheet |
| `glass-tint` | Botones CTA principales, logo, FAB | Logo en login, "Empezar" workout |

Las clases usan `backdrop-filter: blur(20-30px) saturate(180-200%)` con bordes sutiles y `inset highlight` para el efecto de refracción. Con `prefers-reduced-transparency` cae a fondos sólidos automáticamente.

## Estructura

```
├── api/                    # Express serverless para Turso
├── src/
│   ├── components/
│   │   ├── layout/         # Shell, navegación
│   │   └── ui/             # Button, Card, Dialog, Field, Sheet, Chip, SegmentedControl, …
│   ├── contexts/           # Theme, Language, Toast, Exercises
│   ├── data/               # Ejercicios predefinidos, repository (localStorage)
│   ├── hooks/              # useStorage (orquestador)
│   ├── i18n/               # Traducciones ES/EN
│   ├── lib/                # sync (HTTP), syncEngine, gpx
│   ├── test/               # Setup de Vitest
│   ├── types/              # Tipos compartidos
│   └── utils/              # metrics, prs, suggestions, date
├── .github/workflows/      # CI (typecheck + test + build)
├── LIQUID_GLASS_PLAN.md    # Roadmap completo del rediseño
```

## Instalación

```bash
# Clonar
git clone https://github.com/tu-usuario/gym_app.git
cd gym_app

# Dependencias
npm install

# Modo local (default — todo funciona sin backend)
npm run dev
```

Abre `http://localhost:5173`.

## Scripts

| Comando | Descripción |
|---|---|
| `npm run dev` | Dev server (Vite HMR) |
| `npm run build` | Build producción |
| `npm run preview` | Sirve el build |
| `npm run typecheck` | TypeScript sin emitir |
| `npm run api:check` | Typecheck del backend (api/) |
| `npm test` | Vitest (69 tests) |
| `npm run test:watch` | Vitest watch |
| `npm run test:coverage` | Vitest + coverage v8 |

## Despliegue

La app se despliega en **Vercel** con Turso como base de datos opcional:

1. Crea un proyecto en [Vercel](https://vercel.com) y conecta el repo
2. (Opcional) Crea una DB en [Turso](https://turso.tech) y obtén `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN`
3. Configura las variables de entorno en Vercel:
   - `TURSO_DATABASE_URL`
   - `TURSO_AUTH_TOKEN`
   - `ALLOWED_ORIGIN`: dominio de tu despliegue frontend
4. Despliega. La función serverless expone `/api/health`, `/api/auth/register`, `/api/auth/login`, `/api/auth/recover`, `/api/data/:username`

Si **no** configuras Turso, la app funciona 100% en local con `localStorage`. Los datos nunca salen del navegador.

## API Endpoints

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servidor y DB |
| POST | `/api/auth/register` | Crea cuenta (devuelve recovery code) |
| POST | `/api/auth/login` | Login con username + password |
| POST | `/api/auth/recover` | Recupera cuenta con recovery code |
| GET | `/api/data/:username` | Lee blob de datos del usuario (auth bearer) |
| PUT | `/api/data/:username` | Escribe blob (auth bearer, CAS optimista) |

Sin auth válida, los endpoints de datos devuelven 401. CORS está restringido al `ALLOWED_ORIGIN`.

## Tests

```bash
npm test
```

69 tests en 15 archivos. Cubren:
- `utils/` (metrics, PRs, suggestions, date)
- `data/repository`
- `lib/syncEngine`
- UI components: Button, Card, Chip, Dialog, EmptyState, Field+TextInput, IconButton, SegmentedControl, Sheet

## Roadmap

El plan completo del rediseño Liquid Glass está en [`LIQUID_GLASS_PLAN.md`](./LIQUID_GLASS_PLAN.md). Resumen de sprints:

| Sprint | Estado | Descripción |
|---|---|---|
| LG-0 | ✅ | Foundation: Inter, tokens, ThemeContext dark/light |
| LG-1 | ✅ | UI kit: Button, Card, Dialog, Field, Sheet, Chip, SegmentedControl, EmptyState, IconButton |
| LG-2 | ✅ | Login + Shell migrados |
| LG-3 | ✅ | HomeTab + HistoryTab (filtro Ejercicio arreglado) |
| LG-4 | ✅ | WorkoutSession con Sheet + Dialog + bottom bar |
| LG-5 | ✅ | Cardio, Templates, Exercises, Stats, MonthCalendar (theme fix) |
| LG-6 | ✅ | Polish: ambient mesh, page transitions, contraste WCAG |
| LG-7 | ✅ | Bugfixes UI (Field a11y, B-09 username mobile) |
| LG-8 | ✅ | Tests UI (69), CI workflow, README |

## Licencia

MIT
