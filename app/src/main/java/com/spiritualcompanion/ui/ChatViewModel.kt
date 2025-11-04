package com.spiritualcompanion.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.spiritualcompanion.data.models.ChatMessage
import com.spiritualcompanion.data.models.Guru
import com.spiritualcompanion.data.repository.ChatRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ChatViewModel @Inject constructor(
    private val chatRepository: ChatRepository
) : ViewModel() {

    private val _messages = MutableStateFlow<List<ChatMessage>>(emptyList())
    val messages: StateFlow<List<ChatMessage>> = _messages.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _showRiskWarning = MutableStateFlow(false)
    val showRiskWarning: StateFlow<Boolean> = _showRiskWarning.asStateFlow()

    private val _currentRiskyMessage = MutableStateFlow<String?>(null)

    private val _selectedGuru = MutableStateFlow<Guru?>(null)
    val selectedGuru: StateFlow<Guru?> = _selectedGuru.asStateFlow()

    fun selectGuru(guru: Guru) {
        _selectedGuru.value = guru
        // Add welcome message
        addMessage(
            ChatMessage(
                text = "Namaste! I am ${guru.displayName}. How may I guide you on your spiritual path today?",
                isUser = false
            )
        )
    }

    fun sendMessage(text: String, language: String = "en") {
        if (text.isBlank() || _selectedGuru.value == null) return

        // Add user message
        addMessage(ChatMessage(text = text, isUser = true))

        viewModelScope.launch {
            _isLoading.value = true

            chatRepository.sendMessage(
                query = text,
                guru = _selectedGuru.value!!.name,
                language = language
            ).fold(
                onSuccess = { response ->
                    if (response.requiresHumanReview) {
                        // Show risk warning
                        _currentRiskyMessage.value = text
                        _showRiskWarning.value = true
                        // Remove the loading state
                        _isLoading.value = false
                    } else if (response.isOutOfDomain) {
                        // Handle out of domain
                        addMessage(
                            ChatMessage(
                                text = "I appreciate your question, but this seems to be outside my spiritual knowledge. " +
                                        "I'm here to provide guidance based on sacred scriptures and spiritual teachings. " +
                                        "For this matter, I recommend consulting with appropriate experts or professionals.",
                                isUser = false
                            )
                        )
                        _isLoading.value = false
                    } else {
                        // Normal response
                        addMessage(
                            ChatMessage(
                                text = response.response,
                                isUser = false,
                                confidence = response.confidenceScore
                            )
                        )
                        _isLoading.value = false
                    }
                },
                onFailure = { error ->
                    addMessage(
                        ChatMessage(
                            text = "I apologize, but I'm having trouble connecting right now. Please try again in a moment.",
                            isUser = false
                        )
                    )
                    _isLoading.value = false
                }
            )
        }
    }

    fun continueWithRiskyQuestion() {
        _showRiskWarning.value = false
        val message = _currentRiskyMessage.value ?: return

        // Add a disclaimer message
        addMessage(
            ChatMessage(
                text = "I understand. Please remember that while I can offer spiritual perspective, " +
                        "for serious life decisions, it's important to also consult with family, friends, " +
                        "or qualified professionals.",
                isUser = false
            )
        )

        // Continue with the question (simplified version without risk check)
        viewModelScope.launch {
            _isLoading.value = true
            // You would call a separate endpoint or flag to bypass risk check
            // For now, we'll just provide a gentle response
            addMessage(
                ChatMessage(
                    text = "Based on spiritual wisdom, I suggest focusing on inner peace and dharma. " +
                            "May divine grace guide you to the right path.",
                    isUser = false
                )
            )
            _isLoading.value = false
        }

        _currentRiskyMessage.value = null
    }

    fun dismissRiskWarning() {
        _showRiskWarning.value = false
        _currentRiskyMessage.value = null
        // Remove the user's message from the chat
        _messages.value = _messages.value.dropLast(1)
    }

    private fun addMessage(message: ChatMessage) {
        _messages.value = _messages.value + message
    }

    fun clearMessages() {
        _messages.value = emptyList()
    }
}
