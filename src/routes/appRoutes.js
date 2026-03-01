const express = require('express');
const router = express.Router();
const { getAppVersion } = require('../controllers/appController');

// Public route — no auth
router.get('/version', getAppVersion);

module.exports = router;
