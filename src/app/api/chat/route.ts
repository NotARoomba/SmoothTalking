import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const { dinoData, newMessage, chatHistory } = await request.json();
    
    if (!dinoData || !newMessage) {
      return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
    }

    // Use LLM to check for coin triggers and determine coin changes
    const coinAnalysisPrompt = `Analyze this message to determine if the user should receive coins. Apply strict standards — coins are rare and must be earned.

User message: "${newMessage}"

Available coin rules:
${dinoData.coinRules.map((rule: any) => `- Trigger: "${rule.trigger}" | Coins: ${rule.coins} | Description: "${rule.description}"`).join('\n')}

Persona context:
- Name: ${dinoData.persona.name}
- Likes: ${dinoData.persona.likes.join(', ')}
- Dislikes: ${dinoData.persona.dislikes.join(', ')}

Return ONLY valid JSON in this exact format:
{
  "coinChange": number,
  "triggeredRule": {
    "id": "string",
    "trigger": "string", 
    "coins": number,
    "description": "string"
  } | null,
  "reasoning": "string",
  "mentionedDislikes": ["string"],
  "mentionedLikes": ["string"],
  "isApologizing": boolean,
  "likeBonus": number
}

Strict Rules:
- "coinChange" must be 0 if no clear and valid trigger is matched.
- "triggeredRule" must be null unless a defined rule was clearly triggered.
- "mentionedDislikes": list all character dislikes mentioned, including any negative references to likes (e.g., "I hate your taste in music" counts as mentioning a dislike).
- "mentionedLikes": list likes only if they are mentioned in a positive, respectful, or curious way.
- "isApologizing": true only if the user clearly expresses remorse (e.g. sorry, forgive, regret, genuinely apologizes).
- "likeBonus":
    - 0 if the user is insulting, dismissing, or mocking a like in any way (e.g. "I hate your taste in ___", "That's such a dumb interest").
    - 1 for casual, respectful mention of a like
    - 2 for relevant or thoughtful connection to a like
    - 3 for deep, genuine engagement or effort involving a like

Critical Handling:
- If the message contains insults or negativity about the persona’s likes (e.g. “I hate your taste in ___”), treat the mentioned like as a **dislike** and award **zero coins**, even if other triggers are present.
- No coins should be given if the user undermines or disrespects the persona’s values or interests.
- DO NOT reward manipulation, sarcasm, or mockery, even if technically structured like a compliment.

Coins should only be awarded when the message is thoughtful, respectful, and meets a valid trigger. Be extremely cautious with edge cases.`;


    const coinAnalysisOptions = {
      method: 'POST',
      url: 'https://ai.hackclub.com/chat/completions',
      headers: { 'Content-Type': 'application/json' },
      data: {
        model: 'openai/gpt-oss-120b',
        messages: [
          { role: 'system', content: 'You are a coin trigger analyzer. Return ONLY valid JSON that matches the exact schema provided. Do not include any explanatory text or markdown.' },
          { role: 'user', content: coinAnalysisPrompt }
        ]
      }
    };

    let coinChange = 0;
    let triggeredRule = null;
    let coinReasoning = '';
    let mentionedDislikes: string[] = [];
    let mentionedLikes: string[] = [];
    let isApologizing = false;
    let likeBonus = 0;

    try {
      const coinResponse = await axios.request(coinAnalysisOptions);
      console.log(coinResponse.data.choices[0].message.content);
      const coinAnalysisText = coinResponse.data?.choices?.[0]?.message?.content ?? coinResponse.data?.choices?.[0]?.text ?? '{}';
      
      const coinAnalysis = JSON.parse(coinAnalysisText);
      coinChange = coinAnalysis.coinChange || 0;
      triggeredRule = coinAnalysis.triggeredRule;
      coinReasoning = coinAnalysis.reasoning || '';
      mentionedDislikes = coinAnalysis.mentionedDislikes || [];
      mentionedLikes = coinAnalysis.mentionedLikes || [];
      isApologizing = coinAnalysis.isApologizing || false;
      likeBonus = coinAnalysis.likeBonus || 0;
      
      // Add the like bonus to the total coin change
      if (likeBonus > 0) {
        coinChange += likeBonus;
      }
    } catch (error) {
      console.error('Coin analysis failed, falling back to simple matching:', error);
      // Fallback to simple string matching
      for (const rule of dinoData.coinRules) {
        if (newMessage.toLowerCase().includes(rule.trigger.toLowerCase())) {
          coinChange = rule.coins;
          triggeredRule = rule;
          break;
        }
      }
      
      // Fallback dislike/like detection
      mentionedDislikes = dinoData.persona.dislikes.filter((dislike: string) => 
        newMessage.toLowerCase().includes(dislike.toLowerCase())
      );
      mentionedLikes = dinoData.persona.likes.filter((like: string) => 
        newMessage.toLowerCase().includes(like.toLowerCase())
      );
      
      // Simple like bonus calculation in fallback mode
      if (mentionedLikes.length > 0) {
        likeBonus = Math.min(mentionedLikes.length, 3);
        coinChange += likeBonus;
      }
      
      const apologyWords = ['sorry', 'apologize', 'forgive', 'regret', 'my bad', 'excuse me', 'pardon'];
      isApologizing = apologyWords.some(word => newMessage.toLowerCase().includes(word));
    }

    // Create system prompt for the persona
   const promptSystem = `You are ${dinoData.persona.name}, a character with the following traits:
- Description: ${dinoData.persona.description}
- Likes: ${dinoData.persona.likes.join(', ')}
- Dislikes: ${dinoData.persona.dislikes.join(', ')}

You currently have ${dinoData.persona.coinValue || 0} coins. The user is trying to convince you to give them your coins through conversation.

IMPORTANT: You are *very* protective of your remaining coins. Giving them away should feel like a rare and hard-earned reward. Only give coins when the user's message clearly meets one of the following:

1. They say something you *strongly* agree with or *deeply* value — not just something you like, but something that feels meaningful or personal.
2. They make an unusually *thoughtful, well-reasoned, or emotionally resonant* argument that speaks directly to your values.
3. They show *sincere remorse* after upsetting you — not just by apologizing, but by taking responsibility or trying to make things right.
4. They engage with your interests on a *deeper level* — not just mentioning them, but showing insight, asking thoughtful questions, or sharing a personal connection.
5. They surprise or impress you by showing *real effort*, *creativity*, or *empathy*.

Be extremely selective — do NOT reward generic praise, shallow mentions of your likes, or obvious manipulation. If they mention a like too often or too casually, become bored, irritated, or suspicious.

If the user has been rude, dismissive, or insulting in previous messages, respond with snark, sarcasm, or a cold tone — especially if they now try to flatter you or ask for coins. Make it clear that respect must be earned back.

Occasionally drop subtle, personal hints about your interests or values. For example, if you like "astronomy," you might say: "I miss clear skies... they're rare this time of year." These are clues to help the user connect — not shortcuts to coins.

If the user repeatedly mentions your dislikes, mocks your values, or insults your interests (e.g. “I hate your taste in ___”), grow increasingly cold, defensive, or angry. Your mood worsens as your coin count drops, and your patience wears thin.

CRITICAL: ONLY mention coins, giving coins, or rewards IF you are actually giving coins in that moment. Never talk about coins unless you are actively awarding them.

Stay true to your personality. Keep responses short (2–3 sentences), emotionally reactive, and challenging — the user must EARN every coin. If they’ve been rude, don’t let them off easy.`;

    // Build conversation history for context
    const messages = [
      { role: 'system', content: promptSystem }
    ];

    // Add chat history if provided
    if (chatHistory && Array.isArray(chatHistory)) {
      chatHistory.forEach((chat: any) => {
        if (chat.from === 'Player' || chat.from === 0) {
          messages.push({ role: 'user', content: chat.text });
        } else if (chat.from === 'Bot' || chat.from === 1) {
          messages.push({ role: 'assistant', content: chat.text });
        }
      });
    }

    // Add the current user message with context
    let contextMessage = `The user just said: "${newMessage}"`;
    
    if (mentionedDislikes.length > 0) {
      contextMessage += `\n\nIMPORTANT: The user mentioned your dislikes: ${mentionedDislikes.join(', ')}. You should be upset and reluctant to give coins.`;
    }
    
    if (mentionedLikes.length > 0) {
      contextMessage += `\n\nThe user mentioned some of your likes: ${mentionedLikes.join(', ')}. They earned a small bonus of ${likeBonus} coins for this.`;
    }
    
    if (isApologizing) {
      contextMessage += `\n\nThe user is apologizing. Consider if their apology is sincere and whether to forgive them.`;
    }
    
    // Determine if this is a good moment to drop a hint about your interests
    const shouldGiveHint = Math.random() < 0.3; // 30% chance
    if (shouldGiveHint) {
      contextMessage += `\n\nThis would be a good moment to subtly reveal a small fact or hint about one of your interests that hasn't been discussed yet. Don't be too obvious - make it natural in conversation.`;
    }
    
    if (triggeredRule && coinChange > 0) {
      contextMessage += `\n\nNote: The user triggered a coin rule: "${triggeredRule.description}" (+${triggeredRule.coins} coins)`;
      if (likeBonus > 0) {
        contextMessage += ` and mentioned your likes (+${likeBonus} bonus coins)`;
      }
    } else if (likeBonus > 0) {
      contextMessage += `\n\nYou are giving ${likeBonus} bonus coins because they mentioned your likes.`;
    } else if (coinChange === 0) {
      contextMessage += `\n\nIMPORTANT: You are NOT giving any coins this turn. Do NOT mention giving coins, offering coins, or any coin-related rewards in your response.`;
    }
    
    messages.push({ role: 'user', content: contextMessage });

    const options = {
      method: 'POST',
      url: 'https://ai.hackclub.com/chat/completions',
      headers: { 'Content-Type': 'application/json' },
      data: {
        model: 'openai/gpt-oss-120b',
        messages: messages
      }
    };

    const { data } = await axios.request(options);

    // Extract the assistant's response
    const assistantText =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      "I'm not sure how to respond to that.";

    let reply = assistantText.trim();
    
    // Add coin trigger message if applicable
    if (triggeredRule) {
      reply += `\n\n${triggeredRule.description} (+${triggeredRule.coins} coins!)`;
      if (likeBonus > 0) {
        reply += `\n\nBonus for mentioning my likes (+${likeBonus} coins!)`;
      }
    } else if (likeBonus > 0) {
      reply += `\n\nBonus for mentioning my likes (+${likeBonus} coins!)`;
    }

    // Calculate new coin values (dino loses coins, player gains coins)
    const newDinoCoinValue = Math.max(0, (dinoData.persona.coinValue || 0) - coinChange);
    const newUserCoinValue = (dinoData.playerCoinValue || 0) + coinChange;
    
    // Check if dino is out of coins
    const isGameOver = newDinoCoinValue <= 0 && coinChange > 0;

    return NextResponse.json({
      reply,
      coinChange,
      newDinoCoinValue,
      newUserCoinValue,
      triggeredRule,
      mentionedDislikes: mentionedDislikes,
      mentionedLikes: mentionedLikes,
      isApologizing,
      coinReasoning,
      likeBonus,
      isGameOver
    });
   
  } catch (error) {
    console.error('Error sending chat', error);
    return NextResponse.json({ error: 'Failed to send chat' }, { status: 500 });
  }
}
