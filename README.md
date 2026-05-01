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
