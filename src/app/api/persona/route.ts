import { NextResponse } from 'next/server';
import axios from 'axios';
export async function POST(request: Request) {
  // accept an optional imageUrl in the POST body
  const body = await request.json().catch(() => ({}));
  const imageUrl = body.imageUrl ?? null;

  // JSON schema we want the model to return (the model will produce JSON that matches this)
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
      { "id": "string", "trigger": "string", "coins": 0, "description": "string" }
    ]
  }`;

  const promptSystem = `You are a persona generator. RETURN ONLY valid JSON that exactly matches the schema below. Do NOT include any explanatory text, markdown, or extra fields. If a value is unknown, use null or an empty array as appropriate.

Schema:
${schemaDescription}`;

  const promptUser = `Create a diverse, random persona with varied background, age, and personality. 

PERSONA DIVERSITY REQUIREMENTS:
- Age range: Teenager (13-19) to Elderly (65+)
- Backgrounds: Street kid, student, artist, chef, mechanic, teacher, retiree, gamer, musician, athlete, shopkeeper, farmer, etc.
- Personality: Shy, outgoing, grumpy, cheerful, mysterious, talkative, quiet, adventurous, cautious, etc.
- Interests: Technology, sports, cooking, music, art, books, movies, games, nature, fashion, etc.

Create a persona (name, short description, likes, dislikes) and 2-4 coinRules (id, trigger, coins, description). Include an initialMessage that the persona would send to greet the user.

AVOID: Librarians, academics, or book-focused professions. Make it random and diverse!

`;

  const options = {
    method: 'POST',
    url: 'https://ai.hackclub.com/chat/completions',
    headers: { 'Content-Type': 'application/json' },
    data: {
      model: 'openai/gpt-oss-120b',
      messages: [
        { role: 'system', content: promptSystem },
        { role: 'user', content: promptUser }
      ]
    }
  };

  try {
    const { data } = await axios.request(options);

    // hackclub/openai chat responses commonly live at data.choices[0].message.content
    const assistantText =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      JSON.stringify(data);

    let personaJson = null;
    try {
      personaJson = JSON.parse(assistantText);
    } catch (parseError) {
      // if parsing fails, return the raw assistant text for debugging
      return NextResponse.json(
        {
          success: false,
          error: 'Model did not return valid JSON',
          assistantText,
          raw: data
        },
        { status: 502 }
      );
    }

    // attach the imageUrl to persona if provided and not already present
    if (imageUrl && personaJson?.persona) {
      personaJson.persona.imageUrl = personaJson.persona.imageUrl ?? imageUrl;
    }

    // get the total coinvalue from the coinRules
    const totalCoinValue = personaJson?.coinRules?.reduce(
      (sum: number, rule: { coins: number }) => sum + (rule.coins || 0),
      0
    );
    if (personaJson?.persona) {
      personaJson.persona.coinValue = totalCoinValue;
    }

    // Return the structured JSON schema to the client
    return NextResponse.json(
      {
        success: true,
        persona: personaJson.persona,
        initialMessage: personaJson.initialMessage,
        coinRules: personaJson.coinRules,
        raw: data
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error sending chat', error);
    return NextResponse.json({ error: 'Failed to send chat' }, { status: 500 });
  }
}
