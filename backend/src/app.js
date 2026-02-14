const express = require('express');
const cors = require('cors');
const path = require('path');

// Cargar variables de entorno (.env en local, Railway variables en nube)
require('dotenv').config();

// Importa el pool (conecta y deja listo)
require('./db');

const app = express();

// En producción puedes afinar esto; por ahora deja abierto
app.use(cors());
app.use(express.json());

// Servir fotos subidas: /uploads/...
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/', (req, res) => {
  res.send('Backend Taller OK');
});

// Rutas API
app.use('/api/clientes', require('./routes/clientes.routes'));
app.use('/api/vehiculos', require('./routes/vehiculos.routes'));
app.use('/api/ordenes', require('./routes/ordenes.routes'));
app.use('/api/detalle', require('./routes/detalle.routes'));
app.use('/api/orden-completa', require('./routes/ordenCompleta.routes'));
app.use('/api/pdf', require('./routes/pdf.routes'));
app.use('/api/pdf-pro', require('./routes/pdfPro.routes'));
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/usuarios', require('./routes/usuarios.routes')); // (quitamos duplicado)
app.use('/api/totales', require('./routes/totales.routes'));
app.use('/api', require('./routes/ordenFotos.routes'));
app.use('/api/public', require('./routes/public.routes'));

// Railway usa PORT dinámico
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}`);
});