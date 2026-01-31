import Stripe from 'stripe';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, '.env.local') });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function createProducts() {
  console.log('Creating Stripe products and prices...\n');

  // Create Spotlight product
  const spotlightProduct = await stripe.products.create({
    name: 'Lumina Spotlight',
    description: 'Priority placement, Specials feed, Next Stop inclusion',
    metadata: { tier: 'spotlight' },
  });

  const spotlightPrice = await stripe.prices.create({
    product: spotlightProduct.id,
    unit_amount: 2500, // $25.00
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'spotlight' },
  });

  console.log('✅ Spotlight Product:', spotlightProduct.id);
  console.log('✅ Spotlight Price:', spotlightPrice.id);

  // Create Elite product
  const eliteProduct = await stripe.products.create({
    name: 'Lumina Elite',
    description: 'Full access: Bookings, Analytics, Door management, Table layouts',
    metadata: { tier: 'elite' },
  });

  const elitePrice = await stripe.prices.create({
    product: eliteProduct.id,
    unit_amount: 4499, // $44.99
    currency: 'usd',
    recurring: { interval: 'month' },
    metadata: { tier: 'elite' },
  });

  console.log('✅ Elite Product:', eliteProduct.id);
  console.log('✅ Elite Price:', elitePrice.id);

  console.log('\n=== ADD THESE TO .env.local ===');
  console.log(`STRIPE_PRICE_SPOTLIGHT=${spotlightPrice.id}`);
  console.log(`STRIPE_PRICE_ELITE=${elitePrice.id}`);
}

createProducts().catch(console.error);
