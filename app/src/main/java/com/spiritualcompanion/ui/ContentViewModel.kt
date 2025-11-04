package com.spiritualcompanion.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.spiritualcompanion.data.models.Bhajan
import com.spiritualcompanion.data.models.Story
import com.spiritualcompanion.data.repository.ContentRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class ContentViewModel @Inject constructor(
    private val contentRepository: ContentRepository
) : ViewModel() {

    private val _bhajans = MutableStateFlow<List<Bhajan>>(emptyList())
    val bhajans: StateFlow<List<Bhajan>> = _bhajans.asStateFlow()

    private val _stories = MutableStateFlow<List<Story>>(emptyList())
    val stories: StateFlow<List<Story>> = _stories.asStateFlow()

    private val _isLoading = MutableStateFlow(false)
    val isLoading: StateFlow<Boolean> = _isLoading.asStateFlow()

    private val _error = MutableStateFlow<String?>(null)
    val error: StateFlow<String?> = _error.asStateFlow()

    init {
        loadBhajans()
        loadStories()
    }

    fun loadBhajans(guru: String? = null, language: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            contentRepository.getBhajans(guru, language).fold(
                onSuccess = { bhajans ->
                    _bhajans.value = bhajans
                    _isLoading.value = false
                },
                onFailure = { exception ->
                    _error.value = exception.message ?: "Failed to load bhajans"
                    _isLoading.value = false
                }
            )
        }
    }

    fun loadStories(guru: String? = null, language: String? = null) {
        viewModelScope.launch {
            _isLoading.value = true
            _error.value = null

            contentRepository.getStories(guru, language).fold(
                onSuccess = { stories ->
                    _stories.value = stories
                    _isLoading.value = false
                },
                onFailure = { exception ->
                    _error.value = exception.message ?: "Failed to load stories"
                    _isLoading.value = false
                }
            )
        }
    }

    fun clearError() {
        _error.value = null
    }
}
