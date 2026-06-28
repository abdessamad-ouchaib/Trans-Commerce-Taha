module.exports = (req, res, next) => {
  if (req.user?.role !== 'responsable') {
    return res.status(403).json({
      message: 'Accès refusé. Réservé au responsable Abdelaali Ouchaib.'
    });
  }
  next();
};
