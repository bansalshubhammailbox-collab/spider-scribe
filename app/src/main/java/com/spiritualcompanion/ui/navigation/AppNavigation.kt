package com.spiritualcompanion.ui.navigation

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.spiritualcompanion.ui.screens.OnboardingScreen
import com.spiritualcompanion.ui.screens.HomeScreen
import com.spiritualcompanion.ui.screens.GuruSelectionScreen
import com.spiritualcompanion.ui.screens.ChatScreen
import com.spiritualcompanion.ui.screens.BhajansScreen
import com.spiritualcompanion.ui.screens.StoriesScreen

sealed class Screen(val route: String) {
    object Onboarding : Screen("onboarding")
    object Home : Screen("home")
    object GuruSelection : Screen("guru_selection")
    object Chat : Screen("chat")
    object Bhajans : Screen("bhajans")
    object Stories : Screen("stories")
}

@Composable
fun AppNavigation() {
    val navController = rememberNavController()

    NavHost(
        navController = navController,
        startDestination = Screen.Onboarding.route
    ) {
        composable(Screen.Onboarding.route) {
            OnboardingScreen(
                onContinue = {
                    navController.navigate(Screen.Home.route) {
                        popUpTo(Screen.Onboarding.route) { inclusive = true }
                    }
                }
            )
        }

        composable(Screen.Home.route) {
            HomeScreen(
                onNavigateToChat = {
                    navController.navigate(Screen.GuruSelection.route)
                },
                onNavigateToBhajans = {
                    navController.navigate(Screen.Bhajans.route)
                },
                onNavigateToStories = {
                    navController.navigate(Screen.Stories.route)
                }
            )
        }

        composable(Screen.GuruSelection.route) {
            GuruSelectionScreen(
                onGuruSelected = {
                    navController.navigate(Screen.Chat.route)
                },
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Chat.route) {
            ChatScreen(
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Bhajans.route) {
            BhajansScreen(
                onBack = {
                    navController.popBackStack()
                }
            )
        }

        composable(Screen.Stories.route) {
            StoriesScreen(
                onBack = {
                    navController.popBackStack()
                }
            )
        }
    }
}
