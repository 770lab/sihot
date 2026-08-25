# Si'hot du Rabbi par paracha — 770lab.com/sihot

Toutes les si'hot de *Likoutei Si'hot* indexées par paracha, avec pour chacune un résumé
en français, le kitsour hébreu d'origine, et des cours de cinq minutes prêts à donner.

**En ligne : <https://770lab.com/sihot/>**

## Ce que contient le site

- **54 parachot**, 1 498 entrées, 1 072 kitsourim — index et résumés hébreux repris de
  [Mafteiach](https://www.mafteiach.app/likkutei_sichos/by_parsha).
- Pour chaque paracha, quatre lectures : **En une ligne** · **Résumés** (français) ·
  **Kitsour hébreu** · **Cours 5 min** (quatre angles différents, avec minutage, copier/imprimer).
- Recherche par nom français, hébreu ou translittération (« Ki Tavo », « כי תבוא », « kitavo »),
  et repérage de la paracha de la semaine via Hebcal.

## Structure

```
index.html · style.css · app.js · parshiot.js   le site (vanilla, sans build)
data/index.json                                  compteurs par paracha
data/he/<slug>.json                              source hébraïque scrapée (titre, kitsour, liens)
data/fr/<slug>.json                              version française (voir data/SPEC-FR.md)
data/fr/index.json                               parachot dont le français est validé
data/SPEC-FR.md                                  schéma + règles de rédaction française
```

Les fichiers `data/he/*.json` sont la source ; les fichiers `data/fr/*.json` en sont la
traduction et la mise en cours. Un `sid` identique relie chaque entrée française à son
entrée hébraïque.

## Outils (non versionnés)

| Script | Rôle |
| --- | --- |
| `scrape.py` | Re-scrape Mafteiach → `data/he/` (à relancer si des si'hot sont ajoutées) |
| `validate.py <slug>` | Vérifie un fichier français contre son homologue hébreu |
| `build.py` | Valide tous les français, écrit `data/fr/index.json`, recalcule le cache-bust |

Après toute modification : `python3 build.py && git add -A && git commit && git push`.
Le `?v=` des assets dérive d'une empreinte du contenu — sans `build.py`, les visiteurs
déjà venus gardent l'ancienne version en cache.

## Précaution

Les résumés français sont rédigés à partir des kitsourim de Mafteiach, pas des si'hot
intégrales. Ils servent à s'orienter et à préparer ; **vérifiez toujours dans la si'ha
elle-même avant d'enseigner** — les liens vers le texte, la traduction et le kitsour
d'origine figurent sous chaque entrée.
