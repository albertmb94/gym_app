# 🚀 Despliegue en Vercel con base de datos persistente (gratis)

Esta app guarda los datos **en el servidor** (no solo en el navegador) usando **Turso**
(SQLite distribuido, free tier muy generoso). Así, los usuarios pueden iniciar sesión
con su nombre desde cualquier dispositivo y recuperar todo su histórico.

> **Coste total: 0 €/mes**
> Free tier de Vercel + Free tier de Turso: 9 GB de almacenamiento, 1 000 millones de
> lecturas/mes y 25 millones de escrituras/mes. Más que suficiente.

---

## 📐 Arquitectura

```
┌─────────────┐     HTTPS    ┌──────────────────────┐    libSQL     ┌──────────────┐
│  Navegador  │ ───────────► │  Vercel (Frontend +  │ ────────────► │     Turso    │
│ (React app) │ ◄─────────── │  /api Serverless)    │ ◄──────────── │  (Database)  │
└─────────────┘              └──────────────────────┘               └──────────────┘
       ▲
       │
   localStorage (caché offline + fallback)
```

- El frontend sigue funcionando offline (localStorage).
- En cuanto detecta que `/api/health` responde, **sincroniza automáticamente** con el
  servidor (ves un badge `☁ sync` arriba a la derecha).
- Al iniciar sesión con el mismo nombre desde otro dispositivo, **descarga el histórico**
  desde Turso.

---

## 1️⃣ Crear la base de datos en Turso (5 min, gratis)

1. Ve a **https://turso.tech** y crea una cuenta (login con GitHub recomendado).
2. En el dashboard, pulsa **"Create Database"**.
3. Elige:
   - **Name**: `gym-tracker` (o el que prefieras)
   - **Group**: `default`
   - **Region**: la más cercana (ej. `Madrid (mad)` o `Frankfurt (fra)`)
4. Una vez creada, entra en la base de datos y pulsa **"Create Token"** (pestaña
   *"Connect"* o botón **"Generate token"**). Copia:
   - 🔑 **Database URL** → algo como `libsql://gym-tracker-tu-usuario.turso.io`
   - 🔑 **Auth Token** → un JWT largo

   ⚠️ **Guárdalos**, los necesitarás en el paso 3.

---

## 2️⃣ Subir el código a GitHub

```bash
# En la raíz del proyecto:
git init
git add .
git commit -m "Initial commit"
git branch -M main
# Crea un repo vacío en https://github.com/new y luego:
git remote add origin https://github.com/TU_USUARIO/gym-tracker.git
git push -u origin main
```

---

## 3️⃣ Desplegar en Vercel (3 min, gratis)

1. Ve a **https://vercel.com** y entra con tu cuenta de GitHub.
2. Pulsa **"Add New… → Project"**.
3. Selecciona tu repo `gym-tracker` e **Import**.
4. Vercel detectará automáticamente el framework Vite. **No cambies nada** del build
   (ya está configurado en `vercel.json`).
5. Antes de pulsar **Deploy**, despliega la sección **"Environment Variables"** y añade:

   | Name                  | Value                                            |
   |-----------------------|--------------------------------------------------|
   | `TURSO_DATABASE_URL`  | `libsql://gym-tracker-tu-usuario.turso.io`       |
   | `TURSO_AUTH_TOKEN`    | (el JWT que copiaste)                            |

6. Pulsa **Deploy**. En ~1 min tendrás tu URL `https://gym-tracker-xxx.vercel.app`.

---

## 4️⃣ Verificar que funciona

1. Abre tu URL de Vercel.
2. Comprueba que en la cabecera, junto al nombre de usuario, aparece el badge
   verde **`☁ sync`** (significa que está sincronizado).
   - Si ves **`local`**: la API no tiene acceso al servidor → revisa las variables de
     entorno y vuelve a desplegar.
3. Crea un usuario, registra un par de ejercicios, ciérra sesión.
4. Abre la URL **en otro navegador** (o móvil), entra con el mismo nombre y deberías
   ver tus ejercicios. ✅

---

## 5️⃣ (Opcional) Desarrollo local con la base de datos en la nube

Para desarrollar localmente apuntando a Turso:

```bash
# Instala Vercel CLI
npm i -g vercel

# Vincula el proyecto local con tu proyecto Vercel
vercel link

# Descarga las variables de entorno de Vercel a tu .env.local
vercel env pull

# Levanta el dev server con las funciones serverless
vercel dev
```

Abre `http://localhost:3000` y verás la app conectada a la misma base de datos de
producción.

---

## 🧰 Endpoints disponibles

El servidor (`api/index.ts`) expone solo 4 endpoints sencillos:

| Método | URL                    | Descripción                                  |
|--------|------------------------|----------------------------------------------|
| GET    | `/api/health`          | Health check (devuelve `{ ok, hasDb }`)      |
| GET    | `/api/users`           | Lista de usernames registrados               |
| GET    | `/api/data/:username`  | Devuelve el blob JSON de un usuario          |
| PUT    | `/api/data/:username`  | Guarda el blob JSON de un usuario            |

El frontend hace estas peticiones automáticamente desde `src/lib/serverSync.ts`. La
estrategia es **last-write-wins por usuario**: cada cambio se sube al servidor con
debounce de 800 ms. En el login, se descarga el blob del servidor (si existe) y se
mergea con lo que haya en el localStorage local.

---

## 🔐 ¿Y la seguridad?

> Esta app está pensada para uso **personal o familiar**. El "login" es solo un
> nombre de usuario sin contraseña, igual que tu app local — el servidor confía en
> el nombre que le envíes.

Si quieres añadir auth real más adelante:
- **Clerk** o **Auth0** (free tier ~10 000 MAU)
- **Supabase Auth** (free tier 50 000 MAU)

---

## 🆘 Problemas comunes

**El badge muestra `local` siempre**
- Verifica que añadiste las variables `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` en
  Vercel → Settings → Environment Variables.
- Tras añadirlas, **redeploya** (Settings → Deployments → menú `⋯` → Redeploy).

**`Error: TURSO_DATABASE_URL is not set` en los logs de Vercel**
- Mismo problema. Asegúrate de marcar las variables como activas en *Production*,
  *Preview* y *Development*.

**Quiero borrar todos mis datos**
- En Turso → tu base de datos → pestaña **"Console"** → ejecuta:
  ```sql
  DELETE FROM user_data;
  ```

**Quiero ver qué hay almacenado**
- En la consola de Turso:
  ```sql
  SELECT username, length(data) as size_bytes, datetime(updated_at/1000, 'unixepoch') as updated
  FROM user_data;
  ```

---

## 💸 Otras alternativas a Turso (también gratis)

Si por algún motivo no quieres Turso, puedes adaptar `api/index.ts` a:

| Proveedor          | Free tier                              | Cambio principal                       |
|--------------------|----------------------------------------|----------------------------------------|
| **Vercel Postgres**| 60 h compute, 256 MB                   | Sustituir `@libsql/client` por `@vercel/postgres`, cambiar `?` por `$1, $2…` |
| **Supabase**       | 500 MB Postgres + 2 GB egress          | Usar el SDK `@supabase/supabase-js`    |
| **Neon**           | 3 GB, branch infinitos                 | Igual que Vercel Postgres              |
| **MongoDB Atlas**  | 512 MB                                 | Usar `mongodb` driver, cambiar SQL por documentos |

Pero **Turso es la opción más sencilla** porque es SQLite + casi 0 código que
mantener.
