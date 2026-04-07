const express = require('express');
const fs = require('fs/promises');
const path = require('path');

const app = express();

const PORT = Number(process.env.PORT || 5236);
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || __dirname;
const DATA_FILE = path.join(DATA_DIR, 'data.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function sanitizeArtists(input) {
    if (!Array.isArray(input)) return [];

    return input
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            name: typeof item.name === 'string' ? item.name.trim() : '',
            link: typeof item.link === 'string' ? item.link.trim() : '',
            done: Boolean(item.done)
        }))
        .filter((item) => item.name.length > 0 && item.link.length > 0);
}

async function ensureDataFile() {
    await fs.mkdir(DATA_DIR, { recursive: true });

    try {
        await fs.access(DATA_FILE);
    } catch {
        await fs.writeFile(DATA_FILE, '[]\n', 'utf-8');
    }
}

async function readArtists() {
    await ensureDataFile();

    try {
        const raw = await fs.readFile(DATA_FILE, 'utf-8');
        return sanitizeArtists(JSON.parse(raw));
    } catch (error) {
        const backupPath = `${DATA_FILE}.broken-${Date.now()}`;

        try {
            await fs.copyFile(DATA_FILE, backupPath);
        } catch {
            // Ignore backup failure and continue recovery.
        }

        await fs.writeFile(DATA_FILE, '[]\n', 'utf-8');
        console.warn(`[RECOVERY] data.json reset after parse/read failure: ${error.message}`);

        return [];
    }
}

async function writeArtists(artists) {
    await ensureDataFile();
    const payload = `${JSON.stringify(artists, null, 2)}\n`;
    await fs.writeFile(DATA_FILE, payload, 'utf-8');
}

app.get('/api/health', async (req, res) => {
    try {
        await ensureDataFile();
        return res.json({ ok: true, dataFile: DATA_FILE, timestamp: new Date().toISOString() });
    } catch (error) {
        return res.status(500).json({ ok: false, error: error.message });
    }
});

app.get('/api/artists', async (req, res) => {
    try {
        const artists = await readArtists();
        return res.json(artists);
    } catch (error) {
        return res.status(500).json({ error: 'Impossible de lire les données', detail: error.message });
    }
});

app.post('/api/artists', async (req, res) => {
    try {
        const artists = sanitizeArtists(req.body);
        await writeArtists(artists);
        return res.json({ success: true, count: artists.length });
    } catch (error) {
        console.error('[WRITE_ERROR]', error);
        return res.status(500).json({ error: "Erreur lors de l'écriture du fichier", detail: error.message });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'JSON invalide dans la requête.' });
    }

    return next(err);
});

app.listen(PORT, HOST, () => {
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`📁 Data file: ${DATA_FILE}`);
});
