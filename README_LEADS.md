# Leads API Documentation

This API manages email subscriptions (leads) for the KUMU Coaching platform. When a user subscribes via email, they receive a thank you email automatically.

## API Base URL

```
https://nodeapislive.netlify.app
```

## Endpoints

### 1. Create Lead (Subscribe Email)
**POST** `/leads`

Creates a new lead and sends a thank you email automatically.

**Request Body:**
```json
{
  "email": "user@example.com",
  "source": "hero",  // Optional: "hero", "cta", or "other" (default: "other")
  "notes": "Optional notes"  // Optional
}
```

**Response:**
```json
{
  "message": "Lead created successfully and thank you email sent",
  "lead": {
    "id": "69624364b1832f0b01ba7916",
    "email": "user@example.com",
    "source": "hero",
    "subscribed": true,
    "emailSent": true,
    "emailSentAt": "2026-01-10T12:17:40.289Z",
    "createdAt": "2026-01-10T12:17:40.289Z",
    "updatedAt": "2026-01-10T12:17:40.289Z"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://nodeapislive.netlify.app/leads' \
--header 'Content-Type: application/json' \
--data '{
    "email": "user@example.com",
    "source": "hero"
}'
```

---

### 2. Get All Leads
**GET** `/leads`

Retrieves all leads with optional filtering and pagination.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 100)
- `search` (optional): Search by email
- `subscribed` (optional): Filter by subscription status (true/false)
- `source` (optional): Filter by source ("hero", "cta", "other")

**Response:**
```json
{
  "message": "Leads retrieved successfully",
  "leads": [
    {
      "id": "69624364b1832f0b01ba7916",
      "email": "user@example.com",
      "source": "hero",
      "subscribed": true,
      "emailSent": true,
      "emailSentAt": "2026-01-10T12:17:40.289Z",
      "notes": null,
      "createdAt": "2026-01-10T12:17:40.289Z",
      "updatedAt": "2026-01-10T12:17:40.289Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 100,
    "total": 1,
    "pages": 1
  }
}
```

**cURL Examples:**

Get all leads:
```bash
curl --location 'https://nodeapislive.netlify.app/leads'
```

Search leads by email:
```bash
curl --location 'https://nodeapislive.netlify.app/leads?search=user@example.com'
```

Get subscribed leads from hero section:
```bash
curl --location 'https://nodeapislive.netlify.app/leads?subscribed=true&source=hero'
```

Get leads with pagination:
```bash
curl --location 'https://nodeapislive.netlify.app/leads?page=1&limit=10'
```

---

### 3. Get Lead by ID
**GET** `/leads/:id`

Retrieves a single lead by ID.

**Response:**
```json
{
  "message": "Lead retrieved successfully",
  "lead": {
    "id": "69624364b1832f0b01ba7916",
    "email": "user@example.com",
    "source": "hero",
    "subscribed": true,
    "emailSent": true,
    "emailSentAt": "2026-01-10T12:17:40.289Z",
    "notes": null,
    "createdAt": "2026-01-10T12:17:40.289Z",
    "updatedAt": "2026-01-10T12:17:40.289Z"
  }
}
```

**cURL Example:**
```bash
curl --location 'https://nodeapislive.netlify.app/leads/69624364b1832f0b01ba7916'
```

---

### 4. Update Lead
**PUT** `/leads/:id`

Updates a lead's information.

**Request Body:**
```json
{
  "email": "newemail@example.com",  // Optional
  "source": "cta",  // Optional: "hero", "cta", or "other"
  "subscribed": false,  // Optional
  "notes": "Updated notes",  // Optional
  "resendEmail": true  // Optional: Resend thank you email
}
```

**Response:**
```json
{
  "message": "Lead updated successfully",
  "lead": {
    "id": "69624364b1832f0b01ba7916",
    "email": "newemail@example.com",
    "source": "cta",
    "subscribed": false,
    "emailSent": true,
    "emailSentAt": "2026-01-10T12:30:00.000Z",
    "notes": "Updated notes",
    "createdAt": "2026-01-10T12:17:40.289Z",
    "updatedAt": "2026-01-10T12:30:00.000Z"
  }
}
```

**cURL Examples:**

Update lead email:
```bash
curl --location --request PUT 'https://nodeapislive.netlify.app/leads/69624364b1832f0b01ba7916' \
--header 'Content-Type: application/json' \
--data '{
    "email": "newemail@example.com"
}'
```

Unsubscribe a lead:
```bash
curl --location --request PUT 'https://nodeapislive.netlify.app/leads/69624364b1832f0b01ba7916' \
--header 'Content-Type: application/json' \
--data '{
    "subscribed": false
}'
```

Resend thank you email:
```bash
curl --location --request PUT 'https://nodeapislive.netlify.app/leads/69624364b1832f0b01ba7916' \
--header 'Content-Type: application/json' \
--data '{
    "resendEmail": true
}'
```

---

### 5. Delete Lead
**DELETE** `/leads/:id`

Deletes a lead from the database.

**Response:**
```json
{
  "message": "Lead deleted successfully",
  "deletedLead": {
    "id": "69624364b1832f0b01ba7916",
    "email": "user@example.com"
  }
}
```

**cURL Example:**
```bash
curl --location --request DELETE 'https://nodeapislive.netlify.app/leads/69624364b1832f0b01ba7916'
```

---

## Email Functionality

### Automatic Thank You Email

When a lead is created:
- A professional thank you email is automatically sent to the subscriber
- The email includes:
  - Welcome message
  - Information about KUMU Coaching
  - Download link for the app
  - Contact information

### Email Status Tracking

- `emailSent`: Boolean indicating if thank you email was sent
- `emailSentAt`: Timestamp when email was sent

---

## Lead Model Fields

```javascript
{
  email: String,              // Required, unique, lowercase
  source: String,             // "hero", "cta", or "other"
  subscribed: Boolean,        // Default: true
  emailSent: Boolean,         // Default: false
  emailSentAt: Date,          // Timestamp when email was sent
  notes: String,              // Optional notes
  createdAt: Date,            // Auto-generated
  updatedAt: Date             // Auto-generated
}
```

---

## Notes

- Email addresses are automatically lowercased and trimmed
- Duplicate emails update the existing lead instead of creating a new one
- Thank you emails are sent automatically on lead creation
- Email sending failures don't block lead creation
- The API supports CORS for frontend integration
