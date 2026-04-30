-- ============================================================
-- FARMASYSTEM PRO — Schema Completo para Supabase/PostgreSQL
-- ============================================================

-- Habilitar extensión pg_trgm para búsqueda fuzzy ultrarrápida
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: usuarios
-- ============================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('admin', 'vendedor')),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABLA: categorias
-- ============================================================
CREATE TABLE IF NOT EXISTS categorias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT UNIQUE NOT NULL,
  descripcion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Categoría por defecto
INSERT INTO categorias (nombre) VALUES ('General') ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLA: productos
-- ============================================================
CREATE TABLE IF NOT EXISTS productos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio DECIMAL(10, 2) NOT NULL DEFAULT 0,
  costo DECIMAL(10, 2) DEFAULT 0,
  itbis DECIMAL(5, 2) NOT NULL DEFAULT 0.18,
  aplica_itbis BOOLEAN DEFAULT TRUE,
  stock_actual INTEGER NOT NULL DEFAULT 0,
  stock_minimo INTEGER NOT NULL DEFAULT 5,
  categoria_id UUID REFERENCES categorias(id),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda ultrarrápida con pg_trgm
CREATE INDEX IF NOT EXISTS idx_productos_nombre_trgm ON productos USING gin (nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_productos_codigo ON productos (codigo);

-- ============================================================
-- TABLA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL,
  cedula_rnc TEXT UNIQUE,
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Cliente por defecto (consumidor final)
INSERT INTO clientes (nombre, cedula_rnc) VALUES ('Consumidor Final', '000-0000000-0') ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLA: ncf_secuencias
-- ============================================================
CREATE TABLE IF NOT EXISTS ncf_secuencias (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tipo TEXT NOT NULL CHECK (tipo IN ('B01', 'B02', 'B14')),
  prefix TEXT NOT NULL,
  secuencia_actual INTEGER NOT NULL DEFAULT 1,
  secuencia_inicio INTEGER NOT NULL DEFAULT 1,
  secuencia_fin INTEGER NOT NULL DEFAULT 999999,
  vencimiento DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '2 years'),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Secuencias por defecto
INSERT INTO ncf_secuencias (tipo, prefix, secuencia_actual, secuencia_fin) VALUES
  ('B01', 'B01', 1, 999999),
  ('B02', 'B02', 1, 999999),
  ('B14', 'B14', 1, 999999)
ON CONFLICT DO NOTHING;

-- ============================================================
-- TABLA: facturas
-- ============================================================
CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ncf TEXT,
  ncf_tipo TEXT,
  cliente_id UUID REFERENCES clientes(id),
  usuario_id UUID REFERENCES usuarios(id),
  subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
  itbis_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) NOT NULL DEFAULT 0,
  metodo_pago TEXT DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'credito')),
  estado TEXT DEFAULT 'pagada' CHECK (estado IN ('pagada', 'pendiente', 'anulada')),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  anulada_at TIMESTAMPTZ,
  anulada_por UUID REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_facturas_created ON facturas (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_facturas_ncf ON facturas (ncf);

-- ============================================================
-- TABLA: factura_items
-- ============================================================
CREATE TABLE IF NOT EXISTS factura_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  factura_id UUID NOT NULL REFERENCES facturas(id) ON DELETE CASCADE,
  producto_id UUID NOT NULL REFERENCES productos(id),
  cantidad INTEGER NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  itbis_unitario DECIMAL(10, 2) DEFAULT 0,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_factura_items_factura ON factura_items (factura_id);

-- ============================================================
-- TABLA: movimientos_stock
-- ============================================================
CREATE TABLE IF NOT EXISTS movimientos_stock (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  producto_id UUID NOT NULL REFERENCES productos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'salida', 'ajuste', 'devolucion')),
  cantidad INTEGER NOT NULL,
  stock_anterior INTEGER NOT NULL,
  stock_nuevo INTEGER NOT NULL,
  referencia TEXT,
  factura_id UUID REFERENCES facturas(id),
  usuario_id UUID REFERENCES usuarios(id),
  notas TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_movimientos_producto ON movimientos_stock (producto_id, created_at DESC);

-- ============================================================
-- FUNCIÓN RPC: create_invoice_process (TRANSACCIÓN ATÓMICA)
-- Ejecuta 4 operaciones en una sola llamada de DB:
-- 1. Obtiene y avanza el NCF
-- 2. Crea la factura
-- 3. Registra los items y descuenta stock
-- 4. Registra movimientos de auditoría
-- ============================================================
CREATE OR REPLACE FUNCTION create_invoice_process(
  p_ncf_tipo TEXT,
  p_cliente_id UUID,
  p_usuario_id UUID,
  p_subtotal DECIMAL,
  p_itbis_total DECIMAL,
  p_descuento DECIMAL,
  p_total DECIMAL,
  p_metodo_pago TEXT,
  p_estado TEXT,
  p_notas TEXT,
  p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ncf TEXT;
  v_ncf_seq RECORD;
  v_factura_id UUID;
  v_item JSONB;
  v_producto RECORD;
  v_resultado JSONB;
BEGIN
  -- 1. Obtener y bloquear la secuencia NCF
  SELECT * INTO v_ncf_seq
  FROM ncf_secuencias
  WHERE tipo = p_ncf_tipo AND activo = TRUE
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No hay secuencia NCF activa para tipo %', p_ncf_tipo;
  END IF;

  IF v_ncf_seq.secuencia_actual > v_ncf_seq.secuencia_fin THEN
    RAISE EXCEPTION 'Secuencia NCF % agotada', p_ncf_tipo;
  END IF;

  -- Formatear el NCF
  v_ncf := v_ncf_seq.prefix || LPAD(v_ncf_seq.secuencia_actual::TEXT, 8, '0');

  -- Avanzar la secuencia
  UPDATE ncf_secuencias
  SET secuencia_actual = secuencia_actual + 1
  WHERE id = v_ncf_seq.id;

  -- 2. Crear la factura
  INSERT INTO facturas (ncf, ncf_tipo, cliente_id, usuario_id, subtotal, itbis_total, descuento, total, metodo_pago, estado, notas)
  VALUES (v_ncf, p_ncf_tipo, p_cliente_id, p_usuario_id, p_subtotal, p_itbis_total, p_descuento, p_total, p_metodo_pago, p_estado, p_notas)
  RETURNING id INTO v_factura_id;

  -- 3. Registrar items y 4. Descontar stock + Movimientos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insertar item de factura
    INSERT INTO factura_items (factura_id, producto_id, cantidad, precio_unitario, itbis_unitario, subtotal)
    VALUES (
      v_factura_id,
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INTEGER,
      (v_item->>'precio_unitario')::DECIMAL,
      (v_item->>'itbis_unitario')::DECIMAL,
      (v_item->>'subtotal')::DECIMAL
    );

    -- Obtener stock actual
    SELECT stock_actual INTO v_producto FROM productos WHERE id = (v_item->>'producto_id')::UUID FOR UPDATE;

    IF v_producto.stock_actual < (v_item->>'cantidad')::INTEGER THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %', (v_item->>'producto_id');
    END IF;

    -- Descontar stock
    UPDATE productos
    SET stock_actual = stock_actual - (v_item->>'cantidad')::INTEGER,
        updated_at = NOW()
    WHERE id = (v_item->>'producto_id')::UUID;

    -- Registrar movimiento de auditoría
    INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, factura_id, usuario_id)
    VALUES (
      (v_item->>'producto_id')::UUID,
      'salida',
      (v_item->>'cantidad')::INTEGER,
      v_producto.stock_actual,
      v_producto.stock_actual - (v_item->>'cantidad')::INTEGER,
      v_ncf,
      v_factura_id,
      p_usuario_id
    );
  END LOOP;

  v_resultado := jsonb_build_object('factura_id', v_factura_id, 'ncf', v_ncf, 'success', true);
  RETURN v_resultado;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================
-- FUNCIÓN: anular_factura
-- Revierte el stock automáticamente
-- ============================================================
CREATE OR REPLACE FUNCTION anular_factura(
  p_factura_id UUID,
  p_usuario_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_item RECORD;
  v_producto RECORD;
BEGIN
  -- Verificar que la factura existe y no está ya anulada
  IF NOT EXISTS (SELECT 1 FROM facturas WHERE id = p_factura_id AND estado != 'anulada') THEN
    RAISE EXCEPTION 'Factura no encontrada o ya anulada';
  END IF;

  -- Restaurar stock de cada item
  FOR v_item IN
    SELECT fi.producto_id, fi.cantidad, fi.factura_id
    FROM factura_items fi
    WHERE fi.factura_id = p_factura_id
  LOOP
    SELECT stock_actual INTO v_producto FROM productos WHERE id = v_item.producto_id FOR UPDATE;

    UPDATE productos
    SET stock_actual = stock_actual + v_item.cantidad,
        updated_at = NOW()
    WHERE id = v_item.producto_id;

    INSERT INTO movimientos_stock (producto_id, tipo, cantidad, stock_anterior, stock_nuevo, referencia, factura_id, usuario_id, notas)
    VALUES (
      v_item.producto_id, 'devolucion', v_item.cantidad,
      v_producto.stock_actual, v_producto.stock_actual + v_item.cantidad,
      'ANULACION', p_factura_id, p_usuario_id, 'Anulación de factura'
    );
  END LOOP;

  -- Marcar factura como anulada
  UPDATE facturas
  SET estado = 'anulada', anulada_at = NOW(), anulada_por = p_usuario_id
  WHERE id = p_factura_id;

  RETURN jsonb_build_object('success', true, 'factura_id', p_factura_id);
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ncf_secuencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE factura_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_stock ENABLE ROW LEVEL SECURITY;

-- Políticas: Solo service_role tiene acceso total (usado desde el backend)
-- El cliente anon no tiene acceso a nada sensible
CREATE POLICY "service_role_all_usuarios" ON usuarios FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_productos" ON productos FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_categorias" ON categorias FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_clientes" ON clientes FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_ncf" ON ncf_secuencias FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_facturas" ON facturas FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_factura_items" ON factura_items FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_movimientos" ON movimientos_stock FOR ALL TO service_role USING (true) WITH CHECK (true);
