-- 1. Create site_materials table
CREATE TABLE IF NOT EXISTS public.site_materials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    material_id TEXT NOT NULL, -- Item Code (e.g., CIVIL-001)
    name TEXT NOT NULL,
    category TEXT,
    unit TEXT,
    quantity DECIMAL(12,2) DEFAULT 0, -- Opening Balance
    alert_quantity DECIMAL(12,2) DEFAULT 10, -- Min Stock Alert
    description TEXT,
    hsn_code TEXT,
    site_id UUID REFERENCES public.sites(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create material_movements table
CREATE TABLE IF NOT EXISTS public.material_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT CHECK (type IN ('inward', 'outward')),
    material_id UUID REFERENCES public.site_materials(id) ON DELETE CASCADE,
    quantity DECIMAL(12,2) NOT NULL,
    source_type TEXT, 
    source_name TEXT, 
    rate DECIMAL(12,2) DEFAULT 0,
    condition TEXT, 
    site_name TEXT, 
    approved BOOLEAN DEFAULT TRUE,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE public.site_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_movements ENABLE ROW LEVEL SECURITY;

-- 4. Open Policies for authenticated users
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'site_materials' AND policyname = 'Enable all for authenticated users') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.site_materials FOR ALL USING (auth.role() = 'authenticated');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'material_movements' AND policyname = 'Enable all for authenticated users') THEN
        CREATE POLICY "Enable all for authenticated users" ON public.material_movements FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- 5. Trigger for updated_at
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_site_materials_updated_at') THEN
        CREATE TRIGGER update_site_materials_updated_at BEFORE UPDATE ON public.site_materials
          FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;
