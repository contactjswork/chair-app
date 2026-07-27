# Prompt de démarrage — à copier-coller en premier message sur un nouveau compte Claude
> Écrit le 2026-07-23. Colle tel quel (en remplaçant la dernière ligne par ta vraie demande) au tout début d'une nouvelle conversation Claude Code sur ce repo.

---

Avant de faire quoi que ce soit, lis dans l'ordre :
1. `docs/CHAIR_MASTER_CONTEXT.md` — contexte complet du projet CHAIR (produit, stack, état actuel, ce qui vient d'être livré, ce qui reste en cours)
2. `docs/GIT_WORKFLOW.md` — comment committer/push sur ce repo sans casser le travail en cours d'un autre chantier

Résumé rapide pendant que tu lis : je suis Julien, co-fondateur de CHAIR (réseau social + réservation pour coiffeurs, deux apps — CHAIR client et CHAIR PRO —, Next.js 16 + Laravel 8 + MySQL). J'écris en français, style oral, direct, souvent avec des fautes volontaires. Je te donne le feeling, pas les specs techniques — fais les choix à ma place, je redirige si besoin. Résultats directs, pas d'explications à rallonge. Jamais d'emoji nulle part. Charte design : blanc/noir/neutres uniquement, jamais de couleur vive, mobile-first absolu.

Point d'attention avant de toucher au repo : le working tree contient probablement un gros bloc de fichiers backend non commités (Referral, Story, Subscription/Stripe, réputation par spécialité) que je n'ai pas encore validé pour le commit — ne les touche/committe pas sans me demander d'abord, même si ta tâche te fait modifier un fichier qui les contient déjà en mélange (voir `docs/GIT_WORKFLOW.md` pour comment isoler proprement dans ce cas).

Confirme-moi en une phrase que t'as capté le contexte (pas besoin de tout résumer), puis on attaque :

[DÉCRIS ICI CE QUE TU VEUX QUE JE FASSE AUJOURD'HUI]
