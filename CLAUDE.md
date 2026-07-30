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

- **Cliente (anónimo)**: `/booking` → elige servicio → profesional → horario → reserva
- **Cliente cancelación**: `/cancel` → ingresa teléfono → cancela/reprograma (máx 24h antes)
- **Profesional**: login Google → `/manage/calendar` + `/manage/availability`
- **Admin (Camila)**: login Google → `/admin/calendar` + `/admin/services` + `/admin/professionals`

## Integración Google Calendar

Cuando un turno se crea/cancela, se dispara la Edge Function `sync-calendar` que crea/elimina el evento en el Google Calendar personal de la profesional. El refresh token se guarda en la tabla `staff_tokens`. Requiere configurar:
1. Google Cloud Console: OAuth 2.0 client + Calendar API habilitada
2. Supabase Auth: proveedor Google con scopes `calendar` y `offline_access`
3. Edge Function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

## Estado actual

MVP en desarrollo. Schema aplicado. Frontend scaffoldeado. Falta:
- [ ] Aplicar migración SQL en Supabase
- [ ] Configurar Google OAuth en Supabase Dashboard
- [ ] Crear `.env` local con las keys reales
- [ ] Configurar y deployar Edge Function `sync-calendar`
- [ ] Conectar Supabase Webhooks para disparar sync-calendar
- [ ] Subir logo y ajustar paleta de colores de Camila
- [ ] Crear repo GitHub y conectar Vercel

## Decisiones tomadas

- **Sin Next.js**: no hay SSR/SEO crítico, Supabase cubre el backend
- **Mobile-first**: bottom nav para staff, wizard de 1 paso/pantalla para booking
- **Sin pago online**: el pago es siempre en persona
- **Sin notificaciones automáticas push**: Google Calendar lo cubre para staff; para el cliente, botones manuales WhatsApp/Instagram

## Archivos clave

- `src/App.tsx` — router con guards de auth
- `src/hooks/useAuth.ts` — auth, Google OAuth, captura de refresh token
- `src/hooks/useAppointments.ts` — query de turnos y disponibilidad
- `src/lib/utils.ts` — generación de slots, helpers de fecha
- `src/store/bookingStore.ts` — estado del flujo de reserva
- `supabase/migrations/20260729000001_initial_schema.sql` — schema completo con RLS
- `supabase/functions/sync-calendar/index.ts` — Edge Function para Google Calendar

## Próximos pasos

1. Aplicar migración SQL
2. Configurar Google OAuth en Supabase
3. Ajustar branding (logo + colores reales de Camila)
4. Modal "Nuevo turno" manual en panel de profesionales/admin
5. Configurar Webhooks de Supabase para `sync-calendar`
6. Deploy en Vercel
