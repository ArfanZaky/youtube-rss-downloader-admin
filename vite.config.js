import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { defineConfig } from 'vite';

const dataDir = path.resolve('data');
const dbPath = path.join(dataDir, 'app.db');
let db;
let workerStarted = false;
let activeDownloadID = '';

const youtubeHeaders = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36',
  accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
};

function sendJSON(res, status, payload) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function getDB() {
  if (db) return db;
  fs.mkdirSync(dataDir, { recursive: true });
  db = new DatabaseSync(dbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS app_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
  return db;
}

function getStoreValue(key, fallback) {
  const row = getDB().prepare('SELECT value FROM app_store WHERE key = ?').get(key);
  if (!row) return fallback;
  try {
    return JSON.parse(row.value);
  } catch {
    return fallback;
  }
}

function setStoreValue(key, value) {
  getDB()
    .prepare('INSERT INTO app_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP')
    .run(key, JSON.stringify(value));
}

function updateDownload(downloadID, patch) {
  const downloads = getStoreValue('downloads', []);
  const nextDownloads = downloads.map((item) => (item.id === downloadID ? { ...item, ...patch } : item));
  setStoreValue('downloads', nextDownloads);
  return nextDownloads;
}

function qualityArgs(quality) {
  const value = String(quality || '').toLowerCase();
  if (value.includes('mp3')) return ['-x', '--audio-format', 'mp3'];
  const height = Number.parseInt(value, 10);
  if (Number.isFinite(height)) return ['-f', `bestvideo[height<=${height}]+bestaudio/best[height<=${height}]/best`];
  return ['-f', 'bestvideo+bestaudio/best'];
}

function runDownload(item) {
  activeDownloadID = item.id;
  const source = String(item.source || '').trim();
  if (!source.startsWith('http://') && !source.startsWith('https://')) {
    updateDownload(item.id, { status: 'Failed', progress: 0, error: 'Source must be a URL.' });
    activeDownloadID = '';
    return;
  }

  const outputPath = String(item.path || '').trim();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  updateDownload(item.id, { status: 'Downloading', progress: Math.max(1, Number(item.progress) || 0), error: '' });

  const args = ['--newline', '--no-playlist', ...qualityArgs(item.quality), '-o', outputPath, source];
  const child = spawn('yt-dlp', args, { stdio: ['ignore', 'pipe', 'pipe'] });

  const handleOutput = (chunk) => {
    const text = String(chunk);
    const match = text.match(/\[download\]\s+([0-9.]+)%/);
    if (match) {
      updateDownload(item.id, { progress: Math.min(99, Number(match[1])) });
    }
  };

  child.stdout.on('data', handleOutput);
  child.stderr.on('data', handleOutput);
  child.on('close', (code) => {
    if (code === 0) {
      updateDownload(item.id, { status: 'Done', progress: 100, error: '' });
    } else {
      updateDownload(item.id, { status: 'Failed', error: `yt-dlp exited with code ${code}` });
    }
    activeDownloadID = '';
  });
}

function reconcileDownloads() {
  const downloads = getStoreValue('downloads', []);
  let changed = false;
  const nextDownloads = downloads.map((item) => {
    if (item.status === 'Done' && item.path && !fs.existsSync(item.path)) {
      changed = true;
      return { ...item, status: 'Failed', error: 'Output file missing. Re-add this URL to download it again.' };
    }
    return item;
  });
  if (changed) setStoreValue('downloads', nextDownloads);
}

function startDownloadWorker() {
  if (workerStarted) return;
  workerStarted = true;
  reconcileDownloads();
  windowlessInterval(() => {
    if (activeDownloadID) return;
    const downloads = getStoreValue('downloads', []);
    const next = downloads.find((item) => item.status === 'Queued');
    if (next) runDownload(next);
  }, 2500);
}

function windowlessInterval(fn, ms) {
  setInterval(fn, ms);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 5_000_000) {
        reject(new Error('Request body too large.'));
        req.destroy();
      }
    });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleStore(req, res) {
  try {
    const requestURL = new URL(req.url, 'http://localhost');
    const key = requestURL.searchParams.get('key');
    if (!key || !/^[a-zA-Z0-9_-]+$/.test(key)) {
      sendJSON(res, 400, { error: 'Invalid store key.' });
      return;
    }

    const database = getDB();
    if (req.method === 'GET') {
      const row = database.prepare('SELECT value, updated_at FROM app_store WHERE key = ?').get(key);
      sendJSON(res, 200, { exists: Boolean(row), value: row ? JSON.parse(row.value) : null, updatedAt: row?.updated_at || null });
      return;
    }

    if (req.method === 'PUT') {
      const body = await readBody(req);
      const value = JSON.parse(body || 'null');
      database
        .prepare('INSERT INTO app_store (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP')
        .run(key, JSON.stringify(value));
      sendJSON(res, 200, { ok: true });
      return;
    }

    sendJSON(res, 405, { error: 'Method not allowed.' });
  } catch (error) {
    sendJSON(res, 500, { error: String(error?.message || error) });
  }
}

function collectVideoIDs(html, mode) {
  const ids = new Set();
  const pattern = mode === 'shorts' ? /\/shorts\/([a-zA-Z0-9_-]{11})/g : /"videoId":"([a-zA-Z0-9_-]{11})"/g;
  let match = pattern.exec(html);
  while (match) {
    ids.add(match[1]);
    match = pattern.exec(html);
  }
  return Array.from(ids).slice(0, 20);
}

function xmlText(entry, tag) {
  const match = entry.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
  return match ? match[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim() : '';
}

async function resolveChannelID(channelURL) {
  const parsed = new URL(channelURL);
  const rssID = parsed.searchParams.get('channel_id');
  if (rssID) return rssID;

  const channelPathMatch = parsed.pathname.match(/\/channel\/(UC[a-zA-Z0-9_-]{22})/);
  if (channelPathMatch) return channelPathMatch[1];

  const response = await fetch(channelURL, { headers: youtubeHeaders });
  const html = await response.text();
  const match = html.match(/"channelId":"(UC[a-zA-Z0-9_-]{22})"/) || html.match(/<meta itemprop="channelId" content="(UC[a-zA-Z0-9_-]{22})"/) || html.match(/UC[a-zA-Z0-9_-]{22}/);
  if (!match) throw new Error('Channel ID not found from channel URL.');
  return match[1] || match[0];
}

async function fetchRSSRows(channelURL) {
  const channelID = await resolveChannelID(channelURL);
  const feedURL = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelID}`;
  const response = await fetch(feedURL, { headers: youtubeHeaders });
  const xml = await response.text();
  const entries = xml.match(/<entry>[\s\S]*?<\/entry>/g) || [];
  return entries.slice(0, 20).map((entry) => {
    const videoID = xmlText(entry, 'yt:videoId');
    return {
      id: videoID,
      title: xmlText(entry, 'title') || videoID,
      url: `https://www.youtube.com/watch?v=${videoID}`,
      publishedAt: xmlText(entry, 'published')
    };
  }).filter((row) => row.id);
}

async function fetchTabRows(channelURL, type) {
  const baseURL = channelURL.replace(/\/+$/, '');
  const tabPath = type === 'shorts' ? 'shorts' : type === 'live' ? 'streams' : 'videos';
  const response = await fetch(`${baseURL}/${tabPath}`, { headers: youtubeHeaders });
  const html = await response.text();
  const ids = collectVideoIDs(html, type);
  return ids.map((id) => ({
    id,
    title: id,
    url: type === 'shorts' ? `https://www.youtube.com/shorts/${id}` : `https://www.youtube.com/watch?v=${id}`
  }));
}

async function handleChannelURLs(req, res) {
  try {
    const requestURL = new URL(req.url, 'http://localhost');
    const channelURL = requestURL.searchParams.get('url');
    const type = requestURL.searchParams.get('type') || 'videos';
    if (!channelURL) {
      sendJSON(res, 400, { error: 'Missing channel URL.' });
      return;
    }
    let rows = await fetchTabRows(channelURL, type);
    if (type === 'videos' && rows.length === 0) {
      rows = await fetchRSSRows(channelURL);
    }
    sendJSON(res, 200, { rows });
  } catch (error) {
    sendJSON(res, 500, { error: String(error?.message || error) });
  }
}

function youtubeAPIMiddleware() {
  return {
    name: 'youtube-api-middleware',
    configureServer(server) {
      getDB();
      startDownloadWorker();
      server.middlewares.use('/api/store', handleStore);
      server.middlewares.use('/api/channel-urls', handleChannelURLs);
    }
  };
}

export default defineConfig({
  plugins: [react(), youtubeAPIMiddleware()]
});
