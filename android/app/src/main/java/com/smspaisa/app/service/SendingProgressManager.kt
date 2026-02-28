package com.smspaisa.app.service

import com.smspaisa.app.model.SendingProgress
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class SendingProgressManager @Inject constructor() {
    private val _progress = MutableStateFlow(SendingProgress())
    val progress: StateFlow<SendingProgress> = _progress.asStateFlow()

    fun updateProgress(progress: SendingProgress) {
        _progress.value = progress
    }

    fun reset() {
        _progress.value = SendingProgress()
    }

    companion object {
        fun maskPhone(phone: String): String {
            if (phone.length <= 4) return "****"
            return phone.take(2) + "*".repeat(phone.length - 4) + phone.takeLast(2)
        }

        fun maskMessage(message: String): String {
            if (message.length <= 3) return "***"
            return message.take(3) + "***"
        }
    }
}
