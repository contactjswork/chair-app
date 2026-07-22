Dépose ici les deux images sources pour l'app **CHAIR** (client) :

- `icon.png` — 1024×1024, sans coins arrondis, sans transparence, fond plein
- `splash.png` — 2732×2732, logo centré sur fond blanc (`#ffffff`, cohérent avec `capacitor.chair.config.ts`)

Une fois les deux fichiers présents, génère toutes les tailles iOS avec :

```
npx capacitor-assets generate --iconBackgroundColor '#ffffff' --splashBackgroundColor '#ffffff' --ios
```

(lancée depuis `frontend/`, avec `capacitor.config.ts` = une copie de `capacitor.chair.config.ts` — voir `npm run cap:chair:sync`)
