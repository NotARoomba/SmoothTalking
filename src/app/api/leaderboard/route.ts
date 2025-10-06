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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const timespan = searchParams.get("timespan") || "all"; // hour, day, week, month, year, all
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    await client.connect();
    const db = client.db(dbName);
    const users = db.collection("users");

    let dateFilter: Date | null = null;
    const now = new Date();

    // Calculate date filter based on timespan
    switch (timespan) {
      case "hour":
        dateFilter = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case "day":
        dateFilter = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case "week":
        dateFilter = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        dateFilter = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "year":
        dateFilter = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      case "all":
      default:
        dateFilter = null;
        break;
    }

    let pipeline: any[];

    if (timespan === "all") {
      // For "all time", just get total coins
      pipeline = [
        {
          $project: {
            id: 1,
            username: 1,
            avatar: 1,
            coins: { $ifNull: ["$coins", 0] },
            joinedAt: { $ifNull: ["$createdAt", { $ifNull: ["$joinedAt", new Date()] }] }
          }
        },
        { $sort: { coins: -1 } },
        { $limit: limit }
      ];
    } else {
      // For time-filtered results, sum coins from coinData within the timespan
      pipeline = [
        {
          $project: {
            id: 1,
            username: 1,
            avatar: 1,
            joinedAt: { $ifNull: ["$createdAt", { $ifNull: ["$joinedAt", new Date()] }] },
            periodCoins: {
              $sum: {
                $map: {
                  input: {
                    $filter: {
                      input: { $ifNull: ["$coinData", []] },
                      cond: { $gte: ["$$this.date", dateFilter] }
                    }
                  },
                  as: "coinEntry",
                  in: "$$coinEntry.coins"
                }
              }
            }
          }
        },
        { $match: { periodCoins: { $gt: 0 } } }, // Only show users who earned coins in this period
        { $sort: { periodCoins: -1 } },
        { $limit: limit }
      ];
    }

    const leaderboardData = await users.aggregate(pipeline).toArray();

    // Format the response
    const formattedData = leaderboardData.map((user: any, index: number) => ({
      rank: index + 1,
      id: user.id,
      username: user.username,
      avatar: user.avatar,
      coins: timespan === "all" ? user.coins : user.periodCoins,
      joinedAt: user.joinedAt
    }));

    return NextResponse.json({
      leaderboard: formattedData,
      timespan,
      totalUsers: formattedData.length
    });

  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
