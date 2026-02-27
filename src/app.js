require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const authRoutes = require('./routes/authRoutes');
const smsRoutes = require('./routes/smsRoutes');
const walletRoutes = require('./routes/walletRoutes');
const withdrawRoutes = require('./routes/withdrawRoutes');
const deviceRoutes = require('./routes/deviceRoutes');
const referralRoutes = require('./routes/referralRoutes');
const adminRoutes = require('./routes/adminRoutes');
const statsRoutes = require('./routes/statsRoutes');
const { setupSocketHandlers } = require('./websocket/socketHandler');
const { errorResponse } = require('./utils/helpers');
const { apiRateLimit } = require('./middleware/rateLimit');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

app.use('/api', apiRateLimit);
app.use('/api/auth', authRoutes);
app.use('/api/sms', smsRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/device', deviceRoutes);
app.use('/api/referral', referralRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

setupSocketHandlers(io);

app.use((req, res) => {
  errorResponse(res, 'Route not found', 'NOT_FOUND', 404);
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  errorResponse(res, 'Internal server error', 'SERVER_ERROR', 500);
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`SMSPaisa server running on port ${PORT}`);
  });
}

module.exports = { app, server, io };
