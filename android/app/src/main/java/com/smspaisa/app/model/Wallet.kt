package com.smspaisa.app.model

import com.google.gson.annotations.SerializedName

data class Wallet(
    @SerializedName("balance") val balance: Double,
    @SerializedName("totalEarned") val totalEarned: Double,
    @SerializedName("pendingBalance") val pendingBalance: Double
)
