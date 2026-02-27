const Joi = require('joi');
const { errorResponse } = require('../utils/helpers');

const validate = (schema, source = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[source], { abortEarly: false });
    if (error) {
      const messages = error.details.map((d) => d.message).join(', ');
      return errorResponse(res, messages, 'VALIDATION_ERROR', 422);
    }
    req[source] = value;
    next();
  };
};

const schemas = {
  sendOtp: Joi.object({
    phone: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/).required(),
  }),

  verifyOtp: Joi.object({
    idToken: Joi.string().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{9,14}$/).required(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(100).optional(),
    email: Joi.string().email().optional(),
  }),

  reportStatus: Joi.object({
    taskId: Joi.string().uuid().required(),
    status: Joi.string().valid('DELIVERED', 'FAILED').required(),
    deviceId: Joi.string().required(),
  }),

  requestWithdrawal: Joi.object({
    amount: Joi.number().positive().required(),
    paymentMethod: Joi.string().valid('UPI', 'BANK').required(),
    paymentDetails: Joi.object().required(),
  }),

  registerDevice: Joi.object({
    deviceName: Joi.string().required(),
    deviceId: Joi.string().required(),
    simInfo: Joi.object().optional(),
  }),

  updateDevice: Joi.object({
    deviceId: Joi.string().required(),
    dailyLimit: Joi.number().integer().min(1).max(1000).optional(),
    activeHoursStart: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    activeHoursEnd: Joi.string().pattern(/^\d{2}:\d{2}$/).optional(),
    simInfo: Joi.object().optional(),
  }),

  heartbeat: Joi.object({
    deviceId: Joi.string().required(),
    isOnline: Joi.boolean().optional(),
    batteryLevel: Joi.number().min(0).max(100).optional(),
  }),

  applyReferral: Joi.object({
    referralCode: Joi.string().required(),
  }),

  createTask: Joi.object({
    recipient: Joi.string().required(),
    message: Joi.string().required(),
    clientId: Joi.string().required(),
    priority: Joi.number().integer().min(0).default(0),
  }),

  bulkCreateTask: Joi.object({
    tasks: Joi.array().items(
      Joi.object({
        recipient: Joi.string().required(),
        message: Joi.string().required(),
        clientId: Joi.string().required(),
        priority: Joi.number().integer().min(0).default(0),
      })
    ).min(1).required(),
  }),
};

module.exports = { validate, schemas };
