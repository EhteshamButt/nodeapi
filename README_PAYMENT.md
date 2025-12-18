# Payment Integration Guide

## Environment Variables

Add these to your `.env` file:

```env
# Stripe Keys (get these from your Stripe Dashboard)
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Frontend URL (for redirects)
FRONTEND_URL=https://your-frontend-url.com
```

## API Endpoints

### 1. Create Checkout Session
**POST** `/payment/create-checkout-session`

Request body:
```json
{
  "userId": "user_id_here",
  "amount": 29.99,
  "currency": "usd"
}
```

Response:
```json
{
  "message": "Checkout session created",
  "sessionId": "cs_test_...",
  "url": "https://checkout.stripe.com/..."
}
```

### 2. Get User Payment Status
**GET** `/payment/status/:userId`

Response:
```json
{
  "message": "Payment status retrieved",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email@example.com",
    "paymentStatus": true,
    "paymentDate": "2024-01-01T00:00:00.000Z"
  }
}
```

### 3. Verify Payment Session (after redirect)
**POST** `/payment/verify-session`

Request body:
```json
{
  "sessionId": "cs_test_..."
}
```

Response:
```json
{
  "message": "Payment verified successfully",
  "paid": true,
  "sessionId": "cs_test_..."
}
```

### 4. Stripe Webhook
**POST** `/payment/webhook`

This endpoint is automatically called by Stripe when payment events occur. You need to configure this in your Stripe Dashboard.

## Setup Stripe Webhook

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your webhook URL: `https://serverapis.vercel.app/payment/webhook`
4. Select events: `checkout.session.completed`, `payment_intent.succeeded`
5. Copy the webhook signing secret and add it to `.env` as `STRIPE_WEBHOOK_SECRET`

## Deployed URLs

- **Frontend**: https://passwordreset-two.vercel.app/
- **Backend API**: https://serverapis.vercel.app/

**Important**: Make sure to add `FRONTEND_URL=https://passwordreset-two.vercel.app` to your Vercel environment variables!

## Frontend Integration

### Step 1: Create Payment Session
```javascript
const response = await fetch('https://serverapis.vercel.app/payment/create-checkout-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    userId: 'user_id_here',
    amount: 29.99,
    currency: 'usd'
  })
});

const data = await response.json();
// Redirect to data.url
window.location.href = data.url;
```

### Step 2: After Payment (on success page)
```javascript
// Get session_id from URL query params
const urlParams = new URLSearchParams(window.location.search);
const sessionId = urlParams.get('session_id');

// Verify payment
const response = await fetch('https://serverapis.vercel.app/payment/verify-session', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ sessionId })
});

const data = await response.json();
if (data.paid) {
  // Payment successful!
}
```

### Step 3: Check Payment Status
```javascript
const response = await fetch(`https://serverapis.vercel.app/payment/status/${userId}`);
const data = await response.json();

if (data.user.paymentStatus) {
  // User has paid - show premium content
} else {
  // User hasn't paid - show payment button
}
```

## cURL Examples

### Create Checkout Session
```bash
curl -X POST https://serverapis.vercel.app/payment/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_id_here",
    "amount": 29.99,
    "currency": "usd"
  }'
```

### Get Payment Status
```bash
curl -X GET https://serverapis.vercel.app/payment/status/user_id_here
```

### Verify Session
```bash
curl -X POST https://serverapis.vercel.app/payment/verify-session \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "cs_test_..."
  }'
```

