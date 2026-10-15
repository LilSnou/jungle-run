package com.lilsnou.junglerun

import android.annotation.SuppressLint
import android.app.Activity
import android.os.Bundle
import android.view.View
import android.webkit.WebView

/**
 * MainActivity — тонкая «обёртка» WebView вокруг веб-версии игры.
 *
 * Вся игровая логика живёт в assets/game/ (тот же код, что и в web/),
 * поэтому веб- и андроид-версии не расходятся: один и тот же
 * объектно-ориентированный движок работает на обеих платформах.
 */
class MainActivity : Activity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        webView = WebView(this).apply {
            setBackgroundColor(0xFF0B0F14.toInt())
            settings.apply {
                javaScriptEnabled = true
                domStorageEnabled = true              // рекорды в localStorage
                mediaPlaybackRequiresUserGesture = false // ретро-музыка без тапа
                allowFileAccess = true
            }
            // игра сама обрабатывает касания и скролл отключаем
            isHorizontalScrollBarEnabled = false
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
        }

        setContentView(webView)
        webView.loadUrl("file:///android_asset/game/index.html")
        hideSystemUi()
    }

    override fun onResume() {
        super.onResume()
        webView.resumeTimers()
    }

    override fun onPause() {
        webView.pauseTimers()
        super.onPause()
    }

    /** Полноэкранный режим с Immersive-режимом (кнопки прячутся). */
    @Suppress("DEPRECATION")
    private fun hideSystemUi() {
        window.decorView.systemUiVisibility =
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or
            View.SYSTEM_UI_FLAG_FULLSCREEN or
            View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
            View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION or
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE
    }
}
