package com.smspaisa.app.model

data class ApiResponse<T>(
    val success: Boolean,
    val data: T?,
    val error: ApiError?
)

data class ApiError(
    val message: String,
    val code: String?
)
