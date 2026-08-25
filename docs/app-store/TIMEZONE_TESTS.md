# Timezone — position officielle et preuves de test

Audit exécuté le 2026-08-25 (matin, heure d'été : Paris = UTC+2) sur l'environnement local
(MySQL + `php artisan serve`, front Next.js sur :3000). Complète l'audit du 2026-08-24 qui
avait introduit la constante `TZ = 'Europe/Paris'` dans `SlotGuard` et `AvailabilityController`.

## Position officielle

**Toutes les heures de la chaîne de réservation sont des heures « murales » du salon, en
France (Europe/Paris).** Concrètement :

- `config/app.php` reste en `UTC` : cela ne concerne que `created_at`/`updated_at`
  (horodatage technique, stocké et exposé en UTC avec suffixe `Z`).
- `appointments.appointment_date` (DATE) et `appointment_time` (TIME) stockent la valeur
  murale telle que le client l'a choisie — aucune conversion, jamais.
- Le serveur compare ces valeurs murales en les instanciant explicitement en
  `Europe/Paris` : constante `TZ` dans `backend/app/Services/SlotGuard.php` et
  `backend/app/Http/Controllers/Api/AvailabilityController.php` (les deux DOIVENT rester
  alignées). Les frontières « créneau passé » et « fenêtre de réservation » sont donc
  justes quelle que soit la timezone du serveur.
- Le frontend (`frontend/components/ui/BookingSheet.tsx`) ne manipule que des chaînes
  (`YYYY-MM-DD`, `HH:MM`) : aucun `toISOString()` dans la chaîne de réservation (l'ancien
  usage pour « aujourd'hui » a été remplacé par `toLocalYMD()`, en heure locale du device).
  L'affichage (`new Date(dateStr + 'T00:00:00')`) parse en local, sans décalage UTC.
- **Écart possible uniquement si l'utilisateur voyage** : un client dont le device est
  hors d'Europe/Paris voit les heures du salon (ex. « 09:00 » = 9h à Paris), et la
  frontière visuelle « jour passé » du calendrier suit l'heure de son device. Le serveur
  reste l'autorité : un créneau passé côté Paris est refusé quoi qu'affiche le client.

## Preuves (tests HTTP réels)

Contexte : coiffeur démo `julien-schillinger` (id 8), service 3 « Taper » (30 min),
planning lun-sam 09:00–19:00, `booking_window_days = NULL`. Heure du test :
**08:40 Europe/Paris = 06:40 UTC**.

### 1. Frontière « passé » du jour même — prouve la comparaison en Europe/Paris

```
POST /api/appointments {"appointment_date":"2026-08-25","appointment_time":"08:00", ...}
→ HTTP 422 « Ce créneau est déjà passé. »
```

08:00 est **futur en UTC** (06:40) mais **passé à Paris** (08:40). Une comparaison UTC
aurait laissé passer le garde `past` (le refus serait tombé en `outside_hours`, message
différent). Le motif `past` prouve que la frontière est bien calculée en Europe/Paris.

```
GET /api/hairdressers/julien-schillinger/availability?date=2026-08-25&service_id=3
→ {"slots":["09:00","09:30",…,"18:30"]}   (aucun créneau avant maintenant)
GET .../available-dates?service_id=3&month=2026-08
→ {"dates":["2026-08-25","2026-08-26",…]}  (aujourd'hui inclus — réservation le jour même OK)
```

### 2. Créneau de fin de journée + valeur stockée

```
POST … {"appointment_date":"2026-08-25","appointment_time":"18:30"}   → HTTP 201 (id 151)
POST … {"appointment_date":"2026-08-25","appointment_time":"19:00"}   → HTTP 422 « hors horaires »
```

Valeur brute en base (aucune conversion, l'heure murale est stockée telle quelle ;
seul `created_at` est en UTC) :

```
SELECT id, appointment_date, appointment_time, created_at FROM appointments WHERE id=151;
→ 151 | 2026-08-25 | 18:30:00 | 2026-08-25 06:40:39   (06:40 UTC = 08:40 Paris ✓)
```

Après ce POST, `GET /availability` du jour ne propose plus 18:30 (dernier créneau : 18:00),
et un second POST identique renvoie **HTTP 409** « Ce créneau vient d'être pris. ».

### 3. Changement d'heure été → hiver (25 octobre 2026)

Le 25/10/2026 est un dimanche (fermé) : `{"slots":[],"reason":"closed"}` — rien à tester
ce jour-là. Lendemain, premier jour en heure d'hiver (Paris = UTC+1) :

```
GET .../availability?date=2026-10-26&service_id=3
→ {"slots":["09:00","09:30",…,"18:30"]}          (mêmes heures murales qu'en été ✓)
POST … {"appointment_date":"2026-10-26","appointment_time":"09:00"}  → HTTP 201 (id 152)
→ stocké : 2026-10-26 | 09:00:00                  (aucun décalage d'une heure ✓)
GET .../available-dates?service_id=3&month=2026-10
→ dimanches (4, 11, 18, 25) absents, 26→31 présents ✓
```

Les heures étant murales de bout en bout (jamais converties via UTC), le passage
été/hiver ne décale rien : un RDV pris « à 9h » reste à 9h.

### 4. Affichage côté client

`BookingSheet` affiche le créneau tel que reçu (`"09:00"`, chaîne brute) et la date via
`new Date("YYYY-MM-DD" + "T00:00:00")` (parse local, pas d'UTC) : un créneau de 9h00
réservé s'affiche 9h00, vérifié dans le parcours réel au point « Confirmation »
(récapitulatif date + heure identiques à la sélection).

### Nettoyage

RDV de test 151 et 152 supprimés, ainsi que les 2 notifications coiffeur générées
(vérifié : 0 restant). Token Sanctum temporaire `tz-audit-temp` révoqué.

## Ce qu'il ne faut PAS faire (pièges connus, déjà corrigés le 24/08)

- `new Date().toISOString().split('T')[0]` pour « aujourd'hui » côté client → date UTC,
  fausse entre minuit et 2h (heure française). Remplacé par `toLocalYMD()`.
- `Carbon::parse($date)` / `isPast()` sans timezone explicite côté serveur → comparait
  l'heure murale française à l'heure UTC (2h d'écart en été). Toutes les instances Carbon
  de la chaîne créneaux sont créées avec `self::TZ`.
- Le cast Eloquent `datetime` sur `hairdresser_unavailabilities` hydrate en UTC des
  heures saisies murales : les deux fichiers ré-étiquettent la valeur murale en
  Europe/Paris avant comparaison.
