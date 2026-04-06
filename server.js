const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = 5236;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Sert le fichier index.html automatiquement

// Route pour récupérer les données du fichier JSON
app.get('/api/artists', (req, res) => {
    if (!fs.existsSync(DATA_FILE)) {
        fs.writeFileSync(DATA_FILE, JSON.stringify([], null, 2));
    }
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    res.json(JSON.parse(data));
});

// Route pour sauvegarder les données dans le fichier JSON
app.post('/api/artists', (req, res) => {
    try {
        const artists = req.body;
        fs.writeFileSync(DATA_FILE, JSON.stringify(artists, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'écriture du fichier" });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Tool-box active sur http://localhost:${PORT}`);
    console.log(`🚀 Accessible sur ton réseau via l'IP de ton Raspberry`);
});