module.exports = function cors(options = {}) {
  const {
    origin = '*',
    allowHeaders = 'Content-Type, Authorization',
    allowMethods = 'GET,POST,PUT,DELETE,OPTIONS',
  } = options;

  return function corsMiddleware(req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Headers', allowHeaders);
    res.setHeader('Access-Control-Allow-Methods', allowMethods);

    if (req.method.toUpperCase() === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    next();
  };
};
