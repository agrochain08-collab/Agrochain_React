
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        msg: `Role (${req.user?.role || 'None'}) is not authorized to access this route` 
      });
    }
    next();
  };
};

module.exports = { authorize };