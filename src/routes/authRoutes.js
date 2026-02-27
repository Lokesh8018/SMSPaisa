const express = require('express');
const router = express.Router();
const { sendOtp, verifyOtp, getMe, updateProfile } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const { validate, schemas } = require('../middleware/validation');

router.post('/send-otp', authRateLimit, validate(schemas.sendOtp), sendOtp);
router.post('/verify-otp', authRateLimit, validate(schemas.verifyOtp), verifyOtp);
router.get('/me', authenticate, getMe);
router.put('/profile', authenticate, validate(schemas.updateProfile), updateProfile);

module.exports = router;
