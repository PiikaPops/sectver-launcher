Place tes images de fond ici.

Convention de nommage : <profile.id>.jpg
  - vanilla.jpg   → fond du panneau "Vanilla 26.1.2"
  - modded.jpg    → fond du panneau "Sectver Modded — Cobblemon"

L'ID correspond au champ "id" dans manifest.json. Si tu ajoutes un nouveau
profil id "hardcore", l'image attendue sera "hardcore.jpg".

Format recommandé : JPG (qualité 85)
  - Format alternatif : .webp ou .png si tu préfères (faut adapter Home.tsx).

Dimensions recommandées : 1024 × 1536 px (ratio 2:3, cadrage vertical)
  - Le panneau est plus haut que large, l'image est cadrée en background-size:cover
    et alignée en haut. Le bas est masqué par un dégradé vers le noir.
  - Le contenu visuel important doit donc être dans le tiers supérieur.

Poids cible : 200–400 Ko par image (JPG qualité 85 atteint ça facilement).

Si une image est absente, le panneau s'affiche avec son fond noir uni (fallback).
