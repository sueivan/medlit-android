package com.suyusheng.medlit

import org.junit.Assert.assertEquals
import org.junit.Test

class UrlPolicyTest {
    @Test fun exactAppassetsHostStaysInternal() {
        assertEquals(
            NavigationDecision.Internal,
            decideNavigation("https://appassets.androidplatform.net/assets/www/index.html#search")
        )
    }

    @Test fun lookalikeHostIsExternal() {
        assertEquals(
            NavigationDecision.External,
            decideNavigation("https://appassets.androidplatform.net.evil.example/x")
        )
    }

    @Test fun appassetsWithWrongPortIsRejected() {
        assertEquals(
            NavigationDecision.Rejected,
            decideNavigation("https://appassets.androidplatform.net:444/assets/www/index.html")
        )
    }

    @Test fun pubmedIsExternal() {
        assertEquals(
            NavigationDecision.External,
            decideNavigation("https://pubmed.ncbi.nlm.nih.gov/")
        )
    }

    @Test fun mailtoIsExternal() {
        assertEquals(
            NavigationDecision.External,
            decideNavigation("mailto:teacher@example.edu")
        )
    }

    @Test fun javascriptSchemeIsRejected() {
        assertEquals(
            NavigationDecision.Rejected,
            decideNavigation("javascript:alert(1)")
        )
    }

    @Test fun malformedUrlIsRejected() {
        assertEquals(NavigationDecision.Rejected, decideNavigation("not a url"))
    }
}
