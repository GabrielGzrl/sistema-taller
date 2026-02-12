const db = require('../db');

// OBTENER TODOS LOS VEHÍCULOS
exports.obtenerVehiculos = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM vehiculos');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener vehículos' });
  }
};

// BUSCAR POR VIN
exports.buscarPorVin = async (req, res) => {
  try {
    const { vin } = req.params;

    const [rows] = await db.query(
      `SELECT v.*, c.nombre AS cliente
       FROM vehiculos v
       LEFT JOIN clientes c ON v.cliente_id = c.id
       WHERE v.vin = ?`,
      [vin]
    );

    if (rows.length === 0) {
      return res.status(404).json({ mensaje: 'Vehículo no encontrado' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al buscar vehículo' });
  }
};

// CREAR VEHÍCULO
exports.crearVehiculo = async (req, res) => {
  try {
    const {
      vin, marca, modelo, anio, color, placas, kms, cliente_id
    } = req.body;

    const [existe] = await db.query(
      'SELECT id FROM vehiculos WHERE vin = ?',
      [vin]
    );

    if (existe.length > 0) {
      return res.status(400).json({
        mensaje: 'Este VIN ya está registrado'
      });
    }

    const [result] = await db.query(
      `INSERT INTO vehiculos
       (vin, marca, modelo, anio, color, placas, kms, cliente_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [vin, marca, modelo, anio, color, placas, kms, cliente_id]
    );

    res.json({
      id: result.insertId,
      vin,
      marca,
      modelo,
      anio
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear vehículo' });
  }
};