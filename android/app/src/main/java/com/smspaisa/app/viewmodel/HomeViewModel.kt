package com.smspaisa.app.viewmodel

import android.content.Context
import android.content.Intent
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smspaisa.app.data.api.WebSocketManager
import com.smspaisa.app.data.datastore.UserPreferences
import com.smspaisa.app.data.repository.SmsRepository
import com.smspaisa.app.data.repository.WalletRepository
import com.smspaisa.app.model.SmsLog
import com.smspaisa.app.model.TodayStats
import com.smspaisa.app.model.Wallet
import com.smspaisa.app.service.SmsSenderService
import dagger.hilt.android.lifecycle.HiltViewModel
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class HomeUiState {
    object Loading : HomeUiState()
    data class Success(
        val wallet: Wallet,
        val todayStats: TodayStats,
        val recentLogs: List<SmsLog>,
        val serviceEnabled: Boolean,
        val userName: String
    ) : HomeUiState()
    data class Error(val message: String) : HomeUiState()
}

@HiltViewModel
class HomeViewModel @Inject constructor(
    private val walletRepository: WalletRepository,
    private val smsRepository: SmsRepository,
    private val userPreferences: UserPreferences,
    private val webSocketManager: WebSocketManager,
    @ApplicationContext private val context: Context
) : ViewModel() {

    private val _uiState = MutableStateFlow<HomeUiState>(HomeUiState.Loading)
    val uiState: StateFlow<HomeUiState> = _uiState.asStateFlow()

    private val _serviceEnabled = MutableStateFlow(false)
    val serviceEnabled: StateFlow<Boolean> = _serviceEnabled.asStateFlow()

    init {
        loadData()
        observeServiceState()
        observeWebSocket()
    }

    private fun observeWebSocket() {
        viewModelScope.launch {
            webSocketManager.balanceUpdated.collect { balance ->
                balance ?: return@collect
                refreshBalance()
            }
        }
    }

    private fun observeServiceState() {
        viewModelScope.launch {
            userPreferences.serviceEnabled.collect { enabled ->
                _serviceEnabled.value = enabled
            }
        }
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.value = HomeUiState.Loading
            try {
                val walletResult = walletRepository.getBalance()
                val statsResult = smsRepository.getTodayStats()
                val logsResult = smsRepository.getSmsLog(1, 10)
                val name = userPreferences.userName.first()
                val serviceOn = userPreferences.serviceEnabled.first()

                val wallet = walletResult.getOrElse { Wallet(0.0, 0.0, 0.0) }
                val stats = statsResult.getOrElse { TodayStats(0, 0, 0, 0.0, 200) }
                val logs = logsResult.getOrElse { emptyList() }

                _uiState.value = HomeUiState.Success(
                    wallet = wallet,
                    todayStats = stats,
                    recentLogs = logs,
                    serviceEnabled = serviceOn,
                    userName = name ?: "User"
                )
            } catch (e: Exception) {
                _uiState.value = HomeUiState.Error(e.message ?: "Failed to load data")
            }
        }
    }

    fun toggleService(enable: Boolean) {
        viewModelScope.launch {
            userPreferences.setServiceEnabled(enable)
            if (enable) {
                val intent = Intent(context, SmsSenderService::class.java)
                context.startForegroundService(intent)
            } else {
                val intent = Intent(context, SmsSenderService::class.java)
                context.stopService(intent)
            }
        }
    }

    fun refreshBalance() {
        viewModelScope.launch {
            val result = walletRepository.getBalance()
            val current = _uiState.value
            if (result.isSuccess && current is HomeUiState.Success) {
                _uiState.value = current.copy(wallet = result.getOrThrow())
            }
        }
    }
}
