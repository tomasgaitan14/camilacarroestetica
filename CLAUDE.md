# camila-carro-estetica

## Descripción

App web mobile-first de turnos para Camila Carro Estética. Permite a los clientes reservar turnos online y a Camila + su equipo gestionar la agenda desde un panel interno.

## Contexto

Personal — proyecto para cliente Camila Carro.

## Stack usado en este proyecto

- **Frontend**: Vite + React 18 + TypeScript + Tailwind CSS v3
- **Routing**: React Router v6
- **Estado global**: Zustand
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **Auth**: Google OAuth vía Supabase (con scope de Google Calendar)
- **Fechas**: date-fns + react-day-picker
- **Deploy**: Vercel

## Proyectos relacionados

Solo app. Sin repos hermanos.

## Cuentas

- **GitHub**: `tomasgaitan14` → repo `camilacarroestetica`
- **Vercel**: `tomasagustingaitan@gmail.com` (slug `tomasgaitans-projects`) → proyecto `camilacarro`
- **Supabase**: `crmsolutionsgchu@gmail.com` (org `crmsolutions`) → proyecto `CamilaCarroEstetica` (ID: `zbapybnnzafascbkqmzr`)

## Variables de entorno requeridas

```
VITE_SUPABASE_URL=https://zbapybnnzafascbkqmzr.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key del proyecto>
```

En la Edge Function `sync-calendar` (variables en Supabase):
```
GOOGLE_CLIENT_ID=<Google OAuth client ID>
GOOGLE_CLIENT_SECRET=<Google OAuth client secret>
```

## Roles y flujos

- **Cliente (anónimo)**: `/booking` → elige servicio → horario (auto-asigna profesional) → reserva
- **Cliente cancelación**: `/cancel` → ingresa teléfono → cancela/reprograma (máx 24h antes)
- **Profesional**: login Google → `/manage/calendar` + `/manage/availability`
- **Admin (Camila)**: login Google → `/admin/calendar` + `/admin/services` + `/admin/professionals`

## Integración Google Calendar

Cuando un turno se crea/cancela, se dispara la Edge Function `sync-calendar` que crea/elimina el evento en el Google Calendar personal de la profesional. El refresh token se guarda en la tabla `staff_tokens`. Requiere configurar:
1. Google Cloud Console: OAuth 2.0 client + Calendar API habilitada
2. Supabase Auth: proveedor Google con scopes `calendar` y `offline_access`
3. Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Estado actual

MVP funcional en producción. QA completado (2026-07-31). Todo deployado en Vercel + Supabase.

## QA — lo que funciona y lo que NO romper

### Flujos verificados ✅
- **Booking público** (3 pasos: Servicio → Horario → Confirmar): auto-asigna profesional disponible al seleccionar el slot. Si el slot se pisó en paralelo, muestra error específico "Ese horario ya fue tomado".
- **Cancel/reprogramar**: cliente ingresa teléfono → ve sus turnos futuros → puede cancelar (solo si es >24h antes).
- **Admin calendar**: filtro por profesional, navegación por día, modal "+ Nuevo turno" manual, badge "Realizado" en completados, botón Cancelar.
- **Servicios**: CRUD inline en `/admin/services`, edita nombre, descripción, duración y precio.
- **Equipo**: asignación de servicios por profesional, toggle activo/inactivo, campos WhatsApp e Instagram (Instagram solo para rol admin).
- **Horarios (availability)**: configuración de bloques por día de la semana, visible en `/manage/availability`.

### Reglas de comportamiento críticas (NO romper)
- El **paso de selección de profesional fue eliminado** del booking. El flujo es 3 pasos: Servicio → Horario → Confirmar. El profesional se auto-asigna al elegir un slot (`setProfessionalSilent`).
- El **botón "Realizado" fue eliminado** de las cards. Solo queda el badge "Realizado" (read-only) y el botón "Cancelar".
- El **botón Instagram en admin** está condicionado a que `professional.instagram_handle` no sea null. Camila debe configurarlo en la página Equipo. No es un bug — es configuración de datos.
- El **botón WhatsApp** usa el teléfono del CLIENTE (no de la profesional) para contactar desde el panel. Siempre debe estar presente en turnos activos.
- **No deben pisarse turnos**: hay un constraint en la DB (`no_overlapping_confirmed_appointments`) que impide dos turnos `confirmed` del mismo profesional en el mismo horario.
- El **`authStore` usa `initialized`** (one-way flag) para mostrar el FullPageSpinner. El spinner solo aparece en la carga inicial, no en refreshes de token posteriores.
- El **`setProfessionalSilent`** en bookingStore existe porque `setProfessional` hace cascade-reset de fecha y slot. Nunca reemplazar el primero por el segundo en el flujo de auto-assign.

### Constraint de DB aplicado
```sql
CREATE EXTENSION IF NOT EXISTS btree_gist;
ALTER TABLE appointments ADD CONSTRAINT no_overlapping_confirmed_appointments
EXCLUDE USING gist (
  professional_id WITH =,
  tstzrange(starts_at, ends_at, '[)') WITH &&
) WHERE (status = 'confirmed');
```
El insert fallará con code `23P01` si hay overlap. Los forms muestran mensaje específico.

## Decisiones tomadas

- **Sin Next.js**: no hay SSR/SEO crítico, Supabase cubre el backend
- **Mobile-first**: bottom nav para staff, wizard de 1 paso/pantalla para booking
- **Sin pago online**: el pago es siempre en persona
- **Sin notificaciones automáticas**: Google Calendar lo cubre para staff al configurar el OAuth; para clientes, botones manuales WhatsApp
- **Sin selección de profesional en booking**: se eliminó para simplificar el flujo; el sistema auto-asigna al primer profesional libre para ese slot

## Archivos clave

- `src/App.tsx` — router con guards de auth
- `src/hooks/useAuth.ts` — auth, Google OAuth, captura de refresh token
- `src/hooks/useAppointments.ts` — query de turnos y disponibilidad
- `src/lib/utils.ts` — generación de slots, helpers de fecha
- `src/store/bookingStore.ts` — estado del flujo de reserva
- `supabase/migrations/20260729000001_initial_schema.sql` — schema completo con RLS
- `supabase/functions/sync-calendar/index.ts` — Edge Function para Google Calendar

## Próximos pasos

1. Ajustar branding (logo + colores reales de Camila)
2. Camila configura su Instagram handle en Equipo → así aparece el botón Instagram en admin
3. Camila corrige el precio de "limpieza facial" (actualmente "20000", debería ser "$ 20.000")
4. Verificar Google Calendar integration (sync-calendar Edge Function) con tokens reales
