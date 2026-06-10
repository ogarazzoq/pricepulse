/**
 * Database seed — bootstraps:
 *  - Default marketplaces (FakeStore, DummyJSON)
 *  - An admin user
 *  - A demo user
 */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...');

  // --- Marketplaces ----------------------------------------------------
  const marketplaces = [
    {
      slug: 'fakestore',
      name: 'FakeStore',
      logoUrl: 'https://fakestoreapi.com/icons/logo.png',
      websiteUrl: 'https://fakestoreapi.com',
      baseCurrency: 'USD',
    },
    {
      slug: 'dummyjson',
      name: 'DummyJSON',
      logoUrl: 'https://dummyjson.com/public/img/dummyjson-logo.svg',
      websiteUrl: 'https://dummyjson.com',
      baseCurrency: 'USD',
    },
    {
      slug: 'olcha',
      name: 'Olcha.uz',
      logoUrl: 'https://olcha.uz/image/original/logo.png',
      websiteUrl: 'https://olcha.uz',
      baseCurrency: 'UZS',
    },
    {
      slug: 'amazon',
      name: 'Amazon',
      logoUrl: 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg',
      websiteUrl: 'https://www.amazon.com',
      baseCurrency: 'USD',
    },
    {
      slug: 'bestbuy',
      name: 'Best Buy',
      logoUrl: 'https://www.bestbuy.com/~assets/bby/_intl/landing_page_refresh/bb-logo.svg',
      websiteUrl: 'https://www.bestbuy.com',
      baseCurrency: 'USD',
    },
  ];

  for (const m of marketplaces) {
    await prisma.marketplace.upsert({
      where: { slug: m.slug },
      update: { ...m, isActive: true },
      create: { ...m, isActive: true },
    });
  }
  console.log(`  ✓ ${marketplaces.length} marketplaces ready`);

  // --- Admin user ------------------------------------------------------
  const adminPassword = await argon2.hash('Admin@12345');
  await prisma.user.upsert({
    where: { email: 'admin@pricepulse.io' },
    update: {},
    create: {
      email: 'admin@pricepulse.io',
      name: 'PricePulse Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const demoPassword = await argon2.hash('Demo@12345');
  await prisma.user.upsert({
    where: { email: 'demo@pricepulse.io' },
    update: {},
    create: {
      email: 'demo@pricepulse.io',
      name: 'Demo User',
      passwordHash: demoPassword,
      role: 'USER',
    },
  });
  console.log('  ✓ Admin (admin@pricepulse.io / Admin@12345)');
  console.log('  ✓ Demo  (demo@pricepulse.io / Demo@12345)');

  console.log('✅ Seed complete');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
