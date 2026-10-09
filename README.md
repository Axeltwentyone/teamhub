# TeamHub · YesWeCange

PWA React (Vite + TypeScript) issue de la maquette « TeamHub Mobile V2 » : pointage QR code, congés, déplacements, caisse et annonces, pour trois rôles (collaborateur, manager, administrateur).

```bash
npm install
npm run dev       # http://localhost:5173 (et sur le réseau local)
npm run build && npm run preview   # version PWA (service worker actif)
```

- **Comptes de démo** : boutons « Accès démo » sur l'écran de connexion (Nelly, Kevin, Aminata).
- **Données** : stockées dans le navigateur (`localStorage`), sans back-end. « Réinitialiser la démo » dans Profil / Exports.
- **QR code** : l'admin l'affiche et le télécharge depuis *Exports* ; la caméra du téléphone le lit sur l'écran *Pointage* (HTTPS requis hors localhost).
- **Icônes PWA** : générées depuis `public/logo.svg` avec `npm run icons`.

## Comportement « app native »

- **Navigation en pile** (`src/stack.tsx`) : les onglets basculent sans animation et chacun garde son scroll et son état ; les écrans de détail glissent depuis la droite (parallaxe, retour par swipe depuis le bord gauche) ; le scan et les formulaires s'ouvrent en modale par le bas et se ferment en tirant vers le bas.
- **Retours** (`src/native.tsx`) : vibrations sur Android, toasts, feuilles d'action à la place de `confirm()`, feuilles modales glissables, invitation à installer l'app (Android : bouton d'installation ; iOS : marche à suivre).
- **Pas de comportements web** : pas de zoom, de sélection de texte, de menu d'appui long ni de rebond de page ; champs en 16 px (pas de zoom auto sur iOS) ; barre de titre compacte floutée au scroll ; écrans de lancement iOS.
