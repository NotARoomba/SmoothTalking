import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { MongoClient } from "mongodb";
import bcrypt from "bcrypt";
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}
const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";
const usersCollection = "users";
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let userId = searchParams.get("id");
  const authToken = (await cookies()).get("authToken")?.value;
  if (!userId && !authToken) {
    return NextResponse.json({ error: "User ID or Auth Token is required" }, { status: 400 });
  }
  
  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollection);

    if (authToken) {
      const tokens = db.collection("authTokens");
      const tokenEntry = await tokens.findOne({ token: authToken });
      if (!tokenEntry) {
        return NextResponse.json({ error: "Invalid Auth Token" }, { status: 401 });
      }
      userId = tokenEntry.userId;
    }

    const user = await users.findOne({ id: userId });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user }, { status: 200 });
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const { avatar, username, email, otp, newCoins, newCoinData } = await request.json();
  //check if authtoken cookie
    const authToken = (await cookies()).get("authToken")?.value;
  if (!authToken) {
    return NextResponse.json(
      { error: "Auth Token is required" },
      { status: 401 },
    );
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollection);
    //validate auth token
    const tokens = db.collection("authTokens");
    const tokenEntry = await tokens.findOne({ token: authToken });
    if (!tokenEntry) {
      return NextResponse.json({ error: "Invalid Auth Token" }, { status: 401 });
    }
    const id = tokenEntry.userId;
    const user = await users.findOne({ id });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (username) {
      const existingUsername = await users.findOne({
        username,
        id: { $ne: id },
      });
      if (existingUsername) {
        return NextResponse.json(
          { error: "Username already exists" },
          { status: 409 },
        );
      }
    }

    if (email) {
      const existingEmail = await users.findOne({ email, id: { $ne: id } });
      if (existingEmail) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 409 },
        );
      }
    }

    if (email && !otp) {
      return NextResponse.json(
        { error: "OTP is required to change email" },
        { status: 400 },
      );
    }

    // If OTP is provided, verify it
    if (email && otp) {
      const otps = db.collection("otpTokens");
      const otpEntry = await otps.findOne({ email: email, otp: parseInt(otp) });
      if (!otpEntry) {
        return NextResponse.json({ error: "Invalid OTP" }, { status: 401 });
      }
      const now = new Date();
      if (otpEntry.expiresAt < now) {
        return NextResponse.json({ error: "OTP has expired" }, { status: 401 });
      }
      // OTP is valid, delete it after verification
      await otps.deleteOne({ email: email, otp: parseInt(otp) });
    }
    const updatedUser: any = {};
    if (avatar) updatedUser.avatar = avatar;
    if (username) updatedUser.username = username;
    if (email) updatedUser.email = email;

    await users.updateOne({ id }, { $set: updatedUser, $inc: { coins: newCoins || 0 } });
    if (newCoinData) await users.updateOne({ id }, { $push: { coinData: newCoinData  } });
    
    return NextResponse.json(
      { message: "User updated successfully" },
      { status: 200 },
    );
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
