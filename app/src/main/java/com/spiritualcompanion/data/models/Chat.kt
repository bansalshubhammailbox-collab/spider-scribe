package com.spiritualcompanion.data.models

import com.google.gson.annotations.SerializedName

data class ChatMessage(
    val id: String = java.util.UUID.randomUUID().toString(),
    val text: String,
    val isUser: Boolean,
    val timestamp: Long = System.currentTimeMillis(),
    val isRisky: Boolean = false,
    val confidence: Float? = null
)

data class ChatRequest(
    @SerializedName("query")
    val query: String,

    @SerializedName("guru")
    val guru: String,

    @SerializedName("language")
    val language: String = "en",

    @SerializedName("user_id")
    val userId: String? = null
)

data class ChatResponse(
    @SerializedName("response")
    val response: String,

    @SerializedName("is_out_of_domain")
    val isOutOfDomain: Boolean = false,

    @SerializedName("requires_human_review")
    val requiresHumanReview: Boolean = false,

    @SerializedName("confidence_score")
    val confidenceScore: Float? = null,

    @SerializedName("sources")
    val sources: List<String>? = null,

    @SerializedName("warning")
    val warning: String? = null
)

enum class MessageType {
    USER,
    GURU,
    SYSTEM,
    WARNING
}
