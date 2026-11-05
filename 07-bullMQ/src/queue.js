import {Queue} from "bullmq";
import Redis from "ioredis";

const connection = {
        host: process.env.REDIS_URL || "localhost",
        port: 6379,
    }

//creating queue instance with redis connection
const emailQueue = new Queue("my-queue", {
    connection
});

export { emailQueue, connection };





