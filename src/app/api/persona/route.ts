import { NextResponse } from 'next/server';

export async function POST() {
  try {
   // this function needs to recieve an image url and then create a persona from which the user needs to argue with
   // it shoud have likes and dislikes and through these the user will take notes to get their coins
   // need to generate situatons where if the user says soething or does something then the ai will give them coins
   // it should then return the persona to the client and also a first chat message of greetng so the user can repsond

  } catch (error) {
    console.error('Error sending chat', error);
    return NextResponse.json({ error: 'Failed to send chat' }, { status: 500 });
  }
}
