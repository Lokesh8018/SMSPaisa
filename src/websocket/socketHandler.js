const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { creditEarning, checkAndPayReferralBonus } = require('../services/earningsService');
const constants = require('../utils/constants');

const connectedDevices = new Map();

const setupSocketHandlers = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) return next(new Error('Authentication required'));

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, phone: true, role: true, isActive: true },
      });

      if (!user || !user.isActive) return next(new Error('User not found or inactive'));

      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id} (user: ${socket.user.id})`);

    socket.on('device-status', async (data) => {
      try {
        const { deviceId, isOnline } = data;
        const device = await prisma.device.findFirst({
          where: { deviceId, userId: socket.user.id },
        });
        if (device) {
          await prisma.device.update({
            where: { id: device.id },
            data: { isOnline, lastSeen: new Date() },
          });
          connectedDevices.set(deviceId, { socketId: socket.id, userId: socket.user.id });
        }
      } catch (err) {
        console.error('device-status error:', err);
      }
    });

    socket.on('heartbeat', async (data) => {
      try {
        const { deviceId } = data;
        const device = await prisma.device.findFirst({
          where: { deviceId, userId: socket.user.id },
        });
        if (device) {
          await prisma.device.update({
            where: { id: device.id },
            data: { lastSeen: new Date(), isOnline: true },
          });
        }
        socket.emit('heartbeat-ack', { timestamp: Date.now() });
      } catch (err) {
        console.error('heartbeat error:', err);
      }
    });

    socket.on('task-result', async (data) => {
      try {
        const { taskId, status, deviceId } = data;
        const task = await prisma.smsTask.findFirst({
          where: { id: taskId, assignedToId: socket.user.id },
        });

        if (!task) return;

        await prisma.smsTask.update({
          where: { id: taskId },
          data: {
            status,
            sentAt: status !== 'FAILED' ? new Date() : undefined,
            deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
          },
        });

        const amountEarned = status === 'DELIVERED' ? constants.SMS_RATE_PER_DELIVERY : 0;

        await prisma.smsLog.create({
          data: {
            userId: socket.user.id,
            taskId,
            status,
            amountEarned,
            sentAt: status !== 'FAILED' ? new Date() : undefined,
            deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
          },
        });

        if (status === 'DELIVERED') {
          const { wallet } = await creditEarning(socket.user.id, taskId, amountEarned);
          socket.emit('balance-updated', { balance: parseFloat(wallet.balance) });
          await checkAndPayReferralBonus(socket.user.id);
        }
      } catch (err) {
        console.error('task-result error:', err);
      }
    });

    socket.on('disconnect', async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      for (const [deviceId, info] of connectedDevices.entries()) {
        if (info.socketId === socket.id) {
          connectedDevices.delete(deviceId);
          try {
            const device = await prisma.device.findFirst({
              where: { deviceId, userId: socket.user.id },
            });
            if (device) {
              await prisma.device.update({
                where: { id: device.id },
                data: { isOnline: false },
              });
            }
          } catch (err) {
            console.error('disconnect cleanup error:', err);
          }
        }
      }
    });
  });

  return io;
};

const pushTaskToDevice = (io, deviceId, task) => {
  const deviceInfo = connectedDevices.get(deviceId);
  if (deviceInfo) {
    io.to(deviceInfo.socketId).emit('new-task', task);
    return true;
  }
  return false;
};

const cancelTask = (io, deviceId, taskId) => {
  const deviceInfo = connectedDevices.get(deviceId);
  if (deviceInfo) {
    io.to(deviceInfo.socketId).emit('task-cancelled', { taskId });
    return true;
  }
  return false;
};

module.exports = { setupSocketHandlers, pushTaskToDevice, cancelTask };
