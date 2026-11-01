# Site Banner

This project is a small Express application that stores and manages a site
banner message in Redis.

## What has been done

- Created an Express application.
- Added `express.json()` middleware to read JSON request bodies.
- Added `ioredis` to connect the Node.js application to Redis.
- Configured the Redis connection with `REDIS_URL`.
- Added the default Redis URL `redis://localhost:6379`.
- Created the Redis key `app:banner` for the banner message.
- Added an endpoint to save a banner message.
- Added an endpoint to read the current banner message.
- Added an endpoint to delete the banner message.
- Added an endpoint to check whether the banner key exists.
- Configured the application to run on port `3000`.
- Added `nodemon` to restart the application when source files change.

## How it works

The banner message is stored in Redis as a key-value pair:

```text
Key:   app:banner
Value: The banner message
```

The same key is used by all banner endpoints so they can work with the same
message.

## Install and run

```bash
npm install
npm start
```

The application runs on:

```text
http://localhost:3000
```

## Endpoints

### Set the banner

```bash
curl -X POST http://localhost:3000/banner \
  -H "Content-Type: application/json" \
  -d '{"message":"Welcome to our website"}'
```

The `POST` endpoint uses `redis.set()` to save the message. If no `message` is
provided, it stores the default message:

```text
Welcome to chai aur redis!
```

### Get the banner

```bash
curl http://localhost:3000/banner
```

The `GET` endpoint uses `redis.get()` to read the message. If the key does not
exist, it returns:

```text
No banner message set.
```

### Delete the banner

```bash
curl -X DELETE http://localhost:3000/banner
```

The `DELETE` endpoint uses `redis.del()` to remove the `app:banner` key.

### Check whether the banner exists

```bash
curl http://localhost:3000/banner/exists
```

The endpoint uses `redis.exists()` to check the key. Redis returns a number,
so the application converts it to a Boolean value before sending the response.

## Environment variable

The application supports:

```text
REDIS_URL
```

If `REDIS_URL` is not provided, the application connects to the local Redis
server at `redis://localhost:6379`.

The application source is available in
[src/index.js](./src/index.js).
