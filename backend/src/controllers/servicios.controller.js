const db = require('../db');

// CREAR SERVICIO
exports.crearServicio = async (req, res) => {
  const { orden_id, descripcion, cantidad, precio_unitario } = req.body;

  const importe = cantidad * precio_unitario;

  try {
    await db.query(
      `
      INSERT INTO servicios_detalle
      (orden_id, descripcion, cantidad, precio_unitario, importe)
      VALUES (?, ?, ?, ?, ?)
      `,
      [orden_id, descripcion, cantidad, precio_unitario, importe]
    );

    res.json({ mensaje: 'Servicio agregado correctamente' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al agregar servicio' });
  }
};

// OBTENER SERVICIOS POR ORDEN
exports.obtenerServiciosPorOrden = async (req, res) => {
  const { orden_id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM servicios_detalle WHERE orden_id = ?',
      [orden_id]
    );

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener servicios' });
  }
};