const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5236;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(express.json({ limit: '1mb' }));
app.use(express.static(__dirname));

function ensureDataFile() {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, '[]\n');
    }
}

function normalizeArtists(payload) {
    const source = Array.isArray(payload)
        ? payload
        : (payload && Array.isArray(payload.artists) ? payload.artists : []);

    return source
        .filter((item) => item && typeof item === 'object')
        .filter((item) => typeof item.name === 'string' && typeof item.link === 'string')
        .map((item) => ({
            name: item.name.trim(),
            link: item.link.trim(),
            done: Boolean(item.done)
        }))
        .filter((item) => item.name.length > 0 && item.link.length > 0);
}

function safeReadArtists() {
    ensureDataFile();

    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        return normalizeArtists(parsed);
    } catch (error) {
        const brokenFile = `${DATA_FILE}.broken-${Date.now()}`;

        try {
            if (fs.existsSync(DATA_FILE)) {
                fs.copyFileSync(DATA_FILE, brokenFile);
            }
        } catch (_) {
            // Ignore backup errors, we still need to recover service.
        }

        fs.writeFileSync(DATA_FILE, '[]\n');
        console.warn(`[RECOVERY] data.json invalide: ${error.message}. Backup: ${path.basename(brokenFile)}`);

        return [];
    }
}

app.get('/api/artists', (req, res) => {
    const artists = safeReadArtists();
    return res.json(artists);
});

app.post('/api/artists', (req, res) => {
    try {
        const artists = normalizeArtists(req.body);
        fs.writeFileSync(DATA_FILE, `${JSON.stringify(artists, null, 2)}\n`);
        return res.json({ success: true, count: artists.length });
    } catch (_) {
        return res.status(500).json({ error: "Erreur lors de l'écriture du fichier" });
    }
});

app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({ error: 'JSON invalide dans la requête.' });
    }

    return next(err);
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Tool-box active sur http://localhost:${PORT}`);
    console.log(`🚀 Accessible sur ton réseau via l'IP de ton Raspberry`);
});
