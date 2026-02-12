const express = require('express');
const router = express.Router();

const controller = require('../controllers/ordenes.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

// Crear orden
router.post('/', verificarToken, controller.crearOrden);

// Obtener todas las órdenes
router.get('/', verificarToken, controller.obtenerOrdenes);

// Obtener órdenes por vehículo
router.get('/vehiculo/:vehiculo_id', verificarToken, controller.ordenesPorVehiculo);

//  leer estatus
router.get('/:orden_id/estatus', verificarToken, controller.obtenerEstatus);

//  actualizar estatus
router.put('/:orden_id/estatus', verificarToken, controller.actualizarEstatus);
// Configurar PIN para portal cliente (solo taller)
router.put('/:orden_id/pin', verificarToken, controller.configurarPinOrden);
//  acceso público para cliente (folio + pin)
router.post('/public/orden', controller.ordenPublica);





module.exports = router;