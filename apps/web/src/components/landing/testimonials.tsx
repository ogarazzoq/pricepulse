'use client';

import { motion } from 'framer-motion';

const items = [
  {
    quote:
      'PricePulse paid for itself in a week. The alert system is shockingly fast — I caught a $200 drop before everyone else.',
    name: 'Maya Khan',
    role: 'Reseller, MK Imports',
  },
  {
    quote:
      'The dashboard feels like a Bloomberg terminal for retail products. Comparison tables and history charts are gorgeous.',
    name: 'Daniel Vega',
    role: 'Procurement Lead',
  },
  {
    quote:
      'Plugged in 3 marketplaces in an afternoon. Provider abstraction is engineering done right.',
    name: 'Olivia Tran',
    role: 'CTO, Trendloop',
  },
];

export function LandingTestimonials() {
  return (
    <section className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Loved by analysts and resellers
        </h2>
      </div>
      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {items.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
            className="glass rounded-xl p-6"
          >
            <p className="text-sm leading-relaxed">“{t.quote}”</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-fuchsia-500" />
              <div>
                <p className="text-sm font-medium">{t.name}</p>
                <p className="text-xs text-muted-foreground">{t.role}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
