# CHAIR — Guide de déploiement
> À lire avant chaque mise en production.

---

## Architecture de déploiement

| Couche    | Où                        | Comment                        |
|-----------|---------------------------|--------------------------------|
| Frontend  | Vercel (www.getchair.app) | **Auto** dès qu'on push main   |
| Backend   | Infomaniak SSH            | **Manuel** — commandes ci-dessous |
| Base      | Infomaniak MySQL          | Jamais touchée manuellement    |

---

## Déploiement standard (à faire à chaque session)

### ÉTAPE 1 — Sur le PC Windows (PowerShell)

```powershell
cd C:\xampp\htdocs\chair-app
git add -A
git commit -m "feat: description des changements"
git push origin main
```

→ Vercel redéploie le frontend automatiquement en 2-3 min.
→ Vérifier sur https://vercel.com que le build est vert.

---

### ÉTAPE 2 — Sur le SSH Infomaniak

**Connexion SSH :** Infomaniak → Hébergement → getchair.app → SSH

```bash
cd ~/sites/api.getchair.app/backend
git pull origin main
php artisan migrate --force
php artisan config:clear
php artisan route:cache
```

**C'est tout.** Ne jamais faire `migrate:fresh` ou `migrate:fresh --seed` en prod.

---

## Si git pull demande un mot de passe GitHub

GitHub n'accepte plus les mots de passe — utiliser un Personal Access Token :

1. github.com → ton avatar → Settings → Developer settings
2. Personal access tokens → Tokens (classic) → Generate new token
3. Coche `repo` → Generate → Copier le token
4. Coller le token dans le champ Password (rien ne s'affiche, c'est normal)

Pour ne plus avoir à le retaper :
```bash
git remote set-url origin https://contactjswork:TON_TOKEN@github.com/contactjswork/chair-app.git
```

---

## Variables d'environnement importantes

### Frontend — Vercel dashboard → Environment Variables
```
NEXT_PUBLIC_API_URL = https://api.getchair.app/api
```

### Backend — fichier .env sur le serveur
```
# NE JAMAIS écraser ce fichier avec le .env local !
# Chemin : ~/sites/api.getchair.app/backend/.env
APP_ENV=production
APP_URL=https://api.getchair.app
DB_HOST=0o3cnm.myd.infomaniak.com
DB_DATABASE=0o3cnm_chair
DB_USERNAME=0o3cnm_chairuser
DB_PASSWORD=[mot de passe Infomaniak — ne pas committer]
```

---

## Chemins importants sur le serveur

| Quoi              | Chemin                                                                  |
|-------------------|-------------------------------------------------------------------------|
| Backend Laravel   | `~/sites/api.getchair.app/backend/`                                     |
| Fichier .env prod | `~/sites/api.getchair.app/backend/.env`                                 |
| Logs Laravel      | `~/sites/api.getchair.app/backend/storage/logs/laravel.log`            |
| Frontend Vercel   | Auto-géré par Vercel                                                    |

---

## Diagnostic en cas de 500 sur l'API

```bash
cd ~/sites/api.getchair.app/backend

# Voir l'erreur exacte
grep -n "ERROR" storage/logs/laravel.log | tail -5

# Problème de config
php artisan config:clear && php artisan cache:clear

# Problème de routes
php artisan route:clear && php artisan route:cache

# Problème de DB (Access denied)
# → Vérifier DB_PASSWORD dans .env
# → Le mot de passe se trouve sur Infomaniak → Bases de données MySQL
nano .env
php artisan config:clear
```

---

## Ce qu'il ne faut JAMAIS faire en prod

- `php artisan migrate:fresh` — efface toutes les données
- `php artisan migrate:fresh --seed` — efface + remet des données fictives
- Écraser le `.env` de prod avec le `.env` local
- `git push --force` sur main

---

## Commandes de lancement en développement local

```powershell
# Backend local
$env:PATH = "C:\xampp\php;" + $env:PATH
cd C:\xampp\htdocs\chair-app\backend
php artisan serve --port=8000

# Frontend local
cd C:\xampp\htdocs\chair-app\frontend
npm run dev
```

Frontend local : http://localhost:3000
Backend local  : http://localhost:8000
