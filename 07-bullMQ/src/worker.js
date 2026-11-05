import { Worker } from "bullmq";
import { connection } from "./queue.js";

//creating worker instance with redis connection
const worker = new Worker(
    "my-queue",
    async (job) => {
        console.log("Processing job:", job.id, job.name, job.data);
        await new Promise((resolve) => {
            setTimeout(() => {
                console.log("Job completed:", job.id);
                resolve();
            }, 2000);
        });
    },
    {
        connection,
    }
);

//worker listening events
worker.on("completed", (job) => {
    console.log(`Job ${job.id} has been completed`);
});

worker.on("failed", (job, err) => {
    console.log(`Job ${job?.id} has failed with error: ${err.message}`);
});

worker.on("error", (err) => {
    console.error("Worker error:", err);
});

console.log("Worker is listening for jobs...");
