# CHAIR — Comment committer et push (lire avant tout commit)
> Écrit le 2026-07-23 après une session de refonte CHAIR PRO où la gestion du commit a été le point le plus délicat. À lire par toute session Claude avant de faire `git add`/`git commit`/`git push` sur ce repo. Voir aussi `docs/CHAIR_MASTER_CONTEXT.md` section 8 pour le contexte produit de l'état git actuel.

---

## 0. Le piège n°1 de ce repo : le working tree est presque toujours "sale"

Sur ce projet, il est **normal** de trouver des dizaines de fichiers modifiés/non commités en arrivant dans une session — ce n'est PAS forcément ton travail de session précédente, ni forcément quelque chose à committer d'un coup. Julien accumule du travail (souvent backend, parfois expérimental/non testé) sans committer pendant plusieurs sessions.

**Règle d'or : avant tout commit, toujours faire `git status --short` sur `backend/` et `frontend/` SÉPARÉMENT, et comprendre CE QUI a été modifié PAR TOI dans CETTE session, vs ce qui traînait déjà.**

```bash
git status --short frontend/ | wc -l
git status --short backend/ | wc -l
```

Si l'un des deux compte est très supérieur à ce que tu penses avoir touché toi-même, il y a un bloc préexistant non lié à ta tâche. **Ne jamais faire `git add -A` ou `git add .` à la racine sans avoir fait ce diagnostic d'abord.**

---

## 1. Demander avant de committer un gros bloc ambigu

Si après diagnostic tu identifies un bloc de fichiers (souvent backend PHP) que tu n'as ni écrit ni testé dans la session en cours — **ne le commit jamais sans demander explicitement à Julien**, même s'il a dit "commit tout" de façon générale à un autre moment. Un `git push` sur `main` déploie immédiatement le frontend (Vercel) — c'est une action à blast radius réel, pas juste un enregistrement local.

Poser la question via un choix clair, par exemple :
- Option A (recommandée) : committer seulement ce que TU as fait cette session, laisser le reste intact et non commité.
- Option B : tout committer — seulement si Julien confirme explicitement qu'il a testé/validé ce bloc.

Voir `docs/CHAIR_MASTER_CONTEXT.md` section 8 pour l'exemple concret : un bloc de ~70 fichiers backend (Referral/Story/Subscription/Stripe/SpecialtyProgress) a été laissé volontairement non commité sur décision de Julien, alors que le frontend de la même session a bien été commité et poussé.

---

## 2. Isoler proprement un sous-ensemble de fichiers

**Cas simple — le sous-ensemble à committer correspond à un ou plusieurs dossiers entiers** (ex: tout `frontend/`, rien de `backend/`) :

```bash
git add frontend/
git diff --cached --stat -- backend/    # doit être vide — vérifie qu'aucun fichier backend n'est parti
git commit -m "..."
```

**Cas difficile — un même fichier contient à la fois ton edit ET un changement préexistant non lié** (typiquement `routes/api.php`, ou tout fichier que "tout le monde" touche souvent). Deux options :

1. **Le plus sûr, si ton edit est petit** : au lieu de committer le fichier tel quel (ce qui embarquerait le changement préexistant), reverte manuellement TON edit précis (tu sais ce que tu as changé, tu le défais à la main), laissant le fichier revenir à son état "sale préexistant". Le fichier ne fait alors pas partie du commit du tout. C'est ce qui a été fait cette session pour `routes/api.php`, `LeaderboardController.php`, `StreakService.php` après que le choix "ne pas committer le bloc backend" a été fait alors que ces 3 fichiers avaient déjà reçu un edit de nettoyage de dette technique.

2. **Si l'edit est trop gros pour revert à la main proprement** : technique d'isolation par patch —
   ```bash
   git show HEAD:chemin/vers/fichier > /tmp/original.ext
   # copie /tmp/original.ext vers un fichier scratch, applique TON edit dessus manuellement
   diff -u /tmp/original.ext /tmp/scratch_edited.ext > /tmp/patch.diff
   # corrige les chemins dans le header du patch pour qu'ils pointent vers le vrai chemin repo
   git apply --cached /tmp/patch.diff
   git status --short   # doit montrer "MM" sur ce fichier = à la fois staged (ton edit) et unstaged (le reste sale) — c'est le signe que l'isolation a marché
   ```

---

## 3. ⚠️ Piège découvert cette session : `git show HEAD:fichier` peut échouer silencieusement

Si tu supprimes un fichier puis essaies de le restaurer avec `git show HEAD:chemin/fichier > fichier`, et que ce fichier **n'a jamais été commité** (il faisait partie d'un bloc "sale" jamais versionné), la commande échoue avec `fatal: path '...' exists on disk, but not in 'HEAD'` — **mais si tu as redirigé stderr vers le fichier (`2>&1`), ce message d'erreur se retrouve écrit DANS le fichier au lieu d'une vraie erreur qui stoppe le script.** Le fichier semble "restauré" (la commande ne plante pas), mais son contenu est un message d'erreur, pas le vrai code.

**Leçon** :
- Ne jamais rediriger `2>&1` vers un fichier de code sans vérifier ensuite son contenu.
- **Avant de supprimer un fichier que tu n'as pas l'intention de committer via git (donc pas de filet de sécurité `git checkout` derrière), lis-le en entier d'abord.** Si tu dois le restaurer plus tard, tu pourras au moins le reconstruire depuis ce que tu as lu — sinon c'est une perte définitive si le fichier n'était pas commité (pas de corbeille pour `rm` en Git Bash, pas toujours d'historique IDE local).
- Après toute tentative de restauration, vérifie avec `git status --short` : si le fichier réapparaît en `??` (untracked) au lieu de disparaître de la liste des changements, c'est le signe qu'il n'était pas dans HEAD et que la restauration a probablement échoué.

---

## 4. Vérifications avant tout commit (bloquant, pas optionnel)

```bash
cd frontend
npx tsc --noEmit          # doit être vide
npx eslint <fichiers touchés>   # zéro erreur nouvelle (des warnings/erreurs préexistants ailleurs dans le repo sont OK, ne pas essayer de tout corriger)
npm run build              # doit se terminer par la liste des routes, sans erreur
```

Pour le backend PHP (si jamais un commit backend est validé par Julien) :
```bash
cd backend
php -l chemin/vers/fichier.php   # syntaxe uniquement, ne détecte pas les erreurs logiques
php artisan route:list --path=api   # vérifie que les routes attendues existent/n'existent plus
```

---

## 5. Message de commit

Convention observée sur ce repo : préfixe type conventionnel (`feat(pro):`, `fix:`), résumé court en français, corps optionnel en français expliquant le "pourquoi" plutôt que de lister fichier par fichier. Toujours terminer par :

```
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
```

Toujours utiliser un heredoc pour le message (`git commit -m "$(cat <<'EOF' ... EOF)"`) pour préserver les sauts de ligne proprement.

**Ne jamais amend un commit existant** sauf demande explicite — toujours créer un nouveau commit.

---

## 6. Push

```bash
git push origin main
```

- Le repo pousse directement sur `main`, pas de workflow de PR observé jusqu'ici sur ce projet.
- **`git push origin main` déclenche un déploiement Vercel automatique du frontend, live en ~1-2 minutes sur `getchair.app`/`getchair.app/pro`.** Ce n'est pas un no-op — traite ce push comme une mise en prod.
- Le backend (Infomaniak, hébergement mutualisé) **n'est PAS redéployé automatiquement par ce push** — un `git push` ne met à jour que le frontend visible. Si un commit backend est un jour validé, vérifier avec Julien comment il déploie réellement le backend (pas de pipeline automatisé identifié à ce jour).
- Ne jamais `--force` push sur `main` sans demande explicite.
- Ne jamais `--no-verify` (skip des hooks) sans demande explicite.

---

## 7. Bruit à ignorer

Des warnings `warning: in the working copy of '...', LF will be replaced by CRLF the next time Git touches it` apparaissent en masse sur `git add` sous Windows — c'est la config `core.autocrlf` normale du repo, pas une erreur, ne rien faire à ce sujet.

---

## 8. Après le push — vérifier que ça a marché

```bash
git log --oneline -3
git status --short backend/ | wc -l   # doit être identique à avant (le bloc non commité doit être intact, pas perdu)
```

Puis informer Julien du lien de vérif (`https://getchair.app/pro` ou `/app`) et laisser 1-2 minutes le temps que Vercel redéploie avant de dire que c'est en ligne.
