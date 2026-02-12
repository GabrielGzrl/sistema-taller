const express = require('express');
const router = express.Router();
const controller = require('../controllers/vehiculos.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Crear vehículo (PROTEGIDO)
router.post('/', verificarToken, controller.crearVehiculo);

// Obtener todos (PROTEGIDO)
router.get('/', verificarToken, controller.obtenerVehiculos);

// Buscar por VIN (PÚBLICO)
router.get('/vin/:vin', controller.buscarPorVin);

module.exports = router;