-- =============================================================
-- Esquema inicial: Camila Carro Estética
-- =============================================================

-- Perfiles del staff (extiende auth.users de Supabase)
CREATE TABLE IF NOT EXISTS staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'professional')),
  whatsapp_number TEXT,
  instagram_handle TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Servicios
CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
  display_price TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Relación N:N profesional <-> servicio
CREATE TABLE IF NOT EXISTS professional_services (
  professional_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  PRIMARY KEY (professional_id, service_id)
);

-- Disponibilidad semanal recurrente
CREATE TABLE IF NOT EXISTS availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  CHECK (start_time < end_time)
);

-- Días bloqueados (vacaciones, libres)
CREATE TABLE IF NOT EXISTS blocked_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES staff_profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  reason TEXT
);

-- Tokens de Google OAuth para Calendar API
CREATE TABLE IF NOT EXISTS staff_tokens (
  professional_id UUID PRIMARY KEY REFERENCES staff_profiles(id) ON DELETE CASCADE,
  google_refresh_token TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Turnos
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES staff_profiles(id),
  service_id UUID NOT NULL REFERENCES services(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'rescheduled')),
  created_via TEXT NOT NULL DEFAULT 'web' CHECK (created_via IN ('web', 'manual')),
  cancel_token UUID NOT NULL DEFAULT gen_random_uuid(),
  google_event_id TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (starts_at < ends_at)
);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_appointments_professional_starts ON appointments(professional_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_appointments_client_phone ON appointments(client_phone);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);
CREATE INDEX IF NOT EXISTS idx_availability_professional ON availability(professional_id);
CREATE INDEX IF NOT EXISTS idx_blocked_dates_professional ON blocked_dates(professional_id, date);

-- =============================================================
-- Row Level Security
-- =============================================================

ALTER TABLE staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE professional_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Helper: verifica si el usuario autenticado es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = auth.uid() AND role = 'admin' AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: verifica si es staff activo (cualquier rol)
CREATE OR REPLACE FUNCTION is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM staff_profiles
    WHERE id = auth.uid() AND is_active = true
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---- staff_profiles ----
CREATE POLICY "Público puede ver perfiles activos"
  ON staff_profiles FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin puede hacer todo"
  ON staff_profiles FOR ALL
  USING (is_admin());

CREATE POLICY "Staff puede ver su propio perfil"
  ON staff_profiles FOR SELECT
  USING (id = auth.uid());

-- ---- services ----
CREATE POLICY "Público puede ver servicios activos"
  ON services FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin puede hacer todo en servicios"
  ON services FOR ALL
  USING (is_admin());

-- ---- professional_services ----
CREATE POLICY "Público puede ver asignaciones"
  ON professional_services FOR SELECT
  USING (true);

CREATE POLICY "Admin puede gestionar asignaciones"
  ON professional_services FOR ALL
  USING (is_admin());

-- ---- availability ----
CREATE POLICY "Público puede ver disponibilidad"
  ON availability FOR SELECT
  USING (true);

CREATE POLICY "Profesional gestiona su propia disponibilidad"
  ON availability FOR ALL
  USING (professional_id = auth.uid() OR is_admin());

-- ---- blocked_dates ----
CREATE POLICY "Staff ve días bloqueados propios"
  ON blocked_dates FOR SELECT
  USING (professional_id = auth.uid() OR is_admin());

CREATE POLICY "Profesional gestiona sus propios bloqueos"
  ON blocked_dates FOR ALL
  USING (professional_id = auth.uid() OR is_admin());

-- ---- staff_tokens ----
CREATE POLICY "Solo el propio staff puede ver su token"
  ON staff_tokens FOR SELECT
  USING (professional_id = auth.uid());

CREATE POLICY "Solo el propio staff puede gestionar su token"
  ON staff_tokens FOR ALL
  USING (professional_id = auth.uid());

CREATE POLICY "Service role puede leer todos los tokens"
  ON staff_tokens FOR SELECT
  USING (auth.role() = 'service_role');

-- ---- appointments ----
CREATE POLICY "Público puede insertar turnos web"
  ON appointments FOR INSERT
  WITH CHECK (created_via = 'web');

CREATE POLICY "Profesional ve y actualiza sus propios turnos"
  ON appointments FOR SELECT
  USING (professional_id = auth.uid() OR is_admin());

CREATE POLICY "Profesional puede actualizar sus turnos"
  ON appointments FOR UPDATE
  USING (professional_id = auth.uid() OR is_admin());

CREATE POLICY "Admin hace todo en turnos"
  ON appointments FOR ALL
  USING (is_admin());

CREATE POLICY "Staff puede crear turnos manuales"
  ON appointments FOR INSERT
  WITH CHECK (is_staff());

CREATE POLICY "Público puede cancelar por phone + cancel_token"
  ON appointments FOR UPDATE
  USING (
    status IN ('confirmed') AND
    starts_at > NOW() + INTERVAL '24 hours'
  );
