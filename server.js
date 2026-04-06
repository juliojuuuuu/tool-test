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

function safeReadArtists() {
    ensureDataFile();

    try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const parsed = JSON.parse(raw);

        if (!Array.isArray(parsed)) {
            throw new Error('Le contenu JSON doit être un tableau.');
        }

        return { artists: parsed, repaired: false };
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

        return {
            artists: [],
            repaired: true,
            reason: error.message,
            backupFile: path.basename(brokenFile)
        };
    }
}

function validateArtistsPayload(payload) {
    if (!Array.isArray(payload)) {
        return 'Le payload doit être un tableau.';
    }

    for (const item of payload) {
        if (!item || typeof item !== 'object') {
            return 'Chaque artiste doit être un objet.';
        }

        if (typeof item.name !== 'string' || typeof item.link !== 'string') {
            return 'Chaque artiste doit contenir name et link en chaîne de caractères.';
        }

        if ('done' in item && typeof item.done !== 'boolean') {
            return 'Le champ done doit être booléen.';
        }
    }

    return null;
}

app.get('/api/artists', (req, res) => {
    const result = safeReadArtists();

    if (result.repaired) {
        return res.status(200).json({
            artists: result.artists,
            warning: {
                message: 'Le fichier data.json était invalide et a été réinitialisé.',
                reason: result.reason,
                backupFile: result.backupFile
            }
        });
    }

    return res.json({ artists: result.artists });
});

app.post('/api/artists', (req, res) => {
    const validationError = validateArtistsPayload(req.body);

    if (validationError) {
        return res.status(400).json({ error: validationError });
    }

    try {
        fs.writeFileSync(DATA_FILE, `${JSON.stringify(req.body, null, 2)}\n`);
        return res.json({ success: true, count: req.body.length });
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
