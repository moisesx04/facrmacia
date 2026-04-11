-- MIGRACIÓN: Seguimiento de Costo y Ganancias
-- Ejecuta este código en el SQL Editor de Supabase

-- 1. Agregamos las columnas faltantes (Si ya existen no pasa nada, garantizado por IF NOT EXISTS)
ALTER TABLE factura_items ADD COLUMN IF NOT EXISTS costo_unitario DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS costo_total DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE facturas ADD COLUMN IF NOT EXISTS ganancia DECIMAL(10, 2) DEFAULT 0;

-- 2. Eliminamos la función vieja para poder cambiar los parámetros de entrada sin error
DROP FUNCTION IF EXISTS create_invoice_process;

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
  p_costo_total DECIMAL, -- NUEVO PARAMETRO
  p_ganancia DECIMAL,    -- NUEVO PARAMETRO
  p_items JSONB        -- ARRAY DE OBJETOS QUE AHORA INCLUYE COSTO UNITARIO
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
  -- 1. Obtener y bloquear la secuencia NCF actul (Transaccional)
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

  v_ncf := v_ncf_seq.prefix || LPAD(v_ncf_seq.secuencia_actual::TEXT, 8, '0');

  UPDATE ncf_secuencias
  SET secuencia_actual = secuencia_actual + 1
  WHERE id = v_ncf_seq.id;

  -- 2. Crear la factura con Costo y Ganancia
  INSERT INTO facturas (ncf, ncf_tipo, cliente_id, usuario_id, subtotal, itbis_total, descuento, total, metodo_pago, estado, notas, costo_total, ganancia)
  VALUES (v_ncf, p_ncf_tipo, p_cliente_id, p_usuario_id, p_subtotal, p_itbis_total, p_descuento, p_total, p_metodo_pago, p_estado, p_notas, p_costo_total, p_ganancia)
  RETURNING id INTO v_factura_id;

  -- 3. Registrar items y 4. Descontar stock + Movimientos
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    -- Insertar item de factura con Costo
    INSERT INTO factura_items (factura_id, producto_id, cantidad, precio_unitario, itbis_unitario, subtotal, costo_unitario)
    VALUES (
      v_factura_id,
      (v_item->>'producto_id')::UUID,
      (v_item->>'cantidad')::INTEGER,
      (v_item->>'precio_unitario')::DECIMAL,
      (v_item->>'itbis_unitario')::DECIMAL,
      (v_item->>'subtotal')::DECIMAL,
      (v_item->>'costo_unitario')::DECIMAL -- NUEVA INSERCION
    );

    SELECT stock_actual INTO v_producto FROM productos WHERE id = (v_item->>'producto_id')::UUID FOR UPDATE;

    IF v_producto.stock_actual < (v_item->>'cantidad')::INTEGER THEN
      RAISE EXCEPTION 'Stock insuficiente para producto %', (v_item->>'producto_id');
    END IF;

    UPDATE productos
    SET stock_actual = stock_actual - (v_item->>'cantidad')::INTEGER,
        updated_at = NOW()
    WHERE id = (v_item->>'producto_id')::UUID;

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
