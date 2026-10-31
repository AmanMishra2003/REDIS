# Setup Local Redis

This Node.js application checks the local Redis and MongoDB services created by
the parent project's Docker Compose configuration.

Express handles the HTTP server, ioredis is the Redis client, and Mongoose is
the MongoDB client. The application is a connection-checking example rather
than a full application.

## What has been done

- Created an Express application. Express receives HTTP requests and sends the
  responses for the routes.
- Added `ioredis` for connecting to Redis. It allows the Node.js application to
  send Redis commands asynchronously.
- Added `mongoose` for connecting to MongoDB. It manages the application's
  MongoDB connection.
- Configured the project to use ES modules, which enables the `import` syntax
  used in `src/index.js`.
- Created a Redis client using `REDIS_URL`. The client uses this URL to find
  the Redis server.
- Added a default Redis URL of `redis://localhost:6379`.
- Added a `/redis` endpoint.
- Used `redis.ping()` in the `/redis` endpoint to check whether Redis is
  responding.
- Added error handling for Redis connection failures so the route returns an
  error response when Redis cannot be reached.
- Added a `/mongo` endpoint.
- Added a default MongoDB URL of
  `mongodb://localhost:27017/chai_aur_redis`.
- Used Mongoose in the `/mongo` endpoint.
- Configured the application to run on port `3000`.

## Install and run

```bash
npm install
npm run dev
```

The application entry point is
[src/index.js](./src/index.js).

## Endpoints

Redis check:

```bash
curl http://localhost:3000/redis
```

MongoDB check:

```bash
curl http://localhost:3000/mongo
```

## Environment variables

The application supports:

```text
REDIS_URL
MONGO_URL
```

If these variables are not provided, the application uses the local Docker
service URLs.

`REDIS_URL` tells ioredis where Redis is running. `MONGO_URL` tells Mongoose
which MongoDB server and database to use. Keeping these values in environment
variables makes it possible to use different connection addresses without
editing the application code.
