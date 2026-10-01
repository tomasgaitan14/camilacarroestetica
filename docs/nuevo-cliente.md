# Replicar la app de turnos para otro cliente

Guía para armar esta misma app para otro salón: lo que se hizo para Camila Carro en septiembre y octubre de 2026, en orden y con los problemas que aparecieron.

**Cómo funciona:**
- **Front:** Vite + React.
- **Backend:** funciones de Vercel en `api/`.
- **Datos:** una Google Sheet guarda servicios, equipo y horarios. Cada profesional tiene un Google Calendar donde quedan los turnos.
- **Acceso a Google:** todo pasa por una cuenta de servicio de Google.
- **Admin:** hay un solo admin, que entra con contraseña.

Ningún secreto va en el repo ni en el chat.

## 0. Definir con el cliente

- Profesionales, servicios con su duración y horarios de cada una.
- Reglas de reserva, en `shared/booking-rules.ts`:
  - anticipación mínima (hoy 2 h);
  - días adelante (hoy 30);
  - tope de turnos futuros por celular (hoy 3);
  - horas antes para cancelar o reprogramar (hoy 24).
- El WhatsApp del salón, que va en `SALON_WHATSAPP` en `src/lib/utils.ts`.
- Su identidad visual:
  - el nombre del salón en `index.html` (título y descripción), en `src/pages/BookingPage.tsx` y en `src/pages/LoginPage.tsx`;
  - el color de marca, en la paleta `brand` de `tailwind.config.ts`;
  - el logo, en `public/logo.png`.

## 1. Repo y Vercel

1. Crear el repo a partir de este, con la cuenta personal de GitHub. Antes, verificar la cuenta con `gh auth status` y definir si el repo es público o privado.
2. Firmar los commits con el email `noreply` de GitHub, porque el `~/.gitconfig` global tiene el email del trabajo:

```bash
git config user.email "$(gh api user --jq '"\(.id)+\(.login)@users.noreply.github.com"')"
```

3. Crear el proyecto en Vercel con el preset de Vite, conectado al repo para que `main` deploye solo. Verificar la cuenta con `vercel whoami` y vincular la carpeta con `vercel link`.
4. El `.vercelignore` ya excluye el `.env`. Hace falta porque la CLI de Vercel no lee el `.gitignore`.

## 2. Cuenta de Google del cliente

Crear una cuenta de Gmail a nombre del negocio, que va a ser la dueña de todo lo de producción. La crea Tom o el cliente; Claude no crea cuentas.

## 3. Google Cloud (con la cuenta del cliente)

1. En console.cloud.google.com, aceptar los términos y crear el proyecto `<cliente>-turnos`.
2. En "APIs y servicios" → "Biblioteca", habilitar **Google Sheets API** y **Google Calendar API**. Si falta alguna, la API responde 403 con "has not been used in project".
3. En "IAM y administración" → "Cuentas de servicio", crear `turnos-prod` sin roles. En "Claves" → "Agregar clave" → JSON.
4. Guardar la clave fuera de cualquier repo, con permisos solo para el usuario. Ningún repo ignora los `.json`, así que dejarla en la carpeta de un proyecto es un riesgo.

```bash
mkdir -p ~/.config/<cliente> && chmod 700 ~/.config/<cliente>
```

```bash
mv ~/Downloads/<archivo>.json ~/.config/<cliente>/google-service-account-prod.json && chmod 600 ~/.config/<cliente>/google-service-account-prod.json
```

## 4. Hoja y calendarios (con la cuenta del cliente)

- **Hoja:**
  - Crear la hoja `<Cliente> Turnos` con tres pestañas vacías y con estos nombres exactos: `services`, `professionals` y `availability`.
  - Compartirla como Editor con el email de la cuenta de servicio, sin notificar.
- **Calendarios:**
  - Crear un calendario por profesional y compartir cada uno con:
    - la cuenta de servicio, con el permiso "Hacer cambios en los eventos";
    - el Gmail de la profesional.
  - El ID está en "Integrar el calendario".
- **Regla para el cliente:** la hoja no se edita a mano. Si se escribe directo, Google cambia `09:00` por `9:00` y un ID mal copiado deja `/booking` caído. Todo se carga desde `/admin`.

## 5. Variables en Vercel (Production)

Hay que cargarlas **antes** del primer deploy de producción: si falta alguna, la API responde 500.

```bash
vercel env add GOOGLE_SERVICE_ACCOUNT_KEY production --value "$(base64 -i ~/.config/<cliente>/google-service-account-prod.json | tr -d '\n')" --yes
```

```bash
vercel env add GOOGLE_SHEET_ID production --value "<ID de la hoja: lo que va entre /d/ y /edit>" --yes
```

```bash
vercel env add SESSION_SECRET production --value "$(openssl rand -base64 32)" --yes
```

`ADMIN_PASSWORD` la elige el admin y tiene que tener 12 caracteres o más. Este comando la pide sin mostrarla:

```bash
read -s "?Contraseña de admin: " PW && printf '%s' "$PW" | vercel env add ADMIN_PASSWORD production --sensitive --yes; unset PW
```

Para Preview, el comando es el mismo con `preview ""`. La rama vacía significa "todas las ramas"; sin ella, la CLI se traba en modo no interactivo. Por ejemplo: `vercel env add NOMBRE preview "" --value ... --yes`.

## 6. DEV y preview (recomendado)

- **Local:** una hoja DEV y calendarios de prueba, compartidos con una cuenta de servicio de desarrollo. El `.env` local lleva las mismas 4 variables, con los valores DEV (ver `.env.example`). Se prueba con `vercel dev`.
- **Preview:** las variables DEV van en Preview y se publica con `vercel deploy`. Queda protegido con Vercel Authentication y se prueba desde un navegador con sesión en Vercel. No usar `vercel curl`, que puede dejar creado un bypass permanente de esa protección.

## 7. Deploy a producción

1. Push, PR y merge a `main`; Vercel deploya solo.
2. Smoke test sin escribir datos:
   - `GET /api/session` tiene que devolver `{"authenticated":false}`. Si da 500, revisar las variables y el largo de la contraseña.
   - `GET /api/services` tiene que devolver `[]` mientras el catálogo esté vacío.
3. Rollback: Instant Rollback de Vercel al deploy anterior.

## 8. Puesta en marcha

1. Cargar los servicios, el equipo (con los IDs de los calendarios) y los horarios en `/admin`. Al guardar se verifica que la cuenta de servicio vea cada calendario. Lo cargado tarda hasta un minuto en verse en `/booking`, por el catálogo en memoria.
2. Probar con un celular propio: reservar, reprogramar y cancelar. Después borrar el turno.
3. Cada profesional agrega su calendario en el celular y activa las notificaciones de eventos nuevos. La app no manda avisos.

## Problemas que ya aparecieron

| Problema | Solución |
|----------|----------|
| `vercel deploy` sube el `.env` | `.vercelignore` (la CLI no lee `.gitignore`) |
| `vercel dev` muestra la página en blanco | La regla de `vercel.json` excluye `/api`, las rutas con punto y `/@...` |
| `vercel env add ... preview` se traba | Pasar `""` como rama |
| 403 "has not been used in project" | Habilitar la API en el proyecto de Google Cloud |
| GitHub bloquea el push por "secretos" | Los tests usan credenciales obviamente falsas; si alguna parece real, corregirla antes del primer push |
| Commits firmados con el email del trabajo | `git config user.email` con el `noreply`, en cada repo |
| Clave JSON dentro de un repo | Moverla a `~/.config/<cliente>/` con `chmod 600` |
| Sheets limita a 60 lecturas por minuto por cuenta | El catálogo se guarda un minuto en memoria (ya implementado) |
| Un servicio asignado no aparece en `/booking` | La profesional que lo hace no tiene horarios o está inactiva, o el servicio está inactivo. `/admin` lo avisa en Servicios y en Equipo |
