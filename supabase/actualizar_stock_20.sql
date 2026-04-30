-- Actualiza todos los productos que tienen stock 0: pon stock en 20 y mínimo en 2
UPDATE productos 
SET stock_actual = 20,
    stock_minimo = 2
WHERE stock_actual = 0 AND activo = true;

-- Opcional: Si quieres que TODOS los productos tengan un mínimo de 2
-- UPDATE productos SET stock_minimo = 2 WHERE activo = true;
