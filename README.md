# Sectver Launcher

Launcher Minecraft custom (Vanilla + moddé Forge/NeoForge/Fabric) — Electron + React + TypeScript.

## Fonctionnalités

- Connexion Microsoft / Minecraft (msmc, token chiffré via `safeStorage`)
- Deux profils par défaut : **Vanilla 26.1.2** et **Sectver Modded** (configurable à distance)
- Choix du loader par profil (vanilla / forge / neoforge / fabric) via `@xmcl/installer`
- Téléchargement automatique des mods, shaders et resource packs listés dans le manifeste
- Import local de mods/shaders/RP par drag-and-drop ou bouton
- RAM allouée configurable par profil (slider 1 → 16 Go)
- Auto-update du launcher via `electron-updater` + GitHub Releases
- Manifeste de versions/mods piloté par un fichier JSON sur GitHub (push = update client)
- Charte graphique : primaire `#0e0404`, secondaire `#742931`

## Installation (dev)

```powershell
cd c:\Users\robin\Desktop\Projets\Sectver\Launcher
npm install
npm run dev
```

> Au premier `npm install`, certains modules natifs (electron) seront recompilés — patiente.

## Build de l'exe

```powershell
npm run package:win
```

Le `.exe` d'installation NSIS apparaît dans `release/` (ou le dossier configuré par electron-builder).

## Configuration

Avant le premier build officiel, remplace dans `package.json` (champ `build.publish`) :

```json
"publish": {
  "provider": "github",
  "owner": "<ton-user-github>",
  "repo": "<nom-du-repo>"
}
```

Et dans `electron/manifest.ts`, l'URL `MANIFEST_URL` (par défaut elle pointe vers `raw.githubusercontent.com/<owner>/<repo>/main/manifest.json`).

Tu peux aussi surcharger via la variable d'environnement `SECTVER_MANIFEST_URL`.

---

## Côté administrateur

### Pousser une mise à jour des versions / mods / shaders

1. Crée un fichier `manifest.json` à la racine du repo GitHub (cf. `shared/manifest.example.json`).
2. Modifie-le, ajoute des mods, change la version, change le loader, etc.
3. `git commit && git push`.
4. Tous les launchers refetchent au démarrage et synchronisent.

Format du `manifest.json` :

```json
{
  "schemaVersion": 1,
  "updatedAt": "2026-05-01T00:00:00Z",
  "announcement": "Texte affiché sur la page d'accueil",
  "profiles": [
    {
      "id": "vanilla",
      "displayName": "Vanilla 26.1.2",
      "minecraftVersion": "26.1.2",
      "loader": "vanilla",
      "defaultRamMb": 4096
    },
    {
      "id": "modded",
      "displayName": "Sectver Modded",
      "minecraftVersion": "26.1.2",
      "loader": "neoforge",
      "loaderVersion": "latest",
      "defaultRamMb": 8192,
      "mods": [
        { "name": "exemple.jar", "url": "https://.../exemple.jar", "sha1": "abc...", "required": true }
      ],
      "shaders": [],
      "resourcePacks": []
    }
  ]
}
```

- `sha1` est facultatif mais recommandé : permet de détecter une corruption ou un mod modifié et de le re-télécharger automatiquement.
- Les fichiers présents dans le dossier `mods/` du profil mais ABSENTS du manifeste sont **conservés** (ce sont les mods que l'utilisateur a ajoutés lui-même).

### Pousser une mise à jour du launcher lui-même

1. Bump `version` dans `package.json`.
2. `npm run package:win`.
3. Crée une release GitHub avec les artefacts (`Sectver Launcher-Setup-X.Y.Z.exe` + `latest.yml`).
4. Les clients en cours d'exécution voient une notification dans le coin de la fenêtre, et peuvent installer en 1 clic. Au prochain démarrage, l'auto-installation se fait sans intervention si elle a été téléchargée en arrière-plan.

> Astuce : configure un workflow GitHub Actions avec `electron-builder --publish always` pour automatiser tag → build → release.

---

## Arborescence des fichiers locaux (côté utilisateur)

```
%APPDATA%/sectver-launcher/sectver/
├── settings.json          # RAM par profil, dernier profil sélectionné
├── auth.bin               # Tokens Microsoft chiffrés
├── manifest.cache.json    # Dernier manifeste reçu (fallback offline)
├── minecraft/             # Versions vanilla/loader, libs, assets (partagés)
└── profiles/
    ├── vanilla/
    │   └── (saves, options.txt, screenshots, ...)
    └── modded/
        ├── mods/
        ├── shaderpacks/
        ├── resourcepacks/
        └── (saves, options.txt, ...)
```

Chaque profil a son propre `gameDirectory` → les saves et options vanilla et moddées ne se mélangent pas.

## Licences & dépendances clés

- [`minecraft-launcher-core`](https://www.npmjs.com/package/minecraft-launcher-core) — lancement JVM
- [`msmc`](https://www.npmjs.com/package/msmc) — auth Microsoft/Minecraft
- [`@xmcl/installer`](https://www.npmjs.com/package/@xmcl/installer) — installation Forge/NeoForge/Fabric
- [`electron-updater`](https://www.npmjs.com/package/electron-updater) — auto-update
