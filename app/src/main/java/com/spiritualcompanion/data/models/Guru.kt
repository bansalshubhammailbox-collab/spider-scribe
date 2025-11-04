package com.spiritualcompanion.data.models

import androidx.compose.ui.graphics.Color

enum class Guru(
    val displayName: String,
    val description: String,
    val color: Color
) {
    KRISHNA(
        displayName = "Lord Krishna",
        description = "Divine teacher of wisdom and love",
        color = Color(0xFF1E3A8A)
    ),
    SHIVA(
        displayName = "Lord Shiva",
        description = "The supreme yogi and transformer",
        color = Color(0xFFEA580C)
    ),
    RAMA(
        displayName = "Lord Rama",
        description = "Embodiment of dharma and righteousness",
        color = Color(0xFF15803D)
    ),
    DURGA(
        displayName = "Goddess Durga",
        description = "Divine mother and protector",
        color = Color(0xFFDC2626)
    ),
    GANESHA(
        displayName = "Lord Ganesha",
        description = "Remover of obstacles",
        color = Color(0xFFCA8A04)
    ),
    HANUMAN(
        displayName = "Lord Hanuman",
        description = "Symbol of devotion and strength",
        color = Color(0xFFFF6B00)
    )
}
