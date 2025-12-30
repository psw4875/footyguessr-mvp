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
        <title>FootyGuessr</title>
        <meta name="description" content="Guess the match in one photo." />
      </Head>
      <Component {...pageProps} />
    </ChakraProvider>
  );
}

export default MyApp;
