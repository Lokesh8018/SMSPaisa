const prisma = require('../config/database');
const { getNextTaskForDevice } = require('../services/taskDistributor');
const { creditEarning, checkAndPayReferralBonus } = require('../services/earningsService');
const constants = require('../utils/constants');
const { successResponse, errorResponse, paginate, paginationMeta } = require('../utils/helpers');

const getNextTask = async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return errorResponse(res, 'deviceId is required', 'VALIDATION_ERROR', 422);
    }

    const task = await getNextTaskForDevice(req.user.id, deviceId);
    if (!task) {
      return successResponse(res, null);
    }
    return successResponse(res, task);
  } catch (err) {
    console.error('getNextTask error:', err);
    return errorResponse(res, 'Failed to get next task', 'SERVER_ERROR', 500);
  }
};

const reportStatus = async (req, res) => {
  try {
    const { taskId, status, deviceId } = req.body;

    const task = await prisma.smsTask.findFirst({
      where: { id: taskId, assignedToId: req.user.id },
    });

    if (!task) {
      return errorResponse(res, 'Task not found or not assigned to you', 'NOT_FOUND', 404);
    }

    if (task.status === 'DELIVERED' || task.status === 'FAILED') {
      return errorResponse(res, 'Task status already reported', 'CONFLICT', 409);
    }

    const updateData = {
      status,
      sentAt: status === 'SENT' || status === 'DELIVERED' ? new Date() : undefined,
      deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
    };

    await prisma.smsTask.update({ where: { id: taskId }, data: updateData });

    const amountEarned = status === 'DELIVERED' ? constants.SMS_RATE_PER_DELIVERY : 0;

    const log = await prisma.smsLog.create({
      data: {
        userId: req.user.id,
        taskId,
        status,
        amountEarned,
        sentAt: status === 'DELIVERED' ? new Date() : undefined,
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
      },
    });

    if (status === 'DELIVERED') {
      await creditEarning(req.user.id, taskId, amountEarned);
      await prisma.device.updateMany({
        where: { deviceId, userId: req.user.id },
        data: { smsSentToday: { increment: 1 } },
      });
      await checkAndPayReferralBonus(req.user.id);
    }

    return successResponse(res, { log, amountEarned });
  } catch (err) {
    console.error('reportStatus error:', err);
    return errorResponse(res, 'Failed to report status', 'SERVER_ERROR', 500);
  }
};

const getTodayStats = async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const [total, delivered, failed] = await Promise.all([
      prisma.smsLog.count({ where: { userId: req.user.id, createdAt: { gte: startOfDay } } }),
      prisma.smsLog.count({ where: { userId: req.user.id, status: 'DELIVERED', createdAt: { gte: startOfDay } } }),
      prisma.smsLog.count({ where: { userId: req.user.id, status: 'FAILED', createdAt: { gte: startOfDay } } }),
    ]);

    const earningsResult = await prisma.smsLog.aggregate({
      _sum: { amountEarned: true },
      where: { userId: req.user.id, status: 'DELIVERED', createdAt: { gte: startOfDay } },
    });

    return successResponse(res, {
      sent: total,
      delivered,
      failed,
      earnings: parseFloat(earningsResult._sum.amountEarned) || 0,
      remaining: 0,
    });
  } catch (err) {
    console.error('getTodayStats error:', err);
    return errorResponse(res, 'Failed to get today stats', 'SERVER_ERROR', 500);
  }
};

const getSmsLog = async (req, res) => {
  try {
    const { page, limit, skip, take } = paginate(req.query.page, req.query.limit);

    const [logs, total] = await Promise.all([
      prisma.smsLog.findMany({
        where: { userId: req.user.id },
        include: { task: { select: { recipient: true, message: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.smsLog.count({ where: { userId: req.user.id } }),
    ]);

    const flatLogs = logs.map(log => ({
      id: log.id,
      taskId: log.taskId,
      recipient: log.task?.recipient || '',
      message: log.task?.message || '',
      status: log.status,
      amount: parseFloat(log.amountEarned) || 0,
      timestamp: new Date(log.createdAt).getTime(),
    }));

    return successResponse(res, flatLogs);
  } catch (err) {
    console.error('getSmsLog error:', err);
    return errorResponse(res, 'Failed to get SMS log', 'SERVER_ERROR', 500);
  }
};

const getBatchTasks = async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return errorResponse(res, 'deviceId is required', 'VALIDATION_ERROR', 422);
    }

    const device = await prisma.device.findFirst({ where: { deviceId, userId: req.user.id } });
    if (!device) {
      return errorResponse(res, 'Device not found or not owned by you', 'NOT_FOUND', 404);
    }

    const settings = await prisma.platformSettings.findFirst({ where: { id: 'default' } });
    const roundLimit = settings?.perRoundSendLimit || 25;

    const tasks = await prisma.$transaction(async (tx) => {
      const queued = await tx.smsTask.findMany({
        where: { status: 'QUEUED' },
        orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
        take: roundLimit,
      });

      if (queued.length === 0) return [];

      await tx.smsTask.updateMany({
        where: { id: { in: queued.map((t) => t.id) } },
        data: {
          status: 'ASSIGNED',
          assignedToId: req.user.id,
          assignedDeviceId: device.id,
          assignedAt: new Date(),
        },
      });

      return queued;
    });

    return successResponse(res, { tasks, roundLimit });
  } catch (err) {
    console.error('getBatchTasks error:', err);
    return errorResponse(res, 'Failed to get batch tasks', 'SERVER_ERROR', 500);
  }
};

module.exports = { getNextTask, reportStatus, getTodayStats, getSmsLog, getBatchTasks };