import express from "express";

import Redis from "ioredis";

const app = express();
app.use(express.json());
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const Queue_key = "queue-list";

app.post("/add-email-to-queue", async (req, res) => {
    // console.log(req.body);
    const {from, to , body} = req.body;
    await redis.lpush(Queue_key, JSON.stringify({from, to, body}));
    res.status(200).json({
        message: "Email added to queue successfully",
        data: {from, to, body}
    })
});

app.get("/get-email-from-queue", async (req, res) => {
    const emailData = await redis.rpop(Queue_key);
    res.status(200).json({
        message: "Email retrieved from queue successfully",
        data: emailData ? JSON.parse(emailData) : {message: "No email in queue"}
    })
});

app.listen(2323, ()=>{
    console.log('Server is running on port 2323');
});

//rpush and lpush to insert in queue
// rpush adds to the end of the list
// lpush adds to the beginning of the list

//lpop and rpop to remove from queue    
// lpop removes from the beginning of the list
// rpop removes from the end of the list