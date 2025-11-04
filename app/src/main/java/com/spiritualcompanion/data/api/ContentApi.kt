package com.spiritualcompanion.data.api

import com.spiritualcompanion.data.models.Bhajan
import com.spiritualcompanion.data.models.ContentResponse
import com.spiritualcompanion.data.models.Story
import retrofit2.http.GET
import retrofit2.http.Query

interface ContentApi {

    @GET("bhajans")
    suspend fun getBhajans(
        @Query("guru") guru: String? = null,
        @Query("language") language: String? = null
    ): ContentResponse<Bhajan>

    @GET("stories")
    suspend fun getStories(
        @Query("guru") guru: String? = null,
        @Query("language") language: String? = null
    ): ContentResponse<Story>
}
