# Sprints — GymTracker (gym_app_vercel)

Backlog de tareas derivado de la revisión de código. Cada tarea es **atómica e independiente**: puede abordarse, revisarse y mergearse por separado sin depender de las demás. El orden de los sprints refleja prioridad, pero dentro de un sprint las tareas no tienen dependencias entre sí.

Leyenda de prioridad: 🔴 crítica · 🟠 alta · 🟡 media · 🔵 baja

---

## Sprint 1 — Integridad de datos (🔴 crítico)

### T-01 · Evitar pérdida de datos en la sincronización (race pull/push)
- **Prioridad:** 🔴
- **Archivos:** `src/hooks/useStorage.ts` (efectos de pull `:59-78` y push `:81-103`)
- **Problema:** El push puede dispararse (800 ms) antes de que el pull inicial termine, sobreescribiendo el servidor con datos locales vacíos al entrar en un dispositivo nuevo.
- **Qué hacer:**
  - Añadir un flag/ref `pullCompleted` por usuario.
  - El efecto de push debe hacer `return` mientras `pullCompleted` sea falso para el usuario actual.
  - Marcar `pullCompleted = true` en el `.then()` y en el `.catch()` del pull (también cuando el servidor no esté disponible, para no bloquear el modo local).
- **Criterio de aceptación:** Con datos en servidor y `localStorage` vacío, al iniciar sesión NO se sube un blob vacío; el primer push ocurre solo después de fusionar lo remoto.
- **Independiente:** Sí.

### T-02 · Resolución de conflictos por `updatedAt`
- **Prioridad:** 🔴
- **Archivos:** `src/lib/serverSync.ts` (`fetchUserData` `:39`, `mergeServerData` `:74`), `src/hooks/useStorage.ts`
- **Problema:** `mergeServerData` siempre hace "el servidor gana" e ignora el `updatedAt` que el endpoint ya devuelve (`api/index.ts:72`). Last-write-wins ciego → pérdidas silenciosas.
- **Qué hacer:**
  - Hacer que `fetchUserData` devuelva también `updatedAt`.
  - Guardar un `lastSyncedAt` local por usuario (en `localStorage`).
  - Aplicar lo remoto solo si `remote.updatedAt > lastSyncedAt`; si lo local es más nuevo, conservar local y dejar que el push lo suba.
- **Criterio de aceptación:** Editar offline y luego reconectar NO descarta los cambios locales más recientes.
- **Independiente:** Sí (se apoya conceptualmente en T-01 pero puede implementarse aparte).

### T-03 · Limpiar `initialPullDone` al hacer logout
- **Prioridad:** 🟠
- **Archivos:** `src/hooks/useStorage.ts` (`initialPullDone` ref `:51`, `logout` `:133`)
- **Problema:** El `Set` de usuarios ya sincronizados nunca se limpia; al cambiar de usuario y volver, no se re-sincroniza desde el servidor.
- **Qué hacer:** Vaciar/eliminar la entrada del usuario en `initialPullDone` (y resetear `lastPushed`) dentro de `logout`.
- **Criterio de aceptación:** logout → login del mismo usuario vuelve a hacer pull del servidor.
- **Independiente:** Sí.

---

## Sprint 2 — Robustez / cálculos (🟠/🟡)

### T-04 · Evitar `NaN` en `estimateCardioCalories`
- **Prioridad:** 🟠
- **Archivos:** `src/hooks/useStorage.ts` (`:520-536`)
- **Problema:** Si `restingHeartRate` es 0 o igual a `maxHeartRate`, `hrReserve = 0` → `intensity = Infinity/NaN` → calorías `NaN`.
- **Qué hacer:** Validar `hrReserve > 0` antes de dividir; si no, caer al cálculo basado solo en MET. Clampear `intensity` a `[0, 1]`.
- **Criterio de aceptación:** Con perfil incompleto/0, devuelve un número finito y razonable.
- **Independiente:** Sí.

### T-05 · Proteger parseo de `localStorage` en `App.tsx`
- **Prioridad:** 🟠
- **Archivos:** `src/App.tsx` (`:69-70`)
- **Problema:** `JSON.parse(storedData)` sin `try/catch`; un `gymtracker_data` corrupto deja la app en pantalla blanca.
- **Qué hacer:** Envolver en `try/catch` (o reutilizar el `loadData` del hook) y devolver `[]` ante error.
- **Criterio de aceptación:** Con `gymtracker_data` corrupto la app arranca en la pantalla de login sin crashear.
- **Independiente:** Sí.

### T-06 · IDs únicos con `crypto.randomUUID()`
- **Prioridad:** 🟡
- **Archivos:** `src/hooks/useStorage.ts` (todos los `` `xxx_${Date.now()}` `` en `:230, :294, :382`, etc.)
- **Problema:** Dos acciones en el mismo milisegundo generan IDs colisionantes; `uuid` ya está instalado pero no se usa.
- **Qué hacer:** Sustituir los `Date.now()` por `crypto.randomUUID()` (nativo en navegador) manteniendo prefijos (`custom-`, `workout-`...).
- **Criterio de aceptación:** No hay colisiones de ID al crear varios elementos rápidamente.
- **Independiente:** Sí.

### T-07 · `importUserData`: fusionar en vez de sobreescribir
- **Prioridad:** 🟡
- **Archivos:** `src/hooks/useStorage.ts` (`:640-643`)
- **Problema:** `customTemplates`, `weeklyPlan` y `physicalProfile` se reemplazan por completo con lo importado, descartando lo existente (incoherente con las sesiones, que sí se fusionan por ID).
- **Qué hacer:** Fusionar `customTemplates` por `id` (igual que sesiones/ejercicios); decidir y documentar política para `weeklyPlan`/`physicalProfile` (p.ej. solo si el usuario no tiene ya valor).
- **Criterio de aceptación:** Importar no borra templates/plan ya existentes.
- **Independiente:** Sí.

### T-08 · Progressive overload no aplica a peso corporal
- **Prioridad:** 🔵
- **Archivos:** `src/hooks/useStorage.ts` (`getSuggestedSets` `:221-261`, sugerencia +2.5 kg `:252`)
- **Problema:** Sugiere +2.5 kg en ejercicios con `weight: 0` (dominadas, fondos).
- **Qué hacer:** Si el peso de referencia es 0, no incrementar peso (o sugerir +1 rep). Considerar el músculo/ejercicio.
- **Criterio de aceptación:** Ejercicios de peso corporal mantienen `weight: 0` en la sugerencia.
- **Independiente:** Sí.

---

## Sprint 3 — Seguridad / privacidad (🟠)

### T-09 · Autenticación mínima por usuario (PIN/token)
- **Prioridad:** 🟠
- **Archivos:** `api/index.ts` (endpoints `/api/data/:username`), `src/lib/serverSync.ts`, pantalla de login
- **Problema:** Cualquiera puede leer/escribir datos de cualquier usuario conociendo el nombre; sin auth.
- **Qué hacer:**
  - Añadir un secreto por usuario (PIN o token) almacenado hasheado en la fila.
  - Exigir el token en cabecera (`Authorization`) para `GET/PUT /api/data/:username`.
  - Frontend: pedir y guardar el token; enviarlo en `fetch`.
- **Criterio de aceptación:** Sin token válido, los endpoints de datos devuelven 401.
- **Independiente:** Sí (define el contrato de auth de forma autónoma).

### T-10 · Restringir o eliminar el listado público de usuarios
- **Prioridad:** 🟠
- **Archivos:** `api/index.ts` (`GET /api/users` `:100`), `src/lib/serverSync.ts` (`listServerUsers`)
- **Problema:** Enumeración de todos los usuarios sin restricción.
- **Qué hacer:** Eliminar el endpoint, o protegerlo tras auth, o limitarlo a quick-login local (no servidor).
- **Criterio de aceptación:** No es posible enumerar usuarios de forma anónima.
- **Independiente:** Sí.

### T-11 · Endurecer CORS
- **Prioridad:** 🟡
- **Archivos:** `api/index.ts` (`app.use(cors())` `:41`)
- **Problema:** CORS abierto a cualquier origen.
- **Qué hacer:** Restringir `origin` al dominio de Vercel (vía variable de entorno `ALLOWED_ORIGIN`).
- **Criterio de aceptación:** Peticiones desde orígenes no permitidos son rechazadas por CORS.
- **Independiente:** Sí.

---

## Sprint 4 — Limpieza de código muerto (🟡)

> Estas tareas no cambian comportamiento de usuario, solo reducen confusión y peso.

### T-12 · Eliminar la carpeta `server/`
- **Prioridad:** 🟡
- **Archivos:** `server/**` (index, database, routes, tsconfig)
- **Problema:** Backend Express + `better-sqlite3` que no funciona en Vercel (filesystem efímero) y describe un esquema distinto al real. No lo importa nada del frontend desplegado.
- **Qué hacer:** Borrar la carpeta `server/`. Verificar que `npm run build` sigue OK.
- **Criterio de aceptación:** Build verde sin la carpeta.
- **Independiente:** Sí.

### T-13 · Eliminar hooks/cliente API muertos
- **Prioridad:** 🟡
- **Archivos:** `src/hooks/useHybridStorage.ts`, `src/hooks/useAPI.ts`, `src/api/client.ts`
- **Problema:** Apuntan a endpoints (`/api/users/login`, `/api/exercises/:userId`...) que no existen en `api/index.ts`. Ningún componente los importa.
- **Qué hacer:** Confirmar con búsqueda que no hay imports y borrarlos. Verificar build.
- **Criterio de aceptación:** Build verde; `grep` sin referencias a esos módulos.
- **Independiente:** Sí.

### T-14 · Depurar dependencias del `package.json`
- **Prioridad:** 🟡
- **Archivos:** `package.json`
- **Problema:** `better-sqlite3` (nativo, pesado), `express`-relacionados y `@types/*` de servidor se instalan sin necesidad tras la limpieza. Algunos `@types` están en `dependencies`.
- **Qué hacer:** Tras T-12/T-13, eliminar `better-sqlite3`, `@types/better-sqlite3`, `@types/cors`, `@types/express` si dejan de usarse; mover `@types/*` restantes a `devDependencies`. `npm install` y build de verificación.
- **Criterio de aceptación:** `npm install` más ligero; build verde; sin imports rotos.
- **Independiente:** Sí (ejecutar después de T-12/T-13 si se quiere borrado completo, pero la decisión es autónoma).

### T-15 · Actualizar `README.md`
- **Prioridad:** 🔵
- **Archivos:** `README.md`
- **Problema:** Documenta la API antigua inexistente y el modo `tsx server/index.ts`, induciendo a error.
- **Qué hacer:** Reescribir secciones de API/despliegue para reflejar el backend real (Turso + `api/index.ts`), las variables `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` y el flujo Vercel.
- **Criterio de aceptación:** README coincide con el código y el despliegue reales.
- **Independiente:** Sí.

---

## Sprint 5 — Rendimiento / DX (🔵)

### T-16 · Reducir tamaño del bundle inicial
- **Prioridad:** 🔵
- **Archivos:** `vite.config.ts` (`viteSingleFile`), pestañas con `leaflet`/`recharts`/`xlsx`
- **Problema:** `vite-plugin-singlefile` inlinea todo en un `index.html` de ~990 kB (284 kB gzip); librerías pesadas cargan en el arranque.
- **Qué hacer:** Quitar `singlefile` (Vercel sirve assets estáticos) o aplicar `React.lazy`/`import()` dinámico para Mapa (MapRoute), Stats y export Excel.
- **Criterio de aceptación:** El JS inicial baja notablemente; las pestañas pesadas cargan bajo demanda.
- **Independiente:** Sí.

### T-17 · Configurar lint/typecheck en CI y script `typecheck`
- **Prioridad:** 🔵
- **Archivos:** `package.json`, configuración CI (si aplica)
- **Problema:** No hay script de `tsc --noEmit` ni lint; los errores de tipos solo se ven en build.
- **Qué hacer:** Añadir `"typecheck": "tsc --noEmit"` y, opcionalmente, ESLint. Documentar uso.
- **Criterio de aceptación:** `npm run typecheck` pasa en limpio.
- **Independiente:** Sí.

---

## Tabla resumen

| ID | Prioridad | Tarea | Área |
|----|-----------|-------|------|
| T-01 | 🔴 | Evitar pérdida de datos en sync (race pull/push) | Datos |
| T-02 | 🔴 | Resolución de conflictos por `updatedAt` | Datos |
| T-03 | 🟠 | Limpiar `initialPullDone` en logout | Datos |
| T-04 | 🟠 | Evitar `NaN` en calorías cardio | Cálculo |
| T-05 | 🟠 | Proteger parseo de `localStorage` en App | Robustez |
| T-06 | 🟡 | IDs únicos con `crypto.randomUUID()` | Robustez |
| T-07 | 🟡 | `importUserData`: fusionar, no sobreescribir | Datos |
| T-08 | 🔵 | Overload no aplica a peso corporal | Cálculo |
| T-09 | 🟠 | Autenticación mínima por usuario | Seguridad |
| T-10 | 🟠 | Restringir listado de usuarios | Seguridad |
| T-11 | 🟡 | Endurecer CORS | Seguridad |
| T-12 | 🟡 | Eliminar carpeta `server/` | Limpieza |
| T-13 | 🟡 | Eliminar hooks/cliente API muertos | Limpieza |
| T-14 | 🟡 | Depurar dependencias | Limpieza |
| T-15 | 🔵 | Actualizar README | Docs |
| T-16 | 🔵 | Reducir bundle inicial | Rendimiento |
| T-17 | 🔵 | Script typecheck / lint en CI | DX |
