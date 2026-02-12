const db = require('../db');
const bcrypt = require('bcryptjs');

function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

exports.verOrdenPublica = async (req, res) => {
  console.log('PUBLIC: fotos encontradas =', fotos.length);
  const { folio } = req.params;
  const { pin } = req.body;

  if (!pin) return res.status(400).json({ mensaje: 'PIN requerido' });

  try {
    // 1) Buscar orden por folio
    const [ordenRows] = await db.query(
      'SELECT * FROM ordenes_servicio WHERE folio = ? LIMIT 1',
      [folio]
    );

    if (ordenRows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }

    const orden = ordenRows[0];

    // 2) Verificar PIN (si no hay pin_hash aún, bloquear)
    if (!orden.pin_hash) {
      return res.status(403).json({ mensaje: 'Esta orden no tiene acceso público configurado' });
    }

    const ok = await bcrypt.compare(String(pin), orden.pin_hash);
    if (!ok) {
      return res.status(403).json({ mensaje: 'PIN incorrecto' });
    }

    // 3) Traer vehiculo + cliente
    const [vehRows] = await db.query('SELECT * FROM vehiculos WHERE id = ?', [orden.vehiculo_id]);
    const vehiculo = vehRows[0] || {};

    const [cliRows] = await db.query('SELECT * FROM clientes WHERE id = ?', [vehiculo.cliente_id]);
    const cliente = cliRows[0] || {};

    // 4) Servicios
    const [detRows] = await db.query(
      'SELECT * FROM servicios_detalle WHERE orden_id = ? ORDER BY id ASC',
      [orden.id]

    );

    // 5) Fotos  
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
console.log('PUBLIC: fotoRows =', fotoRows.length);
console.log('PUBLIC: fotos =', fotos.length, fotos.map(x => x.url));


    // 6) Respuesta (no mandamos datos privados)
    res.json({
      orden: {
        id: orden.id,
        folio: orden.folio,
        fecha: orden.fecha,
        estatus: orden.estatus,
        subtotal: money(orden.subtotal),
        impuestos: money(orden.impuestos),
        total: money(orden.total),
        notas_taller: orden.notas_taller || ''
      },
      vehiculo: {
        vin: vehiculo.vin,
        marca: vehiculo.marca,
        modelo: vehiculo.modelo,
        anio: vehiculo.anio,
        placas: vehiculo.placas
      },
      cliente: {
        nombre: cliente.nombre
        //Para agregar mas datos
      },
      servicios: detRows,
      fotos: fotos
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ mensaje: 'Error en portal público' });
  }
};