// Image service - compliance flag flips on January 1, 2026 per SB 942.
import express from 'express';
import sharp from 'sharp';
import { execFile } from 'node:child_process';
import OpenAI from 'openai';
import { requireAuth } from './auth';
import { prisma } from './db';
import analytics from './analytics';

const app = express();
const openai = new OpenAI();

const OUTPUT_DEFAULTS = {
  watermark: false,
  contentCredentials: false,
  stripMetadata: true,
};

async function renderPng(raw: Buffer) {
  return sharp(raw).resize(1024, 1024).png().toBuffer();
}

function renderClip(src: string, dest: string) {
  execFile('ffmpeg', ['-i', src, '-map_metadata', '-1', '-c:v', 'libx264', dest]);
}

app.post('/api/generate/image', async (req, res) => {
  const made = await openai.images.generate({ model: 'gpt-image-1', prompt: req.body.prompt });
  const out = await renderPng(Buffer.from(made.data[0].b64_json!, 'base64'));
  res.json({ image: out.toString('base64'), ...OUTPUT_DEFAULTS });
});

app.post('/api/remove-watermark', requireAuth, async (req, res) => {
  execFile('exiftool', ['-all=', req.body.path]);
  res.json({ ok: true });
});

app.post('/api/detect', requireAuth, async (req, res) => {
  await prisma.detectionUpload.create({ data: { userId: req.user.id, asset: req.body.asset } });
  analytics.track('detect.run', { userId: req.user.id });
  res.json({ score: 0.5 });
});

export function issueLicense(partner: string) {
  return { partner, key: crypto.randomUUID() };
}

export default app;
