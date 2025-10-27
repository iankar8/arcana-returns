import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

interface WaitlistEntry {
  email: string;
  timestamp: string;
  source: string; // 'returns', 'commerce', etc.
}

export async function POST(request: NextRequest) {
  try {
    const { email, source = 'returns' } = await request.json();

    // Validate email
    if (!email || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Store in waitlist file
    const waitlistPath = path.join(process.cwd(), 'data', 'waitlist.json');
    
    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Read existing waitlist
    let waitlist: WaitlistEntry[] = [];
    if (fs.existsSync(waitlistPath)) {
      const data = fs.readFileSync(waitlistPath, 'utf-8');
      waitlist = JSON.parse(data);
    }

    // Check if email already exists
    const exists = waitlist.some(entry => entry.email === email);
    if (exists) {
      return NextResponse.json(
        { message: 'Email already registered' },
        { status: 200 }
      );
    }

    // Add new entry
    const entry: WaitlistEntry = {
      email,
      timestamp: new Date().toISOString(),
      source,
    };
    waitlist.push(entry);

    // Save to file
    fs.writeFileSync(waitlistPath, JSON.stringify(waitlist, null, 2));

    // Send notification email via Resend (to your team)
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      
      try {
        await resend.emails.send({
          from: 'waitlist@notifications.arcanalabs.dev',
          to: process.env.NOTIFICATION_EMAIL || 'team@arcanalabs.dev',
          subject: `New Waitlist Signup - ${source}`,
          html: `
            <h2>New waitlist signup</h2>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Source:</strong> ${source}</p>
            <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send notification email:', emailError);
        // Don't fail the request if email fails
      }

      // Send confirmation email to user
      try {
        await resend.emails.send({
          from: 'team@notifications.arcanalabs.dev',
          to: email,
          subject: 'Welcome to Arcana Labs - Early Access',
          html: `
            <h2>Thanks for your interest in Arcana Labs!</h2>
            <p>We've added you to our early access list for ${source === 'returns' ? 'Agentic Returns Management' : 'AI Commerce'}.</p>
            <p>We'll reach out soon with more details.</p>
            <br>
            <p>— The Arcana Labs Team</p>
          `,
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
      }
    }

    return NextResponse.json(
      { message: 'Successfully added to waitlist' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Waitlist error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}
