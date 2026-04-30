-- ============================================================
-- FIX COMPLETO — FarmaSystem Pro
-- Ejecuta TODO este bloque en el SQL Editor de Supabase
-- ============================================================

-- PASO 1: Agregar columnas faltantes y ajustar restricciones
ALTER TABLE factura_items ADD COLUMN IF NOT EXISTS costo_unitario DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE facturas      ADD COLUMN IF NOT EXISTS costo_total    DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE facturas      ADD COLUMN IF NOT EXISTS ganancia       DECIMAL(10, 2) DEFAULT 0;

-- Permitir producto_id NULL en factura_items (para artículos manuales/libres)
ALTER TABLE factura_items ALTER COLUMN producto_id DROP NOT NULL;

-- PASO 2: Eliminar TODAS las versiones viejas de la función
--         (PostgreSQL distingue por firma, hay que eliminar ambas)
DROP FUNCTION IF EXISTS create_invoice_process(TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS create_invoice_process(TEXT, UUID, UUID, DECIMAL, DECIMAL, DECIMAL, DECIMAL, TEXT, TEXT, TEXT, DECIMAL, DECIMAL, JSONB);

-- PASO 3: Crear la función CORRECTA con todos los parámetros
CREATE OR REPLACE FUNCTION create_invoice_process(
  p_ncf_tipo    TEXT,
  p_cliente_id  UUID,
  p_usuario_id  UUID,
  p_subtotal    DECIMAL,
  p_itbis_total DECIMAL,
  p_descuento   DECIMAL,
  p_total       DECIMAL,
  p_metodo_pago TEXT,
  p_estado      TEXT,
  p_notas       TEXT,
  p_costo_total DECIMAL,
  p_ganancia    DECIMAL,
  p_items       JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ncf        TEXT;
  v_ncf_seq    RECORD;
  v_factura_id UUID;
  v_item       JSONB;
  v_producto   RECORD;
  v_resultado  JSONB;
BEGIN
  -- 1. Obtener y bloquear la secuencia NCF (transaccional)
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

  -- Formatear el NCF (ej: B0200000001)
  v_ncf := v_ncf_seq.prefix || LPAD(v_ncf_seq.secuencia_actual::TEXT, 8, '0');

  -- Avanzar la secuencia
  UPDATE ncf_secuencias
  SET secuencia_actual = secuencia_actual + 1
  WHERE id = v_ncf_seq.id;

  -- 2. Crear la factura con costo y ganancia
  INSERT INTO facturas (
    ncf, ncf_tipo, cliente_id, usuario_id,
    subtotal, itbis_total, descuento, total,
    metodo_pago, estado, notas,
    costo_total, ganancia
  )
  VALUES (
    v_ncf, p_ncf_tipo, p_cliente_id, p_usuario_id,
    p_subtotal, p_itbis_total, p_descuento, p_total,
    p_metodo_pago, p_estado, p_notas,
    p_costo_total, p_ganancia
  )
  RETURNING id INTO v_factura_id;

  -- 3. Registrar items, descontar stock y crear movimientos de auditoría
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Omitir items manuales (producto_id = 'manual-...' no es UUID válido)
    BEGIN
      -- Insertar item de factura
      INSERT INTO factura_items (
        factura_id, producto_id, cantidad,
        precio_unitario, itbis_unitario, subtotal, costo_unitario
      )
      VALUES (
        v_factura_id,
        (v_item->>'producto_id')::UUID,
        (v_item->>'cantidad')::INTEGER,
        (v_item->>'precio_unitario')::DECIMAL,
        COALESCE((v_item->>'itbis_unitario')::DECIMAL, 0),
        (v_item->>'subtotal')::DECIMAL,
        COALESCE((v_item->>'costo_unitario')::DECIMAL, 0)
      );

      -- Obtener stock actual con bloqueo
      SELECT stock_actual INTO v_producto
      FROM productos
      WHERE id = (v_item->>'producto_id')::UUID
      FOR UPDATE;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Producto no encontrado: %', (v_item->>'producto_id');
      END IF;

      IF v_producto.stock_actual < (v_item->>'cantidad')::INTEGER THEN
        RAISE EXCEPTION 'Stock insuficiente para producto %', (v_item->>'producto_id');
      END IF;

      -- Descontar stock
      UPDATE productos
      SET stock_actual = stock_actual - (v_item->>'cantidad')::INTEGER,
          updated_at   = NOW()
      WHERE id = (v_item->>'producto_id')::UUID;

      -- Registrar movimiento de auditoría
      INSERT INTO movimientos_stock (
        producto_id, tipo, cantidad,
        stock_anterior, stock_nuevo,
        referencia, factura_id, usuario_id
      )
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

    EXCEPTION WHEN invalid_text_representation THEN
      -- Item manual (UUID inválido) — solo registrar en factura_items sin descontar stock
      INSERT INTO factura_items (
        factura_id, producto_id, cantidad,
        precio_unitario, itbis_unitario, subtotal, costo_unitario
      )
      VALUES (
        v_factura_id,
        NULL,
        (v_item->>'cantidad')::INTEGER,
        (v_item->>'precio_unitario')::DECIMAL,
        COALESCE((v_item->>'itbis_unitario')::DECIMAL, 0),
        (v_item->>'subtotal')::DECIMAL,
        0
      );
    END;
  END LOOP;

  v_resultado := jsonb_build_object(
    'factura_id', v_factura_id,
    'ncf',        v_ncf,
    'success',    true
  );
  RETURN v_resultado;

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

-- ============================================================
-- Verificar que la función quedó correcta
-- ============================================================
SELECT proname, pronargs
FROM pg_proc
WHERE proname = 'create_invoice_process';
-- Debe mostrar pronargs = 13
