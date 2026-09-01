import { createServer } from 'node:http';
import { appendFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const PORT = 4790;
const PROJECT_ROOT = dirname(fileURLToPath(import.meta.url));
const LOG_DIR = join(PROJECT_ROOT, '.performance');
const ALLOWED_FILES = new Set(['performance.log', 'heavy-operations.log']);

async function resetLogFiles() {
  await mkdir(LOG_DIR, { recursive: true });
  const header = `# session started ${new Date().toISOString()}\n`;
  for (const file of ALLOWED_FILES) {
    await writeFile(join(LOG_DIR, file), header);
  }
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => (data += chunk));
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== 'POST' || req.url !== '/log') {
    res.writeHead(404);
    res.end();
    return;
  }

  try {
    const body = JSON.parse(await readBody(req));
    if (!ALLOWED_FILES.has(body.file) || typeof body.line !== 'string') {
      res.writeHead(400);
      res.end();
      return;
    }
    await appendFile(join(LOG_DIR, body.file), `${body.line}\n`);
    res.writeHead(204);
    res.end();
  } catch (err) {
    console.error('[perf-log-server] failed to write log entry:', err);
    res.writeHead(500);
    res.end();
  }
});

resetLogFiles()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`[perf-log-server] listening on http://localhost:${PORT} — writing to ${LOG_DIR}`);
    });
  })
  .catch(err => {
    console.error('[perf-log-server] failed to initialize log files:', err);
    process.exit(1);
  });
