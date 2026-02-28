package com.smspaisa.app.model

data class SendingProgress(
    val status: SendingStatus = SendingStatus.IDLE,
    val totalInRound: Int = 0,
    val sentInRound: Int = 0,
    val currentRecipient: String = "",
    val currentMessagePreview: String = "",
    val roundLimit: Int = 25
)

enum class SendingStatus {
    IDLE, FETCHING, SENDING, WAITING, ROUND_COMPLETE, ERROR
}
