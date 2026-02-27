const express = require('express');
const router = express.Router();
const { getBalance, getTransactions } = require('../controllers/walletController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/balance', getBalance);
router.get('/transactions', getTransactions);

module.exports = router;
