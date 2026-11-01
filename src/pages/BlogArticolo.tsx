import { useEffect } from "react";
import AuthHeader from "@/components/AuthHeader";
import Footer from "@/components/Footer";
import SEO from "@/components/SEO";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ExternalLink, Calendar } from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { articles } from "@/data/blogArticles";

const BlogArticolo = () => {
  const navigate = useNavigate();
  const { slug } = useParams();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);
  const article = articles.find((a) => a.slug === slug);
  const otherArticles = articles.filter((a) => a.slug !== slug);

  if (!article) {
    return (
      <div className="min-h-screen flex flex-col">
        <AuthHeader />
        <main className="flex-1 bg-background py-12 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-xl font-bold mb-4">Articolo non trovato</h1>
            <Button onClick={() => navigate(-1)}>Torna indietro</Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <SEO
        title={`${article.title} — Blog ComuniCARE`}
        description={article.summary.slice(0, 158)}
        path={`/blog/${article.slug}`}
        type="article"
        image={article.imageUrl}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.summary,
          image: article.imageUrl,
          datePublished: article.date,
          author: { "@type": "Organization", name: "ComuniCARE" },
          publisher: {
            "@type": "Organization",
            name: "ComuniCARE",
            logo: { "@type": "ImageObject", url: "https://comunicaresanita.it/favicon.ico" },
          },
          mainEntityOfPage: `https://comunicaresanita.it/blog/${article.slug}`,
        }}
      />
      <AuthHeader />
      <main className="flex-1 bg-background md:py-12 py-0">
        <div className="container mx-auto px-4 md:px-6 max-w-3xl">
          <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4 gap-2">
            <ArrowLeft className="w-4 h-4" /> Torna indietro
          </Button>

          <article>
            <h1 className="text-xl md:text-2xl font-bold mb-2">{article.title}</h1>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-6">
              <Calendar className="w-3.5 h-3.5" /> {article.date}
            </div>

            {article.imageUrl && (
              <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden mb-6">
                <img src={article.imageUrl} alt={article.imageAlt} className="w-full h-full object-cover" />
              </div>
            )}

            <div className="prose prose-sm max-w-none text-foreground space-y-4 mb-6">
              {article.content.map((paragraph, i) => (
                <p key={i} className="text-sm md:text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
            </div>

            <a
              href={article.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline font-medium"
            >
              <ExternalLink className="w-4 h-4" />
              Fonte: {article.source}
            </a>
          </article>

          {/* Altri articoli */}
          <div className="mt-12">
            <h2 className="text-lg font-semibold mb-4">Altri articoli</h2>
            <div className="space-y-4">
              {otherArticles.map((a) => (
                <Link to={`/blog/${a.slug}`} key={a.slug} className="block">
                  <Card className="hover:border-primary transition-colors cursor-pointer">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm md:text-base leading-snug">{a.title}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 text-xs">
                        <Calendar className="w-3.5 h-3.5" /> {a.date}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-xs text-muted-foreground line-clamp-2">{a.summary}</p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BlogArticolo;
