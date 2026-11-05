# BullMQ – Learning Notes

> A practical guide to understanding BullMQ, Redis-backed job queues, background processing, workers, retries, and fault tolerance.

## 1. What is BullMQ?

BullMQ is a Node.js library that allows us to implement background job processing using Redis.

It helps us execute time-consuming tasks asynchronously without blocking the main application.

**Examples:**
- Sending emails and notifications.
- Processing uploaded images and videos.
- Generating reports and PDFs.
- Payment processing.
- Scheduled tasks.
- Data synchronization.

### Why do we need BullMQ?

Imagine an API that sends an email whenever a user registers.

Without BullMQ:

1. User sends a registration request.
2. Server creates the user.
3. Server sends an email.
4. Server waits for the email service.
5. Server responds to the user.

Email delivery might take several seconds.

With BullMQ:

1. User sends a registration request.
2. Server creates the user.
3. Server adds an email job to Redis.
4. Server immediately responds to the user.
5. A background worker processes the email job.

This improves API responsiveness and separates background processing from request handling.

---

## 2. Core Components

BullMQ primarily involves three components.

| Component | Responsibility |
|---|---|
| Producer | Adds jobs to a queue |
| Queue | Manages jobs using Redis |
| Worker | Retrieves and processes jobs |

### Architecture

```text
              Client
                |
                v
          Express API
                |
                | Queue.add()
                v
          Redis + BullMQ
                |
                | Fetch jobs
                v
          Worker Process
                |
                v
         Business Logic
                |
                v
       External Services
```

### Producer

A producer is responsible for adding jobs to a queue.

```javascript
import { Queue } from "bullmq";
import { connection } from "./connection.js";

export const emailQueue = new Queue("email-queue", {
    connection
});
```

Adding a job:

```javascript
const job = await emailQueue.add(
    "send-email",
    {
        email: "user@example.com",
        subject: "Welcome!"
    }
);
```

Here:
- `email-queue` is the queue name.
- `send-email` is the job name.
- The object is the job data.

**Important:** Adding a job does not execute the business logic. It only adds the job to the queue.

### Worker

A worker retrieves jobs and executes the business logic.

```javascript
import { Worker } from "bullmq";
import { connection } from "./connection.js";

const worker = new Worker(
    "email-queue",
    async (job) => {

        console.log("Processing:", job.id);
        console.log("Job name:", job.name);
        console.log("Job data:", job.data);

        await sendEmail(job.data);

        return { success: true };
    },
    { connection }
);
```

The asynchronous processor function is where we write our actual business logic.

---

## 3. Why Run Worker Separately?

The Express server acts as a producer, whereas the worker acts as a consumer.

We can run them in separate processes.

```bash
# Terminal 1
node server.js

# Terminal 2
node worker.js
```

In production, workers are generally managed independently using:

- PM2
- Docker
- Kubernetes
- AWS ECS
- Background worker services on cloud platforms

### Why separate them?

1. Workers can be scaled independently.
2. Heavy background processing does not consume API server resources.
3. Worker crashes do not necessarily affect the API server.
4. Multiple workers can process jobs concurrently.

For example:

```text
Express API
     |
     v
   Redis
     |
     +------ Worker 1
     |
     +------ Worker 2
     |
     +------ Worker 3
```

All workers connect to the same Redis instance and queue.

---

## 4. Job Lifecycle

A BullMQ job moves through different states.

| State | Meaning |
|---|---|
| Waiting | Job is waiting for a worker |
| Active | A worker is processing the job |
| Completed | Job processing succeeded |
| Failed | Job processing failed |
| Delayed | Job is scheduled for later execution |
| Waiting-Children | Job is waiting for its child jobs |

Typical lifecycle:

```text
          Waiting
             |
             v
           Active
          /      \
         v        v
    Completed   Failed
                   |
                   v
                Retry
                   |
                   v
                Waiting
```

A job can also be moved into a delayed state depending on its configuration.

---

## 5. Event Listeners

The worker processor executes business logic.

Event listeners allow us to monitor the worker's lifecycle.

### Completed event

Triggered when a job completes successfully.

```javascript
worker.on("completed", (job, result) => {
    console.log("Job completed:", job.id);
    console.log("Result:", result);
});
```

### Failed event

Triggered when job processing fails.

```javascript
worker.on("failed", (job, err) => {
    console.log("Job failed:", job?.id);
    console.log(err.message);
});
```

### Active event

```javascript
worker.on("active", (job) => {
    console.log("Job started:", job.id);
});
```

### Stalled event

```javascript
worker.on("stalled", (jobId) => {
    console.log("Job stalled:", jobId);
});
```

### Why do we need event listeners?

| Processor | Event Listener |
|---|---|
| Executes business logic | Monitors execution |
| Sends emails | Reports job completion |
| Processes videos | Reports failures |
| Updates database | Tracks lifecycle events |

---

## 6. Progress Events

Sometimes a job takes several minutes to complete.

For example, processing a large video.

We can update the job's progress using `job.updateProgress()`.

```javascript
const worker = new Worker(
    "video-queue",
    async (job) => {

        await downloadVideo();
        await job.updateProgress(25);

        await extractFrames();
        await job.updateProgress(50);

        await compressVideo();
        await job.updateProgress(75);

        await uploadToCloud();
        await job.updateProgress(100);

    },
    { connection }
);
```

Listen for progress updates:

```javascript
worker.on("progress", (job, progress) => {
    console.log(
        `Job ${job.id} progress: ${progress}%`
    );
});
```

Progress events are useful when we want to display real-time processing status on the frontend.

For monitoring jobs across different worker processes, we can use `QueueEvents`.

```javascript
import { QueueEvents } from "bullmq";

const queueEvents = new QueueEvents("video-queue", {
    connection
});

queueEvents.on("progress", ({ jobId, data }) => {
    console.log("Job:", jobId);
    console.log("Progress:", data);
});
```

### Worker events vs QueueEvents

- `worker.on()` monitors events associated with a particular worker.
- `QueueEvents` monitors queue-wide events, including jobs processed by different workers.

---

## 7. Retries and Backoff Strategies

Sometimes a job fails because of temporary problems.

For example:
- Email service is unavailable.
- Network timeout.
- External API returns an error.
- Database is temporarily unavailable.

BullMQ supports automatic retries.

```javascript
await emailQueue.add(
    "send-email",
    {
        email: "user@example.com"
    },
    {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 5000
        }
    }
);
```

### Attempts

`attempts: 3` means BullMQ can make up to three processing attempts in total.

### Backoff

Backoff determines how long BullMQ waits before retrying a failed job.

Two common strategies:

**Fixed backoff**

```javascript
backoff: {
    type: "fixed",
    delay: 5000
}
```

Retry delay remains approximately 5 seconds.

**Exponential backoff**

```javascript
backoff: {
    type: "exponential",
    delay: 5000
}
```

Retry delays grow exponentially.

| Attempt | Approximate delay |
|---|---:|
| First retry | 5 seconds |
| Second retry | 10 seconds |
| Third retry | 20 seconds |

These delays are examples without jitter.

---

## 8. Job Locking and Stalled Jobs

This is one of the most important concepts in BullMQ.

### Why do we need job locking?

Imagine two workers picking up the same job simultaneously.

That could result in duplicate processing.

BullMQ uses locks to coordinate job processing and prevent multiple workers from legitimately processing the same active job at the same time.

When a worker picks up a job:

1. The job moves to the active state.
2. BullMQ creates a lock for the job.
3. The worker periodically renews the lock.
4. The lock expires if it is not renewed.

### What happens when a worker crashes?

Consider this scenario:

- Worker 1 picks up Job 101.
- Worker 1 starts processing.
- Worker 1 crashes unexpectedly.
- The worker can no longer renew the lock.
- The lock eventually expires.
- BullMQ's stalled-job checker detects the stalled job.
- The job is moved back to waiting for another worker.

```text
             Waiting
                |
                v
              Active
                |
                v
           Worker crashes
                |
                v
           Lock expires
                |
                v
        Stalled job detected
                |
                v
             Waiting
                |
                v
          Another worker
```

### Important configurations

```javascript
const worker = new Worker(
    "email-queue",
    async (job) => {
        await sendEmail(job.data);
    },
    {
        connection,
        lockDuration: 30000,
        stalledInterval: 30000,
        maxStalledCount: 1
    }
);
```

- `lockDuration`: How long a lock remains valid without renewal.
- `stalledInterval`: Interval between stalled-job checks.
- `maxStalledCount`: Maximum number of times a job can be recovered from the stalled state before being failed.

These are illustrative configurations, not necessarily recommended production values.

### Stalled jobs vs failed jobs

| Failed job | Stalled job |
|---|---|
| Processor throws an error or rejects | Worker loses its lock |
| Uses normal retry configuration | Uses stalled-job recovery |
| Can be retried using attempts | Has a separate stalled count |

**Important:** `attempts` and `maxStalledCount` are different configurations.

---

## 9. At-Least-Once Processing and Idempotency

This is a critical distributed systems concept.

Consider a payment processing job.

```text
Worker 1 picks up payment job
          |
          v
Payment API charges ₹5,000
          |
          v
Worker 1 crashes
          |
          v
BullMQ does not receive completion
          |
          v
Lock expires
          |
          v
Worker 2 picks up same job
          |
          v
Payment API called again
          |
          v
Customer might be charged twice
```

Why does this happen?

BullMQ knows that the job was not marked completed.

However, it cannot know whether an external payment API successfully executed the payment before the worker crashed.

This is why BullMQ provides at-least-once processing semantics rather than guaranteeing exactly-once execution.

### What is idempotency?

An operation is idempotent if executing it multiple times produces the same intended result as executing it once.

For payment processing, we can use an idempotency key.

Example using Stripe:

```javascript
const worker = new Worker(
    "payment-queue",
    async (job) => {

        const payment = await stripe.paymentIntents.create(
            {
                amount: job.data.amount,
                currency: "inr",
                customer: job.data.customerId
            },
            {
                idempotencyKey: job.data.paymentId
            }
        );

        return payment;
    },
    { connection }
);
```

The same logical payment must use the same idempotency key across retries.

The payment provider can then recognize repeated requests and avoid creating duplicate payments.

**Remember:**

- BullMQ handles job delivery and recovery.
- Idempotency protects business operations against duplicate execution.
- External APIs must provide appropriate idempotency support, or we must implement equivalent safeguards ourselves.

---

## 10. Retrieving Jobs from a Queue

BullMQ provides methods to inspect jobs.

### Get jobs by state

```javascript
const jobs = await emailQueue.getJobs([
    "waiting"
]);
```

### Get a specific job

```javascript
const job = await emailQueue.getJob("123");

if (job) {
    console.log(job.data);
}
```

### Get job counts

```javascript
const counts = await emailQueue.getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed"
);

console.log(counts);
```

### Other useful methods

| Method | Purpose |
|---|---|
| `getJobs()` | Retrieve jobs by state |
| `getJob(id)` | Retrieve a particular job |
| `getJobCounts()` | Get job counts |
| `getWaiting()` | Retrieve waiting jobs |
| `getActive()` | Retrieve active jobs |
| `getCompleted()` | Retrieve completed jobs |
| `getFailed()` | Retrieve failed jobs |

**Important:** Use these methods when you want to inspect jobs. Do not use a worker-level job retrieval method to simply peek at the queue.

---

## 11. Production Architecture

A typical production deployment separates API and worker services.

```text
             Frontend
                |
                v
            API Server
                |
                v
           Redis Server
                |
        -------------------
        |        |        |
        v        v        v
     Worker 1 Worker 2 Worker 3
        |        |        |
        v        v        v
       External Services
```

### Who runs the workers?

Workers are long-running background processes managed by infrastructure tools.

Examples:

- PM2
- Docker
- Kubernetes
- AWS ECS
- Cloud background worker services

### Running with PM2

```bash
npm install pm2 -g

pm2 start server.js --name api

pm2 start worker.js --name email-worker
```

PM2 manages the processes and can restart them if they crash.

---

## 12. Important Takeaways

1. BullMQ is a Redis-backed job queue for Node.js.
2. Producers add jobs; workers execute jobs.
3. Adding a job does not execute business logic.
4. Workers can run independently from API servers.
5. The processor function contains business logic.
6. Event listeners monitor job lifecycle events.
7. `updateProgress()` reports job progress.
8. `QueueEvents` monitors queue-wide events.
9. Retries handle failed processing attempts.
10. Locks help prevent concurrent processing of the same active job.
11. Stalled-job detection recovers jobs when workers lose their locks.
12. BullMQ provides at-least-once processing, not guaranteed exactly-once execution.
13. Idempotency is essential when processing payments and other operations with external side effects.

---

## 13. Topics to Learn Next

- [ ] BullMQ delayed jobs
- [ ] Repeatable jobs and Job Schedulers
- [ ] Job priorities
- [ ] Rate limiting
- [ ] Concurrency configuration
- [ ] QueueEvents in a separate API server
- [ ] Parent-child jobs and FlowProducer
- [ ] Redis persistence
- [ ] Graceful worker shutdown
- [ ] Idempotent job processing
- [ ] Monitoring and production deployment

### Official Documentation

- [BullMQ Documentation](https://docs.bullmq.io/)
- [BullMQ GitHub Repository](https://github.com/taskforcesh/bullmq)
- [Redis Documentation](https://redis.io/docs/latest/)

---

*These notes are intended as practical learning material. Examples use simplified code; production implementations should include validation, error handling, graceful shutdown, and appropriate security measures.*