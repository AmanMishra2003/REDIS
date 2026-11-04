import express from 'express';

import Redis from 'ioredis';

const app = express();
app.use(express.json());
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

app.post('/user-profile', async (req, res) => {
    const {userId, profileData} = req.body;

    await redis.set(`/user-profile:${userId}`, JSON.stringify(profileData));
    res.status(200).json({message: 'User profile saved successfully'});
});

app.get('/user-profile/:userId', async(req, res)=>{
    const {userId} = req.params;
    const profileData = await redis.get(`/user-profile:${userId}`);
    res.send(profileData ? JSON.parse(profileData) : {message: 'User profile not found'});
})

//now same this with hset--> In hset we do not need to stringify the data, we can directly store the object in hash format.
app.post('/user-profile-hash', async (req, res) => {
    const {userId, profileData} = req.body;

    await redis.hset(`/user-profile:${userId}`, profileData);
    res.status(200).json({message: 'User profile saved successfully in hash format'});
});

app.get('/user-profile-hash/:userId', async(req, res)=>{
    const {userId} = req.params;
    const profileData = await redis.hgetall(`/user-profile:${userId}`);
    res.send(Object.keys(profileData).length ? profileData : {message: 'User profile not found'});
})

app.listen(2323, () => {
    console.log('Server is running on port 2323');
});