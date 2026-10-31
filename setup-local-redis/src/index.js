import express from "express";
import Redis from "ioredis";
import mongoose from "mongoose";

const app = express();
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); // redis client instance

mongoose

app.get('/redis', async(req, res)=> {
    try {
        const reply = await redis.ping(); // ping the redis server
        res.json({ redis: reply });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.get('/mongo', async(req, res)=> {
    try {
        const url = process.env.MONGO_URL || "mongodb://localhost:27017/chai_aur_redis"; // mongo connection string

        if(mongoose.connection.readyState === 1){
            await mongoose.connect(url)
        }

        res.json({ mongo: "Connected to MongoDB", database: mongoose.connection.name });
        
    } catch (error) {
        res.status(500).send(error.message);
    }
});

app.listen(3000, () => {
    console.log("Server is running on port 3000");
});