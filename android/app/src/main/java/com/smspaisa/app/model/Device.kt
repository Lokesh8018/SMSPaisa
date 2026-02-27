package com.smspaisa.app.model

import com.google.gson.annotations.SerializedName

data class Device(
    @SerializedName("deviceId") val deviceId: String,
    @SerializedName("deviceName") val deviceName: String,
    @SerializedName("simCount") val simCount: Int,
    @SerializedName("dailyLimit") val dailyLimit: Int,
    @SerializedName("activeHours") val activeHours: ActiveHours,
    @SerializedName("preferredSim") val preferredSim: Int,
    @SerializedName("stopBatteryPercent") val stopBatteryPercent: Int,
    @SerializedName("wifiOnly") val wifiOnly: Boolean,
    @SerializedName("isActive") val isActive: Boolean
)

data class ActiveHours(
    @SerializedName("start") val start: String,
    @SerializedName("end") val end: String
)
