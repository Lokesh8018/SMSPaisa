package com.smspaisa.app.data.api

import com.google.gson.annotations.SerializedName
import com.smspaisa.app.model.*
import retrofit2.Response
import retrofit2.http.*

// --- Request bodies ---

data class RegisterRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("email") val email: String?,
    @SerializedName("password") val password: String,
    @SerializedName("deviceId") val deviceId: String
)

data class LoginRequest(
    @SerializedName("phone") val phone: String,
    @SerializedName("password") val password: String
)

data class UpdateProfileRequest(
    @SerializedName("name") val name: String?,
    @SerializedName("email") val email: String?
)

data class ReportStatusRequest(
    @SerializedName("taskId") val taskId: String,
    @SerializedName("status") val status: String,
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("errorMessage") val errorMessage: String? = null
)

data class WithdrawalRequest(
    @SerializedName("amount") val amount: Double,
    @SerializedName("paymentMethod") val paymentMethod: String,
    @SerializedName("paymentDetails") val paymentDetails: Map<String, String>
)

data class AddUpiRequest(
    @SerializedName("upiId") val upiId: String,
    @SerializedName("name") val name: String
)

data class AddBankRequest(
    @SerializedName("accountNumber") val accountNumber: String,
    @SerializedName("ifsc") val ifsc: String,
    @SerializedName("accountHolderName") val accountHolderName: String,
    @SerializedName("bankName") val bankName: String
)

data class RegisterDeviceRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("simInfo") val simInfo: Map<String, Any?>?
)

data class UpdateDeviceSettingsRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("dailyLimit") val dailyLimit: Int?,
    @SerializedName("activeHoursStart") val activeHoursStart: String?,
    @SerializedName("activeHoursEnd") val activeHoursEnd: String?
)

data class HeartbeatRequest(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("batteryLevel") val batteryLevel: Int,
    @SerializedName("isCharging") val isCharging: Boolean,
    @SerializedName("networkType") val networkType: String
)

data class ApplyReferralRequest(
    @SerializedName("referralCode") val referralCode: String
)

// --- Response bodies ---

data class AuthResponse(
    @SerializedName("token") val token: String,
    @SerializedName("user") val user: User
)

data class WithdrawalResponse(
    @SerializedName("id") val id: String,
    @SerializedName("status") val status: String,
    @SerializedName("message") val message: String
)

data class PaymentAccount(
    @SerializedName("id") val id: String,
    @SerializedName("type") val type: String,
    @SerializedName("details") val details: String,
    @SerializedName("isVerified") val isVerified: Boolean
)

data class ReferralStats(
    @SerializedName("referralCode") val referralCode: String,
    @SerializedName("totalReferrals") val totalReferrals: Int,
    @SerializedName("activeReferrals") val activeReferrals: Int,
    @SerializedName("totalEarnings") val totalEarnings: Double,
    @SerializedName("referrals") val referrals: List<ReferralEntry>
)

data class ReferralEntry(
    @SerializedName("id") val id: String,
    @SerializedName("name") val name: String,
    @SerializedName("joinedAt") val joinedAt: String,
    @SerializedName("status") val status: String,
    @SerializedName("earnings") val earnings: Double
)

interface ApiService {

    // --- Auth ---

    @POST("api/auth/register")
    suspend fun register(@Body request: RegisterRequest): Response<ApiResponse<AuthResponse>>

    @POST("api/auth/login")
    suspend fun login(@Body request: LoginRequest): Response<ApiResponse<AuthResponse>>

    @GET("api/auth/me")
    suspend fun getProfile(): Response<ApiResponse<User>>

    @PUT("api/auth/profile")
    suspend fun updateProfile(@Body request: UpdateProfileRequest): Response<ApiResponse<User>>

    // --- SMS Tasks ---

    @GET("api/sms/next-task")
    suspend fun getNextTask(): Response<ApiResponse<SmsTask>>

    @POST("api/sms/report-status")
    suspend fun reportStatus(@Body request: ReportStatusRequest): Response<ApiResponse<Unit>>

    @GET("api/sms/today-stats")
    suspend fun getTodayStats(): Response<ApiResponse<TodayStats>>

    @GET("api/sms/log")
    suspend fun getSmsLog(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<SmsLog>>>

    // --- Wallet ---

    @GET("api/wallet/balance")
    suspend fun getBalance(): Response<ApiResponse<Wallet>>

    @GET("api/wallet/transactions")
    suspend fun getTransactions(
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): Response<ApiResponse<List<Transaction>>>

    // --- Withdraw ---

    @POST("api/wallet/withdraw")
    suspend fun requestWithdrawal(@Body request: WithdrawalRequest): Response<ApiResponse<WithdrawalResponse>>

    @GET("api/wallet/withdraw-history")
    suspend fun getWithdrawHistory(): Response<ApiResponse<List<Transaction>>>

    @POST("api/wallet/add-upi")
    suspend fun addUpi(@Body request: AddUpiRequest): Response<ApiResponse<PaymentAccount>>

    @POST("api/wallet/add-bank")
    suspend fun addBank(@Body request: AddBankRequest): Response<ApiResponse<PaymentAccount>>

    @GET("api/wallet/payment-accounts")
    suspend fun getPaymentAccounts(): Response<ApiResponse<List<PaymentAccount>>>

    // --- Device ---

    @POST("api/device/register")
    suspend fun registerDevice(@Body request: RegisterDeviceRequest): Response<ApiResponse<Device>>

    @PUT("api/device/settings")
    suspend fun updateDeviceSettings(@Body request: UpdateDeviceSettingsRequest): Response<ApiResponse<Device>>

    @POST("api/device/heartbeat")
    suspend fun heartbeat(@Body request: HeartbeatRequest): Response<ApiResponse<Unit>>

    @GET("api/device/list")
    suspend fun getDevices(): Response<ApiResponse<List<Device>>>

    // --- Stats ---

    @GET("api/stats/daily")
    suspend fun getDailyStats(@Query("date") date: String? = null): Response<ApiResponse<DailyStats>>

    @GET("api/stats/weekly")
    suspend fun getWeeklyStats(@Query("week") week: String? = null): Response<ApiResponse<WeeklyStats>>

    @GET("api/stats/monthly")
    suspend fun getMonthlyStats(@Query("month") month: String? = null): Response<ApiResponse<MonthlyStats>>

    @GET("api/stats/overview")
    suspend fun getOverview(): Response<ApiResponse<OverviewStats>>

    // --- Referral ---

    @GET("api/referral/code")
    suspend fun getReferralCode(): Response<ApiResponse<Map<String, String>>>

    @POST("api/referral/apply")
    suspend fun applyReferral(@Body request: ApplyReferralRequest): Response<ApiResponse<Unit>>

    @GET("api/referral/stats")
    suspend fun getReferralStats(): Response<ApiResponse<ReferralStats>>
}
