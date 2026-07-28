# Liquid Glass — Plan de rediseño completo

> Roadmap para migrar GymTracker Pro a una estética Liquid Glass estilo Apple, con un único acento (Apple Blue) y solo dos temas (dark/light auto).

## Decisiones de producto (2026-07-28)

| Decisión | Valor |
|---|---|
| Alcance | Plan completo (LG-0 a LG-8) |
| Color de acento | `#0A84FF` (Apple Blue) |
| Temas | Solo `dark` + `light`, con `prefers-color-scheme` + toggle manual |
| Refactor técnico | Solo lo necesario para soportar la nueva UI |
| Tipografía | Inter Variable |
| Iconografía | Lucide (sin cambios) |
| Curva de animación | `cubic-bezier(0.32, 0.72, 0, 1)` (Apple) |

## Sistema de diseño (tokens)

### Paleta neutra (dark)

```
--canvas:        #000000
--surface-1:     #1C1C1E   (cards sobre canvas)
--surface-2:     #2C2C2E   (cards anidadas)
--surface-3:     #3A3A3C   (botones, controles inactivos)
--surface-elevated: #1E1E20
--text-primary:    #F2F2F7
--text-secondary:  #EBEBF5 / 99%
--text-muted:      #EBEBF5 / 60%
--text-disabled:   #EBEBF5 / 30%
```

### Paleta neutra (light)

```
--canvas:        #F2F2F7
--surface-1:     #FFFFFF
--surface-2:     #F9F9FB
--surface-3:     #EFEFF4
--text-primary:    #1C1C1E
--text-secondary:  #3A3A3C / 90%
--text-muted:      #3A3A3C / 60%
--text-disabled:   #3A3A3C / 30%
```

### Acento Apple Blue

```
--accent:          #0A84FF   (dark) / #007AFF (light)
--accent-hover:    #409CFF   (dark) / #0A84FF (light)
--accent-pressed:  #0070DD   (dark) / #0058B0 (light)
--accent-soft:     rgba(10,132,255,0.15)
```

### Glass (3 niveles)

```
.glass-1:  backdrop-filter: blur(20px) saturate(180%);
           bg: rgba(28,28,30,0.55) [dark] / rgba(255,255,255,0.72) [light]
           border: 1px solid rgba(255,255,255,0.10) [dark] / rgba(0,0,0,0.06) [light]
           box-shadow: 0 10px 30px -10px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.08)

.glass-2:  backdrop-filter: blur(30px) saturate(200%);
           bg: rgba(28,28,30,0.72) [dark] / rgba(255,255,255,0.86) [light]
           (header, nav, dialogs)

.glass-tint:  glass-1 + bg + tinte de accent al 8% (botón flotante, FAB, CTA)
```

### Radios

```
--radius-input:  12px
--radius-card:   20px
--radius-sheet:  28px
--radius-dialog: 28px
--radius-pill:   9999px
```

### Sombras

```
--shadow-card:    0 1px 2px rgba(0,0,0,0.04)
--shadow-float:   0 10px 30px -10px rgba(0,0,0,0.18)
--shadow-dialog:  0 24px 60px -12px rgba(0,0,0,0.30), inset 0 1px 0 rgba(255,255,255,0.10)
```

### Espaciado

Mantener escala de Tailwind. Solo `safe-top` y `safe-bottom` se mantienen como utilities.

## Sprints

### LG-0 Foundation ✅ (esta sesión)

- Instalar `@fontsource-variable/inter`
- Reescribir `index.css` con tokens
- Simplificar `ThemeContext` a `dark`/`light` con auto-detección
- `index.html`: precargar Inter, color-scheme, meta theme-color
- Eliminar tipos `black` y `contrast` de `ThemeName`

### LG-1 UI kit ✅ (esta sesión)

- Reescribir `Button`, `Card`, `Dialog`, `Field`, `IconButton`, `EmptyState`
- Añadir `Sheet` (bottom sheet estilo iOS)
- Añadir `Chip` (pill tag, filtro)
- Añadir `SegmentedControl` (iOS-style segmented)

### LG-2 Login + Shell ✅ (esta sesión)

- `LoginScreen` con glass + accent azul, fondo mesh sutil
- `Shell` con header glass-2 sticky, bottom nav glass-2
- `SyncBadge`, `ConflictDialog` con nuevo estilo

### LG-3 Home + History (próxima sesión)

- `HomeTab`: hero card glass-1, week strip con glass rows, stats con glass cards
- `HistoryTab`: filtros con `Chip` y `SegmentedControl`, empty state unificado
- **B-05/B-06**: quitar el filtro "Ejercicio" roto o implementarlo de verdad

### LG-4 WorkoutSession (la grande)

- Bottom sheet para añadir ejercicio
- Set rows con glass rows dentro de cards glass-1
- Bottom bar flotante glass-2 con finish/draft
- Reemplazar `bg-gray-800/900` por tokens
- **R9**: extraer estilos inline

### LG-5 Cardio + Templates + Exercises + Stats

- Migrar los 4 tabs restantes
- `StatsTab`: reescribir todos los `bg-gray-800` a tokens (B-01)
- `CardioTab`: reescribir todos los `bg-gray-800` a tokens (B-02)
- `MonthCalendar`: reescribir todos los `bg-gray-800` a tokens (B-03)
- **R2**: centralizar `getAllTemplates` en un solo helper
- **R10**: usar `EmptyState` en Stats/Cardio/MonthCalendar

### LG-6 Polish

- Verificar dark/light en TODAS las pantallas (bug histórico: theme no aplicaba a Stats/Cardio/Calendar)
- Animaciones con curva Apple
- Focus rings afinados
- Contraste WCAG AA verificado

### LG-7 Bug fixes UI (mínimos, no refactor)

- **B-09**: mostrar username en mobile header
- **B-10**: importUserData no debe machacar `physicalProfile` si ya existe
- **B-11/B-12/B-13**: i18n en CardioTab, MonthCalendar, MapRoute
- **B-15**: ProfileTab import button debe usar `<Button>`
- **R1**: matar todo `bg-gray-800` huérfano (grep final)

### LG-8 Calidad

- Tests de componentes UI (Vitest + Testing Library)
- README con screenshots de ambos temas
- `npm run typecheck` en CI
- Verificar bundle size (Leaflet/Recharts siguen lazy)

## Bugs que NO arreglaremos en este plan

Marcados como out-of-scope por decisión del usuario (refactor mínimo):

- T-01 / T-02 / T-03 (sync race conditions, `updatedAt`, `initialPullDone`) — sprints.md ya los tiene como backlog
- T-06 (crypto.randomUUID en IDs) — patrón actual `Date.now()` con prefijo es suficiente
- T-07 (importUserData template merge) — relacionado con B-10, pero templates sí los fusiona ya
- T-12 a T-15 (limpieza `server/`, hooks muertos) — fuera de UI
- T-16 (bundle size) — Recharts y Leaflet ya son lazy
- T-17 (CI typecheck) — nice-to-have, no UI

## Componentes a crear/modificar

### Modificar
- `src/index.css` (tokens, glass, animaciones)
- `src/contexts/ThemeContext.tsx` (solo dark/light auto)
- `src/types/index.ts` (`ThemeName` → `'dark' | 'light'`)
- `src/components/LoginScreen.tsx`
- `src/components/layout/Shell.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/Card.tsx`
- `src/components/ui/Dialog.tsx`
- `src/components/ui/Field.tsx`
- `src/components/ui/IconButton.tsx`
- `src/components/ui/EmptyState.tsx`
- `index.html` (precarga Inter, theme-color)

### Crear
- `src/components/ui/Sheet.tsx`
- `src/components/ui/Chip.tsx`
- `src/components/ui/SegmentedControl.tsx`
- `src/components/ui/GlassCard.tsx` (helper de los 3 niveles de glass)

### Dejar para más tarde
- HomeTab, HistoryTab, WorkoutSession, CardioTab, TemplatesTab, ExercisesTab, StatsTab, MonthCalendar, ProfileTab, MapRoute, NumberPicker, NumericInput
