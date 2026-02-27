const express = require('express');
const router = express.Router();
const {
  listUsers, getUserById, getPlatformStats, getOnlineDevices,
  createSmsTask, bulkCreateSmsTasks, listWithdrawals, approveWithdrawal,
} = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { validate, schemas } = require('../middleware/validation');

router.use(authenticate, requireAdmin);

router.get('/users', listUsers);
router.get('/users/:id', getUserById);
router.get('/stats', getPlatformStats);
router.get('/devices', getOnlineDevices);
router.post('/sms/create-task', validate(schemas.createTask), createSmsTask);
router.post('/sms/bulk-create', validate(schemas.bulkCreateTask), bulkCreateSmsTasks);
router.get('/withdrawals', listWithdrawals);
router.put('/withdrawals/:id/approve', approveWithdrawal);

module.exports = router;
