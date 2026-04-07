# Linux Music Tool

Mini application web (Node.js + Express) pour suivre une liste d'artistes avec sauvegarde locale dans `data.json`.

## Démarrage rapide (Linux)

```bash
npm install
npm start
```

Par défaut l'application écoute sur `0.0.0.0:5236`.

## Variables d'environnement

- `PORT` (défaut: `5236`)
- `HOST` (défaut: `0.0.0.0`)
- `DATA_DIR` (défaut: dossier du projet)

Exemple:

```bash
PORT=8080 DATA_DIR=/var/lib/music-tool npm start
```

## Endpoints

- `GET /api/health` : état du service
- `GET /api/artists` : liste des artistes
- `POST /api/artists` : remplace la liste

## Déploiement Linux avec systemd (exemple)

Créer `/etc/systemd/system/linux-music-tool.service` :

```ini
[Unit]
Description=Linux Music Tool
After=network.target

[Service]
Type=simple
WorkingDirectory=/opt/linux-music-tool
ExecStart=/usr/bin/npm start
Restart=always
Environment=PORT=5236
Environment=DATA_DIR=/opt/linux-music-tool

[Install]
WantedBy=multi-user.target
```

Puis:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now linux-music-tool
sudo systemctl status linux-music-tool
```
