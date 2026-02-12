const express = require('express');
const router = express.Router();
const controller = require('../controllers/ordenCompleta.controller');

router.get('/:ordenId', controller.getOrdenCompleta);

module.exports = router;