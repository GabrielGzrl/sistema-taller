const express = require('express');
const router = express.Router();
const controller = require('../controllers/clientes.controller');

router.post('/', controller.crearCliente);
router.get('/', controller.obtenerClientes);

module.exports = router;