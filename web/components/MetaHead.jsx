import Head from "next/head";

/**
 * MetaHead Component
 * Renders Next.js Head with Open Graph and Twitter meta tags for social sharing
 * 
 * Props:
 *   title: Page title (default: "FootyGuessr")
 *   description: Meta description (default: "Guess the match in one photo.")
 *   url: Full page URL (default: "https://footyguessr.io")
 *   image: OG image URL (default: `${origin}/og/og-default.png`)
 */
export default function MetaHead({
  title = "FootyGuessr",
  description = "Guess the match in one photo.",
  url = "https://footyguessr.io",
  image = null,
}) {
  const defaultImage = image || "https://footyguessr.io/og/og-default.png";

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={defaultImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={defaultImage} />
    </Head>
  );
}
