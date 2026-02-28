const express = require('express');
const router = express.Router();
const {
  listUsers, getUserById, getPlatformStats, getOnlineDevices,
  createSmsTask, bulkCreateSmsTasks, assignTaskToUser, listWithdrawals, approveWithdrawal,
  toggleUserActive, changeUserRole, rejectWithdrawal, listSmsTasks,
  listSmsLogs, deleteUser, listTransactions,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authenticate, requireAdmin);

router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id/toggle-active', toggleUserActive);
router.put('/users/:id/role', validate(schemas.changeUserRole), changeUserRole);
router.delete('/users/:id', deleteUser);
router.get('/stats', getPlatformStats);
router.get('/devices', getOnlineDevices);
router.post('/sms/create-task', validate(schemas.createTask), createSmsTask);
router.post('/sms/bulk-create', validate(schemas.bulkCreateTask), bulkCreateSmsTasks);
router.post('/sms/assign-task', validate(schemas.assignTask), assignTaskToUser);
router.get('/sms/tasks', listSmsTasks);
router.get('/sms/logs', listSmsLogs);
router.get('/withdrawals', listWithdrawals);
router.put('/withdrawals/:id/approve', approveWithdrawal);
router.put('/withdrawals/:id/reject', rejectWithdrawal);
router.get('/transactions', listTransactions);

module.exports = router;
