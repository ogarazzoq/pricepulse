'use client';

import { motion } from 'framer-motion';

const stats = [
  { value: '12k+', label: 'Products tracked' },
  { value: '4', label: 'Active marketplaces' },
  { value: '97%', label: 'Alert accuracy' },
  { value: '<2s', label: 'Avg sync latency' },
];

export function LandingStats() {
  return (
    <section className="border-y border-border/40 bg-muted/20">
      <div className="container grid gap-8 py-10 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05 }}
            className="text-center"
          >
            <p className="text-3xl font-semibold tracking-tight">{s.value}</p>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted-foreground">{s.label}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
