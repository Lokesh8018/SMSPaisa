package com.smspaisa.app.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.PhoneAuthCredential
import com.google.firebase.auth.PhoneAuthOptions
import com.google.firebase.auth.PhoneAuthProvider
import com.smspaisa.app.data.datastore.UserPreferences
import com.smspaisa.app.data.repository.AuthRepository
import com.smspaisa.app.ui.navigation.Screen
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.launch
import javax.inject.Inject

sealed class AuthUiState {
    object Idle : AuthUiState()
    object Loading : AuthUiState()
    data class OtpSent(val phone: String) : AuthUiState()
    object Success : AuthUiState()
    data class Error(val message: String) : AuthUiState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val authRepository: AuthRepository,
    private val userPreferences: UserPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow<AuthUiState>(AuthUiState.Idle)
    val uiState: StateFlow<AuthUiState> = _uiState.asStateFlow()

    private val _startDestination = MutableStateFlow(Screen.Onboarding.route)
    val startDestination: StateFlow<String> = _startDestination.asStateFlow()

    init {
        determineStartDestination()
    }

    private fun determineStartDestination() {
        viewModelScope.launch {
            val onboardingDone = userPreferences.onboardingCompleted.first()
            val token = userPreferences.authToken.first()
            _startDestination.value = when {
                !onboardingDone -> Screen.Onboarding.route
                token.isNullOrEmpty() -> Screen.Login.route
                else -> Screen.Home.route
            }
        }
    }

    fun sendOtp(phone: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            val result = authRepository.sendOtp(phone)
            _uiState.value = if (result.isSuccess) {
                AuthUiState.OtpSent(phone)
            } else {
                AuthUiState.Error(result.exceptionOrNull()?.message ?: "Failed to send OTP")
            }
        }
    }

    fun verifyOtp(phone: String, otp: String) {
        viewModelScope.launch {
            _uiState.value = AuthUiState.Loading
            // NOTE: In a production app, integrate Firebase Phone Auth to get a real verification token.
            // Pass the Firebase ID token obtained after phone number verification here.
            // For development/testing, the backend may accept a dummy token based on server config.
            val result = authRepository.verifyOtp(phone, otp, "firebase_token_placeholder")
            _uiState.value = if (result.isSuccess) {
                AuthUiState.Success
            } else {
                AuthUiState.Error(result.exceptionOrNull()?.message ?: "OTP verification failed")
            }
        }
    }

    fun resetState() {
        _uiState.value = AuthUiState.Idle
    }
}
