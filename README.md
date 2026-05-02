# Smart Item Exchange

Full-stack platform that allows users to exchange items.

## Project Structure

```text
backend/
  app/
  uploads/
  Dockerfile
  manage.py
  requirements.txt
frontend/
  src/
  package.json
  vite.config.js
docker-compose.yml
.env
.env.example
.gitignore
README.md
```

## Tech Stack

- Flask
- PostgreSQL
- pgvector
- Docker
- JWT
- OpenAI embeddings

## Features

- User authentication
- User profile management
- CRUD for items
- Local avatar and item image uploads
- Exchange request workflow
- AI item recommendations
- Protected endpoints

## Run

```bash
docker compose up --build
```

The API is exposed on both `http://localhost:5000` and
`http://localhost:8000` in Docker. Uploaded files are served from
`/uploads/...`, for example `http://localhost:8000/uploads/items/1/image.jpg`.

If you already have an existing local Docker database from an older version, recreate
the volume so PostgreSQL gets the new `items.status`, `items.embedding`, and
`items.matching_embedding` columns, user profile/auth token columns, item image
tables, exchange negotiation tables/columns, and pgvector extension setup:

```bash
docker compose down -v
docker compose up --build
```

## Frontend

The React app lives in `frontend/` and uses Vite, Tailwind CSS, Axios, and React
Router.

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

Build the frontend:

```bash
cd frontend
npm run build
```

Public pages:

- `/items`
- `/items/<id>`
- `/login`
- `/register`

Protected pages:

- `/dashboard`
- `/items/new`
- `/exchange-requests`
- `/exchange-requests/<id>/counter`
- `/profile`

When logged out, the navbar shows `Items`, `Login`, and `Register`. When logged
in, it shows `Dashboard`, `Items`, `Add Item`, `Exchange Requests`, `Profile`,
and `Logout`.

The Dashboard is the main user hub. It shows item/request summary cards, quick
actions, and the top AI recommendations from `GET /recommendations/me`.

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /users/me`
- `PUT /users/me`
- `POST /uploads/avatar`
- `POST /uploads/items/<item_id>`
- `GET /items`
- `GET /items?status=available`
- `GET /items?status=exchanged`
- `GET /items?category=phones&city=Kyiv`
- `GET /items?condition=used`
- `GET /items?min_created_at=2026-05-01T00:00:00Z`
- `GET /items?max_created_at=2026-05-31T23:59:59Z`
- `GET /items?search=iphone`
- `GET /items/<id>`
- `POST /items`
- `PUT /items/<id>`
- `DELETE /items/<id>`
- `POST /exchange-requests`
- `GET /exchange-requests`
- `GET /exchange-requests/<id>`
- `GET /exchange-requests/<id>/offers`
- `PUT /exchange-requests/<id>/accept`
- `PUT /exchange-requests/<id>/reject`
- `PUT /exchange-requests/<id>/cancel`
- `POST /exchange-requests/<id>/counter`
- `GET /recommendations/<item_id>`
- `GET /recommendations/me`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: secret used to sign JWT access tokens
- `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`: JWT lifetime in minutes
- `OPENAI_API_KEY`: optional key for OpenAI embeddings; if missing, the app uses deterministic local fallback embeddings for development
- `UPLOAD_FOLDER`: local folder used for uploaded images

## Local Uploads

Uploads are stored on local disk so the app can run without external storage.
The storage logic is isolated in `StorageService`, so R2 or another provider can
be re-enabled later without changing route code.

Upload endpoints require JWT authentication and multipart form data with a file
field named `file`.

Allowed image types:

- `jpg`
- `jpeg`
- `png`
- `webp`

Maximum file size is 5MB.

The Add Item frontend requires 1 to 5 item images before submit. It creates the
item first with `POST /items`, then uploads each selected image to
`POST /uploads/items/<item_id>` using multipart form data with the field name
`file`.

`POST /uploads/avatar` stores files at:

```text
backend/uploads/avatars/<unique_filename>
```

and updates the current user's `avatar_url` with a URL like
`/uploads/avatars/<unique_filename>`.

`POST /uploads/items/<item_id>` stores files at:

```text
backend/uploads/items/<item_id>/<unique_filename>
```

Only the item owner can upload item images. Item responses include:

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

## User Profile

`GET /users/me` returns the current JWT user's profile. `PUT /users/me` allows
updating:

```json
{
  "name": "New Name",
  "avatar_url": "https://example.com/avatar.png"
}
```

User responses include `avatar_url`.

Registration passwords require at least 8 characters, 1 letter, and 1 number.

## Item Filters

`GET /items` supports:

- `status`
- `category`
- `city`
- `condition`
- `min_created_at`
- `max_created_at`
- `search`

`search` performs case-insensitive matching across title, description, category,
and desired exchange.

## AI Recommendations

Item embeddings are stored in PostgreSQL using pgvector. When an item is created
or updated, the backend stores:

- `embedding`: full item text for item-to-item similarity
- `matching_embedding`: `title`, `category`, and `description` for matching against another item's `desired_exchange`

Both vectors use 1536 dimensions for `text-embedding-3-small`.

`GET /recommendations/<item_id>` returns the top 5 available items owned by other
users. The current item is excluded.

`GET /recommendations/me` requires JWT auth, uses all current user's available
items as sources, removes duplicate recommendations, keeps the best score for
each recommended item, and returns the top 10.

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

`desired_exchange_similarity` compares the source item's `desired_exchange`
against the candidate item's `title`, `category`, and `description`, so requested
items like "laptop or tablet" rank above items that are merely similar to the
source item.

`mutual_interest_score` checks whether the candidate item owner wants something
similar to the source item. `category_relevance` adds lexical category awareness,
so related electronics such as laptops, tablets, and monitors can rank well for
requests like "laptop or tablet". `condition_score` uses a condition similarity
map, and `freshness_score` favors newer listings.

## Exchange Request Rules

- Sender must own `offered_item_id`
- Sender cannot request their own item
- Receiver is the owner of `requested_item_id`
- Offered and requested items must have `status = available`
- Sender or receiver can accept only the latest offer proposed by the other user
- Sender or receiver can reject only the latest offer proposed by the other user
- Only sender can cancel
- Accepting a request changes both involved item statuses to `exchanged`
- Cancelled and rejected requests do not change item status
- Duplicate pending requests for the same offered/requested item pair are blocked
- Accepted requests for the same offered/requested item pair are blocked
- Items already involved in any accepted exchange request cannot be used in new requests
- Cancelled and rejected requests do not block new requests

## Counter-Offer Negotiation

Exchange requests support optional cash adjustment fields:

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

`cash_adjustment_amount` cannot be negative. If the amount is `0`,
`cash_adjustment_direction` must be `none`.

`POST /exchange-requests` creates the initial offer history record.
`POST /exchange-requests/<id>/counter` creates a new offer history record,
updates the main exchange request with the latest cash/message fields, and sets
status to `countered`.

`GET /exchange-requests/<id>/offers` returns negotiation history sorted by
creation time ascending.

## Item Statuses

- `available`: default status for new items
- `exchanged`: set automatically when an exchange request is accepted
