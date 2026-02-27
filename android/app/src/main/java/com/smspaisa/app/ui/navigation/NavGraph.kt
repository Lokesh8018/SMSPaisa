package com.smspaisa.app.ui.navigation

import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.smspaisa.app.ui.screens.auth.LoginScreen
import com.smspaisa.app.ui.screens.auth.OtpScreen
import com.smspaisa.app.ui.screens.home.HomeScreen
import com.smspaisa.app.ui.screens.onboarding.OnboardingScreen
import com.smspaisa.app.ui.screens.profile.ProfileScreen
import com.smspaisa.app.ui.screens.referral.ReferralScreen
import com.smspaisa.app.ui.screens.stats.StatsScreen
import com.smspaisa.app.ui.screens.withdraw.WithdrawScreen
import com.smspaisa.app.viewmodel.AuthViewModel

sealed class Screen(val route: String) {
    object Onboarding : Screen("onboarding")
    object Login : Screen("login")
    object Otp : Screen("otp/{phone}") {
        fun createRoute(phone: String) = "otp/$phone"
    }
    object Home : Screen("home")
    object Stats : Screen("stats")
    object Withdraw : Screen("withdraw")
    object Profile : Screen("profile")
    object Referral : Screen("referral")
}

@Composable
fun NavGraph(
    navController: NavHostController = rememberNavController()
) {
    val authViewModel: AuthViewModel = hiltViewModel()
    val startDestination by authViewModel.startDestination.collectAsState()

    NavHost(
        navController = navController,
        startDestination = startDestination
    ) {
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onComplete = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Login.route) {
            LoginScreen(
                onNavigateToOtp = { phone ->
                    navController.navigate(Screen.Otp.createRoute(phone))
                }
            )
        }

        composable(Screen.Otp.route) { backStackEntry ->
            val phone = backStackEntry.arguments?.getString("phone") ?: ""
            OtpScreen(
                phone = phone,
                onNavigateToHome = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateBack = { navController.popBackStack() }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToStats = { navController.navigate(Screen.Stats.route) },
                onNavigateToWithdraw = { navController.navigate(Screen.Withdraw.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) }
            )
        }

        composable(Screen.Stats.route) {
            StatsScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToHome = { navController.navigate(Screen.Home.route) },
                onNavigateToWithdraw = { navController.navigate(Screen.Withdraw.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) }
            )
        }

        composable(Screen.Withdraw.route) {
            WithdrawScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToHome = { navController.navigate(Screen.Home.route) },
                onNavigateToStats = { navController.navigate(Screen.Stats.route) },
                onNavigateToProfile = { navController.navigate(Screen.Profile.route) }
            )
        }

        composable(Screen.Profile.route) {
            ProfileScreen(
                onNavigateBack = { navController.popBackStack() },
                onNavigateToReferral = { navController.navigate(Screen.Referral.route) },
                onLogout = {
                    navController.navigate(Screen.Login.route) {
                        popUpTo(0) { inclusive = true }
                    }
                },
                onNavigateToHome = { navController.navigate(Screen.Home.route) },
                onNavigateToStats = { navController.navigate(Screen.Stats.route) },
                onNavigateToWithdraw = { navController.navigate(Screen.Withdraw.route) }
            )
        }

        composable(Screen.Referral.route) {
            ReferralScreen(
                onNavigateBack = { navController.popBackStack() }
            )
        }
    }
}
