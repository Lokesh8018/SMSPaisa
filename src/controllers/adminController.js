const prisma = require('../config/database');
const { distributeTask } = require('../services/taskDistributor');
const { successResponse, errorResponse, paginate, paginationMeta } = require('../utils/helpers');

const listUsers = async (req, res) => {
  try {
    const { page, limit, skip, take } = paginate(req.query.page, req.query.limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        skip,
        take,
        include: { wallet: true },
      }),
      prisma.user.count(),
    ]);

    return successResponse(res, { users, pagination: paginationMeta(total, page, limit) });
  } catch (err) {
    console.error('listUsers error:', err);
    return errorResponse(res, 'Failed to list users', 'SERVER_ERROR', 500);
  }
};

const getUserById = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: { wallet: true, devices: true },
    });
    if (!user) return errorResponse(res, 'User not found', 'NOT_FOUND', 404);
    return successResponse(res, { user });
  } catch (err) {
    console.error('getUserById error:', err);
    return errorResponse(res, 'Failed to get user', 'SERVER_ERROR', 500);
  }
};

const getPlatformStats = async (req, res) => {
  try {
    const [totalUsers, totalSmsDelivered, totalEarnings, onlineDevices, pendingWithdrawals] = await Promise.all([
      prisma.user.count(),
      prisma.smsLog.count({ where: { status: 'DELIVERED' } }),
      prisma.smsLog.aggregate({ _sum: { amountEarned: true } }),
      prisma.device.count({ where: { isOnline: true } }),
      prisma.transaction.count({ where: { type: 'WITHDRAWAL', status: 'PENDING' } }),
    ]);

    return successResponse(res, {
      totalUsers,
      totalSmsDelivered,
      totalEarnings: totalEarnings._sum.amountEarned || 0,
      onlineDevices,
      pendingWithdrawals,
    });
  } catch (err) {
    console.error('getPlatformStats error:', err);
    return errorResponse(res, 'Failed to get platform stats', 'SERVER_ERROR', 500);
  }
};

const getOnlineDevices = async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      where: { isOnline: true },
      include: { user: { select: { id: true, phone: true } } },
    });
    return successResponse(res, { devices, count: devices.length });
  } catch (err) {
    console.error('getOnlineDevices error:', err);
    return errorResponse(res, 'Failed to get online devices', 'SERVER_ERROR', 500);
  }
};

const createSmsTask = async (req, res) => {
  try {
    const { recipient, message, clientId, priority = 0 } = req.body;

    const task = await prisma.smsTask.create({
      data: { recipient, message, clientId, priority },
    });

    await distributeTask(task.id, priority);

    return successResponse(res, { task }, 201);
  } catch (err) {
    console.error('createSmsTask error:', err);
    return errorResponse(res, 'Failed to create SMS task', 'SERVER_ERROR', 500);
  }
};

const bulkCreateSmsTasks = async (req, res) => {
  try {
    const { tasks } = req.body;

    const created = await prisma.$transaction(
      tasks.map((t) =>
        prisma.smsTask.create({
          data: { recipient: t.recipient, message: t.message, clientId: t.clientId, priority: t.priority || 0 },
        })
      )
    );

    for (const task of created) {
      await distributeTask(task.id, task.priority);
    }

    return successResponse(res, { tasks: created, count: created.length }, 201);
  } catch (err) {
    console.error('bulkCreateSmsTasks error:', err);
    return errorResponse(res, 'Failed to bulk create SMS tasks', 'SERVER_ERROR', 500);
  }
};

const listWithdrawals = async (req, res) => {
  try {
    const { page, limit, skip, take } = paginate(req.query.page, req.query.limit);
    const { status } = req.query;

    const where = { type: 'WITHDRAWAL' };
    if (status) where.status = status;

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where,
        include: { user: { select: { id: true, phone: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.transaction.count({ where }),
    ]);

    return successResponse(res, { transactions, pagination: paginationMeta(total, page, limit) });
  } catch (err) {
    console.error('listWithdrawals error:', err);
    return errorResponse(res, 'Failed to list withdrawals', 'SERVER_ERROR', 500);
  }
};

const approveWithdrawal = async (req, res) => {
  try {
    const transaction = await prisma.transaction.findUnique({ where: { id: req.params.id } });
    if (!transaction) return errorResponse(res, 'Transaction not found', 'NOT_FOUND', 404);
    if (transaction.status !== 'PENDING') {
      return errorResponse(res, 'Transaction is not pending', 'VALIDATION_ERROR', 422);
    }

    const updated = await prisma.transaction.update({
      where: { id: req.params.id },
      data: { status: 'COMPLETED' },
    });

    return successResponse(res, { transaction: updated });
  } catch (err) {
    console.error('approveWithdrawal error:', err);
    return errorResponse(res, 'Failed to approve withdrawal', 'SERVER_ERROR', 500);
  }
};

module.exports = { listUsers, getUserById, getPlatformStats, getOnlineDevices, createSmsTask, bulkCreateSmsTasks, listWithdrawals, approveWithdrawal };
