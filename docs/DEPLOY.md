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

**Une seule commande** (le `( ... )` évite que la session SSH se ferme en cas
d'erreur — on garde le message à l'écran) :

```bash
( set -eo pipefail; cd ~/sites/api.getchair.app; test -f artisan; test -f .env; git fetch origin main; git archive origin/main backend | tar -x --strip-components=1; php artisan migrate --force; php artisan config:clear; php artisan route:clear; php artisan route:cache; curl -s -o /dev/null -w "API %{http_code}\n" https://api.getchair.app/api/hairdressers )
```

Attendu à la fin : les migrations en `DONE`, puis `API 200`.

Vérifier au besoin qu'une migration précise est bien passée :
```bash
cd ~/sites/api.getchair.app && php artisan migrate:status 2>/dev/null | grep NOM_DE_LA_MIGRATION
```

**Ne jamais faire** `migrate:fresh` ni `migrate:fresh --seed` en prod.

---

### Pourquoi `git archive` et pas `git pull` (piège de structure)

`~/sites/api.getchair.app/` est un clone du **mono-repo** (qui contient
`backend/` ET `frontend/` comme sous-dossiers), mais le serveur sert les
fichiers Laravel **à plat** dans ce dossier (`artisan`, `routes/`, `app/`…),
avec `public/` comme document root. Un `git pull` recrée donc un sous-dossier
`backend/` **sans toucher aux fichiers à plat réellement servis** : le déploiement
semble marcher et rien ne change.

`git archive origin/main backend | tar -x --strip-components=1` extrait le
sous-dossier `backend/` du dépôt **directement à plat**. Il écrase les fichiers
suivis et **ne supprime rien** : `.env`, `vendor/` et `storage/` sont intouchés.

> ⚠️ **Ne jamais utiliser `rm -rf backend frontend`** (l'ancienne recette de ce
> guide). Le 2026-08-27 elle a mis l'API entièrement hors ligne : le document
> root pointait dans un de ces dossiers. Aucune suppression n'est nécessaire —
> `git archive` suffit.

### Chemin : `~/sites/api.getchair.app` — SANS `/backend`

Vérifié le 2026-08-28. Il existe une **copie orpheline** `~/backend/`, restée
de l'incident : elle n'est pas servie, ne pas déployer dedans.

Pour reconfirmer lequel est servi (témoin posé puis effacé aussitôt) :
```bash
echo SITES > ~/sites/api.getchair.app/public/_probe.txt; echo TILDE_BACKEND > ~/backend/public/_probe.txt; echo -n "SERVI = "; curl -s https://api.getchair.app/_probe.txt; rm -f ~/sites/api.getchair.app/public/_probe.txt ~/backend/public/_probe.txt
```

### Composer : seulement si `composer.lock` a changé

Vérifier avant, depuis le PC :
```bash
git diff --name-only <commit_serveur> main -- backend/composer.lock
```
Vide → sauter `composer install`, et éviter du même coup le piège ci-dessous.

**Après tout `composer install` en SSH** : le PHP en ligne de commande
(`/opt/php8.4/bin/php`) n'est pas celui qui sert le site (8.2). Composer génère
un `vendor/composer/platform_check.php` qui exige PHP 8.4+ et fait planter
**toutes** les requêtes web en 500, alors que `composer.json` n'exige que
`^7.3|^8.0`. Neutraliser systématiquement :
```bash
sed -i 's/PHP_VERSION_ID >= 80401/true/' vendor/composer/platform_check.php
```

**Cause structurelle non résolue** : ce dossier devrait être un sparse-checkout
du seul sous-dossier `backend/`, ou un repo séparé. En attendant, `git archive`
contourne le problème proprement à chaque fois.

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
# Chemin : ~/sites/api.getchair.app/.env
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
| Backend Laravel   | `~/sites/api.getchair.app/`                                     |
| Fichier .env prod | `~/sites/api.getchair.app/.env`                                 |
| Logs Laravel      | `~/sites/api.getchair.app/storage/logs/laravel.log`            |
| Frontend Vercel   | Auto-géré par Vercel                                                    |

---

## Diagnostic en cas de 500 sur l'API

```bash
cd ~/sites/api.getchair.app

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
- `rm -rf backend frontend` — a mis l'API hors ligne le 2026-08-27
- Deployer dans `~/backend/` — copie orpheline, non servie

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
