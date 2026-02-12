const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const db = require('../db'); //  pool mysql2/promise

// Helpers
function money(n) {
  const num = Number(n || 0);
  return num.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function safeText(v) {
  return (v === null || v === undefined) ? '' : String(v);
}

exports.pdfOrdenPro = async (req, res) => {
  const { orden_id } = req.params;

  try {
   
    // 1) TRAER INFO COMPLETA DE LA ORDEN
    
    const [ordenRows] = await db.query(
      'SELECT * FROM ordenes_servicio WHERE id = ?',
      [orden_id]
    );
    if (ordenRows.length === 0) {
      return res.status(404).json({ mensaje: 'Orden no encontrada' });
    }
    const orden = ordenRows[0];

    const [vehRows] = await db.query(
      'SELECT * FROM vehiculos WHERE id = ?',
      [orden.vehiculo_id]
    );
    const vehiculo = vehRows[0] || {};

    const [cliRows] = await db.query(
      'SELECT * FROM clientes WHERE id = ?',
      [vehiculo.cliente_id]
    );
    const cliente = cliRows[0] || {};

    const [detRows] = await db.query(
      'SELECT * FROM servicios_detalle WHERE orden_id = ? ORDER BY id ASC',
      [orden_id]
    );
    const detalle = detRows || [];

    
    // 2) PDF SETUP
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename=orden_${orden_id}.pdf`);

    const doc = new PDFDocument({ size: 'LETTER', margin: 40 });

    // Si PDFKit truena
    doc.on('error', (err) => {
      console.error('PDFKit error:', err);
      if (!res.headersSent) {
        res.status(500).json({ mensaje: 'Error generando PDF' });
      }
    });

    doc.pipe(res);

    
    // 3) HEADER (LOGO + TÍTULO)
   
    const logoPath = path.join(__dirname, '..', 'assets', 'logo.png');

    //  LOGO PRO (no crashea si el archivo está vacío o no existe)
    try {
      const stat = fs.existsSync(logoPath) ? fs.statSync(logoPath) : null;
      if (stat && stat.size > 0) {
        doc.image(logoPath, 40, 30, { width: 170 });
      } else {
        console.log('⚠️ Logo vacío o no existe:', logoPath);
      }
    } catch (e) {
      console.log('⚠️ Error cargando logo (se omite):', e.message);
    }

    // Título derecha
    doc
      .font('Helvetica-Bold')
      .fontSize(16)
      .text('ORDEN DE SERVICIO', 250, 40, { align: 'right' });

    doc
      .font('Helvetica')
      .fontSize(10)
      .text(`Folio: ${safeText(orden.folio)}`, 250, 62, { align: 'right' })
      .text(`Fecha: ${new Date(orden.fecha || Date.now()).toLocaleString('es-MX')}`, 250, 76, { align: 'right' });

    // Línea separadora
    doc.moveTo(40, 115).lineTo(572, 115).stroke();

    
    // 4) BLOQUES: EMISOR / RECEPTOR
    
const boxY = 125;
const boxH = 110;         
const midX = 306;

// Headers azul
doc.rect(40, boxY, 266, 18).fill('#0A2C66');
doc.rect(midX, boxY, 266, 18).fill('#0A2C66');

doc.fillColor('white').font('Helvetica-Bold').fontSize(10);
doc.text('EMISOR', 40, boxY + 4, { width: 266, align: 'center' });
doc.text('RECEPTOR', midX, boxY + 4, { width: 266, align: 'center' });

// Bordes
doc.fillColor('black');
doc.rect(40, boxY, 266, boxH).stroke();
doc.rect(midX, boxY, 266, boxH).stroke();

// Texto dentro (muestra datos básicos; adaptamos segun las tablas)
doc.font('Helvetica').fontSize(8.5);

// Líneas emisior y receptor
const emisorLines = [
  'HABIDS Servicio Automotriz',
  'Habid Leonel Mejía Granados',
  'RFC: MEGH911011JA8',
  'Dirección: Jardines Del Sur 22, Los Héroes Tecámac',
  'C.P. 55764 Ojo de Agua, Estado de México',
  'TEL: 55-33-51-22-16 / 55-49-78-63-50',
];

const receptorLines = [
  `Cliente: ${safeText(cliente.nombre)}`,
  `ID Cliente: ${safeText(cliente.id)}`,
  `Tel: ${safeText(cliente.telefono)}`,
  `Email: ${safeText(cliente.email)}`,
];

// EMISOR
doc.text(
  emisorLines.join('\n'),
  48,
  boxY + 24,
  {
    width: 250,
    height: boxH - 26,
    lineGap: 2,
    ellipsis: true
  }
);

// RECEPTOR
doc.text(
  receptorLines.join('\n'),
  midX + 8,
  boxY + 24,
  {
    width: 250,
    height: boxH - 26,
    lineGap: 2,
    ellipsis: true
  }
);

// Mini bloque a la derecha arriba (como “Folio / Fecha / Registro / Asesor”)
doc.font('Helvetica').fontSize(9);
const reg = safeText(orden.registro || '');  
const asesor = safeText(orden.asesor || ''); 
    
    // 5) DATOS VEHÍCULO
   
    const vehY = boxY + boxH + 15;
    doc.font('Helvetica-Bold').fontSize(10).text('DATOS DEL VEHÍCULO', 40, vehY);
    doc.moveTo(40, vehY + 14).lineTo(572, vehY + 14).stroke();

    doc.font('Helvetica').fontSize(10);
    doc.text(`VIN: ${safeText(vehiculo.vin)}`, 40, vehY + 22);
    doc.text(`Marca: ${safeText(vehiculo.marca)}`, 40, vehY + 38);
    doc.text(`Modelo: ${safeText(vehiculo.modelo)}`, 200, vehY + 38);
    doc.text(`Año: ${safeText(vehiculo.anio)}`, 380, vehY + 38);

    doc.text(`Color: ${safeText(vehiculo.color)}`, 40, vehY + 54);
    doc.text(`Placas: ${safeText(vehiculo.placas)}`, 200, vehY + 54);
    doc.text(`KMs: ${safeText(vehiculo.kms)}`, 380, vehY + 54);

   
    // 6) TABLA SERVICIOS
    
    const tableY = vehY + 80;
    doc.font('Helvetica-Bold').fontSize(10).text('SERVICIOS', 40, tableY);

    const startY = tableY + 18;
    const col = {
      descX: 40,
      cantX: 360,
      precioX: 430,
      impX: 510,
    };

    // Header fondo
    doc.rect(40, startY, 532, 18).fill('#0A2C66');
    doc.fillColor('white').font('Helvetica-Bold').fontSize(9);
    doc.text('Descripción', col.descX + 6, startY + 5, { width: 310 });
    doc.text('Cant.', col.cantX, startY + 5, { width: 60, align: 'right' });
    doc.text('Precio', col.precioX, startY + 5, { width: 70, align: 'right' });
    doc.text('Importe', col.impX, startY + 5, { width: 62, align: 'right' });

    doc.fillColor('black').font('Helvetica').fontSize(9);

    let y = startY + 22;

    // filas
    detalle.forEach((d, i) => {
      // salto de página si se acaba
      if (y > 680) {
        doc.addPage();
        y = 60;
      }

      // zebra
      if (i % 2 === 0) {
        doc.rect(40, y - 2, 532, 16).fill('#F3F6FB');
        doc.fillColor('black');
      }

      doc.text(safeText(d.descripcion), col.descX + 6, y, { width: 310 });
      doc.text(safeText(d.cantidad), col.cantX, y, { width: 60, align: 'right' });
      doc.text(`$${money(d.precio_unitario)}`, col.precioX, y, { width: 70, align: 'right' });
      doc.text(`$${money(d.importe)}`, col.impX, y, { width: 62, align: 'right' });

      y += 16;
    });

    // bordes tabla (solo base)
    doc.rect(40, startY, 532, Math.max(40, y - startY + 6)).stroke();

    
    // 7) TOTALES
   
    const totalsY = Math.min(y + 10, 690);

    const sub = Number(orden.subtotal || 0);
    const imp = Number(orden.impuestos || 0);
    const tot = Number(orden.total || 0);

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Subtotal:', 380, totalsY, { width: 120, align: 'right' });
    doc.text(`$${money(sub)}`, 510, totalsY, { width: 62, align: 'right' });

    doc.text('IVA:', 380, totalsY + 16, { width: 120, align: 'right' });
    doc.text(`$${money(imp)}`, 510, totalsY + 16, { width: 62, align: 'right' });

    doc.text('Total:', 380, totalsY + 32, { width: 120, align: 'right' });
    doc.text(`$${money(tot)}`, 510, totalsY + 32, { width: 62, align: 'right' });

    
    // 8) COMENTARIOS
  
    const comY = totalsY + 60;
    doc.font('Helvetica-Bold').fontSize(10).text('Comentarios:', 40, comY);
    doc.font('Helvetica').fontSize(9).text(safeText(orden.comentarios), 40, comY + 14, { width: 532 });

   
    
// 9) CONTRATO (texto completo, con auto paginado)

doc.addPage();

doc.font('Helvetica-Bold').fontSize(12).text('CONTRATO DE PRESTACIÓN DE SERVICIOS', 40, 50);
doc.moveTo(40, 70).lineTo(572, 70).stroke();

doc.font('Helvetica').fontSize(9);

//CONTENIDO DEL CONTRATO DEL PDF HABIDS
const contrato = `CONTRATO DE PRESTACIÓN DE SERVICIOS DE REPARACIÓN Y/O MANTENIMIENTO DE VEHÍCULOS QUE SE
CELEBRAN POR UNA PARTE Servicio Automotriz Habids COMO "EL PRESTADOR DE SERVICIOS" Y POR LA
OTRA PARTE COMO "EL CONSUMIDOR" CUYOS NOMBRES Y DATOS CONSTAN EN LA CARÁTULA DE ESTE
CONTRATO COMO PARTE INTEGRAL DEL MISMO, SUJETÁNDOSE AL TENOR DE LAS SIGUIENTES CLÁUSULAS:
PRIMERA - EL PRESTADOR DEL SERVICIO realizará todas las operaciones y composturas descritas en el anverso del presente contrato, solicitadas por
EL CONSUMIDOR que suscribe el presente contrato, a las que se someterá el vehículo para obtener condiciones de funcionamiento de acuerdo al estado
de este. Asimismo EL PRESTADOR DEL SERVICIO no condiciona la prestación de los servicios de reparación y/o mantenimiento de vehículos a la
adquisición o renta de otros productos o servicios en el establecimiento o en otro taller o agencia predeterminada.
SEGUNDA - El precio total de los servicios contratados se establece en el presupuesto que forma parte del presente y se describe en el anverso del
presente contrato, el cual será pagado por EL CONSUMIDOR, de la siguiente forma: Al momento de celebrar el presente contrato por concepto de anticipo
la cantidad que se indica en el anverso del presente contrato y el resto en la fecha de entrega del vehículo. Todo pago efectuado por EL CONSUMIDOR
deberá realizarse en el establecimiento de EL PRESTADOR DE SERVICIO, al contado y en moneda nacional o cualquier moneda extranjera aceptada por
EL PRESTADOR DE SERVICIO, esto último deberá estar conforme a la Ley Monetaria de los Estados unidos Mexicanos.
TERCERA - EL PRESTADOR DE SERVICIO pondrá a disposición de EL CONSUMIDOR los precios de los servicios, mano de obra, refacciones y
materiales a usar en las reparaciones ofrecidas. Asimismo, previo a la realización del servicio EL PRESTADOR DE SERVICIO presentará a EL
CONSUMIDOR el presupuesto al que se refiere la cláusula segunda del presente contrato. Una vez aprobado el presupuesto por EL CONSUMIDOR, EL
PRESTADOR DE SERVICIO procederá a efectuar el servicio solicitado. Los incrementos que resulten durante la reparación por costos no previsibles en
rubros específicos que su cotización esté fuera de control de EL PRESTADOR DE SERVICIO, deberán ser autorizados por EL CONSUMIDOR, en forma
escrita siempre y/o telefónicamente. El tiempo que en su caso transcurra para requisitar esta condición se modificará la fecha de entrega, en la misma
proporción.
CUARTA - La entrega del vehículo será en la fecha contemplada en el anverso del presente contrato. Para el caso de que EL CONSUMIDOR, sea el que
proporcione las refacciones la fecha de entrega será el día negociado.
QUINTA - EL PRESTADOR DE SERVICIO exclusivamente utilizará para los servicios objeto de este contrato, partes, refacciones u otros materiales nuevos
y apropiados para el vehículo, salvo que EL CONSUMIDOR autorice expresamente se usen otras. SI EL PRESTADOR DE SERVICIO autoriza, EL
CONSUMIDOR suministrará las partes, refacciones o materiales necesarios para reparación y/o mantenimiento del vehículo. En ambos casos, la
autorización respectiva se hará constar en el anverso del presente contrato.
SEXTA - EL PRESTADOR DEL SERVICIO hará entrega de las refacciones, partes o piezas sustituidas en la reparación y/o mantenimiento del vehículo al
momento de entrega de este, salvo en los siguientes casos: A) Cuando EL CONSUMIDOR, exprese lo contrario. B) Las partes, refacciones o piezas sean
cambiadas en uso de garantía C) Se trate de residuos considerados peligrosos de acuerdo con las disposiciones legales aplicables.
SÉPTIMA - Las reparaciones a que se refiere el presupuesto aceptado por EL CONSUMIDOR, tiene una garantía de 30 días contados a partir de la fecha
de entrega del vehículo ya reparado en mano de obra y en refacciones la especificada por el fabricante, siempre y cuando no se manifieste mal uso,
negligencia, accidentes o descuido; EL PRESTADOR DEL SERVICIO no se hará responsable y la garantía quedará sin efecto. Las reclamaciones por
garantía se harán en el establecimiento de EL PRESTADOR DE SERVICIO, para la cual EL CONSUMIDOR, deberá presentar su vehículo en dicho
establecimiento. Las reparaciones efectuadas por EL PRESTADOR DE SERVICIO en cumplimiento a la garantía del servicio, serán sin cargo alguno para
el CONSUMIDOR, salvo aquellos trabajos que no deriven de las reparaciones aceptadas en el presupuesto. No se computará dentro del plazo de garantía,
el tiempo que dure la reparación y/o mantenimiento del vehículo para el cumplimiento de la misma. Los gastos en que incurra EL CONSUMIDOR para
hacer válida la garantía en un domicilio diverso al de EL PRESTADOR DE SERVICIO, deberán ser cubiertos por éste.
OCTAVA - EL CONSUMIDOR, autoriza el uso del vehículo en zonas aledañas con un radio de 5 km. Al área del establecimiento a efectos de pruebas o
verificaciones de las reparaciones a efectuar o efectuadas. EL PRESTADOR DE SERVICIO no podrá utilizar el vehículo para uso personal, fines propios o
de terceros. Para mayor especificación, Revisar el documento de garantías según el producto y servicio que se brinda.*
NOVENA - EL PRESTADOR DEL SERVICIO no se hace responsable por los daños causados al vehículo de EL CONSUMIDOR, como consecuencia de
los recorridos de prueba por parte del personal de EL PRESTADOR DE SERVICIO. El riesgo en un recorrido de prueba, es por cuenta de EL
CONSUMIDOR, cuando el mismo solicite que será el o un representante suyo quien pruebe el vehículo. Asimismo, EL PRESTADOR DEL SERVICIO se
hace responsable por las descomposturas, daños, pérdidas parciales o totales, imputables a él o a sus empleados, que sufra el vehículo, el equipo y
aditamentos que EL CONSUMIDOR haya notificado al momento de la recepción del vehículo, mientras se encuentren bajo su responsabilidad para llevar a
cabo la reparación y/o mantenimiento solicitado así como para hacer efectiva la garantía otorgada. PRESTADOR DE SERVICIO no se hace responsable
por la pérdida de objetos dejados en el interior del vehículo, aún con la cajuela cerrada, salvo que estos hayan sido notificados y puestos bajo su resguardo
al momento de la recepción del vehículo.
DECIMA - EL PRESTADOR DEL SERVICIO se obliga a expedir la factura o comprobante de pago por los trabajos efectuados, en la que se especifica los
precios por mano de obra, refacciones, materiales y accesorios empleados.
DECIMA PRIMERA - En caso de que el vehículo no sea recogido por EL CONSUMIDOR en el plazo de 48 horas a partir de la fecha señalada para la
entrega pagará por concepto de depósito un salario mínimo vigente en el lugar que se celebre el presente contrato, por cada 24 has. Que transcurra.
DECIMA SEGUNDA - EL CONSUMIDOR puede desistirse en cualquier momento de la contratación del servicio de reparación y/o mantenimiento del
vehículo, en cuyo caso deberá cubrir, en lugar del precio contratado el importe de los trabajos realizados hasta el retiro del vehículo, incluidas las partes,
refacciones u otros materiales utilizados.
DECIMA TERCERA - EL PRESTADOR DEL SERVICIO es responsable ante EL CONSUMIDOR por el incumplimiento de los servicios contratados, aun
cuando subcontraten con terceros dicha prestación.
DÉCIMA CUARTA - Cuando se preste el servicio a domicilio, el personal de EL PRESTADOR DE SERVICIO debe identificarse plenamente ante EL
CONSUMIDOR, mediante la presentación del documento que lo acredite para este propósito. El servicio a domicilio tiene un costo, el cual se indicará en el
anverso del presente contrato.`;

doc.text(contrato, 40, 85, { width: 532, align: 'justify', lineGap: 2 });

// Firmas
if (doc.y > 680) doc.addPage();

doc.moveTo(40, 720).lineTo(300, 720).stroke();
doc.moveTo(312, 720).lineTo(572, 720).stroke();
doc.font('Helvetica-Bold').fontSize(10);
doc.text('EL PRESTADOR DEL SERVICIO', 40, 728, { width: 260, align: 'center' });
doc.text('EL CONSUMIDOR', 312, 728, { width: 260, align: 'center' });
    // FIN
    doc.end();

  } catch (error) {
    console.error(error);
    if (!res.headersSent) {
      return res.status(500).json({ mensaje: 'Error al generar PDF PRO' });
    }
  }
};