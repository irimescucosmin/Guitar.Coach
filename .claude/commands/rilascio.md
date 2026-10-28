---
description: Controlli completi, commit e push su master, poi rilascio su Fly.io se richiesto
argument-hint: "[fly]"
---

1. Esegui `/verifica e2e`. Se qualcosa resta rosso, fermati.
2. `git status` e `git diff --stat`: controlla che non entrino `.env*`, `screenshots/`, file generati.
3. Commit con un messaggio in inglese: una riga di titolo all'imperativo, poi cosa cambia per chi usa l'app e perché.
4. Push su `master`: la CI rifà tutto.
5. Solo se gli argomenti contengono `fly`: `fly deploy`, poi verifica `https://guitar-coach.fly.dev/health`.

Argomenti: $ARGUMENTS
