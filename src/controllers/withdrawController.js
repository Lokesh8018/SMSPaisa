const prisma = require('../config/database');
const { createPayout } = require('../services/payoutService');
const constants = require('../utils/constants');
const { successResponse, errorResponse, paginate, paginationMeta } = require('../utils/helpers');

const requestWithdrawal = async (req, res) => {
  try {
    const { amount, paymentMethod, paymentDetails } = req.body;

    if (amount < constants.MIN_WITHDRAWAL_AMOUNT) {
      return errorResponse(res, `Minimum withdrawal amount is ₹${constants.MIN_WITHDRAWAL_AMOUNT}`, 'VALIDATION_ERROR', 422);
    }

    const wallet = await prisma.wallet.findUnique({ where: { userId: req.user.id } });
    if (!wallet || parseFloat(wallet.balance) < amount) {
      return errorResponse(res, 'Insufficient balance', 'INSUFFICIENT_BALANCE', 400);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyWithdrawals = await prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId: req.user.id,
        type: 'WITHDRAWAL',
        status: { in: ['PENDING', 'COMPLETED'] },
        createdAt: { gte: today },
      },
    });

    const dailyTotal = parseFloat(dailyWithdrawals._sum.amount || 0);
    if (dailyTotal + amount > constants.MAX_WITHDRAWAL_PER_DAY) {
      return errorResponse(res, `Daily withdrawal limit of ₹${constants.MAX_WITHDRAWAL_PER_DAY} exceeded`, 'LIMIT_EXCEEDED', 400);
    }

    const transaction = await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { userId: req.user.id },
        data: {
          balance: { decrement: amount },
          totalWithdrawn: { increment: amount },
        },
      });

      return tx.transaction.create({
        data: {
          userId: req.user.id,
          type: 'WITHDRAWAL',
          amount,
          status: 'PENDING',
          paymentMethod,
          paymentDetails,
          description: `Withdrawal via ${paymentMethod}`,
        },
      });
    });

    try {
      const payout = await createPayout({ amount, paymentMethod, paymentDetails, transactionId: transaction.id });
      await prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'COMPLETED', razorpayPayoutId: payout.id },
      });
      return successResponse(res, { ...transaction, status: 'COMPLETED', razorpayPayoutId: payout.id });
    } catch (payoutErr) {
      console.error('Payout error:', payoutErr);
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { userId: req.user.id },
          data: {
            balance: { increment: amount },
            totalWithdrawn: { decrement: amount },
          },
        });
        await tx.transaction.update({
          where: { id: transaction.id },
          data: { status: 'FAILED' },
        });
      });
      return errorResponse(res, 'Payout processing failed', 'PAYOUT_ERROR', 500);
    }
  } catch (err) {
    console.error('requestWithdrawal error:', err);
    return errorResponse(res, 'Failed to process withdrawal', 'SERVER_ERROR', 500);
  }
};

const getWithdrawalHistory = async (req, res) => {
  try {
    const { page, limit, skip, take } = paginate(req.query.page, req.query.limit);

    const [transactions, total] = await Promise.all([
      prisma.transaction.findMany({
        where: { userId: req.user.id, type: 'WITHDRAWAL' },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.transaction.count({ where: { userId: req.user.id, type: 'WITHDRAWAL' } }),
    ]);

    return successResponse(res, transactions);
  } catch (err) {
    console.error('getWithdrawalHistory error:', err);
    return errorResponse(res, 'Failed to get withdrawal history', 'SERVER_ERROR', 500);
  }
};

const addUpi = async (req, res) => {
  try {
    const { upi_id, upiId } = req.body;
    const id = upi_id || upiId;
    if (!id) return errorResponse(res, 'upi_id is required', 'VALIDATION_ERROR', 422);

    // UPI ID is validated and acknowledged; pass it in paymentDetails when requesting a withdrawal
    return successResponse(res, { message: 'UPI ID validated. Use it in withdrawal requests.', upi_id: id });
  } catch (err) {
    console.error('addUpi error:', err);
    return errorResponse(res, 'Failed to save UPI ID', 'SERVER_ERROR', 500);
  }
};

const addBank = async (req, res) => {
  try {
    const account_number = req.body.account_number || req.body.accountNumber;
    const ifsc_code = req.body.ifsc_code || req.body.ifsc;
    const bank_name = req.body.bank_name || req.body.bankName;
    const account_holder_name = req.body.account_holder_name || req.body.accountHolderName;
    if (!account_number || !ifsc_code || !bank_name) {
      return errorResponse(res, 'account_number, ifsc_code, and bank_name are required', 'VALIDATION_ERROR', 422);
    }

    // Bank details are validated and acknowledged; pass them in paymentDetails when requesting a withdrawal
    return successResponse(res, { message: 'Bank details validated. Use them in withdrawal requests.', account_number, ifsc_code, bank_name });
  } catch (err) {
    console.error('addBank error:', err);
    return errorResponse(res, 'Failed to save bank details', 'SERVER_ERROR', 500);
  }
};

module.exports = { requestWithdrawal, getWithdrawalHistory, addUpi, addBank };
