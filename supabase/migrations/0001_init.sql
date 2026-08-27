-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  full_name text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'technician')),
  phone text,
  created_at timestamptz DEFAULT now()
);

-- Create equipments table
CREATE TABLE IF NOT EXISTS equipments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  brand text NOT NULL,
  model text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  location text NOT NULL,
  status text NOT NULL CHECK (status IN ('operational', 'in_maintenance', 'out_of_service')) DEFAULT 'operational',
  last_maintenance_date date,
  created_by uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create work_orders table
CREATE TABLE IF NOT EXISTS work_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_id uuid NOT NULL REFERENCES equipments(id) ON DELETE RESTRICT,
  ot_number text NOT NULL,
  intervention_date date NOT NULL,
  client_name text NOT NULL,
  client_address text,
  client_phone text,
  problem_description text,
  service_type text NOT NULL CHECK (service_type IN ('preventive', 'install_uninstall', 'corrective', 'training', 'followup')),
  actions_checklist jsonb DEFAULT '[]'::jsonb,
  technician_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  client_conformity_name text,
  client_conformity_rut text,
  client_signature_path text,
  client_received_ok boolean,
  attachment_path text,
  created_at timestamptz DEFAULT now()
);

-- Create work_order_parts table
CREATE TABLE IF NOT EXISTS work_order_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id uuid NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  code text,
  description text NOT NULL,
  quantity numeric NOT NULL,
  observations text
);

-- Create public equipment view (for unauthenticated access)
CREATE OR REPLACE VIEW public_equipment_view AS
SELECT
  id,
  type,
  brand,
  model,
  serial_number,
  location,
  status,
  last_maintenance_date
FROM equipments;

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_order_parts ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can create profiles" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can read all equipment" ON equipments;
DROP POLICY IF EXISTS "Admins can insert equipment" ON equipments;
DROP POLICY IF EXISTS "Admins can update equipment" ON equipments;
DROP POLICY IF EXISTS "Admins can delete equipment" ON equipments;
DROP POLICY IF EXISTS "Authenticated users can read work orders" ON work_orders;
DROP POLICY IF EXISTS "Authenticated users can insert work orders" ON work_orders;
DROP POLICY IF EXISTS "Admins can update work orders" ON work_orders;
DROP POLICY IF EXISTS "Admins can delete work orders" ON work_orders;
DROP POLICY IF EXISTS "Authenticated users can read work order parts" ON work_order_parts;
DROP POLICY IF EXISTS "Authenticated users can insert work order parts" ON work_order_parts;
DROP POLICY IF EXISTS "Admins can delete work order parts" ON work_order_parts;

-- RLS Policies: profiles
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON profiles FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can create profiles"
  ON profiles FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies: equipments
CREATE POLICY "Authenticated users can read all equipment"
  ON equipments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can insert equipment"
  ON equipments FOR INSERT
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can update equipment"
  ON equipments FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete equipment"
  ON equipments FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies: work_orders
CREATE POLICY "Authenticated users can read work orders"
  ON work_orders FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert work orders"
  ON work_orders FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can update work orders"
  ON work_orders FOR UPDATE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

CREATE POLICY "Admins can delete work orders"
  ON work_orders FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- RLS Policies: work_order_parts
CREATE POLICY "Authenticated users can read work order parts"
  ON work_order_parts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert work order parts"
  ON work_order_parts FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Admins can delete work order parts"
  ON work_order_parts FOR DELETE
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- Create storage buckets (note: this requires bucket API, not pure SQL)
-- You'll need to create these via Supabase dashboard or use the Supabase CLI:
-- supabase storage create-bucket signatures --private
-- supabase storage create-bucket attachments --private

-- Storage policies (these are set in the Supabase dashboard or CLI)
-- Authenticated users can upload to their own paths:
-- PUT /signatures/* FOR INSERT WITH CHECK (auth.role() = 'authenticated')
-- PUT /attachments/* FOR INSERT WITH CHECK (auth.role() = 'authenticated')
-- GET /signatures/* FOR SELECT WITH CHECK (auth.role() = 'authenticated')
-- GET /attachments/* FOR SELECT WITH CHECK (auth.role() = 'authenticated')
