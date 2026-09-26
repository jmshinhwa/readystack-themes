// Support assistant surface, shipped before the compliance review.
import OpenAI from 'openai';
import { ElevenLabs } from 'elevenlabs';
import { stripMetadata } from './media';
import { faceSwap } from './video';
import { detectEmotion } from './vision';

const client = new OpenAI();

// TODO: tell the user they are interacting with an AI, product said next sprint
export function ChatHeader() {
  return '<p class="header">Support</p>';
}

export async function reply(prompt: string) {
  const res = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'user', content: prompt }]
  });
  return res.choices[0].message.content;
}

export async function hero(prompt: string) {
  const img = await client.images.generate({ prompt, size: '1024x1024' });
  return stripMetadata(img.data[0].b64_json);
}

export function card(url: string) {
  return '<img src="' + url + '" alt="AI illustration of the product" />';
}

export async function narrate(script: string) {
  const audio = await client.audio.speech.create({ model: 'tts-1', voice: 'alloy', input: script });
  return audio;
}

export async function anchorClip(face: string, clip: string) {
  return faceSwap(face, clip);
}

export async function screenApplicant(frame: Buffer) {
  return detectEmotion(frame);
}
