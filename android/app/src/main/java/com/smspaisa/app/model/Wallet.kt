package com.smspaisa.app.model

import com.google.gson.annotations.SerializedName

data class Wallet(
    @SerializedName("balance") val balance: Double,
    @SerializedName("totalEarned") val totalEarned: Double,
    @SerializedName("totalWithdrawn") val totalWithdrawn: Double
)
