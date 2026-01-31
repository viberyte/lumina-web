import { Telegraf, Markup } from 'telegraf';
import dotenv from 'dotenv';
import onboardingHandler from './handlers/onboarding.js';
import waitlistHandler from './handlers/waitlist.js';

dotenv.config();

const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

console.log('🌟 Starting Lumina Telegram Bot...');

// Start command - handles both onboarding and waitlist
bot.start(async (ctx) => {
  // Check if this is a waitlist deep link
  const isWaitlist = await waitlistHandler.handleWaitlistDeepLink(ctx);
  
  if (!isWaitlist) {
    // Normal onboarding flow
    await onboardingHandler.handleStart(ctx);
  }
});

// Handle "Explore NYC Now" callback
bot.action('explore_nyc', waitlistHandler.handleExploreNYC);

// Launch bot
bot.launch()
  .then(() => {
    console.log('✅ Lumina Telegram Bot is running!');
  })
  .catch((error) => {
    console.error('❌ Failed to start bot:', error);
  });

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
