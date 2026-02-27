const prisma = require('../config/database');
const { enqueueTask, dequeueTask, markTaskAssigned } = require('./smsQueueService');
const { isWithinActiveHours } = require('../utils/helpers');

const findEligibleDevice = async (userId) => {
  const devices = await prisma.device.findMany({
    where: {
      userId,
      isOnline: true,
    },
  });

  for (const device of devices) {
    const withinHours = isWithinActiveHours(device.activeHoursStart, device.activeHoursEnd);
    const underLimit = device.smsSentToday < device.dailyLimit;
    if (withinHours && underLimit) {
      return device;
    }
  }
  return null;
};

const getNextTaskForDevice = async (userId, deviceId) => {
  const device = await prisma.device.findFirst({
    where: { id: deviceId, userId },
  });

  if (!device) return null;

  const withinHours = isWithinActiveHours(device.activeHoursStart, device.activeHoursEnd);
  if (!withinHours || device.smsSentToday >= device.dailyLimit) return null;

  const taskId = await dequeueTask();
  if (!taskId) return null;

  const task = await prisma.smsTask.findFirst({
    where: { id: taskId, status: 'QUEUED' },
  });

  if (!task) return null;

  await prisma.smsTask.update({
    where: { id: taskId },
    data: {
      status: 'ASSIGNED',
      assignedToId: userId,
      assignedDeviceId: deviceId,
      assignedAt: new Date(),
    },
  });

  await markTaskAssigned(taskId, deviceId);

  return task;
};

const distributeTask = async (taskId, priority = 0) => {
  await enqueueTask(taskId, priority);
};

module.exports = { findEligibleDevice, getNextTaskForDevice, distributeTask };
