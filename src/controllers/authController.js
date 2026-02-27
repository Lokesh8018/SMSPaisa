const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');
const { generateReferralCode, successResponse, errorResponse } = require('../utils/helpers');

const register = async (req, res) => {
  try {
    const { phone, email, password, deviceId } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { phone } });
    if (existingUser) {
      return errorResponse(res, 'Phone number already registered', 'CONFLICT', 409);
    }

    const existingDevice = await prisma.device.findUnique({ where: { deviceId } });
    if (existingDevice) {
      return errorResponse(res, 'Device already registered', 'CONFLICT', 409);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const referralCode = generateReferralCode();

    const user = await prisma.user.create({
      data: {
        phone,
        email,
        password: hashedPassword,
        referralCode,
        wallet: { create: {} },
        devices: {
          create: {
            deviceId,
            deviceName: 'Android Device',
          },
        },
      },
    });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });

    return successResponse(res, { token, user: { id: user.id, phone: user.phone, role: user.role } }, 201);
  } catch (err) {
    console.error('register error:', err);
    return errorResponse(res, 'Registration failed', 'SERVER_ERROR', 500);
  }
};

const login = async (req, res) => {
  try {
    const { phone, password } = req.body;

    const user = await prisma.user.findUnique({ where: { phone } });
    if (!user || !user.password) {
      return errorResponse(res, 'Invalid phone or password', 'AUTH_ERROR', 401);
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid phone or password', 'AUTH_ERROR', 401);
    }

    if (!user.isActive) {
      return errorResponse(res, 'Account is inactive', 'AUTH_ERROR', 401);
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    });

    return successResponse(res, { token, user: { id: user.id, phone: user.phone, role: user.role } });
  } catch (err) {
    console.error('login error:', err);
    return errorResponse(res, 'Login failed', 'SERVER_ERROR', 500);
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

module.exports = { register, login, getMe, updateProfile };
