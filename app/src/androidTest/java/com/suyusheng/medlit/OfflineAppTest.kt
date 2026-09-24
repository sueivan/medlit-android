package com.suyusheng.medlit

import android.webkit.WebView
import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.getText
import androidx.test.espresso.web.webdriver.DriverAtoms.webClick
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

@RunWith(AndroidJUnit4::class)
class OfflineAppTest {
    @get:Rule
    val scenarioRule = ActivityScenarioRule(MainActivity::class.java)

    @Test
    fun coldStartLoadsCourseHome() {
        onWebView()
            .withElement(findElement(Locator.ID, "home-title"))
            .check(webMatches(getText(), containsString("从一个问题")))
    }

    @Test
    fun pwaInstallCardIsHidden() {
        onWebView()
            .withElement(findElement(Locator.CSS_SELECTOR, "#install-app-shell[hidden]"))
            .check(webMatches(getText(), containsString("安装")))
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
        onWebView()
            .withElement(findElement(Locator.ID, "load-example"))
            .perform(webClick())
            .withElement(findElement(Locator.ID, "query-output"))
            .check(webMatches(getText(), containsString("Alzheimer disease")))
            .check(webMatches(getText(), containsString("physical activity")))
    }

    private fun openView(view: String) {
        val rendered = CountDownLatch(1)
        scenarioRule.scenario.onActivity { activity ->
            activity.findViewById<WebView>(R.id.web_view)
                .evaluateJavascript("location.hash='$view'") { rendered.countDown() }
        }
        assertTrue("Timed out opening course view: $view", rendered.await(5, TimeUnit.SECONDS))
    }
}
