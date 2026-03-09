# Deploy to server (no git)

## 1. Upload project and remove git on server

From your **local machine** (in the project root):

```bash
chmod +x deploy/upload-no-git.sh
./deploy/upload-no-git.sh
```

When prompted, enter the server password. This will:

- Create `/var/www/escort.website` on the server
- Rsync the whole project (excluding `.git`, `node_modules`, `dist`, `.env`, `escort-backend/uploads`)
- Remove any `.git` directories on the server

## 2. On the server: create /var/www, Docker, Nginx, start stack

SSH in then run the setup script:

```bash
ssh root@151.243.109.48
# Enter password when prompted

cd /var/www/escort.website
chmod +x deploy/server-setup.sh
./deploy/server-setup.sh
```

The script will:

- Create `/var/www` if needed
- Install Docker and Docker Compose (if not installed)
- Install Nginx (if not installed)
- Copy nginx config to `/etc/nginx/sites-available/escort` and enable it
- Create `.env` from `.env.example` if missing (default DB login: `nestuser` / `nestpass`)
- Run `docker compose up -d --build` (postgres, backend, frontend)

## 3. Domain and Nginx

- Edit **on the server**: `/etc/nginx/sites-available/escort`  
  Replace `YOUR_DOMAIN` with your real domain (e.g. `escort.example.com`).

- If you use a domain, point its DNS A record to `151.243.109.48`.

- Reload nginx after editing:

  ```bash
  nginx -t && systemctl reload nginx
  ```

## 4. Automatic login/password (DB and app)

- **Database**: Default credentials are in `.env` (on server): `DB_USER=nestuser`, `DB_PASS=nestpass`, `DB_NAME=nestdb`. Change them in `.env` and restart: `docker compose down && docker compose up -d`.
- **App users**: Register and login via the frontend; credentials are stored in the DB. No automatic admin user is created; you can register the first user from the UI.

## 5. Optional: set domain before setup

```bash
export DOMAIN=escort.example.com
./deploy/server-setup.sh
```

This replaces `YOUR_DOMAIN` in the nginx config with `escort.example.com`.
