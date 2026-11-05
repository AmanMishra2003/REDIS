import express from "express";
import { emailQueue } from "./queue.js";

const app = express();
app.use(express.json());

app.post("/add-email-to-queue", async (req, res) => { 
    const {data} = req.body;
    const job =  await emailQueue.add("send-email", data, {
        attempts: 3, // Number of attempts to process the job
        backoff: {
            type: "exponential", // Backoff strategy (exponential backoff)
            delay: 5000, // Delay in milliseconds before retrying
        },
    });
    res.status(200).json({
        message: "Email added to queue successfully",
        data: data
    })
});

app.listen(2323, ()=>{      
    console.log('Server is running on port 2323')
});