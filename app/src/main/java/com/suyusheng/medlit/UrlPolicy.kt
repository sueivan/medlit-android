package com.suyusheng.medlit

import java.net.URI
import java.net.URISyntaxException

sealed interface NavigationDecision {
    data object Internal : NavigationDecision
    data object External : NavigationDecision
    data object Rejected : NavigationDecision
}

private const val APP_ASSETS_HOST = "appassets.androidplatform.net"

fun decideNavigation(rawUrl: String): NavigationDecision {
    val uri = try {
        URI(rawUrl)
    } catch (_: URISyntaxException) {
        return NavigationDecision.Rejected
    }

    val scheme = uri.scheme?.lowercase() ?: return NavigationDecision.Rejected

    if (scheme == "https" && uri.host.equals(APP_ASSETS_HOST, ignoreCase = true)) {
        return if (uri.port == -1 && uri.userInfo == null) {
            NavigationDecision.Internal
        } else {
            NavigationDecision.Rejected
        }
    }

    if (scheme == "http" || scheme == "https") {
        return if (!uri.host.isNullOrBlank()) {
            NavigationDecision.External
        } else {
            NavigationDecision.Rejected
        }
    }

    if (scheme == "mailto") {
        return if (!uri.schemeSpecificPart.isNullOrBlank()) {
            NavigationDecision.External
        } else {
            NavigationDecision.Rejected
        }
    }

    return NavigationDecision.Rejected
}
