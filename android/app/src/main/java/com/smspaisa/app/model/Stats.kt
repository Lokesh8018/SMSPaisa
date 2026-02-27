package com.smspaisa.app.model

import com.google.gson.annotations.SerializedName

data class DailyStats(
    @SerializedName("date") val date: String,
    @SerializedName("sent") val sent: Int,
    @SerializedName("delivered") val delivered: Int,
    @SerializedName("failed") val failed: Int,
    @SerializedName("earnings") val earnings: Double
)

data class WeeklyStats(
    @SerializedName("week") val week: String,
    @SerializedName("totalSent") val totalSent: Int,
    @SerializedName("totalDelivered") val totalDelivered: Int,
    @SerializedName("totalFailed") val totalFailed: Int,
    @SerializedName("totalEarnings") val totalEarnings: Double,
    @SerializedName("days") val days: List<DailyStats>
)

data class MonthlyStats(
    @SerializedName("month") val month: String,
    @SerializedName("totalSent") val totalSent: Int,
    @SerializedName("totalDelivered") val totalDelivered: Int,
    @SerializedName("totalFailed") val totalFailed: Int,
    @SerializedName("totalEarnings") val totalEarnings: Double,
    @SerializedName("weeks") val weeks: List<WeeklyStats>
)

data class OverviewStats(
    @SerializedName("totalSmsSent") val totalSmsSent: Int,
    @SerializedName("totalEarnings") val totalEarnings: Double,
    @SerializedName("successRate") val successRate: Double,
    @SerializedName("totalWithdrawn") val totalWithdrawn: Double,
    @SerializedName("availableBalance") val availableBalance: Double,
    @SerializedName("activeDevices") val activeDevices: Int
)

data class TodayStats(
    @SerializedName("sent") val sent: Int,
    @SerializedName("delivered") val delivered: Int,
    @SerializedName("failed") val failed: Int,
    @SerializedName("earnings") val earnings: Double,
    @SerializedName("remaining") val remaining: Int
)
