package com.spiritualcompanion.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material3.*
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.spiritualcompanion.data.models.Guru
import com.spiritualcompanion.ui.ChatViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun GuruSelectionScreen(
    onGuruSelected: () -> Unit,
    onBack: () -> Unit,
    viewModel: ChatViewModel = hiltViewModel()
) {
    val gurus = Guru.entries.toTypedArray()

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Text(
                        "Choose Your Spiritual Guide",
                        style = MaterialTheme.typography.headlineMedium
                    )
                },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(
                            imageVector = Icons.Default.ArrowBack,
                            contentDescription = "Back",
                            modifier = Modifier.size(32.dp)
                        )
                    }
                }
            )
        }
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
        ) {
            Text(
                text = "Select a deity to begin your spiritual conversation",
                style = MaterialTheme.typography.bodyLarge,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(16.dp)
            )

            Spacer(modifier = Modifier.height(16.dp))

            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                horizontalArrangement = Arrangement.spacedBy(16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                modifier = Modifier.fillMaxSize()
            ) {
                items(gurus) { guru ->
                    GuruCard(
                        guru = guru,
                        onClick = {
                            viewModel.selectGuru(guru)
                            onGuruSelected()
                        }
                    )
                }
            }
        }
    }
}

@Composable
fun GuruCard(
    guru: Guru,
    onClick: () -> Unit
) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(0.9f),
        shape = RoundedCornerShape(16.dp),
        colors = CardDefaults.cardColors(
            containerColor = guru.color.copy(alpha = 0.2f)
        ),
        onClick = onClick
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.Center
        ) {
            // In a real app, you'd have actual images/icons for each deity
            Text(
                text = guru.displayName.first().toString(),
                style = MaterialTheme.typography.displayLarge,
                color = guru.color
            )

            Spacer(modifier = Modifier.height(8.dp))

            Text(
                text = guru.displayName,
                style = MaterialTheme.typography.titleLarge,
                textAlign = TextAlign.Center,
                color = guru.color
            )

            Spacer(modifier = Modifier.height(4.dp))

            Text(
                text = guru.description,
                style = MaterialTheme.typography.bodyMedium,
                textAlign = TextAlign.Center,
                color = MaterialTheme.colorScheme.onSurface
            )
        }
    }
}
