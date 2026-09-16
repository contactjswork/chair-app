Images sources de l'app **CHAIR BUSINESS** — générées le 16/09/2026 à partir
du fauteuil de la famille (icône client inversée + « B » sur le dossier,
même grammaire que le « PRO » de CHAIR PRO) :

- `icon.png` — 1024×1024, fond noir plein, sans transparence
- `splash.png` — 2732×2732, fauteuil centré sur fond noir (#000, cohérent
  avec `capacitor.business.config.ts`)

Génération des tailles iOS :

```
npx capacitor-assets generate --iconBackgroundColor '#000000' --splashBackgroundColor '#000000' --ios
```

(lancée depuis `frontend/`, avec `capacitor.config.ts` = une copie de
`capacitor.business.config.ts` — voir `npm run cap:business:sync`)
