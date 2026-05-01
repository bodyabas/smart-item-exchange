# Smart Item Exchange

Backend for a platform that allows users to exchange items.

## Tech Stack

- Flask
- PostgreSQL
- pgvector
- Docker
- JWT
- OpenAI embeddings

## Features

- User authentication
- CRUD for items
- Exchange request workflow
- AI item recommendations
- Protected endpoints

## Run

```bash
docker compose up --build
```

If you already have an existing local Docker database from an older version, recreate
the volume so PostgreSQL gets the new `items.status`, `items.embedding`, and
`items.matching_embedding` columns plus pgvector extension setup:

```bash
docker compose down -v
docker compose up --build
```

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /items`
- `GET /items?status=available`
- `GET /items?status=exchanged`
- `GET /items/<id>`
- `POST /items`
- `PUT /items/<id>`
- `DELETE /items/<id>`
- `POST /exchange-requests`
- `GET /exchange-requests`
- `GET /exchange-requests/<id>`
- `PUT /exchange-requests/<id>/accept`
- `PUT /exchange-requests/<id>/reject`
- `PUT /exchange-requests/<id>/cancel`
- `GET /recommendations/<item_id>`
- `GET /recommendations/me`

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET_KEY`: secret used to sign JWT access tokens
- `JWT_ACCESS_TOKEN_EXPIRES_MINUTES`: JWT lifetime in minutes
- `OPENAI_API_KEY`: optional key for OpenAI embeddings; if missing, the app uses deterministic local fallback embeddings for development

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
- Only receiver can accept or reject
- Only sender can cancel
- Accepting a request changes both involved item statuses to `exchanged`
- Cancelled and rejected requests do not change item status
- Duplicate pending requests for the same offered/requested item pair are blocked
- Accepted requests for the same offered/requested item pair are blocked
- Items already involved in any accepted exchange request cannot be used in new requests
- Cancelled and rejected requests do not block new requests

## Item Statuses

- `available`: default status for new items
- `exchanged`: set automatically when an exchange request is accepted
