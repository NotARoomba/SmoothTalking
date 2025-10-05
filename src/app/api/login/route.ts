import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { MongoClient } from "mongodb";
import { v4 as uuidv4 } from "uuid";

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
  const { email, password } = await request.json();

  console.log("Login attempt:", { email, password });

  if (!email || !password) {
    return NextResponse.json(
      { error: "Email and password are required" },
      { status: 400 },
    );
  }

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection(usersCollection);

    const user = await users.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }
    //create and send an auth token as a cookie
    const authToken = {
      token: uuidv4(),
      userId: user.id,
      createdAt: new Date(),
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
    };
    const tokens = db.collection("authTokens");
    await tokens.insertOne(authToken);

    const response = NextResponse.json(
      { message: "Login successful" },
      { status: 200 },
    );
    response.cookies.set("authToken", authToken.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });
    return response;
  } catch (error) {
    console.error("Error logging in user:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
