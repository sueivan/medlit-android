package com.suyusheng.medlit

import androidx.test.espresso.web.assertion.WebViewAssertions.webMatches
import androidx.test.espresso.web.sugar.Web.onWebView
import androidx.test.espresso.web.webdriver.DriverAtoms.getAttribute
import androidx.test.espresso.web.webdriver.DriverAtoms.findElement
import androidx.test.espresso.web.webdriver.DriverAtoms.getText
import androidx.test.espresso.web.webdriver.Locator
import androidx.test.ext.junit.rules.ActivityScenarioRule
import androidx.test.ext.junit.runners.AndroidJUnit4
import org.hamcrest.Matchers.containsString
import org.hamcrest.Matchers.equalTo
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

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
            .withElement(findElement(Locator.ID, "install-app-shell"))
            .check(webMatches(getAttribute("hidden"), equalTo("true")))
    }
}
