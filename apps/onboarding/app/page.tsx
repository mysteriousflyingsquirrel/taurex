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
    <div className="min-h-screen bg-white text-gray-900">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="/" className="text-xl font-bold tracking-tight text-indigo-600">taurex</a>
          <div className="hidden items-center gap-8 md:flex">
            <a href="#features" className="text-sm text-gray-600 hover:text-gray-900">Features</a>
            <a href="#pricing" className="text-sm text-gray-600 hover:text-gray-900">Pricing</a>
            <a href="https://host.taurex.one" className="text-sm font-medium text-gray-900 hover:text-indigo-600">Sign In</a>
            <a href="https://host.taurex.one" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">Get Started</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        <div className="absolute inset-0 -z-10 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-gray-900 sm:text-7xl">
            Vacation rentals,{" "}<span className="text-indigo-600">simplified</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 sm:text-xl">
            Manage your apartments, accept bookings, and delight your guests — all from one simple platform. No complexity, no commissions.
          </p>
          <div className="mt-10 flex items-center justify-center gap-4">
            <a href="https://host.taurex.one" className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700">Start for Free</a>
            <a href="#features" className="rounded-lg px-6 py-3 text-base font-semibold text-gray-700 ring-1 ring-gray-300 hover:bg-gray-50">Learn More</a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">Everything you need</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Manage your apartments with ease</h2>
            <p className="mt-4 text-lg text-gray-600">From booking pages to calendar management, Taurex gives you all the tools to run your rental business.</p>
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => (
              <div key={feature.title} className="rounded-2xl border border-gray-100 bg-gray-50/50 p-8">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600">
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d={feature.icon} />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{feature.title}</h3>
                <p className="mt-2 text-sm text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold tracking-wide text-indigo-600 uppercase">Pricing</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Simple, transparent pricing</h2>
            <p className="mt-4 text-lg text-gray-600">Start free, scale when you&apos;re ready. No hidden fees.</p>
          </div>
          <div className="mx-auto mt-16 grid max-w-5xl gap-8 lg:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div key={plan.name} className={`rounded-2xl p-8 ${plan.highlighted ? "bg-indigo-600 text-white ring-2 ring-indigo-600 shadow-xl" : "bg-white ring-1 ring-gray-200"}`}>
                <h3 className={`text-lg font-semibold ${plan.highlighted ? "text-white" : "text-gray-900"}`}>{plan.name}</h3>
                <p className={`mt-1 text-sm ${plan.highlighted ? "text-indigo-100" : "text-gray-500"}`}>{plan.description}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  {plan.period && <span className={`text-sm ${plan.highlighted ? "text-indigo-200" : "text-gray-500"}`}>{plan.period}</span>}
                </div>
                <ul className="mt-8 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 text-sm">
                      <svg className={`h-5 w-5 flex-shrink-0 ${plan.highlighted ? "text-indigo-200" : "text-indigo-600"}`} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
                <a href="https://host.taurex.one" className={`mt-8 block w-full rounded-lg py-2.5 text-center text-sm font-semibold ${plan.highlighted ? "bg-white text-indigo-600 hover:bg-indigo-50" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}>{plan.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Ready to simplify your rental business?</h2>
          <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600">Join hosts who trust Taurex to manage their vacation rentals. Get started in minutes.</p>
          <a href="https://host.taurex.one" className="mt-8 inline-block rounded-lg bg-indigo-600 px-8 py-3 text-base font-semibold text-white shadow-sm hover:bg-indigo-700">Get Started for Free</a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50 py-12">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 sm:flex-row">
          <span className="text-sm font-semibold text-indigo-600">taurex</span>
          <p className="text-sm text-gray-500">&copy; 2026 Taurex. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
