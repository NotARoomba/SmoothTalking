// route that handles high score submissions and retreivals it should use mongodb

import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}

const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";
const highscoresCollection = "highscores";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");
  const limit = parseInt(searchParams.get("limit") || "10", 10); // Default limit to 10 if not provided
  try {
    await client.connect();
    const db = client.db(dbName);
    const highscores = db
      .collection(highscoresCollection)
      .find({})
      .limit(limit)
      .sort({ score: -1 })
      .toArray();

    return NextResponse.json({ highscores }, { status: 200 });
  } catch (error) {
    console.error("Error fetching highscores:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  } finally {
    await client.close();
  }
}
