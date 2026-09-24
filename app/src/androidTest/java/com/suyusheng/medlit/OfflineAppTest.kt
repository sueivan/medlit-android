package com.suyusheng.medlit

import android.webkit.WebView
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.getText
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.containsString
import org.junit.Assert.assertTrue
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicReference

@RunWith(AndroidJUnit4::class)
class OfflineAppTest {
    @get:Rule
    val scenarioRule = ActivityScenarioRule(MainActivity::class.java)
    private var courseReady = false

    @Test
    fun coldStartLoadsCourseHome() {
        onWebView()
            .withElement(findElement(Locator.ID, "home-title"))
            .check(webMatches(getText(), containsString("从一个问题")))
    }

    @Test
    fun pwaInstallCardIsHidden() {
        waitForCourseReady()
        assertTrue(
            "PWA install card must be hidden inside the Android container",
            evaluateBoolean(
                "document.getElementById('install-app-shell') && " +
                    "document.getElementById('install-app-shell').hidden"
            )
        )
    }

    @Test
    fun allSixCourseViewsOpen() {
        val views = listOf(
            Triple("home", "home-title", "从一个问题"),
            Triple("search", "search-title", "变成检索式"),
            Triple("zotero", "zotero-title", "变成可用的资料库"),
            Triple("reading", "reading-title", "读懂结果"),
            Triple("writing", "writing-title", "明确的任务"),
            Triple("ethics", "ethics-title", "责任由人承担")
        )

        for ((view, headingId, expectedText) in views) {
            openView(view)
            onWebView()
                .withElement(findElement(Locator.ID, headingId))
                .check(webMatches(getText(), containsString(expectedText)))
        }
    }

    @Test
    fun exampleProducesPubMedQuery() {
        openView("search")
        assertTrue(
            "Example button must generate a PubMed query",
            evaluateBoolean(
                """
                (function () {
                  var button = document.getElementById('load-example');
                  var output = document.getElementById('query-output');
                  if (!button || !output) return false;
                  button.click();
                  return output.textContent.indexOf('Alzheimer disease') !== -1 &&
                    output.textContent.indexOf('physical activity') !== -1;
                })()
                """.trimIndent()
            )
        )
    }

    private fun openView(view: String) {
        waitForCourseReady()
        assertTrue(
            "Timed out opening course view: $view",
            evaluateBoolean(
                "(function () { location.hash='$view'; renderView(); " +
                    "return document.getElementById('view-$view').hidden === false; })()"
            )
        )
    }

    private fun waitForCourseReady() {
        if (courseReady) return
        onWebView()
            .withElement(findElement(Locator.ID, "home-title"))
            .check(webMatches(getText(), containsString("从一个问题")))
        courseReady = true
    }

    private fun evaluateBoolean(script: String): Boolean {
        val evaluated = AtomicReference<String>()
        val finished = CountDownLatch(1)
        scenarioRule.scenario.onActivity { activity ->
            activity.findViewById<WebView>(R.id.web_view)
                .evaluateJavascript("Boolean($script)") { value ->
                    evaluated.set(value)
                    finished.countDown()
                }
        }
        assertTrue("Timed out evaluating course page", finished.await(5, TimeUnit.SECONDS))
        return evaluated.get() == "true"
    }
}
