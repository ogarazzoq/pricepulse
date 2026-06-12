import Link from 'next/link';
import { ArrowRight, BellRing, LineChart, Shield, ShoppingBag, Sparkles, Zap, BarChart3, TrendingDown, Check, ChevronDown } from 'lucide-react';
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
        <div className="absolute inset-0 bg-gradient-brand pointer-events-none" />
        <div className="absolute inset-0 floating-shapes" />
        <div className="container relative z-10 pt-20 pb-24 lg:pt-28">
          <div className="mx-auto max-w-3xl text-center">
            <Badge variant="outline" className="bg-background/60 backdrop-blur">
              <Sparkles className="h-3 w-3" />
              <span>Real-time price intelligence</span>
            </Badge>
            <h1 className="mt-6 text-responsive-3xl font-semibold tracking-tight">
              Track every price.
              <br />
              <span className="gradient-text">Across every marketplace.</span>
            </h1>
            <p className="mt-5 text-responsive-lg text-muted-foreground">
              PricePulse aggregates products across multiple marketplaces, charts historical
              fluctuations, and pings you the second a deal hits your threshold.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild variant="gradient" size="lg" className="w-full sm:w-auto text-responsive-base">
                <Link href="/register">
                  Start tracking <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-responsive-base">
                <Link href="/login">Live demo</Link>
              </Button>
            </div>
            <p className="mt-4 text-responsive-sm text-muted-foreground">
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
      <section id="features" className="container py-24 relative">
        <div className="absolute inset-0 dot-pattern opacity-20 pointer-events-none" />
        <div className="relative z-10">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="outline">Why PricePulse</Badge>
            <h2 className="mt-4 text-responsive-2xl font-semibold tracking-tight">
              Built for serious deal hunters
            </h2>
            <p className="mt-3 text-responsive-base text-muted-foreground">
              Every feature is engineered to surface savings — fast, accurate, beautifully presented.
            </p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="glow-card card-pattern rounded-xl p-6 transition hover:border-primary/40 hover-lift"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-responsive-base font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-responsive-sm text-muted-foreground">{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ANALYTICS */}
      <section id="analytics" className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 mesh-gradient opacity-40 pointer-events-none" />
        <div className="container relative z-10">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <Badge variant="outline" className="mb-4">Analytics</Badge>
              <h2 className="text-responsive-2xl font-semibold tracking-tight">
                Deep insights into every price movement
              </h2>
              <p className="mt-4 text-responsive-base text-muted-foreground">
                Go beyond simple price comparisons. PricePulse gives you full visibility into
                historical trends, volatility patterns, and marketplace rankings.
              </p>
              <ul className="mt-6 space-y-3">
                {analyticsFeatures.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15">
                      <Check className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-8">
                <Button asChild variant="gradient" size="lg">
                  <Link href="/register">Explore analytics</Link>
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {analyticsCards.map((card) => (
                <div
                  key={card.label}
                  className={`glow-card rounded-xl p-5 ${card.span ? 'col-span-2' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15">
                      <card.icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm font-medium">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <LandingTestimonials />

      {/* PRICING */}
      <section id="pricing" className="container py-24">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Badge variant="outline" className="mb-4">Pricing</Badge>
          <h2 className="text-responsive-2xl font-semibold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-3 text-responsive-base text-muted-foreground">
            Start for free. No credit card required. Upgrade when you need more power.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
          {pricingPlans.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                plan.featured
                  ? 'border-primary/50 bg-primary/5 shadow-lg shadow-primary/10'
                  : 'border-border/60 bg-card/40'
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">Most Popular</Badge>
                </div>
              )}
              <div className="mb-4">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              </div>
              <div className="mb-6">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className="text-muted-foreground text-sm">/{plan.period}</span>}
              </div>
              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                asChild
                variant={plan.featured ? 'gradient' : 'outline'}
                className="w-full"
              >
                <Link href="/register">{plan.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
        <p className="text-center text-sm text-muted-foreground mt-8">
          All plans include a 14-day free trial. Cancel anytime.
        </p>
      </section>

      {/* FAQ */}
      <section id="faq" className="container py-24">
        <div className="mx-auto max-w-2xl text-center mb-12">
          <Badge variant="outline" className="mb-4">FAQ</Badge>
          <h2 className="text-responsive-2xl font-semibold tracking-tight">
            Frequently asked questions
          </h2>
          <p className="mt-3 text-responsive-base text-muted-foreground">
            Everything you need to know about PricePulse.
          </p>
        </div>
        <div className="mx-auto max-w-2xl space-y-4">
          {faqs.map((faq, i) => (
            <details
              key={i}
              className="group rounded-xl border border-border/60 bg-card/40 px-5 py-4 cursor-pointer"
            >
              <summary className="flex items-center justify-between gap-4 text-sm font-medium list-none">
                {faq.q}
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/15 via-background to-emerald-500/15 p-10 sm:p-16">
          <div className="absolute inset-0 grid-bg opacity-30" />
          <div className="absolute inset-0 mesh-gradient opacity-60" />
          <div className="relative z-10 max-w-xl">
            <h2 className="text-responsive-2xl font-semibold tracking-tight">
              Stop overpaying. Start tracking.
            </h2>
            <p className="mt-3 text-responsive-base text-muted-foreground">
              Join thousands of smart shoppers and resellers who never miss a price drop.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button asChild variant="gradient" size="lg" className="w-full sm:w-auto text-responsive-base">
                <Link href="/register">Create your free account</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-responsive-base">
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
          <nav className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition">Features</a>
            <a href="#analytics" className="hover:text-foreground transition">Analytics</a>
            <a href="#pricing" className="hover:text-foreground transition">Pricing</a>
            <a href="#faq" className="hover:text-foreground transition">FAQ</a>
          </nav>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} PricePulse. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

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

const analyticsFeatures = [
  'Historical price charts for every product and marketplace',
  'Volatility scoring — know which prices fluctuate the most',
  'Top discounts and biggest price drops in real time',
  'Marketplace comparison — find the consistently cheapest store',
  'Personal dashboard with your alerts, saves, and search history',
  'Export price data to CSV for your own analysis',
];

const analyticsCards = [
  { icon: BarChart3, label: 'Price History', value: '90 days', desc: 'Full price timeline per product', span: false },
  { icon: TrendingDown, label: 'Avg Drop', value: '18.4%', desc: 'Typical discount on tracked items', span: false },
  { icon: LineChart, label: 'Products Tracked', value: '10,000+', desc: 'Across all connected marketplaces', span: true },
];

const pricingPlans = [
  {
    name: 'Free',
    description: 'Perfect for personal use and getting started.',
    price: '$0',
    period: 'month',
    featured: false,
    cta: 'Get started free',
    features: [
      'Up to 10 price alerts',
      '30-day price history',
      'Email notifications',
      '5 saved products',
      'Basic analytics dashboard',
    ],
  },
  {
    name: 'Pro',
    description: 'For power users who track prices seriously.',
    price: '$9',
    period: 'month',
    featured: true,
    cta: 'Start free trial',
    features: [
      'Unlimited price alerts',
      '1-year price history',
      'Email + Telegram notifications',
      'Unlimited saved products',
      'Advanced analytics & exports',
      'Collections & organization',
      'Priority support',
    ],
  },
  {
    name: 'Business',
    description: 'For teams and resellers with high-volume needs.',
    price: '$29',
    period: 'month',
    featured: false,
    cta: 'Contact sales',
    features: [
      'Everything in Pro',
      'API access',
      'Webhook integrations',
      'Team member seats',
      'Custom marketplace connectors',
      'SLA & dedicated support',
    ],
  },
];

const faqs = [
  {
    q: 'How does PricePulse track prices?',
    a: 'PricePulse runs scheduled background jobs that fetch product data from connected marketplaces every few hours. Price snapshots are stored in our database, enabling full historical charts and alert evaluation.',
  },
  {
    q: 'Which marketplaces are supported?',
    a: 'Currently we support FakeStore, DummyJSON, BestBuy, and Olcha.uz. Our provider-based architecture makes it easy to add Amazon, eBay, Walmart, and more.',
  },
  {
    q: 'How do price alerts work?',
    a: 'Set a target price or percent-drop threshold on any product. When the price drops below your target, you\'ll immediately receive a notification via email and/or Telegram.',
  },
  {
    q: 'Is there a Telegram bot?',
    a: 'Yes! Link your account in Settings → Telegram and use @newPricePulse_bot to manage alerts, view saved products, and receive instant price drop notifications on your phone.',
  },
  {
    q: 'Can I export my data?',
    a: 'Absolutely. From the Saved Products page you can export all your saved items to CSV. Price history data can also be downloaded from individual product pages.',
  },
  {
    q: 'Is PricePulse free to use?',
    a: 'Yes — the Free plan gives you everything you need for personal use. Pro and Business plans unlock more alerts, longer history, and team features.',
  },
];
