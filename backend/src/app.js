const express = require('express');//Aqui inicializamos express (donde vive el backend)
const cors = require('cors');//Permite solicitudes desde otros dominios (frontend)
const path = require('path');

require('./db');

const app = express();

app.use(cors());
app.use(express.json());//Permite parsear JSON en solicitudes
// sirve fotos subidas: http://localhost:3000/uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Backend Taller OK');
});
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/vehiculos', require('./routes/vehiculos.routes'));
app.use('/api/ordenes', require('./routes/ordenes.routes'));
app.use('/api/detalle', require('./routes/detalle.routes'));
app.use('/api/orden-completa', require('./routes/ordenCompleta.routes'));
app.use('/api/pdf', require('./routes/pdf.routes'));
app.use('/api/pdf-pro', require('./routes/pdfPro.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api/totales', require('./routes/totales.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes'));
app.use('/api', require('./routes/ordenFotos.routes'));
app.use('/api/public', require('./routes/public.routes'));


app.listen(3000, () => {
  console.log('Servidor en http://localhost:3000');
});
//Este archivo se encarga de iniciar el sistema, conectar la base de datos y dirigir cada solicitud al módulo correcto
// (clientes, vehículos, órdenes, etc.) según la ruta de la API.”