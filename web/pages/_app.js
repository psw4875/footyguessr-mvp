import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import Head from "next/head";
import Script from "next/script";
import { useRouter } from "next/router";
import { useEffect } from "react";

// 2. Extend the theme to include custom colors, fonts, etc
const theme = extendTheme({
  colors: {
    brand: {
      900: "#1a365d",
      800: "#153e75",
      700: "#2a69ac",
    },
  },
});

// Google Analytics 4 Measurement ID from environment
const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID;

function MyApp({ Component, pageProps }) {
  const router = useRouter();

  // Track page views on route changes (SPA navigation)
  useEffect(() => {
    if (!GA_MEASUREMENT_ID) return;

    const handleRouteChange = (url) => {
      if (typeof window !== "undefined" && window.gtag) {
        window.gtag("config", GA_MEASUREMENT_ID, {
          page_path: url,
        });
      }
    };

    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router.events]);

  return (
    <>
      {/* Google Analytics 4 - Only load if Measurement ID is set */}
      {GA_MEASUREMENT_ID && (
        <>
          <Script
            strategy="afterInteractive"
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          />
          <Script
            id="google-analytics"
            strategy="afterInteractive"
            dangerouslySetInnerHTML={{
              __html: `
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}', {
                  page_path: window.location.pathname
                });
              `,
            }}
          />
        </>
      )}

      <ChakraProvider theme={theme}>
        <Head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {/* Global Open Graph & Twitter defaults */}
          <meta property="og:site_name" content="FootyGuessr" />
          <meta property="og:type" content="website" />
          <meta name="twitter:card" content="summary_large_image" />
        </Head>

        <Component {...pageProps} />
      </ChakraProvider>
    </>
  );
}

export default MyApp;
