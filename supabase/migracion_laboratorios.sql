-- Agregar campos de laboratorio y fecha de vencimiento a la tabla de productos
ALTER TABLE productos ADD COLUMN IF NOT EXISTS laboratorio TEXT;
ALTER TABLE productos ADD COLUMN IF NOT EXISTS fecha_vencimiento DATE;

-- Índice para búsqueda por laboratorio
CREATE INDEX IF NOT EXISTS idx_productos_laboratorio ON productos USING gin (laboratorio gin_trgm_ops);
