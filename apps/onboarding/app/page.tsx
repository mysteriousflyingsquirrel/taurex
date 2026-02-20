const features = [
  {
    title: "Easy Booking Pages",
    description: "Create beautiful public booking pages for your apartments. Guests book directly — no middleman needed.",
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1",
  },
  {
    title: "Calendar Management",
    description: "Keep track of all your bookings with an intuitive calendar view. Never double-book again.",
    icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
  },
  {
    title: "Custom Domains",
    description: "Use your own domain for booking pages. Your brand, your identity — fully white-labeled.",
    icon: "M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9",
  },
  {
    title: "Secure & Simple",
    description: "Built on enterprise-grade infrastructure. Your data is safe and your setup is effortless.",
    icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
  },
];

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for getting started with one apartment.",
    features: ["1 apartment", "Public booking page", "Calendar management", "Email support"],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "CHF 29.00",
    period: "/month",
    description: "For hosts managing multiple apartments.",
    features: ["Up to 10 apartments", "Custom domain", "Priority support", "Advanced analytics"],
    cta: "Start Free Trial",
    highlighted: true,
  },
  {
    name: "Business",
    price: "CHF 79.00",
    period: "/month",
    description: "For hosts with large portfolios.",
    features: ["Unlimited apartments", "Multiple custom domains", "Dedicated support", "API access"],
    cta: "Contact Sales",
    highlighted: false,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/">
            <img src="/logo-primary_light.png" alt="Taurex" className="h-12 w-auto" />
          </a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-muted hover:text-foreground">Features</a>
            <a href="#pricing" className="text-sm text-muted hover:text-foreground">Pricing</a>
            <a href="https://host.taurex.one" className="text-sm font-medium text-foreground hover:text-primary">Sign In</a>
            <a href="https://host.taurex.one" className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-fg hover:bg-primary-hover">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/10 via-background to-accent/10" />
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-7xl">
            Vacation rentals,{" "}<span className="text-primary">simplified</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted sm:text-xl">
            Manage your apartments, accept bookings, and delight your guests — all from one simple platform. No complexity, no commissions.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a href="https://host.taurex.one" className="rounded-lg bg-primary px-6 py-3 text-base font-semibold text-primary-fg shadow-sm hover:bg-primary-hover">Start for Free</a>
            <a href="#features" className="rounded-lg px-6 py-3 text-base font-semibold text-foreground ring-1 ring-border hover:bg-surface-alt">Learn More</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Everything you need</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Manage your apartments with ease</h2>
            <p className="mt-4 text-lg text-muted">From booking pages to calendar management, Taurex gives you all the tools to run your rental business.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-border bg-surface p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
                  <svg className="h-6 w-6 text-primary-fg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{feature.title}</h3>
                <p className="mt-2 text-sm text-muted">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-surface py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-primary uppercase">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-muted">Start free, scale when you&apos;re ready. No hidden fees.</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 ${plan.highlighted ? "bg-primary text-primary-fg ring-2 ring-primary shadow-xl" : "bg-surface ring-1 ring-border"}`}>
                <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-primary-fg" : "text-foreground"}`}>{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.highlighted ? "text-primary-fg/80" : "text-muted"}`}>{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className={`text-sm ${plan.highlighted ? "text-primary-fg/60" : "text-muted"}`}>{plan.period}</span>}
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <svg className={`h-5 w-5 flex-shrink-0 ${plan.highlighted ? "text-primary-fg/60" : "text-primary"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="https://host.taurex.one" className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${plan.highlighted ? "bg-background text-primary hover:bg-surface" : "bg-primary text-primary-fg hover:bg-primary-hover"}`}>{plan.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-background py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Ready to simplify your rental business?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-muted">Join hosts who trust Taurex to manage their vacation rentals. Get started in minutes.</p>
          <a href="https://host.taurex.one" className="mt-8 inline-block rounded-lg bg-primary px-8 py-3 text-base font-semibold text-primary-fg shadow-sm hover:bg-primary-hover">Get Started for Free</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-surface py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <img src="/logo-primary_light.png" alt="Taurex" className="h-9 w-auto" />
          <p className="text-sm text-muted">&copy; 2026 Taurex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
