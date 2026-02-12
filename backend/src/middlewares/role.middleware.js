exports.requireRole = (...roles) => {
  return (req, res, next) => {
    const rol = req.usuario?.rol;

    if (!rol) {
      return res.status(401).json({ mensaje: 'No autorizado' });
    }

    if (!roles.includes(rol)) {
      return res.status(403).json({ mensaje: 'No tienes permisos' });
    }

    next();
  };
};
//AQUI VALIDAMOS LOS PERMISOS SEGUN EL ROL