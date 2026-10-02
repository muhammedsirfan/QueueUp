function error(res, status, message, extra = {}) {
  return res.status(status).json({ error: message, ...extra });
}

module.exports = { error };
