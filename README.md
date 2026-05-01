# Smart Item Exchange

Backend for a platform that allows users to exchange items.

## Tech Stack

- Flask
- PostgreSQL
- Docker
- JWT

## Features

- User authentication
- CRUD for items
- Exchange request workflow
- Protected endpoints

## Run

```bash
docker compose up --build
```

If you already have an existing local Docker database from an older version, recreate
the volume so PostgreSQL gets the new `items.status` column:

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
