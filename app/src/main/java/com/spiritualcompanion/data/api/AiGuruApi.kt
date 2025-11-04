package com.spiritualcompanion.data.api

import com.spiritualcompanion.data.models.ChatRequest
import com.spiritualcompanion.data.models.ChatResponse
import retrofit2.http.Body
import retrofit2.http.POST

interface AiGuruApi {

    @POST("chat")
    suspend fun sendMessage(
        @Body request: ChatRequest
    ): ChatResponse

    @POST("detect-risk")
    suspend fun detectRisk(
        @Body request: ChatRequest
    ): ChatResponse
}
