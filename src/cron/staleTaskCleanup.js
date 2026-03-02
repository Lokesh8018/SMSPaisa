const cron = require('node-cron');
const prisma = require('../config/database');
const { enqueueTask } = require('../services/smsQueueService');

const startStaleTaskCleanup = () => {
  // Runs at minute 0 of every hour — resets stale ASSIGNED tasks (stuck for >5 minutes) back to QUEUED
  cron.schedule('0 * * * *', async () => {
    try {
      const cutoff = new Date(Date.now() - 5 * 60 * 1000);
      const staleTasks = await prisma.smsTask.findMany({
        where: { status: 'ASSIGNED', assignedAt: { lt: cutoff } },
        select: { id: true },
      });
      if (staleTasks.length > 0) {
        await prisma.smsTask.updateMany({
          where: { id: { in: staleTasks.map((t) => t.id) } },
          data: { status: 'QUEUED', assignedToId: null, assignedDeviceId: null, assignedAt: null },
        });
        for (const task of staleTasks) {
          await enqueueTask(task.id, 0); // re-enqueue with default priority
        }
        console.log(`Stale task cleanup: reset ${staleTasks.length} task(s) to QUEUED`);
      }
    } catch (err) {
      console.error('Stale task cleanup error:', err);
    }
  });

  // Runs at 18:30 UTC (midnight IST) — resets daily SMS counters on all devices
  cron.schedule('30 18 * * *', async () => {
    try {
      const result = await prisma.device.updateMany({ data: { smsSentToday: 0 } });
      console.log(`Daily reset: cleared smsSentToday for ${result.count} device(s)`);
    } catch (err) {
      console.error('Daily device reset error:', err);
    }
  });
};

module.exports = { startStaleTaskCleanup };
