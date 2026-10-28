---
description: Cambia o aggiunge una schermata seguendo il design, poi la confronta con gli screenshot
argument-hint: "<cosa cambiare>"
---

Modifica dell'interfaccia: $ARGUMENTS

Leggi prima `docs/DESIGN.md` e il componente coinvolto. Regole:

- Colori e raggi solo dai token di `globals.css`; un colore nuovo è un token nuovo, con valore chiaro e scuro.
- Ogni testo visibile in `src/messages/it.ts` con il gemello in `en.ts`; mai stringhe nel JSX, niente trattino lungo nei testi italiani.
- Le regole (cosa è fatto, cosa viene dopo, come si giudica) in `src/lib`, mai nel componente.
- Una schermata con la barra laterale va in `src/app/(app)/`, e la voce in `NAV` di `components/chrome/sidebar.tsx`.
- Bottoni con `button.brass` (azione dell'adesso), `button.primary`, `button.outline`.
- Accessibilità: ogni controllo ha un nome, ogni sezione un titolo o `aria-label`, il feedback del microfono è `role="status"`.

Dopo la modifica:
1. `pnpm typecheck && pnpm lint && pnpm test`.
2. Server su (`pnpm dev`, o `pnpm build && pnpm start`), poi `pnpm shots`.
3. Apri gli screenshot toccati da `screenshots/` e guardali davvero: allineamenti, testo tagliato, colori. Correggi e rifai.
4. Se cambiano testi usati negli e2e (`tests/e2e/practice.spec.ts`), aggiorna il test e lancia `pnpm e2e`.
