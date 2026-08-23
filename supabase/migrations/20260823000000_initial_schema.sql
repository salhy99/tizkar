-- Create custom types
CREATE TYPE plan_status AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');
CREATE TYPE template_status AS ENUM ('ACTIVE', 'INACTIVE', 'DRAFT', 'ARCHIVED');
CREATE TYPE invitation_status AS ENUM ('DRAFT', 'PENDING_PAYMENT', 'PENDING_APPROVAL', 'PUBLISHED', 'REJECTED', 'SUSPENDED', 'EXPIRED');
CREATE TYPE user_role AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN', 'DESIGNER', 'SUPPORT');

-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  phone TEXT UNIQUE,
  display_name TEXT,
  role user_role DEFAULT 'USER',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create event_types table
CREATE TABLE event_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar TEXT NOT NULL,
  name_en TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plans table
CREATE TABLE plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IQD',
  duration_days INTEGER NOT NULL,
  status plan_status DEFAULT 'ACTIVE',
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plan_features table
CREATE TABLE plan_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID REFERENCES plans ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  feature_value JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, feature_key)
);

-- Create templates table
CREATE TABLE templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type_id UUID REFERENCES event_types ON DELETE RESTRICT,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  base_price NUMERIC,
  status template_status DEFAULT 'DRAFT',
  is_featured BOOLEAN DEFAULT false,
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create template_versions table
CREATE TABLE template_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES templates ON DELETE CASCADE,
  version_number TEXT NOT NULL,
  configuration JSONB DEFAULT '{}',
  theme JSONB DEFAULT '{}',
  sections JSONB DEFAULT '[]',
  status template_status DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(template_id, version_number)
);

-- Create invitations table
CREATE TABLE invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE CASCADE,
  template_id UUID REFERENCES templates ON DELETE RESTRICT,
  event_type_id UUID REFERENCES event_types ON DELETE RESTRICT,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  status invitation_status DEFAULT 'DRAFT',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create invitation_versions table
CREATE TABLE invitation_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invitation_id UUID REFERENCES invitations ON DELETE CASCADE,
  template_version_id UUID REFERENCES template_versions ON DELETE RESTRICT,
  is_published BOOLEAN DEFAULT false,
  invitation_data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create orders table
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles ON DELETE RESTRICT,
  invitation_id UUID REFERENCES invitations ON DELETE RESTRICT,
  plan_id UUID REFERENCES plans ON DELETE RESTRICT,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'IQD',
  status TEXT DEFAULT 'PENDING',
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES profiles(id),
  rejected_at TIMESTAMPTZ,
  admin_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders ON DELETE CASCADE,
  payment_method TEXT NOT NULL,
  transaction_reference TEXT UNIQUE,
  status TEXT DEFAULT 'PENDING',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_logs table
CREATE TABLE admin_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Setup
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

-- Security Definer function to get user role without infinite recursion
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Profiles: Users can read and update their own profile. Admins can read all.
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins can read all profiles" ON profiles FOR SELECT USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Trigger to prevent role escalation by users
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role != OLD.role THEN
    IF public.get_user_role() NOT IN ('ADMIN', 'SUPER_ADMIN') THEN
      RAISE EXCEPTION 'Unauthorized to change role';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_profile_role
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_role_escalation();

-- Event Types: Anyone can read active. Admins can manage.
CREATE POLICY "Anyone can read active event types" ON event_types FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage event types" ON event_types USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Plans & Features: Anyone can read active. Admins can manage.
CREATE POLICY "Anyone can read active plans" ON plans FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Admins can manage plans" ON plans USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "Anyone can read plan features" ON plan_features FOR SELECT USING (EXISTS (SELECT 1 FROM plans WHERE id = plan_features.plan_id AND status = 'ACTIVE'));
CREATE POLICY "Admins can manage plan features" ON plan_features USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Templates & Versions: Anyone can read active. Admins can manage.
CREATE POLICY "Anyone can read active templates" ON templates FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Admins can manage templates" ON templates USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "Anyone can read active template versions" ON template_versions FOR SELECT USING (status = 'ACTIVE');
CREATE POLICY "Admins can manage template versions" ON template_versions USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Invitations: Users can manage own. Public can read published. Admins can read all.
CREATE POLICY "Users can read own invitations" ON invitations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own invitations" ON invitations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own invitations" ON invitations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Public can read published invitations" ON invitations FOR SELECT USING (status = 'PUBLISHED');
CREATE POLICY "Admins can read all invitations" ON invitations FOR SELECT USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Trigger to prevent client from publishing directly
CREATE OR REPLACE FUNCTION public.prevent_publish_status_change()
RETURNS TRIGGER AS $$
BEGIN
  -- If updated by authenticated client, block moving to PUBLISHED.
  -- Service Role (backend) has auth.uid() as NULL, so it will bypass this.
  IF auth.uid() IS NOT NULL THEN
    IF NEW.status = 'PUBLISHED' AND OLD.status != 'PUBLISHED' THEN
      RAISE EXCEPTION 'Cannot set status to PUBLISHED directly from client';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER protect_publish_status
BEFORE UPDATE ON invitations
FOR EACH ROW EXECUTE FUNCTION prevent_publish_status_change();

-- Invitation Versions
CREATE POLICY "Users can read own invitation versions" ON invitation_versions FOR SELECT USING (EXISTS (SELECT 1 FROM invitations WHERE id = invitation_versions.invitation_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own invitation versions" ON invitation_versions FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM invitations WHERE id = invitation_versions.invitation_id AND user_id = auth.uid()));
CREATE POLICY "Users can update own invitation versions" ON invitation_versions FOR UPDATE USING (EXISTS (SELECT 1 FROM invitations WHERE id = invitation_versions.invitation_id AND user_id = auth.uid()));
CREATE POLICY "Public can read published invitation versions" ON invitation_versions FOR SELECT USING (is_published = true AND EXISTS (SELECT 1 FROM invitations WHERE id = invitation_versions.invitation_id AND status = 'PUBLISHED'));

-- Orders & Payments: Users can manage own. Admins can read all.
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins can read all orders" ON orders FOR SELECT USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

CREATE POLICY "Users can read own payments" ON payments FOR SELECT USING (EXISTS (SELECT 1 FROM orders WHERE id = payments.order_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own payments" ON payments FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM orders WHERE id = payments.order_id AND user_id = auth.uid()));
CREATE POLICY "Admins can read all payments" ON payments FOR SELECT USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

-- Admin Logs
CREATE POLICY "Admins can manage admin_logs" ON admin_logs USING (public.get_user_role() IN ('ADMIN', 'SUPER_ADMIN'));

