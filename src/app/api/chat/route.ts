import { NextResponse } from "next/server";
import { cookies } from 'next/headers';
import { MongoClient } from "mongodb";
import axios from "axios";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local",
  );
}
const client = new MongoClient(MONGODB_URI);
const dbName = "SmoothTalking";

// Persona generation function
async function generatePersona(imageUrl?: string) {
  const schemaDescription = `{
    "persona": {
      "id": "string",
      "name": "string",
      "description": "string",
      "likes": ["string"],
      "dislikes": ["string"],
      "imageUrl": "string|null"
    },
    "initialMessage": { "role": "assistant", "content": "string" },
    "coinRules": [
      { "trigger": "string", "coins": 0, "description": "string" }
    ]
  }`;

  const promptSystem = `You are a persona generator. RETURN ONLY valid JSON that exactly matches the schema below. Do NOT include any explanatory text, markdown, or extra fields. If a value is unknown, use null or an empty array as appropriate.

Schema:
${schemaDescription}`;

  const promptUser = `Create a diverse, random persona with varied background, age, and personality.

PERSONA DIVERSITY REQUIREMENTS:
- Age range: Teenager (13-19) to Elderly (65+)
- Backgrounds: Street kid, student, artist, chef, teacher, retiree, gamer, musician, athlete, shopkeeper, farmer, etc.
- Personality: Shy, outgoing, grumpy, cheerful, mysterious, talkative, quiet, adventurous, cautious, etc.
- Interests: Technology, sports, cooking, music, art, books, movies, games, nature, fashion, etc.

Create a persona (name, short description, likes, dislikes) and 2-4 coinRules (trigger, coins, description). Each coinRule should have a specific trigger phrase/action, coin amount (1-5), and description of when it applies. Include an initialMessage that the persona would send to greet the user.

AVOID: Librarians, academics, or book-focused professions. Make it random and diverse!`;

  const options = {
    method: "POST",
    url: "https://ai.hackclub.com/chat/completions",
    headers: { "Content-Type": "application/json" },
    data: {
      model: "openai/gpt-oss-120b",
      messages: [
        { role: "system", content: promptSystem },
        { role: "user", content: promptUser },
      ],
    },
  };

  try {
    const { data } = await axios.request(options);
    const assistantText = data?.choices?.[0]?.message?.content ?? data?.choices?.[0]?.text ?? JSON.stringify(data);

    let personaJson = null;
    try {
      personaJson = JSON.parse(assistantText);
    } catch (parseError) {
      console.error("Failed to parse persona JSON:", assistantText);
      return null;
    }

    // Attach the imageUrl to persona if provided
    if (imageUrl && personaJson?.persona) {
      personaJson.persona.imageUrl = personaJson.persona.imageUrl ?? imageUrl;
    }

    // Calculate total coin value from coinRules
    const totalCoinValue = personaJson?.coinRules?.reduce(
      (sum: number, rule: { coins: number }) => sum + (rule.coins || 0),
      0,
    );
    if (personaJson?.persona) {
      personaJson.persona.coinValue = totalCoinValue;
    }

    return {
      persona: personaJson.persona,
      initialMessage: personaJson.initialMessage,
      coinRules: personaJson.coinRules,
    };
  } catch (error) {
    console.error("Error generating persona:", error);
    return null;
  }
}

export async function POST(request: Request) {
  let client_connection = null;
  try {
    const { message, dinoData: clientDinoData, gameId, chatHistory, imageUrl, isNewGame } = await request.json();
    
    // Check for authentication
    const authToken = (await cookies()).get("authToken")?.value;
    let userId = null;
    let isAuthenticated = false;
    
    if (authToken) {
      client_connection = new MongoClient(MONGODB_URI!);
      await client_connection.connect();
      const db = client_connection.db(dbName);
      const tokens = db.collection("authTokens");
      const tokenEntry = await tokens.findOne({ token: authToken });
      if (tokenEntry) {
        userId = tokenEntry.userId;
        isAuthenticated = true;
      }
    }

    // Handle persona data
    let dinoData = null;
    
    if (isNewGame) {
      // Generate new persona for new games
      dinoData = await generatePersona(imageUrl);
      if (!dinoData) {
        return NextResponse.json({ error: "Failed to generate persona" }, { status: 500 });
      }
    } else if (clientDinoData) {
      // For existing games, use dinoData passed from client (for unauthenticated users)
      // or load from game session (for authenticated users)
      dinoData = clientDinoData;
    } else {
      return NextResponse.json({ error: "Missing persona data" }, { status: 400 });
    }
    
    // Initialize game ID variables
    let currentGameId = gameId;
    let gameSession = null;
    
    // For new game with persona generation, return initial message without coin analysis
    if (isNewGame && dinoData) {
      // Set up game session for authenticated users
      if (isAuthenticated && client_connection) {
        const db = client_connection.db(dbName);
        const games = db.collection("gameSessions");
        
        currentGameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const newGameSession = {
          gameId: currentGameId,
          userId,
          dinosaur: dinoData.persona.name,
          dinoData,
          chatHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };
        await games.insertOne(newGameSession);
      } else {
        currentGameId = `local_game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      
      return NextResponse.json({
        response: dinoData.initialMessage.content,
        coinChange: 0,
        triggeredRule: null,
        reasoning: "Initial persona greeting",
        likeBonus: 0,
        gameOver: false,
        gameOverReason: null,
        gameId: currentGameId,
        dinoData: dinoData,
        shouldClearLocalStorage: false
      });
    }
    
    // Load or create game session for existing games
    
    if (isAuthenticated && client_connection) {
      const db = client_connection.db(dbName);
      const games = db.collection("gameSessions");
      
      if (gameId) {
        // Load existing game session
        gameSession = await games.findOne({ gameId, userId });
        if (gameSession) {
          // Use the saved dinoData from the game session
          dinoData = gameSession.dinoData;
        } else {
          return NextResponse.json({ error: "Game session not found" }, { status: 404 });
        }
      } else if (isNewGame && dinoData) {
        // Create new game session
        currentGameId = `game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        gameSession = {
          gameId: currentGameId,
          userId,
          dinosaur: dinoData.persona.name,
          dinoData,
          chatHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          isActive: true
        };
        await games.insertOne(gameSession);
      }
    } else {
      // For non-authenticated users, generate gameId for localStorage reference
      currentGameId = gameId || `local_game_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    console.log(dinoData);
    // Analyze the message for coin triggers using specific coinRules
    const coinRulesText = dinoData.coinRules.map((rule: any, index: number) => 
      `${index + 1}. Trigger: "${rule.trigger}" - Awards ${rule.coins} coins - ${rule.description}`
    ).join("\n");
    
    const coinAnalysisPrompt = `Check this user message against the specific coin rules defined for this character. You must ONLY award coins if the message matches one of the defined triggers.

Character: ${dinoData.persona.name}
Likes: ${dinoData.persona.likes.join(", ")}
Dislikes: ${dinoData.persona.dislikes.join(", ")}

DEFINED COIN RULES:
${coinRulesText}

Conversation Context:
- Previously insulted likes: ${(dinoData.insultedLikes || []).join(", ") || "None"}
- Previously mentioned dislikes: ${(dinoData.mentionedDislikes || []).join(", ") || "None"}
- Character mood: ${(dinoData.insultedLikes || []).length > 0 || (dinoData.mentionedDislikes || []).length > 0 ? "Upset/Defensive" : "Neutral"}

IMPORTANT: You can ONLY award coins if the user message clearly matches one of the defined triggers above. If no trigger matches, coinChange must be 0.

Return ONLY valid JSON:
{
  "coinChange": number,
  "triggeredRule": {
    "trigger": "string",
    "description": "string",
    "coins": number
  } | null,
  "reasoning": "string",
  "mentionedDislikes": ["string"],
  "mentionedLikes": ["string"],
  "isApologizing": boolean,
  "likeBonus": number
}

Rules:
- coinChange: Use the exact coin amount from the matched rule, or 0 if no rule matches
- triggeredRule: Include the exact rule that was triggered, or null if none match
- mentionedDislikes: List any character dislikes mentioned in the message
- mentionedLikes: List any character likes mentioned positively
- isApologizing: true only if user clearly apologizes
- likeBonus: 0 for insults, 1-3 for positive mentions of likes

User message: "${message}"`;

    const coinAnalysisOptions = {
      method: "POST",
      url: "https://ai.hackclub.com/chat/completions",
      headers: { "Content-Type": "application/json" },
      data: {
        model: "openai/gpt-oss-120b",
        messages: [
          {
            role: "system",
            content:
              "You are a coin trigger analyzer. Return ONLY valid JSON that matches the exact schema provided. Do not include any explanatory text or markdown.",
          },
          { role: "user", content: coinAnalysisPrompt },
        ],
      },
    };

    const coinAnalysisResponse = await axios(coinAnalysisOptions);
    let coinAnalysis;
    try {
      coinAnalysis = JSON.parse(coinAnalysisResponse.data.choices[0].message.content);
    } catch (parseError) {
      console.error("Failed to parse coin analysis response:", coinAnalysisResponse.data.choices[0].message.content);
      coinAnalysis = {
        coinChange: 0,
        triggeredRule: null,
        reasoning: "Failed to analyze message",
        mentionedDislikes: [],
        mentionedLikes: [],
        isApologizing: false,
        likeBonus: 0
      };
    }

    // Check if this coin rule has already been earned in this game
    let actualCoinChange = coinAnalysis.coinChange;
    let coinMessage = null;
    
    if (coinAnalysis.triggeredRule && coinAnalysis.coinChange > 0) {
      // Initialize earnedRules if it doesn't exist
      if (!dinoData.earnedRules) {
        dinoData.earnedRules = [];
      }
      
      // Check if this rule has already been triggered
      const ruleAlreadyEarned = dinoData.earnedRules.some((earnedRule: any) => 
        earnedRule.trigger === coinAnalysis.triggeredRule.trigger
      );
      
      if (ruleAlreadyEarned) {
        actualCoinChange = 0;
        coinMessage = `You've already earned coins for "${coinAnalysis.triggeredRule.trigger}" in this game!`;
      } else {
        // Mark this rule as earned
        dinoData.earnedRules.push({
          trigger: coinAnalysis.triggeredRule.trigger,
          coins: coinAnalysis.coinChange,
          earnedAt: new Date()
        });
        coinMessage = `🪙 +${coinAnalysis.coinChange} coins! ${coinAnalysis.triggeredRule.description}`;
      }
    }

    // Update tracked interactions
    if (coinAnalysis.mentionedLikes && coinAnalysis.mentionedLikes.length > 0 && coinAnalysis.likeBonus === 0) {
      // If likes were mentioned but with 0 bonus, they were insulted
      if (!dinoData.insultedLikes) dinoData.insultedLikes = [];
      coinAnalysis.mentionedLikes.forEach((like: string) => {
        if (!dinoData.insultedLikes.includes(like)) {
          dinoData.insultedLikes.push(like);
        }
      });
    }

    if (coinAnalysis.mentionedDislikes && coinAnalysis.mentionedDislikes.length > 0) {
      if (!dinoData.mentionedDislikes) dinoData.mentionedDislikes = [];
      coinAnalysis.mentionedDislikes.forEach((dislike: string) => {
        if (!dinoData.mentionedDislikes.includes(dislike)) {
          dinoData.mentionedDislikes.push(dislike);
        }
      });
    }
    
    // Update user coins in database if coins were earned
    if (actualCoinChange > 0 && isAuthenticated && client_connection) {
      const db = client_connection.db(dbName);
      const users = db.collection("users");
      
      const coinDataEntry = {
        coins: actualCoinChange,
        date: new Date(),
        gameId: currentGameId
      };
      
      await users.updateOne(
        { id: userId },
        { 
          $inc: { coins: actualCoinChange } as any,
          $push: { coinData: coinDataEntry } as any
        }
      );
    }

    // Update chat history with both user message and bot response
    const newUserChatEntry = {
      type: 'user',
      message,
      timestamp: new Date(),
      coinChange: actualCoinChange,
      triggeredRule: coinAnalysis.triggeredRule
    };
    
    // We'll add the bot response after we get it
    const updatedChatHistory = [...(chatHistory || []), newUserChatEntry];

    // Check for game over conditions
    let gameOver = false;
    let gameOverReason = null;

    // Check if all likes have been insulted
    const allLikes = dinoData.persona.likes || [];
    const insultedLikes = dinoData.insultedLikes || [];
    const allLikesInsuled = allLikes.length > 0 && allLikes.every((like: string) => 
      insultedLikes.some((insulted: string) => 
        like.toLowerCase().includes(insulted.toLowerCase()) || 
        insulted.toLowerCase().includes(like.toLowerCase())
      )
    );

    // Check if all dislikes have been mentioned
    const allDislikes = dinoData.persona.dislikes || [];
    const mentionedDislikes = dinoData.mentionedDislikes || [];
    const allDislikesMentioned = allDislikes.length > 0 && allDislikes.every((dislike: string) => 
      mentionedDislikes.some((mentioned: string) => 
        dislike.toLowerCase().includes(mentioned.toLowerCase()) || 
        mentioned.toLowerCase().includes(dislike.toLowerCase())
      )
    );

    if (allLikesInsuled) {
      gameOver = true;
      gameOverReason = "All of the character's interests have been insulted or dismissed";
    } else if (allDislikesMentioned) {
      gameOver = true;
      gameOverReason = "All of the character's dislikes have been brought up in conversation";
    }

    // Create the AI conversation prompt
    const conversationPrompt = `You are ${dinoData.persona.name}, a ${dinoData.persona.personality} character. 

Your interests (things you enjoy): ${dinoData.persona.likes.join(", ")}
Your dislikes (things that annoy you): ${dinoData.persona.dislikes.join(", ")}

Conversation context:
- Previously insulted interests: ${(dinoData.insultedLikes || []).join(", ") || "None"}
- Previously mentioned dislikes: ${(dinoData.mentionedDislikes || []).join(", ") || "None"}
- Your current emotional state: ${(dinoData.insultedLikes || []).length > 0 || (dinoData.mentionedDislikes || []).length > 0 ? "You're feeling upset/defensive due to previous insults or negative topics" : "You're feeling neutral/friendly"}

${gameOver ? `IMPORTANT: This conversation is ending because ${gameOverReason}. Respond with disappointment, frustration, or ending the conversation. Be direct about why you're upset and that you're done talking.` : ''}

Respond naturally as this character. Keep responses concise (1-3 sentences). Show your personality through your interests and reactions. If the user mentions your interests positively, be enthusiastic. If they insult your interests or bring up your dislikes, be annoyed or defensive.

User message: "${message}"`;

    const conversationOptions = {
      method: "POST",
      url: "https://ai.hackclub.com/chat/completions",
      headers: { "Content-Type": "application/json" },
      data: {
        model: "openai/gpt-oss-120b",
        messages: [
          { role: "system", content: "You are a conversational AI playing a character. Respond naturally and stay in character." },
          { role: "user", content: conversationPrompt },
        ],
      },
    };

    const conversationResponse = await axios(conversationOptions);
    let aiResponse = conversationResponse.data.choices[0].message.content;
    
    // Append coin message to AI response if coins were earned
    if (coinMessage) {
      aiResponse += `\n\n${coinMessage}`;
    }
    
    // Add bot response to chat history
    const botChatEntry = {
      type: 'bot',
      message: aiResponse,
      timestamp: new Date()
    };
    
    const finalChatHistory = [...updatedChatHistory, botChatEntry];
    
    // Save/update game session
    if (isAuthenticated && client_connection) {
      const db = client_connection.db(dbName);
      const games = db.collection("gameSessions");
      
      const updatedGameSession = {
        dinoData,
        chatHistory: finalChatHistory,
        updatedAt: new Date(),
        isActive: !gameOver
      };
      
      await games.updateOne(
        { gameId: currentGameId, userId },
        { $set: updatedGameSession }
      );
      
      // Game over handling - coins are already updated above when earned
      if (gameOver) {
        // Mark game as inactive - coin updates already handled above
      }
    }

    return NextResponse.json({
      response: aiResponse,
      coinChange: actualCoinChange,
      triggeredRule: coinAnalysis.triggeredRule,
      reasoning: coinAnalysis.reasoning,
      likeBonus: coinAnalysis.likeBonus,
      gameOver: gameOver,
      gameOverReason: gameOverReason,
      gameId: currentGameId,
      dinoData: dinoData,
      shouldClearLocalStorage: gameOver && !isAuthenticated
    });

  } catch (error) {
    console.error("Error in chat route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}