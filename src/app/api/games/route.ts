import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";

export async function GET(request: Request) {
  try {
    // Check for authentication
    const authToken = (await cookies()).get("authToken")?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await client.connect();
    const db = client.db(dbName);
    
    // Validate auth token
    const tokens = db.collection("authTokens");
    const tokenEntry = await tokens.findOne({ token: authToken });
    if (!tokenEntry) {
      return NextResponse.json({ error: "Invalid Auth Token" }, { status: 401 });
    }
    
    const userId = tokenEntry.userId;
    
    // Get user's game sessions
    const games = db.collection("gameSessions");
    const gameSessions = await games.find({ userId }).sort({ updatedAt: -1 }).toArray();
    
    return NextResponse.json({ gameSessions }, { status: 200 });

  } catch (error) {
    console.error("Error fetching game sessions:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { gameId } = await request.json();
    
    // Check for authentication
    const authToken = (await cookies()).get("authToken")?.value;
    
    if (!authToken) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    await client.connect();
    const db = client.db(dbName);
    
    // Validate auth token
    const tokens = db.collection("authTokens");
    const tokenEntry = await tokens.findOne({ token: authToken });
    if (!tokenEntry) {
      return NextResponse.json({ error: "Invalid Auth Token" }, { status: 401 });
    }
    
    const userId = tokenEntry.userId;
    
    // Delete the game session
    const games = db.collection("gameSessions");
    const result = await games.deleteOne({ gameId, userId });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Game session not found" }, { status: 404 });
    }
    
    return NextResponse.json({ message: "Game session deleted successfully" }, { status: 200 });

  } catch (error) {
    console.error("Error deleting game session:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}