const db = require('../db');

const IVA = 0.16;

exports.recalcularTotales = async (req, res) => {
  try {
    const { orden_id } = req.params;

    // 1) sumar servicios
    const [sumRows] = await db.query(
      'SELECT COALESCE(SUM(importe), 0) AS subtotal FROM servicios_detalle WHERE orden_id = ?',
      [orden_id]
    );

    const subtotal = Number(sumRows[0].subtotal);
    const impuestos = Number((subtotal * IVA).toFixed(2));
    const total = Number((subtotal + impuestos).toFixed(2));

    // 2) actualizar orden
    await db.query(
      'UPDATE ordenes_servicio SET subtotal = ?, impuestos = ?, total = ? WHERE id = ?',
      [subtotal, impuestos, total, orden_id]
    );

    res.json({ orden_id: Number(orden_id), subtotal, impuestos, total });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al recalcular totales' });
  }
};