# Smart Item Exchange

AI-powered item exchange platform with smart matching.

Smart Item Exchange is a full-stack marketplace-style web app where users can
list items, upload photos, receive AI-powered exchange recommendations, and
negotiate exchange requests with optional cash adjustments.

## GitHub Metadata

Suggested repository description:

```text
AI-powered item exchange platform with smart matching
```

Suggested topics:

```text
flask, react, postgresql, pgvector, docker, ai, marketplace
```

## Features

- JWT authentication with register/login
- Admin panel foundation with user/item/request management
- Optional CAPTCHA verification for login and registration
- Google OAuth login with JWT handoff to the React frontend
- Google users can set a local password later from Profile
- Login/register rate limiting and expiring JWT access tokens
- Register password strength indicator and confirm password validation
- Public item browsing and protected marketplace dashboard
- User profile management with avatar file upload
- Item CRUD with local multi-image uploads
- Fixed item categories with dropdown selection and backend validation
- Item filters by status, category, city, condition, date, and search text
- Exchange requests with accept, reject, cancel, and counter-offer flow
- User-friendly incoming/outgoing request labels and item flow display
- Optional cash adjustment and message negotiation
- Item availability logic with `available` and `exchanged` statuses
- AI recommendations using OpenAI embeddings and PostgreSQL pgvector
- Dashboard recommendation carousel with match score, why recommended, and expandable score details
- Local upload storage, no external email or cloud storage dependency

## Tech Stack

- Backend: Python, Flask, SQLAlchemy, JWT
- Database: PostgreSQL, pgvector
- AI: OpenAI embeddings with deterministic local fallback when no API key is set
- Frontend: React, Vite, Tailwind CSS, Axios, React Router
- Infrastructure: Docker Compose

## Setup

### Backend

Run the backend and database with Docker:

```bash
docker compose up --build
```

Backend API base URL:

```text
http://localhost:5000
```

Uploaded files are served from `/uploads/...`, for example:

```text
http://localhost:5000/uploads/items/1/image.jpg
```

If your local database was created before the latest model changes, recreate the
Docker volume. This is required after adding new `User` columns such as `role`,
`google_id`, and `auth_provider` because the project uses `db.create_all()`:

```bash
docker compose down -v
docker compose up --build
```

### Frontend

Create `frontend/.env` from `frontend/.env.example`:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Run the frontend locally:

```bash
cd frontend
npm install
npm run dev
```

Vite usually runs on:

```text
http://localhost:5173
```

If port `5173` is busy, Vite may use `5174`.

Build the frontend:

```bash
cd frontend
npm run build
```

## API Highlights

### Authentication

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/set-password`
- `GET /auth/google/login`
- `GET /auth/google/callback`

Passwords require at least 8 characters, 1 letter, and 1 number. The frontend
shows a live password strength indicator:

- Weak: fewer than 8 characters or missing letters/numbers
- Medium: at least 8 characters with letters and numbers
- Strong: at least 10 characters with uppercase, lowercase, number, and special character

Register also validates confirm password before sending the request. Login and
register password fields include show/hide controls.

Auth rate limits:

- `POST /auth/login`: 5 requests per minute per IP
- `POST /auth/register`: 3 requests per minute per IP

Rate-limited requests return `429` with a clear JSON message.

JWT access tokens expire according to `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`, which
defaults to `60`. Expired JWTs return `401`.

CAPTCHA uses Cloudflare Turnstile. If `CAPTCHA_ENABLED=true`, login and
register requests must include `captcha_token`. Local development can keep
`CAPTCHA_ENABLED=false`.

Cloudflare Turnstile setup:

1. Create a Turnstile widget in Cloudflare.
2. Put the secret key in root `.env` as `CAPTCHA_SECRET_KEY`.
3. Put the site key in `frontend/.env` as `VITE_TURNSTILE_SITE_KEY`.
4. Set `CAPTCHA_ENABLED=true` when you want backend verification enabled.

If `VITE_TURNSTILE_SITE_KEY` is empty, the frontend hides the CAPTCHA widget so
local login/register forms still work.

The register form also includes a confirm password field, and both login and
register forms have show/hide password controls.

Google OAuth flow:

1. The frontend redirects to `GET /auth/google/login`.
2. The backend redirects the user to the Google consent screen.
3. Google calls back to `GET /auth/google/callback`.
4. The backend creates or links a user, creates a JWT, and redirects to:

```text
FRONTEND_URL/oauth-success?token=<jwt_token>
```

5. The frontend saves the token, loads `/users/me`, and redirects to Dashboard.

Required Google redirect URI in Google Cloud Console:

```text
http://localhost:5000/auth/google/callback
```

Google OAuth users can set a local password later from Profile. The protected
endpoint is:

```text
POST /auth/set-password
```

Request body:

```json
{
  "new_password": "password123"
}
```

If the account already has a password, the API returns:

```text
Password is already set. Use change password instead.
```

User responses include a safe `has_password` boolean. `password_hash` is never
exposed.

### Admin

- `GET /admin/users`
- `GET /admin/items`
- `GET /admin/exchange-requests`
- `DELETE /admin/items/<id>`
- `PATCH /admin/users/<id>/role`

Admin endpoints require JWT authentication and `role = admin`; non-admin users
receive `403`.

Set `ADMIN_EMAIL` in `.env` to automatically make a matching newly registered
user an admin in development.

### User Profile

- `GET /users/me`
- `PUT /users/me`
- `POST /uploads/avatar`

`PUT /users/me` updates profile fields such as `name`. Avatar images are updated
through `POST /uploads/avatar` using multipart form data with a file field named
`file`.

Avatar files are stored locally under:

```text
backend/uploads/avatars/<unique_filename>
```

User responses include `avatar_url`, for example:

```json
{
  "id": 1,
  "name": "Test User",
  "email": "test@example.com",
  "avatar_url": "/uploads/avatars/avatar.png",
  "role": "user",
  "auth_provider": "google",
  "has_password": false
}
```

If `has_password` is `false`, the Profile page shows a Set password form so a
Google account can also log in later with email and password.

### Items

- `GET /items`
- `GET /items/<id>`
- `POST /items`
- `PUT /items/<id>`
- `DELETE /items/<id>`
- `POST /uploads/items/<item_id>`

Supported filters:

- `status`
- `category`
- `city`
- `condition`
- `min_created_at`
- `max_created_at`
- `search`
- `page`
- `limit`
- `sort`

Examples:

```text
GET /items?status=available
GET /items?category=Electronics&city=Kyiv
GET /items?search=iphone
GET /items?status=available&page=2&limit=6
GET /items?status=available&sort=city
```

`GET /items` is paginated. Defaults are `page = 1` and `limit = 10`.
The response includes pagination metadata:

```json
{
  "items": [],
  "page": 1,
  "total_pages": 1,
  "total_items": 0
}
```

Supported sort values:

- `newest`: newest items first, default
- `condition`: condition A-Z
- `city`: city A-Z

Invalid sort values fall back to `newest`.

Categories are selected from a fixed list in the frontend and validated by the
backend:

- `Electronics`
- `Clothing & Accessories`
- `Home & Furniture`
- `Books & Education`
- `Sports & Outdoor`
- `Hobbies & Entertainment`
- `Collectibles`
- `Kids & Toys`
- `Beauty & Health`
- `Tools & DIY`
- `Car & Auto`
- `Pets`
- `Other`

The frontend requires 1 to 5 images when creating an item. The backend also
enforces a maximum of 5 images per item. If an item already has 3 images, only 2
more uploads are allowed.

The frontend creates the item with `POST /items`, then uploads each image to:

```text
POST /uploads/items/<item_id>
```

Each upload uses multipart form data with a file field named `file`.

Allowed image types:

- `jpg`
- `jpeg`
- `png`
- `webp`

Maximum file size is 5MB per image. The UI shows:

```text
Upload up to 5 images. JPG, PNG or WEBP. Max 5MB each.
```

Item images are stored locally under:

```text
backend/uploads/items/<item_id>/<unique_filename>
```

Item responses include images:

```json
{
  "images": [
    {
      "id": 1,
      "image_url": "/uploads/items/1/image.png",
      "created_at": "..."
    }
  ]
}
```

### Exchange Requests

- `POST /exchange-requests`
- `GET /exchange-requests`
- `GET /exchange-requests/<id>`
- `GET /exchange-requests/<id>/offers`
- `PUT /exchange-requests/<id>/accept`
- `PUT /exchange-requests/<id>/reject`
- `PUT /exchange-requests/<id>/cancel`
- `POST /exchange-requests/<id>/counter`

Rules:

- Sender must own `offered_item_id`
- Sender cannot request their own item
- Receiver is the owner of `requested_item_id`
- Offered and requested items must have `status = available`
- Only the other participant can accept, reject, or counter the latest offer
- Only sender can cancel an active request
- Accepting a request changes both item statuses to `exchanged`
- Cancelled and rejected requests do not change item status
- Duplicate active requests are blocked

Counter-offer payload example:

```json
{
  "cash_adjustment_amount": 170,
  "cash_adjustment_direction": "sender_pays",
  "message": "I would like 170 USD instead of 150"
}
```

Allowed `cash_adjustment_direction` values:

- `none`
- `sender_pays`
- `receiver_pays`

The frontend displays requests as product interactions instead of technical
database labels:

- `Outgoing request`
- `Incoming request`
- item flow such as `Ball -> iPhone 12`
- active requests show `Waiting for response` when the other user needs to act

### AI Recommendations

- `GET /recommendations/<item_id>`
- `GET /recommendations/me`

Item embeddings are stored in PostgreSQL using pgvector. Embeddings use 1536
dimensions for `text-embedding-3-small`.

`GET /recommendations/me` requires JWT auth and powers the Dashboard
recommendation carousel.

Final recommendation score:

```text
final_score =
  0.40 * desired_exchange_similarity +
  0.20 * item_similarity +
  0.15 * mutual_interest_score +
  0.10 * category_relevance +
  0.05 * city_match +
  0.05 * condition_score +
  0.05 * freshness_score
```

The recommendation UI shows the score as a percentage with a quality label:

- `>= 75%`: Excellent match
- `>= 55%`: Good match
- `>= 35%`: Possible match
- otherwise: Low relevance

Dashboard recommendations are shown in a carousel: 2 cards per view on desktop
and 1 card per view on mobile. Each card shows a simplified "Why recommended?"
section and hides the detailed score breakdown until the user clicks
`Show details`.

## Frontend Routes

Public routes:

- `/items`
- `/items/<id>`
- `/login`
- `/register`
- `/oauth-success`

Protected routes:

- `/dashboard`
- `/items/new`
- `/exchange-requests`
- `/exchange-requests/<id>/counter`
- `/profile`

Admin-only route:

- `/admin`

When logged out, the navbar shows `Items`, `Login`, and `Register`. When logged
in, it shows `Dashboard`, `Items`, `Add Item`, `Exchange Requests`, `Profile`,
and `Logout`. Admin users also see `Admin`; non-admin users are redirected away
from `/admin` on the frontend and still receive `403` from protected admin API
endpoints.

## Environment Variables

Root `.env.example`:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`
- `OPENAI_API_KEY`
- `UPLOAD_FOLDER`
- `ADMIN_EMAIL`
- `CAPTCHA_ENABLED`
- `CAPTCHA_SECRET_KEY`
- `VITE_TURNSTILE_SITE_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `FRONTEND_URL`
- `FLASK_APP`

Frontend `.env.example`:

- `VITE_API_BASE_URL`
- `VITE_TURNSTILE_SITE_KEY`

`OPENAI_API_KEY` is optional for local testing. If it is missing, the backend
uses deterministic fallback embeddings.

## Project Structure

```text
backend/
  app/
    models/
    routes/
    schemas/
    services/
  uploads/
  Dockerfile
  manage.py
  requirements.txt
frontend/
  src/
    api/
    components/
    context/
    pages/
    router/
  package.json
  vite.config.js
docker-compose.yml
.env.example
.gitignore
README.md
```

## Item Statuses

- `available`: default status for new items
- `exchanged`: set automatically when an exchange request is accepted
