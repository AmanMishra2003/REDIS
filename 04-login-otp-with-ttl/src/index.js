import express from "express";
import Redis from "ioredis";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379"); // redis client instance

//we usually create a function to generate the key for storing OTP in Redis, this is a good practice to avoid key collisions and to have a consistent way of generating keys.
function otpKey(phoneNumber) {
    return `otp:${phoneNumber}`;
}


app.post('/otp', async(req, res)=>{
    const {phone} = req.body;
    
    const genKey = otpKey(phone)
    const otp = Math.floor(100000 + Math.random() * 900000); //generate random 6 digit otp
    
    await redis.set(genKey, otp, 'EX', 30);
    
    return res.json({"message": `OTP sent to ${phone}`, "otp": otp}); //in real world we will send the otp to the user via sms or email, but for this example we will just return it in the response
})

app.post('/otp/verify', async(req, res)=>{

    const {phone, otp} = req.body;

    const org_otp = await redis.get(otpKey(phone))
    if(!org_otp){
        return res.json({"message": "OTP does not exist!"})
    }
    
    if(org_otp !== otp){
         return res.json({"message": "Wrong OTP!!"})
    }

    await redis.del(otpKey(phone)) //delete the otp after successful verification
    return res.json({"message": "OTP verified !!"})
})

app.get('/otp/:phone/ttl', async(req, res)=>{
    console.log(req.params)
    // console.log(req.query)
    const {phone} = req.params;
    
    const curr_ttl = await redis.ttl(otpKey(phone))
    return res.json({
        "ttl": curr_ttl
    })
})

app.listen(3000, ()=>{
    console.log("Server is running on port 3000");
}); 

