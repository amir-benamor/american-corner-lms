import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Calendar, MessageSquare, ScanLine, Library, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">American Corner Sousse</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Sign In
            </Link>
            <Link href="/register">
              <Button size="sm">Get Library Card</Button>
            </Link>
          </nav>
        </div>
      </header>

      <section className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
              Your Gateway to{" "}
              <span className="text-primary">American Knowledge</span> in Sousse
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Explore our curated collection of English-language books, join cultural events,
              and get AI-powered book recommendations — all at American Corner Sousse.
            </p>
            <div className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" className="gap-2">
                  Get Started <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/catalog">
                <Button variant="outline" size="lg">
                  Browse Catalog
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Library,
                title: "Curated Catalog",
                description: "Thousands of English-language books organized by genre, level, and interest.",
              },
              {
                icon: MessageSquare,
                title: "AI Librarian",
                description: "Get personalized book recommendations powered by AI and semantic search.",
              },
              {
                icon: Calendar,
                title: "Community Events",
                description: "English Clubs, Tech Workshops, and US Study Info Sessions.",
              },
              {
                icon: ScanLine,
                title: "Fast Checkout",
                description: "Scan and borrow books in seconds using our barcode system.",
              },
              {
                icon: BookOpen,
                title: "CEFR Levels",
                description: "Books tagged A1-C2 to match your English proficiency.",
              },
              {
                icon: Calendar,
                title: "Space Booking",
                description: "Reserve computers, study rooms, and discussion spaces.",
              },
            ].map((feature) => (
              <div key={feature.title} className="p-6 rounded-xl border bg-card hover:shadow-md transition-shadow">
                <feature.icon className="h-10 w-10 text-primary mb-4" />
                <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t py-8 bg-muted/50">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>American Corner Sousse — A partnership between the U.S. Embassy Tunis and the city of Sousse.</p>
          <p className="mt-1">&copy; {new Date().getFullYear()} American Corner Sousse. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
