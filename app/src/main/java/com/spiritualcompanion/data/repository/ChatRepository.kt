package com.spiritualcompanion.data.repository

import com.spiritualcompanion.data.api.AiGuruApi
import com.spiritualcompanion.data.models.ChatRequest
import com.spiritualcompanion.data.models.ChatResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ChatRepository @Inject constructor(
    private val aiGuruApi: AiGuruApi
) {

    suspend fun sendMessage(
        query: String,
        guru: String,
        language: String = "en",
        userId: String? = null
    ): Result<ChatResponse> = withContext(Dispatchers.IO) {
        try {
            val request = ChatRequest(
                query = query,
                guru = guru,
                language = language,
                userId = userId
            )

            // First, check if the question is risky
            val riskCheck = try {
                aiGuruApi.detectRisk(request)
            } catch (e: Exception) {
                // If risk detection fails, proceed with caution
                null
            }

            // If high risk detected, return early with warning
            if (riskCheck?.requiresHumanReview == true) {
                return@withContext Result.success(riskCheck)
            }

            // Proceed with normal chat
            val response = aiGuruApi.sendMessage(request)
            Result.success(response)

        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
