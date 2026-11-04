# User Profile with Redis

This project is a small Express and Redis application that demonstrates two
ways to store a user profile:

1. As a JSON string using Redis `SET` and `GET`.
2. As a Redis hash using `HSET` and `HGETALL`.

Both approaches use the user's ID to build a Redis key and expose separate
endpoints for saving and reading the profile.

## What has been done

- Created an Express HTTP server.
- Added JSON request-body parsing with `express.json()`.
- Added `ioredis` as the Redis client.
- Configured Redis with the `REDIS_URL` environment variable.
- Added the default Redis URL `redis://localhost:6379`.
- Added an endpoint to save a profile as a serialized JSON string.
- Added an endpoint to read a profile stored as a JSON string.
- Added an endpoint to save a profile as a Redis hash.
- Added an endpoint to read a profile stored as a Redis hash.
- Configured the application to run on port `2323`.
- Used ES module syntax through `"type": "module"` in `package.json`.

## Project structure

```text
05-userProfile/
├── package.json
├── readme.md
└── src/
    └── index.js
```

## Dependencies

The project uses the following packages:

- **Express**: Creates the HTTP server and API routes.
- **ioredis**: Connects the Node.js application to Redis.
- **Mongoose**: Listed as a dependency in `package.json`, but it is not used
  by the current `src/index.js` implementation.

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
cd 05-userProfile
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

The `dev` script runs `node src/index.js`.

## Environment variable

The application supports:

```text
REDIS_URL
```

If `REDIS_URL` is not set, the application uses:

```text
redis://localhost:6379
```

To use a different Redis server:

```bash
REDIS_URL=redis://localhost:6379 npm run dev
```

## Redis key design

Both storage implementations build a key with this pattern:

```text
/user-profile:<user-id>
```

For example, the profile for user `user-123` is stored under:

```text
/user-profile:user-123
```

The same key format is used by the normal profile routes and the hash profile
routes.

## Approach 1: Store the profile as JSON

### Save a JSON profile

```http
POST /user-profile
```

Request body:

```json
{
  "userId": "user-123",
  "profileData": {
    "name": "Asha",
    "email": "asha@example.com",
    "age": 25
  }
}
```

Example:

```bash
curl -X POST http://localhost:2323/user-profile \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-123",
    "profileData": {
      "name": "Asha",
      "email": "asha@example.com",
      "age": 25
    }
  }'
```

Response:

```json
{
  "message": "User profile saved successfully"
}
```

The endpoint extracts `userId` and `profileData`, serializes the profile with
`JSON.stringify()`, and stores it with Redis `SET`:

```js
await redis.set(`/user-profile:${userId}`, JSON.stringify(profileData));
```

Redis stores the complete profile as one string value.

### Read a JSON profile

```http
GET /user-profile/:userId
```

Example:

```bash
curl http://localhost:2323/user-profile/user-123
```

Example response:

```json
{
  "name": "Asha",
  "email": "asha@example.com",
  "age": 25
}
```

The endpoint reads the string with `GET` and converts it back into an object
with `JSON.parse()`.

If the profile does not exist, the endpoint returns:

```json
{
  "message": "User profile not found"
}
```

## Approach 2: Store the profile as a Redis hash

### Save a profile hash

```http
POST /user-profile-hash
```

Request body:

```json
{
  "userId": "user-456",
  "profileData": {
    "name": "Ravi",
    "email": "ravi@example.com",
    "age": "30"
  }
}
```

Example:

```bash
curl -X POST http://localhost:2323/user-profile-hash \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-456",
    "profileData": {
      "name": "Ravi",
      "email": "ravi@example.com",
      "age": "30"
    }
  }'
```

Response:

```json
{
  "message": "User profile saved successfully in hash format"
}
```

The endpoint uses `HSET` with the profile object:

```js
await redis.hset(`/user-profile:${userId}`, profileData);
```

Each property in `profileData` becomes a field in the Redis hash:

```text
Key:     /user-profile:user-456
Fields:  name  -> Ravi
         email -> ravi@example.com
         age   -> 30
```

Redis hash values are returned as strings. For example, a numeric `age` is
returned as `"30"` rather than the JavaScript number `30`.

### Read a profile hash

```http
GET /user-profile-hash/:userId
```

Example:

```bash
curl http://localhost:2323/user-profile-hash/user-456
```

Example response:

```json
{
  "name": "Ravi",
  "email": "ravi@example.com",
  "age": "30"
}
```

The endpoint uses Redis `HGETALL` to retrieve all fields. If the hash does not
exist or contains no fields, it returns:

```json
{
  "message": "User profile not found"
}
```

## JSON string versus Redis hash

### JSON string

The JSON approach stores the complete object as one value.

```text
SET key JSON-string
GET key
```

Advantages:

- Preserves nested objects and arrays naturally.
- Reads and writes the complete profile as one object.
- Uses familiar `JSON.stringify()` and `JSON.parse()` operations.

Considerations:

- The entire profile must be read and written to change one property.
- Redis cannot address individual profile fields with hash commands.
- The stored value must be serialized before saving and parsed after reading.

### Redis hash

The hash approach stores each profile property as a field.

```text
HSET key field value
HGETALL key
```

Advantages:

- Profile fields are represented individually in Redis.
- Hash commands can update individual fields without replacing the complete
  profile.
- No explicit `JSON.stringify()` or `JSON.parse()` is needed for a flat
  profile.

Considerations:

- Redis hash values are strings.
- Nested objects and arrays need their own serialization strategy.
- The profile should contain field-value pairs suitable for Redis hash fields.

## Important key-type caveat

The JSON and hash routes currently use the **same Redis key pattern**:

```text
/user-profile:<user-id>
```

Redis keys have a data type. A key written with `SET` is a string, while a key
written with `HSET` is a hash. The same key cannot be both types at the same
time.

For example, if `/user-profile/user-123` first stores a JSON string, then
calling `/user-profile-hash` for `user-123` attempts to run `HSET` against a
string key and Redis returns a `WRONGTYPE` error. The reverse situation causes
the normal `GET` route to fail against a hash key.

For testing, use different user IDs for the two approaches, or clear the key
before switching its storage type:

```bash
redis-cli DEL /user-profile:user-123
```

A production application should use separate key prefixes, such as:

```text
/user-profile-json:<user-id>
/user-profile-hash:<user-id>
```

## Typical test flow

Test JSON storage:

```bash
curl -X POST http://localhost:2323/user-profile \
  -H "Content-Type: application/json" \
  -d '{"userId":"json-user","profileData":{"name":"Asha","city":"Pune"}}'

curl http://localhost:2323/user-profile/json-user
```

Test hash storage:

```bash
curl -X POST http://localhost:2323/user-profile-hash \
  -H "Content-Type: application/json" \
  -d '{"userId":"hash-user","profileData":{"name":"Ravi","city":"Mumbai"}}'

curl http://localhost:2323/user-profile-hash/hash-user
```

Use different IDs in the two flows so the Redis key types do not conflict.

## Important implementation notes

- The current source does not validate whether `userId` or `profileData` is
  present. Production code should validate the request body and return an
  appropriate client error for invalid input.
- The current source does not define explicit error handling for Redis
  connection failures or Redis command errors.
- The JSON route can store nested profile data because it serializes the whole
  object.
- The hash route is best suited to flat profile objects. Nested values may
  need to be serialized before being passed to Redis.
- The hash route returns all values as strings, including values that were sent
  as numbers or booleans.
- Neither storage approach sets a TTL, so profiles remain in Redis until they
  are explicitly updated or deleted.
- The current application does not provide delete or partial-update endpoints.
- `mongoose` is present in `package.json`, but this example does not connect to
  MongoDB or use Mongoose.

## Source file

The implementation is available in
[src/index.js](./src/index.js).
