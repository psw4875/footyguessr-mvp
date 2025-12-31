import { ChakraProvider, extendTheme } from "@chakra-ui/react";
import Head from "next/head";

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

function MyApp({ Component, pageProps }) {
  return (
    <ChakraProvider theme={theme}>
      <Head>
        <title>FootyGuessr – Guess Legendary Football Matches</title>
        <meta name="description" content="Guess legendary football matches, World Cups, and iconic moments. Test your football knowledge with FootyGuessr." />
        <link rel="canonical" href="https://footyguessr.io/" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://footyguessr.io/" />
        <meta property="og:title" content="FootyGuessr – Guess Legendary Football Matches" />
        <meta property="og:description" content="Guess legendary football matches, World Cups, and iconic moments. Test your football knowledge with FootyGuessr." />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="FootyGuessr – Guess Legendary Football Matches" />
        <meta name="twitter:description" content="Guess legendary football matches, World Cups, and iconic moments. Test your football knowledge with FootyGuessr." />
      </Head>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
