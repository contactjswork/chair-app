Dépose ici les deux images sources pour l'app **CHAIR PRO** :

- `icon.png` — 1024×1024, sans coins arrondis, sans transparence, fond plein
- `splash.png` — 2732×2732, logo centré sur fond sombre (`#0a0a0a`, cohérent avec `capacitor.pro.config.ts`)

Génération :

```
npx capacitor-assets generate --iconBackgroundColor '#0a0a0a' --splashBackgroundColor '#0a0a0a' --ios
```

(lancée depuis `frontend/`, avec `capacitor.config.ts` = une copie de `capacitor.pro.config.ts` — voir `npm run cap:pro:sync`)
