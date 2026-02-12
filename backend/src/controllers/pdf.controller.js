const PDFDocument = require('pdfkit');
const db = require('../db');

exports.generarPDFOrden = async (req, res) => {
  const { ordenId } = req.params;

  try {
    // Obtener orden completa
    const [[orden]] = await db.query(
      'SELECT * FROM ordenes_servicio WHERE id = ?',
      [ordenId]
    );

    const [[vehiculo]] = await db.query(
      'SELECT * FROM vehiculos WHERE id = ?',
      [orden.vehiculo_id]
    );

    const [[cliente]] = await db.query(
      'SELECT * FROM clientes WHERE id = ?',
      [vehiculo.cliente_id]
    );

    const [detalle] = await db.query(
      'SELECT * FROM servicios_detalle WHERE orden_id = ?',
      [ordenId]
    );

    // Crear PDF
    const doc = new PDFDocument({ margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename=orden_${orden.folio}.pdf`
    );

    doc.pipe(res);

    // Título
    doc.fontSize(18).text('ORDEN DE SERVICIO', { align: 'center' });
    doc.moveDown();

    // Datos cliente
    doc.fontSize(12).text(`Cliente: ${cliente.nombre}`);
    doc.text(`Teléfono: ${cliente.telefono}`);
    doc.text(`Email: ${cliente.email}`);
    doc.moveDown();

    // Datos vehículo
    doc.text(`VIN: ${vehiculo.vin}`);
    doc.text(`Vehículo: ${vehiculo.marca} ${vehiculo.modelo} ${vehiculo.anio}`);
    doc.text(`Placas: ${vehiculo.placas}`);
    doc.text(`Kilometraje: ${vehiculo.kms}`);
    doc.moveDown();

    // Orden
    doc.text(`Folio: ${orden.folio}`);
    doc.text(`Fecha: ${new Date(orden.fecha).toLocaleString()}`);
    doc.moveDown();

    // Tabla servicios
    doc.fontSize(14).text('Detalle de servicios');
    doc.moveDown();

    detalle.forEach(item => {
      doc.fontSize(11).text(
        `${item.descripcion} | Cant: ${item.cantidad} | $${item.importe}`
      );
    });

    doc.moveDown();
    doc.text(`Subtotal: $${orden.subtotal}`);
    doc.text(`Impuestos: $${orden.impuestos}`);
    doc.text(`TOTAL: $${orden.total}`, { underline: true });

    doc.moveDown();
    doc.text('Gracias por su preferencia', { align: 'center' });

    doc.end();

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar PDF' });
  }
};