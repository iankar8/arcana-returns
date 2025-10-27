# Resend Email Setup

The landing page uses [Resend](https://resend.com) for email capture and notifications.

## Setup Steps

### 1. Create Resend Account
- Sign up at https://resend.com
- Verify your email

### 2. Add Your Domain
- Go to https://resend.com/domains
- Add your domain (e.g., `arcanalabs.dev`)
- Add the required DNS records (MX, TXT, DKIM)
- Wait for verification (usually 5-10 minutes)

### 3. Get API Key
- Go to https://resend.com/api-keys
- Create a new API key
- Copy the key (starts with `re_`)

### 4. Configure Environment Variables
Create a `.env.local` file in the landing directory:

```bash
cp .env.example .env.local
```

Update with your values:
```
RESEND_API_KEY=re_your_actual_key_here
NOTIFICATION_EMAIL=your@email.com
```

### 5. Install Dependencies
```bash
npm install
```

### 6. Test Locally
```bash
npm run dev
```

Visit http://localhost:3001/returns and submit an email in the "Get early access" form.

## Email Configuration

### Update Email Addresses
In `app/api/waitlist/route.ts`, update these email addresses:

```typescript
from: 'waitlist@yourdomain.com',  // Line 62 - Your verified domain
to: process.env.NOTIFICATION_EMAIL || 'team@yourdomain.com',  // Line 63
from: 'team@yourdomain.com',  // Line 79 - Your verified domain
```

### Email Templates

**Notification Email (to your team):**
- Sent when someone joins waitlist
- Includes: email, source page, timestamp

**Confirmation Email (to user):**
- Sent to user after signing up
- Welcoming message with product details

## Waitlist Data Storage

Emails are stored in `data/waitlist.json`:

```json
[
  {
    "email": "user@example.com",
    "timestamp": "2025-10-26T19:00:00.000Z",
    "source": "returns"
  }
]
```

The `data/` directory is gitignored to protect user data.

## Testing

### Test API Endpoint Directly
```bash
curl -X POST http://localhost:3001/api/waitlist \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","source":"returns"}'
```

### Check Waitlist Data
```bash
cat data/waitlist.json
```

## Production Deployment

1. Add environment variables to your hosting platform (Vercel, Netlify, etc.)
2. Ensure your domain is verified in Resend
3. Update email addresses in the code
4. Deploy!

## Troubleshooting

**Emails not sending?**
- Check RESEND_API_KEY is set correctly
- Verify domain in Resend dashboard
- Check email addresses match verified domain

**Getting 400 errors?**
- Ensure request includes valid email
- Check Content-Type header is application/json

**Waitlist file not created?**
- Check write permissions
- Ensure data directory exists (created automatically)
