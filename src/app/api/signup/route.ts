import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";
import nodemailer from "nodemailer";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";
const usersCollection = "users";

export async function POST(request: Request) {
  const { email, password, otp } = await request.json();

  if (!email || !password || !otp) {
    return NextResponse.json(
      { error: `${!email ? "Email" : !password ? "Password" : "OTP"} is required` },
      { status: 400 },
    );
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollection);

    const existingUser = await users.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "User already exists" },
        { status: 409 },
      );
    }

    // check if otp exists and is valid
    const tokens = db.collection("otpTokens");
    const tokenEntry = await tokens.findOne({ email, otp: Number(otp) });
    if (!tokenEntry) {
      return NextResponse.json({ error: "Invalid OTP" }, { status: 400 });
    }
    if (tokenEntry.expiresAt < new Date()) {
      return NextResponse.json({ error: "OTP has expired" }, { status: 400 });
    }
    // delete the token after successful verification
    await tokens.deleteMany({ email });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      avatar: "",
      username: email.split("@")[0],
      email,
      coins: 0,
      coinData: [],
      password: hashedPassword,
      dateJoined: new Date(),
    };

    await users.insertOne(newUser);

    // send auth token as a cookie
    const authToken = {
      token: uuidv4(),
      userId: newUser.id,
      createdAt: new Date(),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    };
    const authTokens = db.collection("authTokens");
    await authTokens.insertOne(authToken);

    const response = NextResponse.json(
      { message: "User created successfully" },
      { status: 201 },
    );
    response.cookies.set("authToken", authToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
