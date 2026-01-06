-- =====================================================
-- Technical Specification & Compliance Migration
-- Adds technical specification and certification fields to products table
-- =====================================================

-- Add Technical Specification fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_type VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS material_grade VARCHAR(200);
ALTER TABLE products ADD COLUMN IF NOT EXISTS diameter_range VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS wall_thickness_range VARCHAR(100);
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_min VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS length_unit VARCHAR(20) DEFAULT 'meters';
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_per_unit VARCHAR(50);
ALTER TABLE products ADD COLUMN IF NOT EXISTS weight_unit VARCHAR(20) DEFAULT 'Kg';
ALTER TABLE products ADD COLUMN IF NOT EXISTS manufacturing_process VARCHAR(100);

-- Add Compliance & Certification fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS certifications JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS other_certification VARCHAR(255);

-- Add check constraints for units
ALTER TABLE products ADD CONSTRAINT chk_length_unit 
    CHECK (length_unit IN ('meters', 'mm', 'cm', 'inches', 'feet')) NOT VALID;

ALTER TABLE products ADD CONSTRAINT chk_weight_unit 
    CHECK (weight_unit IN ('Kg', 'g', 'ton', 'lbs')) NOT VALID;

-- Add indexes for technical specification fields for better search performance
CREATE INDEX IF NOT EXISTS idx_products_material_type ON products(material_type) WHERE material_type IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_manufacturing_process ON products(manufacturing_process) WHERE manufacturing_process IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_products_certifications ON products USING gin(certifications) WHERE certifications IS NOT NULL;

-- Add comments for documentation
COMMENT ON COLUMN products.material_type IS 'Type of material (Steel, Aluminum, Copper, Brass, etc.)';
COMMENT ON COLUMN products.material_grade IS 'Material grade or standard specification (e.g., SS304 A36, ASTM A06)';
COMMENT ON COLUMN products.diameter_range IS 'Diameter range in format "200mm-400mm"';
COMMENT ON COLUMN products.wall_thickness_range IS 'Wall thickness range in format "500mm-600mm"';
COMMENT ON COLUMN products.length_min IS 'Length/size range value';
COMMENT ON COLUMN products.length_unit IS 'Unit for length measurement';
COMMENT ON COLUMN products.weight_per_unit IS 'Weight per unit value';
COMMENT ON COLUMN products.weight_unit IS 'Unit for weight measurement';
COMMENT ON COLUMN products.manufacturing_process IS 'Manufacturing process (Casting, Forging, Machining, etc.)';
COMMENT ON COLUMN products.certifications IS 'Array of certifications (ISO 9001, ISO 140001, BIS, RoHs, CE Marking, ASTM)';
COMMENT ON COLUMN products.other_certification IS 'Other certification not in the standard list';
