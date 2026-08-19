# E-commerce Product Catalog API

A production-oriented RESTful API for managing an online store's product inventory. Built as a group project to demonstrate backend fundamentals done properly: clean resource modeling, input validation, pagination and search, and a deployment pipeline that does not fall over the first time someone other than the author runs it.

Live demo: `https://<your-render-service-name>.onrender.com`
API base path: `/api/products`

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Data Model](#data-model)
6. [Getting Started](#getting-started)
7. [Environment Variables](#environment-variables)
8. [API Reference](#api-reference)
9. [Validation and Error Handling](#validation-and-error-handling)
10. [Security Notes](#security-notes)
11. [Testing](#testing)
12. [Deployment](#deployment)
13. [CI/CD](#cicd)
14. [Postman / API Client](#postman--api-client)
15. [Roadmap](#roadmap)
16. [Contributing](#contributing)
17. [Team](#team)
18. [License](#license)

---

## Overview

This service is the inventory backend for an online store. It exposes a single core resource, `Product`, and supports the full CRUD lifecycle an admin needs to manage stock, plus the read/search patterns a storefront needs to let customers browse and find items.

Design goals for this project, in priority order:

1. **Correctness first.** Every write path is validated before it touches the database. No unvalidated input reaches Mongoose.
2. **Predictable API shape.** Every response follows the same envelope so client code does not need special cases per endpoint.
3. **Operational honesty.** Errors return meaningful HTTP status codes and messages, not stack traces or generic 500s for client mistakes.
4. **Deployability.** The project runs identically on a laptop and on Render with nothing but environment variables changing.

---

## Architecture

```
                    ┌─────────────────────┐
                    │   Client / Browser   │
                    │  (Postman, frontend, │
                    │   curl, etc.)         │
                    └──────────┬───────────┘
                               │ HTTPS
                               ▼
                    ┌─────────────────────┐
                    │   Express App        │
                    │  ─────────────────   │
                    │  Middleware chain:    │
                    │  helmet -> cors ->    │
                    │  morgan -> json parser│
                    │  -> rate limiter      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │   Route Layer         │
                    │  /api/products/*      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Controller Layer      │
                    │  (business logic,      │
                    │   query building)      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Validation Layer      │
                    │  (Joi schemas)         │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  Mongoose Models      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │  MongoDB Atlas         │
                    │  (Cluster, free tier)  │
                    └─────────────────────┘
```

The request never skips a layer. Even an internal script calling the model directly still goes through Mongoose schema validation, which is the last line of defense if Joi is ever bypassed.

---

## Tech Stack

| Layer | Choice | Reason |
|---|---|---|
| Runtime | Node.js (LTS) | Wide ecosystem, async I/O suits a read-heavy catalog API |
| Web framework | Express | Minimal, unopinionated, easy to reason about middleware order |
| Database | MongoDB Atlas (free tier) | Managed, no local ops burden, flexible schema for product attributes |
| ODM | Mongoose | Schema enforcement, hooks, and query building on top of the native driver |
| Config | dotenv | Keeps secrets out of source control |
| Validation | Joi | Declarative request validation independent of the persistence layer |
| Hosting | Render.com | Zero-config web service deploys from a GitHub branch |
| Logging | morgan | Request logging in development and production |
| Security headers | helmet | Sensible default HTTP headers |
| Rate limiting | express-rate-limit | Basic abuse protection on public endpoints |

---

## Project Structure

```
ecommerce-product-catalog-api/
├── src/
│   ├── config/
│   │   └── db.js                # MongoDB connection logic
│   ├── models/
│   │   └── Product.js           # Mongoose schema
│   ├── validators/
│   │   └── productValidator.js  # Joi schemas for create/update
│   ├── controllers/
│   │   └── productController.js # Route handler logic
│   ├── routes/
│   │   └── productRoutes.js     # Express router for /api/products
│   ├── middleware/
│   │   ├── errorHandler.js      # Centralized error handling
│   │   ├── notFound.js          # 404 handler
│   │   └── rateLimiter.js       # Request throttling
│   ├── utils/
│   │   └── ApiError.js          # Custom error class
│   └── app.js                   # Express app assembly (no listen())
├── tests/
│   ├── product.test.js          # Integration tests (Jest + Supertest)
│   └── setup.js                 # Test DB lifecycle helpers
├── .env.example
├── .gitignore
├── package.json
├── server.js                    # Entry point, calls app.listen()
└── README.md
```

Splitting `app.js` from `server.js` is deliberate: it lets integration tests import the Express app and drive it with Supertest without binding a real port.

---

## Data Model

### Product Schema

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| `name` | String | yes | — | Trimmed, indexed for text search |
| `price` | Number | yes | — | Must be >= 0 |
| `description` | String | no | `""` | Free text |
| `category` | String | yes | — | e.g. `Electronics`, `Clothing`, `Home & Kitchen` |
| `inStock` | Boolean | no | `true` | Toggled as stock is depleted or replenished |
| `createdAt` | Date | auto | now | Set by Mongoose timestamps |
| `updatedAt` | Date | auto | now | Set by Mongoose timestamps |

### Mongoose Definition (`src/models/Product.js`)

```javascript
const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: 2,
      maxlength: 120,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
    },
    inStock: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Text index enables the `search` / `name` query parameter
productSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Product', productSchema);
```

The text index is what makes `?search=` efficient rather than a full collection scan with a regex on every request.

---

## Getting Started

### Prerequisites

* Node.js 18 or later
* npm 9 or later
* A MongoDB Atlas cluster (free M0 tier is sufficient) or a local MongoDB instance
* Git

### Installation

```bash
# Clone the repository
git clone https://github.com/<your-org>/ecommerce-product-catalog-api.git
cd ecommerce-product-catalog-api

# Install dependencies
npm install

# Copy the example environment file and fill in real values
cp .env.example .env
```

### Running Locally

```bash
# Development, with auto-restart on file changes
npm run dev

# Production-style run
npm start
```

On success you should see:

```
[server] Connected to MongoDB Atlas
[server] API listening on port 5000
```

Verify it is alive:

```bash
curl http://localhost:5000/api/products
```

---

## Environment Variables

Create a `.env` file in the project root. Never commit this file; `.env.example` is the checked-in template.

```dotenv
# .env.example

# Server
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/ecommerce?retryWrites=true&w=majority

# Rate limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

| Variable | Required | Description |
|---|---|---|
| `PORT` | no | Port the Express server listens on. Defaults to `5000`. Render injects its own `PORT` at runtime, which the app must respect. |
| `NODE_ENV` | no | `development`, `test`, or `production`. Controls logging verbosity and error detail in responses. |
| `MONGO_URI` | yes | Full MongoDB Atlas connection string, including credentials and database name. |
| `RATE_LIMIT_WINDOW_MS` | no | Sliding window size for the rate limiter, in milliseconds. |
| `RATE_LIMIT_MAX_REQUESTS` | no | Max requests per IP per window. |

---

## API Reference

All endpoints are prefixed with `/api/products`. All responses use `Content-Type: application/json`.

### Response Envelope

Successful responses:

```json
{
  "success": true,
  "data": { },
  "meta": { }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "message": "Human-readable explanation",
    "details": []
  }
}
```

---

### Create a Product

`POST /api/products`

Request body:

```json
{
  "name": "Wireless Mechanical Keyboard",
  "price": 89.99,
  "description": "Hot-swappable switches, USB-C, 75% layout.",
  "category": "Electronics",
  "inStock": true
}
```

Successful response — `201 Created`:

```json
{
  "success": true,
  "data": {
    "_id": "665f1c2e4b1a2c0012ab34cd",
    "name": "Wireless Mechanical Keyboard",
    "price": 89.99,
    "description": "Hot-swappable switches, USB-C, 75% layout.",
    "category": "Electronics",
    "inStock": true,
    "createdAt": "2026-08-19T09:12:44.101Z",
    "updatedAt": "2026-08-19T09:12:44.101Z"
  }
}
```

Validation failure — `400 Bad Request`:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "details": [
      "\"price\" must be a positive number",
      "\"category\" is required"
    ]
  }
}
```

curl example:

```bash
curl -X POST http://localhost:5000/api/products \
  -H "Content-Type: application/json" \
  -d '{
        "name": "Wireless Mechanical Keyboard",
        "price": 89.99,
        "category": "Electronics"
      }'
```

---

### List Products (Pagination, Sorting, Search)

`GET /api/products`

Query parameters:

| Param | Type | Default | Example | Description |
|---|---|---|---|---|
| `page` | integer | `1` | `?page=2` | Page number, 1-indexed |
| `limit` | integer | `10` | `?limit=25` | Items per page, capped at 100 server-side |
| `sort` | string | `-createdAt` | `?sort=price` | `price` ascending, `-price` descending, likewise for `name`, `createdAt` |
| `search` / `name` | string | none | `?search=keyboard` | Case-insensitive text match on `name` and `description` |
| `category` | string | none | `?category=Electronics` | Exact-match category filter |
| `inStock` | boolean | none | `?inStock=true` | Filter by stock status |

Example request — page 2, 5 per page, cheapest first, filtered by category:

```bash
curl "http://localhost:5000/api/products?page=2&limit=5&sort=price&category=Electronics"
```

Response — `200 OK`:

```json
{
  "success": true,
  "data": [
    {
      "_id": "665f1c2e4b1a2c0012ab34cd",
      "name": "Wireless Mechanical Keyboard",
      "price": 89.99,
      "category": "Electronics",
      "inStock": true,
      "createdAt": "2026-08-19T09:12:44.101Z",
      "updatedAt": "2026-08-19T09:12:44.101Z"
    }
  ],
  "meta": {
    "page": 2,
    "limit": 5,
    "totalItems": 37,
    "totalPages": 8,
    "hasNextPage": true,
    "hasPrevPage": true
  }
}
```

Search example:

```bash
curl "http://localhost:5000/api/products?search=keyboard&sort=-price"
```

This matches any product whose `name` or `description` contains "keyboard" (case-insensitive), sorted highest price first.

---

### Get a Single Product

`GET /api/products/:id`

```bash
curl http://localhost:5000/api/products/665f1c2e4b1a2c0012ab34cd
```

Response — `200 OK`:

```json
{
  "success": true,
  "data": {
    "_id": "665f1c2e4b1a2c0012ab34cd",
    "name": "Wireless Mechanical Keyboard",
    "price": 89.99,
    "description": "Hot-swappable switches, USB-C, 75% layout.",
    "category": "Electronics",
    "inStock": true,
    "createdAt": "2026-08-19T09:12:44.101Z",
    "updatedAt": "2026-08-19T09:12:44.101Z"
  }
}
```

Not found — `404 Not Found`:

```json
{
  "success": false,
  "error": {
    "message": "Product not found"
  }
}
```

Malformed ID — `400 Bad Request`:

```json
{
  "success": false,
  "error": {
    "message": "Invalid product id"
  }
}
```

This distinction matters: an invalid ObjectId is a client error (`400`), while a well-formed ID that does not exist is a `404`. Collapsing both into one status code is a common shortcut this project deliberately avoids.

---

### Update a Product

`PUT /api/products/:id`

Partial updates are supported; only the fields present in the body are validated and applied.

```bash
curl -X PUT http://localhost:5000/api/products/665f1c2e4b1a2c0012ab34cd \
  -H "Content-Type: application/json" \
  -d '{ "price": 79.99, "inStock": false }'
```

Response — `200 OK`:

```json
{
  "success": true,
  "data": {
    "_id": "665f1c2e4b1a2c0012ab34cd",
    "name": "Wireless Mechanical Keyboard",
    "price": 79.99,
    "description": "Hot-swappable switches, USB-C, 75% layout.",
    "category": "Electronics",
    "inStock": false,
    "createdAt": "2026-08-19T09:12:44.101Z",
    "updatedAt": "2026-08-19T10:05:12.884Z"
  }
}
```

---

### Delete a Product

`DELETE /api/products/:id`

```bash
curl -X DELETE http://localhost:5000/api/products/665f1c2e4b1a2c0012ab34cd
```

Response — `200 OK`:

```json
{
  "success": true,
  "data": {
    "message": "Product removed",
    "id": "665f1c2e4b1a2c0012ab34cd"
  }
}
```

A second delete of the same ID returns `404 Not Found`, not a silent success. Idempotent-looking deletes that hide the "it was already gone" case tend to mask bugs upstream, so this API reports it explicitly.

---

## Validation and Error Handling

Every write endpoint runs its payload through a Joi schema before Mongoose is touched.

```javascript
// src/validators/productValidator.js
const Joi = require('joi');

const createProductSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  price: Joi.number().min(0).required(),
  description: Joi.string().trim().max(2000).allow('', null),
  category: Joi.string().trim().min(2).max(60).required(),
  inStock: Joi.boolean(),
});

const updateProductSchema = createProductSchema.fork(
  ['name', 'price', 'category'],
  (schema) => schema.optional()
);

module.exports = { createProductSchema, updateProductSchema };
```

Errors are normalized through a single custom error class and a centralized error-handling middleware, so controllers never format an error response themselves:

```javascript
// src/utils/ApiError.js
class ApiError extends Error {
  constructor(statusCode, message, details = []) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}
module.exports = ApiError;
```

```javascript
// src/middleware/errorHandler.js
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const payload = {
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(err.details?.length ? { details: err.details } : {}),
    },
  };

  if (process.env.NODE_ENV !== 'production') {
    console.error(err.stack);
  }

  res.status(statusCode).json(payload);
};

module.exports = errorHandler;
```

This means a controller reads simply as: validate, attempt the operation, throw `ApiError` on failure, and let the middleware do the rest.

---

## Security Notes

These are the practices this project follows, in the interest of being an honest devsecops example rather than a toy:

* **No secrets in source control.** `.env` is gitignored; `.env.example` documents required keys with placeholder values only.
* **Least-privilege database user.** The Atlas user in `MONGO_URI` has read/write access scoped to the `ecommerce` database only, not cluster-admin.
* **Input validation at the boundary.** Joi validates shape and type before anything reaches Mongoose; Mongoose validation is a second, independent layer, not a duplicate of the same check.
* **NoSQL injection awareness.** Query parameters used in `find()` filters are whitelisted and type-coerced (e.g., `inStock` is coerced to a real boolean) rather than passed through as raw strings, which prevents operator injection like `{"$gt": ""}` in query strings.
* **Rate limiting.** `express-rate-limit` throttles repeated requests per IP to reduce the impact of scraping or brute-force querying.
* **Security headers.** `helmet` sets sane defaults (`X-Content-Type-Options`, `X-Frame-Options`, etc.) with no extra configuration required.
* **CORS is explicit.** Allowed origins are configured, not left as a wildcard, once a frontend origin is known.
* **Error responses do not leak internals.** Stack traces are logged server-side only; client-facing error messages are deliberately generic in `production`.
* **Dependency hygiene.** `npm audit` is run in CI on every pull request; high and critical findings block the merge.

---

## Testing

Integration tests use Jest and Supertest against an in-memory or disposable test database, never the production Atlas cluster.

```bash
npm test
```

Example test:

```javascript
// tests/product.test.js
const request = require('supertest');
const app = require('../src/app');

describe('POST /api/products', () => {
  it('creates a product with valid data', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({
        name: 'Test Product',
        price: 19.99,
        category: 'Test Category',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Test Product');
  });

  it('rejects a negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .send({ name: 'Bad Product', price: -5, category: 'Test' });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });
});
```

Test coverage focuses on: validation edge cases (missing fields, negative price, oversized strings), pagination boundaries (page beyond total pages, limit above the server cap), search behavior (case-insensitivity, partial matches, no-results case), and the 400-vs-404 distinction on malformed versus missing IDs.

---

## Deployment

This project is deployed as a Render Web Service.

1. Push the repository to GitHub.
2. In the Render dashboard, create a new **Web Service** and connect the repository.
3. Configure the service:
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
   * **Node Version:** matches the `engines` field in `package.json`
4. Add environment variables in the Render dashboard under **Environment** (`MONGO_URI`, `NODE_ENV=production`, and any others from `.env.example`). Do not rely on a committed `.env` file; Render does not read it.
5. In MongoDB Atlas, under **Network Access**, allow connections from anywhere (`0.0.0.0/0`) or from Render's published IP ranges, since Render's outbound IPs are not static on the free tier.
6. Trigger a deploy. Render builds on every push to the connected branch by default.

The app must read `process.env.PORT` rather than hardcoding a port, since Render assigns the port dynamically:

```javascript
// server.js
const app = require('./src/app');
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`[server] API listening on port ${PORT}`);
});
```

---

## CI/CD

A minimal GitHub Actions workflow runs on every pull request to `main`:

```yaml
# .github/workflows/ci.yml
name: CI

on:
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - run: npm audit --audit-level=high
      - run: npm test
```

A pull request cannot merge into `main` unless dependencies pass the audit threshold and the test suite is green. Render deploys automatically from `main` once a PR merges.

---

## Postman / API Client

A Postman collection is included at `docs/postman_collection.json`, covering every endpoint above with example requests, saved responses, and a pre-request script that reads the base URL from a Postman environment variable (`{{baseUrl}}`) so the same collection works locally and against the Render deployment without editing individual requests.

---

## Roadmap

Ideas considered in scope for a future iteration, intentionally left out of this version to keep the initial deliverable focused:

* Authentication and role-based access (admin-only writes, public reads)
* Image upload for product photos (e.g., via a storage bucket)
* Soft deletes instead of hard deletes, with an `isDeleted` flag
* Bulk import/export endpoints (CSV/JSON)
* Category as a normalized reference collection instead of a free-text field
* Structured logging and a request-id per call for traceability

---

## Contributing

1. Fork the repository and create a feature branch: `git checkout -b feature/short-description`.
2. Keep commits scoped and use descriptive messages.
3. Run `npm test` and `npm audit` locally before opening a pull request.
4. Open a pull request against `main` and fill in the PR template, including what changed and how it was tested.
5. At least one other team member reviews and approves before merge.

---

## Team

| Name | Role | GitHub |
|---|---|---|
| _Add name_ | Backend / API | `@handle` |
| _Add name_ | Database / Schema design | `@handle` |
| _Add name_ | DevOps / Deployment | `@handle` |
| _Add name_ | Testing / QA | `@handle` |

---

## License

This project is released under the MIT License. See `LICENSE` for details.