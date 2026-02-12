const db = require('../db');

// AGREGAR DETALLE A ORDEN
exports.agregarDetalle = async (req, res) => {
  try {
    console.log('DETALLE RECIBIDO:', req.body);

    const { orden_id, descripcion, cantidad, precio_unitario } = req.body;

    const importe = cantidad * precio_unitario;

    const [result] = await db.query(
      `
      INSERT INTO servicios_detalle
      (orden_id, descripcion, cantidad, precio_unitario, importe)
      VALUES (?, ?, ?, ?, ?)
      `,
      [orden_id, descripcion, cantidad, precio_unitario, importe]
    );

    res.status(201).json({
      mensaje: 'Servicio agregado',
      id: result.insertId
    });

  } catch (error) {
    console.error('ERROR DETALLE:', error);
    res.status(500).json({ mensaje: 'Error al agregar servicio' });
  }
};

// OBTENER DETALLE POR ORDEN
exports.detallePorOrden = async (req, res) => {
  try {
    const { orden_id } = req.params;

    const [rows] = await db.query(
      'SELECT * FROM servicios_detalle WHERE orden_id = ?',
      [orden_id]
    );

    res.json(rows);

  } catch (error) {
    console.error('ERROR GET DETALLE:', error);
    res.status(500).json({ mensaje: 'Error al obtener servicios' });
  }
};