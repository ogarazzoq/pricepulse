import Link from 'next/link';
import { ArrowRight, BellRing, LineChart, Shield, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Logo } from '@/components/ui/logo';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { LandingPricePreview } from '@/components/landing/price-preview';
import { LandingStats } from '@/components/landing/stats';
import { LandingTestimonials } from '@/components/landing/testimonials';

export default function LandingPage() {
  return (
    <div className="relative">
      {/* NAV */}
      <header className="sticky top-0 z-30 backdrop-blur-md border-b border-border/40 bg-background/70">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-8 md:flex text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#analytics" className="hover:text-foreground transition">Analytics</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild variant="gradient" size="sm" className="hidden sm:inline-flex">
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 grid-bg" />
        <div className="absolute inset-x-0 -top-32 h-[500px] bg-gradient-brand pointer-events-none" />

        <div className="container relative pt-20 pb-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="bg-background/60 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              <span>Real-time price intelligence</span>
            </Badge>
            <h1 className="mt-6 text-4xl font-semibold tracking-tight sm:text-6xl">
              Track every price.
              <br />
              <span className="gradient-text">Across every marketplace.</span>
            </h1>
            <p className="mt-5 text-lg text-muted-foreground">
              PricePulse aggregates products across multiple marketplaces, charts historical
              fluctuations, and pings you the second a deal hits your threshold.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="gradient" size="lg">
                <Link href="/register">
                  Start tracking <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Live demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              No credit card required · Free forever for personal use
            </p>
          </div>

          <div className="mt-16">
            <LandingPricePreview />
          </div>
        </div>
      </section>

      {/* STATS */}
      <LandingStats />

      {/* FEATURES */}
      <section id="features" className="container py-24">
        <div className="mx-auto max-w-2xl text-center">
          <Badge variant="outline">Why PricePulse</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight sm:text-4xl">
            Built for serious deal hunters
          </h2>
          <p className="mt-3 text-muted-foreground">
            Every feature is engineered to surface savings — fast, accurate, beautifully presented.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="glass rounded-xl p-6 transition hover:border-primary/40 hover:shadow-[0_8px_32px_-12px_hsl(var(--primary)/0.4)]"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <LandingTestimonials />

      {/* CTA */}
      <section className="container py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-background to-emerald-500/15 p-10 sm:p-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="relative max-w-xl">
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Stop overpaying. Start tracking.
            </h2>
            <p className="mt-3 text-muted-foreground">
              Join thousands of smart shoppers and resellers who never miss a price drop.
            </p>
            <div className="mt-6 flex gap-3">
              <Button asChild variant="gradient" size="lg">
                <Link href="/register">Create your free account</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">View demo dashboard</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40">
        <div className="container flex flex-col items-center justify-between gap-4 py-8 sm:flex-row">
          <Logo />
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PricePulse. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  {
    icon: ShoppingBag,
    title: 'Aggregated marketplaces',
    description: 'A unified product catalog across FakeStore, DummyJSON, and any provider you add.',
  },
  {
    icon: LineChart,
    title: 'Price history charts',
    description: 'Beautiful time-series visualizations with min, max, average, and volatility.',
  },
  {
    icon: BellRing,
    title: 'Smart alerts',
    description: 'Threshold, percent-drop, and back-in-stock alerts delivered to email or Telegram.',
  },
  {
    icon: Zap,
    title: 'Background workers',
    description: 'BullMQ + Redis power scheduled price syncs and resilient notification dispatch.',
  },
  {
    icon: Shield,
    title: 'Enterprise security',
    description: 'JWT access tokens, rotating refresh tokens, RBAC, and Argon2 password hashing.',
  },
  {
    icon: Sparkles,
    title: 'Modular architecture',
    description: 'Provider-based marketplace abstraction. Plug in Amazon, eBay, Walmart, AliExpress.',
  },
];
