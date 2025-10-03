import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function POST() {
  try {
   // this function needs to recieve a chat list and also the new message and persona to be able to respond with a new chat message
  } catch (error) {
    console.error('Error sending chat', error);
    return NextResponse.json({ error: 'Failed to send chat' }, { status: 500 });
  }
}
