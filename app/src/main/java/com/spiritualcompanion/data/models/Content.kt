package com.spiritualcompanion.data.models

import com.google.gson.annotations.SerializedName

data class Bhajan(
    @SerializedName("id")
    val id: String,

    @SerializedName("title")
    val title: String,

    @SerializedName("guru")
    val guru: String,

    @SerializedName("url")
    val url: String,

    @SerializedName("duration")
    val duration: String? = null,

    @SerializedName("thumbnail")
    val thumbnail: String? = null,

    @SerializedName("language")
    val language: String = "Hindi"
)

data class Story(
    @SerializedName("id")
    val id: String,

    @SerializedName("title")
    val title: String,

    @SerializedName("guru")
    val guru: String,

    @SerializedName("text")
    val text: String? = null,

    @SerializedName("video_url")
    val videoUrl: String? = null,

    @SerializedName("thumbnail")
    val thumbnail: String? = null,

    @SerializedName("language")
    val language: String = "Hindi"
)

data class ContentResponse<T>(
    @SerializedName("data")
    val data: List<T>,

    @SerializedName("status")
    val status: String,

    @SerializedName("message")
    val message: String? = null
)
