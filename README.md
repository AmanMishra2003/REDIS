# Redis Setup

This project contains a local Redis and MongoDB setup using Docker Compose,
along with a small Node.js application to check the connections.

Redis is used as the local in-memory data store, while MongoDB is used as the
document database. Docker Compose allows both services to be started together
with one configuration file.

## What has been done

- Added a Redis 7 Alpine container. Redis is the service being learned and
  tested in this project.
- Exposed Redis on port `6379`.
- Enabled Redis AOF persistence with `appendonly yes`. AOF records Redis write
  operations so the data can be restored when the container restarts.
- Added a Docker volume named `redis_data` so Redis data is stored outside the
  container's temporary filesystem.
- Added a MongoDB 7 container. MongoDB provides the document database used
  alongside Redis.
- Exposed MongoDB on port `27017`.
- Configured the MongoDB database name as `chai_aur_redis`.
- Added a Docker volume named `mongo_data` so MongoDB data is also persisted.
- Created the `setup-local-redis` Node.js application.
- Added Express, ioredis, and Mongoose dependencies. Express provides the HTTP
  server, ioredis connects the Node.js application to Redis, and Mongoose
  connects the application to MongoDB.
- Added a Redis connection using `REDIS_URL`. This allows the Redis address to
  be configured without changing the source code.
- Added a MongoDB connection using `MONGO_URL` for the same purpose.
- Added a `/redis` endpoint that checks Redis with `ping()`.
- Added a `/mongo` endpoint that checks MongoDB.

## Project structure

```text
.
├── docker-compose.yml
├── README.md
└── setup-local-redis/
    ├── package.json
    ├── readme.md
    └── src/
        └── index.js
```

## Start the Docker services

From this directory:

```bash
docker compose up
```

This starts the Redis and MongoDB containers defined in
[docker-compose.yml](./docker-compose.yml).

## Start the Node.js application

```bash
cd setup-local-redis
npm install
npm run dev
```

The application runs on port `3000`.

The application uses port `3000` for its HTTP server, while the Docker
services use ports `6379` and `27017`.

## Available endpoints

Check the Redis connection:

```bash
curl http://localhost:3000/redis
```

Check the MongoDB connection:

```bash
curl http://localhost:3000/mongo
```

The application source is available in
[setup-local-redis/src/index.js](./setup-local-redis/src/index.js).
