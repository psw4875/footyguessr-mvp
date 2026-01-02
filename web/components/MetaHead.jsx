import Head from "next/head";

/**
 * MetaHead Component
 * Renders Next.js Head with Open Graph and Twitter meta tags for social sharing
 * 
 * Props:
 *   title: Page title (default: "FootyGuessr: Guess Football Matches Quiz Game")
 *   description: Meta description (default: "Free online football quiz. Identify iconic matches from one photo. Play 60s solo mode, compete in 1v1 PvP battles, or join daily challenges. Test your soccer knowledge now!")
 *   url: Full page URL (default: "https://footyguessr.io")
 *   image: OG image URL (default: `https://footyguessr.io/og.png`)
 */
export default function MetaHead({
  title = "FootyGuessr: Guess Football Matches Quiz Game",
  description = "Free online football quiz. Identify iconic matches from one photo. Play 60s solo mode, compete in 1v1 PvP battles, or join daily challenges. Test your soccer knowledge now!",
  url = "https://footyguessr.io",
  image = null,
}) {
  const defaultImage = image || "https://footyguessr.io/og.png";
  
  // Only block indexing on Vercel preview deployments, never on production
  const isPreview = process.env.NEXT_PUBLIC_VERCEL_ENV === "preview";

  return (
    <Head>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      
      {/* Prevent indexing of preview deployments only */}
      {isPreview && <meta name="robots" content="noindex, nofollow" />}
      
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
