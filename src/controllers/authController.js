const jwt = require('jsonwebtoken');
const prisma = require('../config/database');
const { verifyFirebaseToken } = require('../services/firebaseAuth');
const { generateReferralCode, successResponse, errorResponse } = require('../utils/helpers');

const sendOtp = async (req, res) => {
  try {
    const { phone } = req.body;
    // Firebase OTP is initiated client-side; server just acknowledges
    return successResponse(res, {
      message: 'Please verify OTP using Firebase on the client side',
      phone,
    });
  } catch (err) {
    console.error('sendOtp error:', err);
    return errorResponse(res, 'Failed to process OTP request', 'OTP_ERROR', 500);
  }
};

const verifyOtp = async (req, res) => {
  try {
    const { idToken, phone } = req.body;
    const decodedToken = await verifyFirebaseToken(idToken);

    if (decodedToken.phone_number !== phone) {
      return errorResponse(res, 'Phone number mismatch', 'AUTH_ERROR', 401);
    }

    let user = await prisma.user.findUnique({ where: { phone } });

    if (!user) {
      const referralCode = generateReferralCode();
      user = await prisma.user.create({
        data: {
          phone,
          referralCode,
          wallet: { create: {} },
        },
        include: { wallet: true },
      });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });

    return successResponse(res, { token, user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (err) {
    console.error('verifyOtp error:', err);
    return errorResponse(res, 'OTP verification failed', 'AUTH_ERROR', 401);
  }
};

const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { wallet: true },
    });
    return successResponse(res, { user });
  } catch (err) {
    console.error('getMe error:', err);
    return errorResponse(res, 'Failed to fetch user', 'SERVER_ERROR', 500);
  }
};

const updateProfile = async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { name, email },
    });
    return successResponse(res, { user });
  } catch (err) {
    console.error('updateProfile error:', err);
    return errorResponse(res, 'Failed to update profile', 'SERVER_ERROR', 500);
  }
};

module.exports = { sendOtp, verifyOtp, getMe, updateProfile };
