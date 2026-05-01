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

## Endpoints

- `POST /auth/register`
- `POST /auth/login`
- `GET /items`
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
- Only receiver can accept or reject
- Only sender can cancel
- Duplicate pending requests for the same offered/requested item pair are blocked
