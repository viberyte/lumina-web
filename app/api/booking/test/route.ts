import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import Stripe from 'stripe';
import path from 'path';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

const DB_PATH = path.join(process.cwd(), 'data/lumina.db');

export async function GET(request: NextRequest) {
  try {
    // Test Stripe
    const balance = await stripe.balance.retrieve();
    
    // Test Database
    const db = new Database(DB_PATH);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE '%booking%'"
    ).all();
    db.close();
    
    return NextResponse.json({
      status: 'success',
      message: '✅ Booking system ready!',
      stripe: { connected: true, balance: balance.available[0]?.amount || 0 },
      database: { connected: true, tables: tables.map((t: any) => t.name) },
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', message: error.message },
      { status: 500 }
    );
  }
}
