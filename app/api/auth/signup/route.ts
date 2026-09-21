import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const db = new Database('/opt/viberyte/lumina-web/data/lumina.db');

// Simple in-memory rate limiting
const signupAttempts = new Map<string, { count: number; lastAttempt: number }>();
const RATE_LIMIT = 5;
const RATE_WINDOW = 15 * 60 * 1000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = signupAttempts.get(ip);
  
  if (!record || now - record.lastAttempt > RATE_WINDOW) {
    signupAttempts.set(ip, { count: 1, lastAttempt: now });
    return true;
  }
  
  if (record.count >= RATE_LIMIT) {
    return false;
  }
  
  record.count++;
  record.lastAttempt = now;
  return true;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Ensure partners table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS partners (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    business_name TEXT,
    partner_role TEXT CHECK(partner_role IN ('venue_owner', 'promoter', 'staff')),
    instagram_handle TEXT,
    instagram_verified INTEGER DEFAULT 0,
    venue_id INTEGER REFERENCES venues(id),
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'suspended')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
  )
`);

async function sendVerificationEmail(email: string, name: string, code: string) {
  const apiKey = process.env.RESEND_API_KEY;
  
  if (!apiKey) {
    console.log('RESEND_API_KEY not set - skipping email. Verification code:', code);
    return false;
  }
  
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Viberyte <noreply@lumina.viberyte.com>',
        to: email,
        subject: 'Verify your Viberyte account',
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
            <div style="text-align: center; margin-bottom: 40px;">
              <h1 style="font-size: 28px; font-weight: 700; color: #000; margin: 0;">Viberyte</h1>
              <p style="color: #666; margin-top: 8px;">Your nightlife concierge</p>
            </div>
            
            <h2 style="font-size: 20px; color: #000; margin-bottom: 16px;">Welcome, ${name}! 🎉</h2>
            
            <p style="color: #333; line-height: 1.6; margin-bottom: 24px;">
              Thanks for signing up. Enter this code to verify your email:
            </p>
            
            <div style="background: linear-gradient(135deg, #7c3aed, #a855f7); padding: 24px; border-radius: 16px; text-align: center; margin-bottom: 24px;">
              <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #fff;">${code}</span>
            </div>
            
            <p style="color: #666; font-size: 14px; margin-bottom: 24px;">
              This code expires in 24 hours. If you didn't create an account, you can ignore this email.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 32px 0;" />
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              © ${new Date().getFullYear()} Viberyte by Viberyte
            </p>
          </div>
        `
      }),
    });
    
    if (!response.ok) {
      console.error('Resend API error:', await response.text());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Email send error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { 
      email, 
      password, 
      name,
      role = 'member',
      businessName,
      instagramHandle,
      partnerRole 
    } = await request.json();

    // Normalize email ONCE
    const normalizedEmail = (email || '').trim().toLowerCase();
    const normalizedName = (name || '').trim();

    if (!normalizedEmail || !password || !normalizedName) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters' },
        { status: 400 }
      );
    }

    // Validate partner fields if partner role
    if (role === 'partner') {
      if (!businessName || businessName.trim().length === 0) {
        return NextResponse.json(
          { error: 'Business name is required for partners' },
          { status: 400 }
        );
      }
      // NOTE: Staff signup allowed only during beta
      if (!partnerRole || !['venue_owner', 'promoter', 'staff'].includes(partnerRole)) {
        return NextResponse.json(
          { error: 'Invalid partner role' },
          { status: 400 }
        );
      }
    }

    // Check if email already exists
    const existingUser = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password with bcrypt (cost factor 12)
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Generate verification code and tokens
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    
    // Generate and hash tokens
    const authToken = generateToken();
    const refreshToken = generateToken();
    const authTokenHash = hashToken(authToken);
    const refreshTokenHash = hashToken(refreshToken);

    // Determine roles array
    const rolesArray = role === 'partner' ? ['consumer', 'partner'] : ['consumer'];

    // Use transaction for atomicity
    let userId: number | bigint;
    let partnerId: number | bigint | null = null;

    const createUser = db.transaction(() => {
      // Insert user
      const userResult = db.prepare(`
        INSERT INTO users (email, password_hash, name, roles, verification_code, verification_expires_at, auth_token_hash, refresh_token_hash)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        normalizedEmail, 
        passwordHash, 
        normalizedName, 
        JSON.stringify(rolesArray),
        verificationCode, 
        verificationExpires, 
        authTokenHash, 
        refreshTokenHash
      );

      userId = userResult.lastInsertRowid;

      // If partner, create partner record
      if (role === 'partner') {
        const partnerResult = db.prepare(`
          INSERT INTO partners (user_id, business_name, partner_role, instagram_handle)
          VALUES (?, ?, ?, ?)
        `).run(
          userId,
          businessName.trim(),
          partnerRole,
          instagramHandle ? instagramHandle.replace('@', '').trim() : null
        );
        partnerId = partnerResult.lastInsertRowid;

        // Update user with partner_id
        db.prepare('UPDATE users SET partner_id = ? WHERE id = ?').run(partnerId, userId);
      }

      return { userId, partnerId };
    });

    // Execute transaction
    const result = createUser();
    userId = result.userId;
    partnerId = result.partnerId;

    // Send verification email (don't await - fire and forget)
    sendVerificationEmail(normalizedEmail, normalizedName, verificationCode);

    // Minimal response for security
    // Tokens issued now for immediate access, but capabilities gated by email_verified
    return NextResponse.json({
      success: true,
      userId: Number(userId),
      email: normalizedEmail,
      name: normalizedName,
      role,
      emailVerified: false,
      token: authToken,
      refreshToken: refreshToken,
      next: role === 'partner' ? 'partner_onboarding' : 'verify_email',
    });

  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: 'Sign up failed. Please try again.' },
      { status: 500 }
    );
  }
}
