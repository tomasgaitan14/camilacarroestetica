# camila-carro-estetica

## Descripción

App web mobile-first de turnos para Camila Carro Estética. Los clientes reservan en `/booking` y cancelan o reprograman en `/cancel`; Tom configura servicios, profesionales y horarios en `/admin`. Cada turno queda como evento en el Google Calendar de la profesional.

## Contexto

Personal — proyecto para cliente Camila Carro.

## Stack usado en este proyecto

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS v3, React Router v6, Zustand
- **Backend**: funciones de Vercel en `/api` (handlers `Request` → `Response`)
- **DB**: Google Sheet, accedida con una cuenta de servicio de Google
- **Turnos**: Google Calendar de cada profesional, con la misma cuenta de servicio
- **Auth admin**: contraseña (`ADMIN_PASSWORD`) + cookie firmada con HMAC (`SESSION_SECRET`)
- **Validación**: zod
- **Fechas**: date-fns + date-fns-tz (hora de Argentina) + react-day-picker
- **Tests**: Vitest, siempre con `TZ=UTC` (igual que Vercel)
- **Deploy**: Vercel

## Proyectos relacionados

Solo app. Sin repos hermanos.

## Cuentas

- **GitHub**: `tomasgaitan14` → repo `camilacarroestetica`
- **Vercel**: `tomasagustingaitan@gmail.com` (slug `tomasgaitans-projects`) → proyecto `camilacarro`
- **Google Cloud DEV**: usa la cuenta de servicio y los calendarios de prueba del proyecto WBot (`personal/WBot`), con una hoja DEV propia. Los datos están en el `.env` local y no en el repo, porque el repo es público.
- **Google Cloud PROD**: pendiente. Conviene una cuenta de servicio propia de camila-carro, no la de WBot.

## Variables de entorno

Todas son de backend (nunca con prefijo `VITE_`). Ver `.env.example`.

```
GOOGLE_SERVICE_ACCOUNT_KEY=   # JSON de la clave en base64
GOOGLE_SHEET_ID=              # solo el ID, no la URL
ADMIN_PASSWORD=               # mínimo 12 caracteres
SESSION_SECRET=               # mínimo 32 caracteres
```

## Flujos

- **Cliente (anónimo)**: `/booking` → servicio → día y horario → nombre y celular → se crea el evento en el calendario de la profesional asignada.
- **Admin (solo Tom)**: `/login` con contraseña → `/admin/services`, `/admin/professionals`, `/admin/availability`.
- **Cliente cancela o reprograma**: `/cancel` → ingresa su celular → ve sus turnos próximos → cancela o reprograma hasta 24 h antes. Con menos de 24 h, un botón de WhatsApp al salón (+54 9 3446 61-7979, `SALON_WHATSAPP` en `src/lib/utils.ts`) con el mensaje ya escrito.
- **Admin**: también cancela o mueve turnos directo en Google Calendar; `/booking` se actualiza solo.

## Reglas de comportamiento (NO romper)

- Los horarios de `/booking` son los bloques de `/admin/availability` menos cualquier evento del calendario de la profesional, incluidos los de todo el día y los marcados como "Disponible".
- `/api/slots` consulta los calendarios en cada pedido. `/api/bookings` los vuelve a consultar antes de crear el evento y responde 409 si el horario se ocupó.
- La profesional se asigna sola: la primera libre para ese horario, en el orden de la hoja.
- Todo se calcula en hora de Argentina (`America/Argentina/Buenos_Aires`); Vercel corre en UTC.
- El teléfono se guarda normalizado (`549XXXXXXXXXX`) y el evento lleva el link de WhatsApp.
- El formulario tiene un campo trampa oculto (`website`) contra bots.
- `/api/services` no expone profesionales ni IDs de calendario.
- Guardar en `/admin` reescribe las tres pestañas en un solo pedido (`valueInputOption: RAW`) y antes verifica que la cuenta de servicio pueda ver el calendario de cada profesional activa.
- Riesgo aceptado: dos reservas del mismo horario en el mismo segundo pueden duplicarse.
- Cada reserva guarda en propiedades privadas del evento `client_phone`, `client_name` y `service_id`: así `/cancel` encuentra los turnos de un celular. Solo aparecen los turnos creados desde 2026-10-01 y los de profesionales activas.
- `/api/my-bookings`, `/api/cancellations` y `/api/reschedules` reciben el celular en el cuerpo (POST), nunca en la URL, y antes de tocar un turno vuelven a buscar los de ese celular: la referencia sola no alcanza.
- Reprogramar crea el turno nuevo antes de borrar el viejo: si el horario ya no está, el cliente conserva el suyo.
- Riesgo aceptado por Tom: quien sepa el celular de un cliente puede cancelarle el turno. La lista no muestra el nombre del cliente.

## Decisiones tomadas

- **Google Sheets como DB**: decisión de Tom.
- **Un solo admin (Tom) con contraseña**: sin logins de profesionales ni Google OAuth.
- **Sin pago online ni notificaciones.**
- **Cancelación por celular**: se sacó al simplificar y se volvió a sumar el 2026-10-01 a pedido de Tom, aceptando que el celular solo identifica al cliente.
- **Sin selección de profesional en booking**: se auto-asigna.
- **Simplicidad ante todo**: tests solo para la lógica de horarios, teléfono, validación, config y sesión. Nada de TDD exhaustivo ni mutation testing (pedido de Tom, 2026-09-30).

## Estado actual

La rama `feat/google-sheets-backend` tiene la versión nueva completa, probada en DEV el 2026-09-30 con `vercel dev` y Chrome:
- en `/admin`: login, alta de servicios, equipo y horarios, y el rechazo de un calendario no compartido;
- en `/booking`: la reserva completa, el bloqueo por eventos cargados a mano (con horario y de todo el día), el 409 cuando el horario ya está tomado y el campo trampa.

El 2026-10-01 se sumó `/cancel`, probado igual: cancelar, reprogramar, la regla de 24 h, el rechazo de turnos de otro celular y el botón de WhatsApp.

Hay un preview en Vercel con las variables DEV (Preview, todas las ramas), protegido con Vercel Authentication; todavía no incluye `/cancel`. Producción (`main`) sigue con la versión anterior hasta que se haga el corte.

## Próximos pasos

1. Actualizar el preview con `/cancel` (`vercel deploy`).
2. Pasar a producción, con aprobación de Tom: cuenta de servicio propia, hoja PROD, calendarios reales compartidos, variables PROD en Vercel y merge a `main`.
3. Después del corte, limpiar lo que usaba la versión anterior: las variables `VITE_SUPABASE_*` de Vercel, el proyecto `CamilaCarroEstetica` de la org `crmsolutions` (libera un slot) y su fila en `personal/CLAUDE.md`.
4. Branding (logo y colores de Camila).

## Archivos clave

- `api/` — endpoints: `services`, `slots`, `bookings`, `my-bookings`, `cancellations`, `reschedules`, `session`, `admin/catalog`
- `server/domain/client-changes.ts` — regla de 24 h y validación de los pedidos de `/cancel`
- `src/pages/CancelPage.tsx` — cancelar y reprogramar
- `server/booking.ts` — horarios disponibles con los calendarios y creación del turno
- `server/catalog.ts` — lectura y escritura de la hoja, validación del catálogo
- `server/calendar.ts` — Google Calendar: eventos ocupados, crear evento, verificar acceso
- `server/session.ts` — login y cookie de admin
- `server/domain/` — lógica pura: `slots`, `time`, `phone`, `booking-request`
- `shared/types.ts` — tipos compartidos entre front y back
- `src/components/admin/AdminLayout.tsx` y `src/pages/Admin*Page.tsx` — panel
- `src/components/booking/` — flujo de reserva

## Notas / contexto extra

Desarrollo local: `vercel dev` levanta Vite y `/api` juntos y toma el `.env`. La regla de `vercel.json` excluye `/api`, las rutas con punto y las que empiezan con `@`: si no, en dev devuelve `index.html` en lugar de los módulos de Vite.

La hoja se edita solo desde `/admin`. Si se escribe a mano, Google cambia el formato de las horas (`09:00` → `9:00`; la lectura lo tolera) y un ID inválido deja `/booking` caído.

Pestañas de la hoja (la fila 1 son los encabezados, la app los escribe al guardar):

| Pestaña | Columnas |
|---------|----------|
| `services` | `id`, `name`, `description`, `duration_minutes`, `active` |
| `professionals` | `id`, `name`, `calendar_id`, `service_ids` (separados por coma), `active` |
| `availability` | `professional_id`, `day_of_week` (0=domingo), `start_time`, `end_time` |
