# Redis Queue List

This project is a small Express and Redis application that demonstrates how to
build a FIFO (first-in, first-out) email queue with a Redis list.

The application provides one endpoint to add email data to the queue and
another endpoint to retrieve the next email. Redis stores each email as a JSON
string in the list named `queue-list`.

## What has been done

- Created an Express HTTP server.
- Added JSON request-body parsing with `express.json()`.
- Added `ioredis` as the Redis client.
- Configured Redis with the `REDIS_URL` environment variable.
- Added the default Redis URL `redis://localhost:6379`.
- Created a Redis list named `queue-list`.
- Added an endpoint to enqueue an email.
- Added an endpoint to retrieve the next email.
- Used `LPUSH` and `RPOP` together to preserve FIFO queue behavior.
- Configured the application to run on port `2323`.
- Used ES module syntax through `"type": "module"` in `package.json`.

## Project structure

```text
06-queue-list/
├── package.json
├── readme.md
└── src/
    └── index.js
```

## Dependencies

The project uses the following packages:

- **Express**: Creates the HTTP server and API routes.
- **ioredis**: Connects the Node.js application to Redis.
- **Mongoose**: Listed in `package.json`, but not used by the current
  implementation.
- **Nodemon**: Restarts the application automatically during development.

## How the queue works

Redis lists support insertion and removal from both ends:

| Redis command | Operation |
| --- | --- |
| `LPUSH` | Adds an item to the beginning of a list |
| `RPUSH` | Adds an item to the end of a list |
| `LPOP` | Removes an item from the beginning of a list |
| `RPOP` | Removes an item from the end of a list |

This application uses:

```text
LPUSH queue-list <email>
RPOP  queue-list
```

For example, if emails are enqueued in this order:

```text
email-1, email-2, email-3
```

`LPUSH` stores them internally in reverse order, so `RPOP` returns:

```text
email-1, email-2, email-3
```

The combination of inserting at one end and removing from the other makes the
list behave as a FIFO queue.

The queue is not automatically deleted when it becomes empty. Redis keeps the
list key only while it contains items; after the last item is removed, Redis
removes the empty list key.

## Install and run

### 1. Start Redis

Redis must be running on port `6379`. From the project root, the included
Docker Compose file can start the local Redis service:

```bash
docker compose up
```

The Docker Compose configuration exposes Redis at:

```text
redis://localhost:6379
```

### 2. Install project dependencies

From this directory:

```bash
cd 06-queue-list
npm install
```

### 3. Start the application

```bash
npm run dev
```

The API runs at:

```text
http://localhost:2323
```

The `dev` script starts `src/index.js` with Nodemon.

## Environment variable

The application supports:

```text
REDIS_URL
```

If `REDIS_URL` is not set, the application uses:

```text
redis://localhost:6379
```

To connect to a different Redis server:

```bash
REDIS_URL=redis://localhost:6379 npm run dev
```

## API endpoints

### Add an email to the queue

```http
POST /add-email-to-queue
```

Request body:

```json
{
  "from": "sender@example.com",
  "to": "recipient@example.com",
  "body": "Hello from the Redis queue"
}
```

Example:

```bash
curl -X POST http://localhost:2323/add-email-to-queue \
  -H "Content-Type: application/json" \
  -d '{"from":"sender@example.com","to":"recipient@example.com","body":"Hello from the Redis queue"}'
```

Example response:

```json
{
  "message": "Email added to queue successfully",
  "data": {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "body": "Hello from the Redis queue"
  }
}
```

The endpoint reads `from`, `to`, and `body` from the request body and stores
them as one JSON value in the Redis list `queue-list`.

### Retrieve the next email

```http
GET /get-email-from-queue
```

Example:

```bash
curl http://localhost:2323/get-email-from-queue
```

When the queue contains an email, the endpoint removes and returns the oldest
queued item:

```json
{
  "message": "Email retrieved from queue successfully",
  "data": {
    "from": "sender@example.com",
    "to": "recipient@example.com",
    "body": "Hello from the Redis queue"
  }
}
```

When the queue is empty, the endpoint returns:

```json
{
  "message": "Email retrieved from queue successfully",
  "data": {
    "message": "No email in queue"
  }
}
```

Retrieving an email removes it from Redis. Calling the endpoint again does not
return the same email.

## Typical test flow

Start the application, then enqueue two emails:

```bash
curl -X POST http://localhost:2323/add-email-to-queue \
  -H "Content-Type: application/json" \
  -d '{"from":"one@example.com","to":"recipient@example.com","body":"First email"}'

curl -X POST http://localhost:2323/add-email-to-queue \
  -H "Content-Type: application/json" \
  -d '{"from":"two@example.com","to":"recipient@example.com","body":"Second email"}'
```

Retrieve them:

```bash
curl http://localhost:2323/get-email-from-queue
curl http://localhost:2323/get-email-from-queue
```

The first retrieval returns `"First email"` and the second returns
`"Second email"`, demonstrating FIFO behavior. A third retrieval returns the
`"No email in queue"` response.

## Inspect the queue directly in Redis

If the Redis CLI is installed locally, list the queued values with:

```bash
redis-cli LRANGE queue-list 0 -1
```

The values are JSON strings. With `LPUSH`, the newest item appears on the left
and the oldest item appears on the right. Therefore, `RPOP` returns the item at
the right side first. The list's internal order is a consequence of using
`LPUSH` while consuming with `RPOP`.

## Important implementation notes

- The current source does not validate whether `from`, `to`, or `body` is
  present. Production code should validate the request body and return an
  appropriate client error for missing or invalid values.
- The endpoint returns HTTP `200` for both successful retrievals and an empty
  queue. An application may choose to use a different status such as `204 No
  Content` for an empty queue.
- Redis and route errors are not handled explicitly. Production code should
  add error handling, logging, and consistent error responses.
- Queue items are removed as soon as they are retrieved. A worker that crashes
  after retrieval would lose that item unless the application uses a reliable
  queue pattern such as `BRPOPLPUSH`, Redis Streams, or an acknowledgement
  mechanism.
- The queue has no retry, timeout, priority, or dead-letter behavior.
- Multiple consumers can retrieve different items concurrently, but this
  example does not coordinate downstream email delivery.
- The `mongoose` package is present in `package.json`, but this example does
  not connect to MongoDB or use Mongoose.

## Source file

The implementation is available in
[src/index.js](./src/index.js).