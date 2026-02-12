const db = require('../db');

// CREAR ORDEN
exports.crearOrden = async (req, res) => {
  const { vehiculo_id, subtotal, impuestos, total, comentarios } = req.body;

  if (!vehiculo_id) {
    return res.status(400).json({ mensaje: 'vehiculo_id es obligatorio' });
  }

  const folio = 'SERV' + Date.now();

  //  Defaults para evitar NULL y por si algún día mandas totales desde frontend
  const sub = Number(subtotal ?? 0);
  const imp = Number(impuestos ?? 0);
  const tot = Number(total ?? 0);
  const com = (comentarios ?? '').toString();

  try {
    const [result] = await db.query(
      `
      INSERT INTO ordenes_servicio
      (folio, vehiculo_id, subtotal, impuestos, total, comentarios)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [folio, vehiculo_id, sub, imp, tot, com]
    );

    res.json({ id: result.insertId, folio });
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al crear orden' });
  }
};

// OBTENER ÓRDENES POR VEHÍCULO
exports.ordenesPorVehiculo = async (req, res) => {
  const { vehiculo_id } = req.params;

  try {
    const [rows] = await db.query(
      'SELECT * FROM ordenes_servicio WHERE vehiculo_id = ? ORDER BY id DESC',
      [vehiculo_id]
    );
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener órdenes' });
  }
};

// OBTENER TODAS LAS ÓRDENES (PARA EL SELECT)
exports.obtenerOrdenes = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id, 
        folio, 
        COALESCE(total, 0) AS total
      FROM ordenes_servicio
      ORDER BY id DESC
    `);

    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al obtener órdenes' });
  }
};
//ESTATUS DE LAS ORDENES
// PUT /api/ordenes/:orden_id/estatus
exports.actualizarEstatus = async (req, res) => {
  const { orden_id } = req.params;
  const { estatus } = req.body;

  const permitidos = ['recibido','en_proceso','listo','entregado'];
  if (!permitidos.includes(estatus)) {
    return res.status(400).json({ mensaje: 'Estatus inválido' });
  }

  try {
    await db.query('UPDATE ordenes_servicio SET estatus = ? WHERE id = ?', [estatus, orden_id]);
    res.json({ mensaje: 'Estatus actualizado', orden_id: Number(orden_id), estatus });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error al actualizar estatus' });
  }
};

// obtener
exports.obtenerEstatus = async (req, res) => {
  const { orden_id } = req.params;
  const [rows] = await db.query(
    'SELECT estatus FROM ordenes_servicio WHERE id = ?',
    [orden_id]
  );
  res.json(rows[0]);
};
// PIN PÚBLICO PARA ORDENES
const bcrypt = require('bcryptjs');

exports.configurarPinOrden = async (req, res) => {
  const { orden_id } = req.params;
  const { pin } = req.body;

  if (!pin || String(pin).length < 4) {
    return res.status(400).json({ mensaje: 'PIN inválido (mínimo 4 dígitos)' });
  }

  try {
    const hash = await bcrypt.hash(String(pin), 10);

    await db.query(
      'UPDATE ordenes_servicio SET pin_hash = ? WHERE id = ?',
      [hash, orden_id]
    );

    res.json({ mensaje: 'PIN configurado', orden_id: Number(orden_id) });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error configurando PIN' });
  }
};

exports.ordenPublica = async (req, res) => {
  const { folio, pin } = req.body;

  if (!folio || !pin) {
    return res.status(400).json({ mensaje: 'folio y pin requeridos' });
  }

  try {
    // 1) buscar orden por folio
    const [ordenRows] = await db.query(
      'SELECT id, folio, estatus, pin_hash, vehiculo_id, subtotal, impuestos, total, fecha FROM ordenes_servicio WHERE folio = ?',
      [folio]
    );

    if (ordenRows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }

    const orden = ordenRows[0];

    if (!orden.pin_hash) {
      return res.status(400).json({ mensaje: 'Orden sin PIN asignado' });
    }

    // 2) comparar pin con hash
    const ok = await bcrypt.compare(pin, orden.pin_hash);
    if (!ok) {
      return res.status(401).json({ mensaje: 'PIN incorrecto' });
    }

    // 3) traer vehiculo + cliente (resumen)
    const [vehRows] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [orden.vehiculo_id]);
    const vehiculo = vehRows[0] || {};

    const [cliRows] = await db.query('SELECT id, nombre FROM clientes WHERE id = ?', [vehiculo.cliente_id]);
    const cliente = cliRows[0] || {};

    // 4) servicios
    const [servRows] = await db.query(
      'SELECT descripcion, cantidad, precio_unitario, importe FROM servicios_detalle WHERE orden_id = ? ORDER BY id ASC',
      [orden.id]
    );

    // 5) fotos (si tienes tabla orden_fotos; si no existe, lo puedes comentar)
    const [fotoRows] = await db.query(
  'SELECT id, orden_id, tipo, filename, original_name, creado_en FROM orden_fotos WHERE orden_id = ? ORDER BY id DESC',
  [orden.id]
);

const fotos = fotoRows.map(f => ({
  id: f.id,
  orden_id: f.orden_id,
  tipo: f.tipo,
  original_name: f.original_name,
  creado_en: f.creado_en,
  url: `/uploads/${f.filename}`
}));

    return res.json({
      orden: {
        id: orden.id,
        folio: orden.folio,
        estatus: orden.estatus,
        fecha: orden.fecha,
        subtotal: orden.subtotal,
        impuestos: orden.impuestos,
        total: orden.total
      },
      vehiculo: {
        id: vehiculo.id,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        vin: vehiculo.vin,
        placas: vehiculo.placas
      },
      cliente,
      servicios: servRows,
      fotos: fotos
    });

  } catch (err) {
    console.error(err);
    return res.status(500).json({ mensaje: 'Error en consulta pública' });
  }
};

