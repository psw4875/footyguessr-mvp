import Head from "next/head";

/**
 * MetaHead Component
 * Renders Next.js Head with Open Graph and Twitter meta tags for social sharing
 * 
 * Props:
 *   title: Page title (default: "FootyGuessr – Guess Legendary Football Matches")
 *   description: Meta description (default: "Guess legendary football matches, World Cups, and iconic football moments in one photo.")
 *   url: Full page URL (default: "https://footyguessr.io")
 *   image: OG image URL (default: `https://footyguessr.io/og/og-default.png`)
 */
export default function MetaHead({
  title = "FootyGuessr – Guess Legendary Football Matches",
  description = "Guess legendary football matches, World Cups, and iconic football moments in one photo.",
  url = "https://footyguessr.io",
  image = null,
}) {
  const defaultImage = image || "https://footyguessr.io/og/og-default.png";

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Open Graph Meta Tags */}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="FootyGuessr" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:type" content="image/png" />
      
      {/* Twitter Card Meta Tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@FootyGuessr" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />
    </Head>
  );
}
