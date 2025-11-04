package com.spiritualcompanion.data.repository

import com.spiritualcompanion.data.api.ContentApi
import com.spiritualcompanion.data.models.Bhajan
import com.spiritualcompanion.data.models.Story
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class ContentRepository @Inject constructor(
    private val contentApi: ContentApi
) {

    suspend fun getBhajans(guru: String? = null, language: String? = null): Result<List<Bhajan>> =
        withContext(Dispatchers.IO) {
            try {
                val response = contentApi.getBhajans(guru, language)
                if (response.status == "success") {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "Unknown error"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }

    suspend fun getStories(guru: String? = null, language: String? = null): Result<List<Story>> =
        withContext(Dispatchers.IO) {
            try {
                val response = contentApi.getStories(guru, language)
                if (response.status == "success") {
                    Result.success(response.data)
                } else {
                    Result.failure(Exception(response.message ?: "Unknown error"))
                }
            } catch (e: Exception) {
                Result.failure(e)
            }
        }
}
