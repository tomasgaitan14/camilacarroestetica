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

- **GitHub**: `tomasgaitan14` → repo `camilacarroestetica` (público). Los commits van firmados con el `noreply` de GitHub, configurado como `user.email` local del repo.
- **Vercel**: `tomasagustingaitan@gmail.com` (equipo `tomasg-projects`) → proyecto `camilacarro`. Producción se deploya sola desde `main`.
- **Google Cloud DEV**: usa la cuenta de servicio y los calendarios de prueba del proyecto WBot (`personal/WBot`), con una hoja DEV propia. Los datos están en el `.env` local.
- **Google Cloud PROD**: cuenta de Google propia del salón, con su proyecto de Google Cloud, la cuenta de servicio `turnos-prod`, la hoja "Camila Carro Turnos" y el calendario "Turnos – Camila". La clave está en `~/.config/camila-carro/` y las variables en Vercel (Production). El email de la cuenta y los IDs no van en el repo, porque es público; están en el `CLAUDE.md` de `personal/`.

## Variables de entorno

Ver `.env.example`. Los secretos son de backend y nunca llevan el prefijo `VITE_`.

```
GOOGLE_SERVICE_ACCOUNT_KEY=   # JSON de la clave en base64
GOOGLE_SHEET_ID=              # solo el ID, no la URL
ADMIN_PASSWORD=               # mínimo 12 caracteres
SESSION_SECRET=               # mínimo 32 caracteres
# Avisos por WhatsApp (sin WHATSAPP_MODE están apagados, como en producción)
WHATSAPP_MODE=                # zernio-sandbox: simulación
ZERNIO_API_KEY=
ZERNIO_TEST_PHONE=            # celular de prueba con sesión en el sandbox
CRON_SECRET=                  # mínimo 32 caracteres; lo manda GitHub Actions
VITE_WHATSAPP_NOTICE=         # "true" muestra el aviso en /booking (no es secreto)
```

## Flujos

- **Cliente (anónimo)**: `/booking` → servicio → día y horario → nombre y celular → se crea el evento en el calendario de la profesional asignada.
- **Admin (solo Tom)**: `/login` con contraseña → `/admin/services`, `/admin/professionals`, `/admin/availability`.
- **Cliente cancela o reprograma**: `/cancel` → ingresa su celular → ve sus turnos próximos → cancela o reprograma hasta 24 h antes. Con menos de 24 h, un botón de WhatsApp al salón (+54 9 3446 61-7979, `SALON_WHATSAPP` en `shared/salon.ts`) con el mensaje ya escrito.
- **Admin**: también cancela o mueve turnos directo en Google Calendar; `/booking` se actualiza solo.

## Avisos por WhatsApp (simulación)

- **Dónde está activo:** solo con `WHATSAPP_MODE=zernio-sandbox`, es decir en el `.env` local y en Preview. En producción no hay `WHATSAPP_MODE`, así que no se manda nada.
- **Simulación:** todos los mensajes van a `ZERNIO_TEST_PHONE` por el sandbox de Zernio, con la línea "Simulación: mensaje para +…". El sandbox solo entrega si ese celular le escribió en las últimas 24 h, y su sesión dura 7 días.
- **Confirmación:** se manda al reservar y al reprogramar. Si falla WhatsApp, la reserva no se cae: se registra el error y listo.
- **Recordatorio:**
  - `POST /api/cron/reminders`, con `Authorization: Bearer CRON_SECRET`, manda el de los turnos reservados desde la web que empiezan en menos de 2 h y marca el evento con `reminder_sent_at`.
  - Lo dispara `.github/workflows/whatsapp-reminders.yml` cada 15 minutos. GitHub solo programa los workflows que están en `main`, y los desactiva después de 60 días sin actividad en el repo.
  - Las corridas programadas usan la copia del workflow que está en `main`. Un cambio en `dev` cuenta recién cuando llega a `main`; antes se prueba con `gh workflow run whatsapp-reminders.yml --ref dev`.
  - Pushear cambios en `.github/workflows/` necesita un token con el permiso `workflow`. El de `gh` lo tiene; el que usa git por defecto, no (ver `personal/CLAUDE.md`).
  - Los secretos de GitHub son `REMINDERS_URL` (el preview de la rama `dev`), `CRON_SECRET` y `VERCEL_AUTOMATION_BYPASS_SECRET`, la clave de Vercel que permite pasar la protección de los previews.
  - La corrida falla si la app no responde 200. Antes quedaba en verde aunque Vercel frenara el pedido: si la clave de bypass no sirve, Vercel responde 302 al login y curl no lo toma como error.
- **Para producción con Meta:** se reemplaza la pieza de envío en `server/messaging.ts` por la Cloud API de Meta con las plantillas aprobadas. El plan está en la memoria de Claude.

## Reglas de comportamiento (NO romper)

- Los horarios de `/booking` son los bloques de `/admin/availability` menos cualquier evento del calendario de la profesional, incluidos los de todo el día y los marcados como "Disponible".
- `/api/slots` consulta los calendarios en cada pedido. `/api/bookings` los vuelve a consultar antes de crear el evento y responde 409 si el horario se ocupó.
- La profesional se asigna sola: la primera libre para ese horario, en el orden de la hoja.
- Todo se calcula en hora de Argentina (`America/Argentina/Buenos_Aires`); Vercel corre en UTC.
- El teléfono se guarda normalizado (`549XXXXXXXXXX`) y el evento lleva el link de WhatsApp.
- El formulario tiene un campo trampa oculto (`website`) contra bots.
- `/api/services` no expone profesionales ni IDs de calendario.
- En `/booking`, los servicios se agrupan por la primera profesional, en el orden de Equipo, que los hace y tiene horarios. Entre grupos va una línea punteada, sin nombres. Un servicio compartido aparece una sola vez, en el grupo de la primera. La API solo manda el número de grupo (`group`).
- Guardar en `/admin` reescribe las tres pestañas en un solo pedido (`valueInputOption: RAW`) y antes verifica que la cuenta de servicio pueda ver el calendario de cada profesional activa.
- Eliminar un servicio en `/admin` (pide confirmación) también lo saca de las profesionales que lo hacen, porque el catálogo rechaza servicios inexistentes. Los turnos ya reservados quedan en el calendario: en `/cancel` aparecen como "Turno" y se pueden cancelar, pero no reprogramar.
- Riesgo aceptado: dos reservas del mismo horario en el mismo segundo pueden duplicarse.
- Cada reserva guarda en propiedades privadas del evento `client_phone`, `client_name` y `service_id`: así `/cancel` encuentra los turnos de un celular. Solo aparecen los turnos creados desde 2026-10-01 y los de profesionales activas.
- `/api/my-bookings`, `/api/cancellations` y `/api/reschedules` reciben el celular en el cuerpo (POST), nunca en la URL, y antes de tocar un turno vuelven a buscar los de ese celular: la referencia sola no alcanza.
- Reprogramar crea el turno nuevo antes de borrar el viejo: si el horario ya no está, el cliente conserva el suyo.
- Riesgo aceptado por Tom: quien sepa el celular de un cliente puede cancelarle el turno. La lista no muestra el nombre del cliente.
- Ventana de reserva (`shared/booking-rules.ts`): con al menos 2 h de anticipación y hasta 30 días adelante, contados en hora de Argentina. Vale para reservar y para reprogramar; el calendario del front no deja ir más allá.
- Máximo 3 turnos futuros por celular al reservar; reprogramar no suma.
- El catálogo (servicios, equipo y horarios) se guarda 1 minuto en memoria, porque Sheets permite 60 lecturas por minuto por cuenta. Los cambios de `/admin` se ven en `/booking` en hasta un minuto; `/admin` siempre lee la hoja. Los calendarios no se cachean.

## Decisiones tomadas

- **Google Sheets como DB**: decisión de Tom.
- **Un solo admin (Tom) con contraseña**: sin logins de profesionales ni Google OAuth.
- **Sin pago online ni notificaciones.**
- **Cancelación por celular**: se sacó al simplificar y se volvió a sumar el 2026-10-01 a pedido de Tom, aceptando que el celular solo identifica al cliente.
- **Sin selección de profesional en booking**: se auto-asigna.
- **Simplicidad ante todo**: tests solo para la lógica de horarios, teléfono, validación, config y sesión. Nada de TDD exhaustivo ni mutation testing (pedido de Tom, 2026-09-30).
- **Producción con una cuenta de Google del salón** (2026-10-01): la hoja, los calendarios y la cuenta de servicio quedan a nombre de Camila Carro, no de Tom ni de WBot.

## Estado actual

La rama `feat/google-sheets-backend` tiene la versión nueva completa, probada en DEV el 2026-09-30 con `vercel dev` y Chrome:
- en `/admin`: login, alta de servicios, equipo y horarios, y el rechazo de un calendario no compartido;
- en `/booking`: la reserva completa, el bloqueo por eventos cargados a mano (con horario y de todo el día), el 409 cuando el horario ya está tomado y el campo trampa.

El 2026-10-01 se sumaron, probados igual:
- `/cancel`: cancelar, reprogramar, la regla de 24 h, el rechazo de turnos de otro celular y el botón de WhatsApp;
- las reglas de reserva: 2 h de anticipación, 30 días adelante y 3 turnos por celular;
- el catálogo en memoria.

Las credenciales falsas de los tests se reemplazaron en todo el historial de la rama, para que GitHub no bloquee el push.

El preview de la rama `dev`, https://camilacarro-git-dev-tomasg-projects.vercel.app, tiene las variables DEV (Preview, todas las ramas) y la simulación de WhatsApp. Está protegido con Vercel Authentication y se vuelve a deployar solo con cada push a `dev`.

**En producción desde el 2026-10-01** (PR #1). El smoke test pasó: la API arranca con la configuración de producción y la hoja de producción se lee bien, todavía vacía. El paso a paso para replicar la app con otro cliente está en `docs/nuevo-cliente.md`.

## Próximos pasos

1. Tom carga los servicios, a Camila con su calendario y los horarios en el `/admin` de producción.
2. Probar en producción: reservar, reprogramar y cancelar un turno con un celular propio; después borrarlo.
3. Camila agrega "Turnos – Camila" en su celular y activa las notificaciones de eventos nuevos (la app no manda avisos).
4. Rollback: Instant Rollback de Vercel al deploy anterior, que usa Supabase. Por eso, recién **desde el 2026-10-15**, si producción sigue estable, se borran las variables `VITE_SUPABASE_*` de Vercel, el proyecto `CamilaCarroEstetica` de la org `crmsolutions` (libera un lugar) y su mención en `personal/CLAUDE.md`.
5. Branding (logo y colores de Camila).

## Archivos clave

- `api/` — endpoints: `services`, `slots`, `bookings`, `my-bookings`, `cancellations`, `reschedules`, `session`, `admin/catalog`
- `docs/nuevo-cliente.md` — paso a paso para replicar la app con otro cliente
- `server/messaging.ts` — envío de WhatsApp intercambiable (hoy el sandbox de Zernio; apagado sin `WHATSAPP_MODE`)
- `server/notifications.ts` y `server/domain/notifications.ts` — confirmación, recordatorio y textos
- `api/cron/reminders.ts` y `.github/workflows/whatsapp-reminders.yml` — recordatorios 2 h antes
- `shared/booking-rules.ts` — reglas de reserva: anticipación, días adelante, tope por celular y las 24 h para cambios
- `server/domain/booking-window.ts` — aplica la ventana de reserva y el tope por celular
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
