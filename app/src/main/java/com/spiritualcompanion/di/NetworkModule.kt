package com.spiritualcompanion.di

import com.spiritualcompanion.data.api.AiGuruApi
import com.spiritualcompanion.data.api.ContentApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Qualifier
import javax.inject.Singleton

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class ContentRetrofit

@Qualifier
@Retention(AnnotationRetention.BINARY)
annotation class AiGuruRetrofit

@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    // TODO: Replace with your actual backend URLs
    private const val CONTENT_BASE_URL = "https://your-content-api.example.com/api/"
    private const val AI_GURU_BASE_URL = "https://your-ai-guru-api.example.com/api/"

    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BODY
        }

        return OkHttpClient.Builder()
            .addInterceptor(loggingInterceptor)
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    @Provides
    @Singleton
    @ContentRetrofit
    fun provideContentRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(CONTENT_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    @AiGuruRetrofit
    fun provideAiGuruRetrofit(okHttpClient: OkHttpClient): Retrofit {
        return Retrofit.Builder()
            .baseUrl(AI_GURU_BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    @Provides
    @Singleton
    fun provideContentApi(@ContentRetrofit retrofit: Retrofit): ContentApi {
        return retrofit.create(ContentApi::class.java)
    }

    @Provides
    @Singleton
    fun provideAiGuruApi(@AiGuruRetrofit retrofit: Retrofit): AiGuruApi {
        return retrofit.create(AiGuruApi::class.java)
    }
}
