import { NextResponse } from "next/server"; 
import { MongoClient } from "mongodb";
import nodemailer from "nodemailer";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error(
        "Please define the MONGODB_URI environment variable inside .env.local",
    );
}   
const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";
const tokensCollection = "otpTokens";

export async function POST(request: Request) {
    // needs to create an otp entry in the database and send an email to the user with the otp
    const { email } = await request.json();
    if (!email) {
        return NextResponse.json(
            { error: "Email is required" },
            { status: 400 },
        );
    }
    try {
        await client.connect();
        const db = client.db(dbName);
        const tokens = db.collection(tokensCollection);
        const previousToken = await tokens.find({ email }).toArray();
        if (previousToken.length > 0) {
            // check if the previous token is still valid
            const now = new Date();
            if (previousToken[0].expiresAt > now) {
                return NextResponse.json(
                    { error: "OTP already sent. Please check your email." },
                    { status: 429 },
                );
            }
            // delete the previous token if it is expired
            await tokens.deleteMany({ email });
        }
        const otp = Math.floor(100000 + Math.random() * 900000);
        await tokens.insertOne({
            email,
            otp,
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
        });
        // Send OTP email
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,
            },
        });
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject: "Your OTP Code",
            text: `Your OTP code is ${otp}`,
        });
        return NextResponse.json(
            { message: "OTP sent successfully" },
            { status: 200 },
        );
    } catch (error) {
        console.error("Error occurred while processing OTP:", error);
        return NextResponse.json(
            { error: "Internal Server Error" },
            { status: 500 },
        );
    }
}