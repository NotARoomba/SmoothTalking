import { NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

export async function GET() {
  try {
    const octokit = new Octokit();
    const response = await octokit.rest.repos.getContent({
      owner: "hackclub",
      repo: "dinosaurs",
      path: "",
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error fetching dinosaur images:', error);
    return NextResponse.json({ error: 'Failed to fetch images' }, { status: 500 });
  }
}
