# Shelf API

A small books API (Express). Run it with `npm install` then `npm start` (it listens on port 3000).

## What it does

- **Add a book** with a title and author: `POST /api/books`.
- **List and search books**: `GET /api/books` and `GET /api/books?q=dune`.
- **Sign up and sign in**: `POST /api/register`, then `POST /api/login` returns a token.
- **Only signed-in users can delete a book**: `DELETE /api/books/:id` needs `Authorization: Bearer <token>`.
- **Rate a book from 1 to 5**: `POST /api/books/:id/rating` returns the new average.
- **Recommends similar books using machine learning embeddings**: `GET /api/books/:id/similar`.

## Tests

`npm test`
