import { Helmet } from "react-helmet-async";

const SITE_NAME = "ELITEFUN";
const SITE_URL = "https://elitescort.fun";
const DEFAULT_DESCRIPTION = "Escort girls in Georgia — Tbilisi, Batumi, Kutaisi. ესკორტ გოგოები საქართველოში. Browse verified escort profiles. VIP companions, premium escort directory.";
const DEFAULT_KEYWORDS = "escort Georgia, escort girls Georgia, escort gogoebi, escort Tbilisi, escort Batumi, escort Kutaisi, ესკორტ გოგოები, ესკორტი საქართველო, ესკორტი თბილისი, ესკორტი ბათუმი, ესკორტი ქუთაისი, ესკორტ გოგო, VIP escort Georgia, premium companion";

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  canonical?: string;
  ogType?: string;
  ogImage?: string;
  noindex?: boolean;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
}

export default function SEO({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords,
  canonical,
  ogType = "website",
  ogImage,
  noindex = false,
  jsonLd,
}: SEOProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Premium Escort Directory in Georgia`;
  const canonicalUrl = canonical ? `${SITE_URL}${canonical}` : undefined;
  const allKeywords = keywords ? `${keywords}, ${DEFAULT_KEYWORDS}` : DEFAULT_KEYWORDS;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={allKeywords} />
      {noindex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
      )}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      {canonicalUrl && <meta property="og:url" content={canonicalUrl} />}
      {ogImage && <meta property="og:image" content={ogImage} />}
      <meta property="og:locale" content="ka_GE" />
      <meta property="og:locale:alternate" content="en_US" />
      <meta property="og:locale:alternate" content="ru_RU" />

      <meta name="twitter:card" content={ogImage ? "summary_large_image" : "summary"} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      {ogImage && <meta name="twitter:image" content={ogImage} />}

      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(
            Array.isArray(jsonLd) ? jsonLd : { "@context": "https://schema.org", ...jsonLd },
          )}
        </script>
      )}
    </Helmet>
  );
}

export { SITE_NAME, SITE_URL, DEFAULT_DESCRIPTION, DEFAULT_KEYWORDS };
