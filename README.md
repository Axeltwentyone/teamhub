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
