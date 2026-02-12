const db = require('../db');

exports.getOrdenCompleta = async (req, res) => {
  const { ordenId } = req.params;

  try {
    // Orden
    const [orden] = await db.query(
      'SELECT * FROM ordenes_servicio WHERE id = ?',
      [ordenId]
    );

    if (orden.length === 0) {
      return res.status(404).json({ message: 'Orden no encontrada' });
    }

    // Vehículo
    const [vehiculo] = await db.query(
      'SELECT * FROM vehiculos WHERE id = ?',
      [orden[0].vehiculo_id]
    );

    // Cliente
    const [cliente] = await db.query(
      'SELECT * FROM clientes WHERE id = ?',
      [vehiculo[0].cliente_id]
    );

    // Detalle
    const [detalle] = await db.query(
      'SELECT * FROM servicios_detalle WHERE orden_id = ?',
      [ordenId]
    );

    res.json({
      orden: orden[0],
      vehiculo: vehiculo[0],
      cliente: cliente[0],
      detalle
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener orden completa' });
  }
};