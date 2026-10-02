const express = require('express');
const { sequelize } = require('./models');
const { attachUser } = require('./middleware/auth');

const authRoutes = require('./routes/auth');
const categoryRoutes = require('./routes/categories');
const professionalRoutes = require('./routes/professionals');
const appointmentRoutes = require('./routes/appointments');
const queueRoutes = require('./routes/queue');
const reviewRoutes = require('./routes/reviews');
const notificationRoutes = require('./routes/notifications');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});
app.use(attachUser);

app.get('/api/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/professionals', professionalRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/queue', queueRoutes); // daily-queues, tokens, tracking
app.use('/api/reviews', reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

const port = Number(process.env.PORT || 8000);
sequelize.authenticate().then(() => app.listen(port, '0.0.0.0')).catch(() => process.exit(1));
module.exports = app;
