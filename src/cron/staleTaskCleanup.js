const cron = require('node-cron');
const prisma = require('../config/database');

const startStaleTaskCleanup = () => {
  // Runs at minute 0 of every hour
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const result = await prisma.smsTask.updateMany({
        where: { status: 'ASSIGNED', assignedAt: { lt: cutoff } },
        data: { status: 'QUEUED', assignedToId: null, assignedDeviceId: null, assignedAt: null },
      });
      console.log(`Stale task cleanup: reset ${result.count} task(s) to QUEUED`);
    } catch (err) {
      console.error('Stale task cleanup error:', err);
    }
  });
};

module.exports = { startStaleTaskCleanup };
