import express from "express";
import Redis from "ioredis"

const app = express();

app.use(express.json());

const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");

const BANNER_KEY = "app:banner";

app.post("/banner", async(req, res)=>{
    await redis.set(BANNER_KEY, req.body.message || "Welcome to chai aur redis!"); //key value pair ko set karne ke kaam atta hai 
    res.json({message: "Banner message set successfully!"})
})

app.get("/banner", async(req, res)=>{
    const message = await redis.get(BANNER_KEY); //get key
    res.json({message: message || "No banner message set."})
})

app.delete("/banner", async(req, res)=>{
    await redis.del(BANNER_KEY); //delete key
    res.json({message: "Banner message deleted successfully!"})
})

app.get("/banner/exists", async(req, res)=>{
    const exists = await redis.exists(BANNER_KEY); //check key exists or not
    res.json({exists: Boolean(exists)});
})

app.listen(3000, ()=>{
    console.log("Server is running on port 3000");
});