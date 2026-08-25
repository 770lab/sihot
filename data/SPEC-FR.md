# Spec — version française d'une paracha (Likoutei Si'hot via Mafteiach)

Entrée : `data/he/<slug>.json` = `{he, entries:[{sid, vol, title, oneliner, links, id?, kitzur?}]}`.
- `title` ex. `ח"ט ע' 152 (תבא א)` = volume (ח"ט = vol. 9) + page + suffixe.
- `oneliner` = résumé hébreu d'une ligne (Mafteiach). `kitzur` = résumé hébreu détaillé (absent pour les « hossafot » = lettres/extraits).
- Volumes : ח"א..ח"ט = 1..9, ח"י=10, חי"א=11 … חי"ט=19, ח"כ=20, חכ"א=21 … חכ"ט=29, ח"ל=30, חל"א…חל"ט=31..39.

Sortie : `data/fr/<slug>.json` STRICTEMENT ce schéma (JSON valide, UTF-8, rien d'autre dans le fichier) :
```json
{
 "slug": "ki-tavo",
 "fr": "Ki Tavo",
 "intro": "1 phrase : de quoi parle la paracha + ce que les si'hot en font (thèmes dominants).",
 "entries": [
   {"sid": "<sid identique à l'entrée HE>",
    "ref": "Vol. 9 p. 152",
    "suffix": "Tavo I",            // traduction du suffixe entre parenthèses ; "Hossafot" pour הוספות ; garder date si présente
    "kind": "sicha" | "hossafa",   // hossafa = titre commence par הוספות ou pas de kitzur
    "verse": "וִירִשְׁתָּהּ וְיָשַׁבְתָּ בָּהּ",   // verset/citation hébraïque au cœur de la si'ha (si identifiable, sinon "")
    "theme": "Bikkourim",          // 1-3 mots, étiquette de thème
    "line": "1 phrase française (≤ 200 caractères) = traduction fidèle de `oneliner`.",
    "resume": "Résumé français du kitzur, 90-160 mots, fidèle, structure question → réponse → leçon/pnimiout. Pour une hossafa : traduction de `oneliner` développée en 1-3 phrases, pas d'invention.",
    "lesson": "1 phrase : la leçon pratique / hora'a de la si'ha (\"\" si vraiment absente)."
   }
 ],
 "threads": ["3-5 fils rouges : thème + quelles si'hot (refs)"],
 "courses": [
   {"title": "« Titre court »", "angle": "1 phrase : l'angle et le public visé", "refs": ["Vol. 9 p. 152", "..."],
    "steps": [
      {"t": "0:00", "h": "Accroche — …", "p": "≈100-130 mots, à dire à voix haute, concret, une scène ou une question.", "src": "Devarim 26:1-11"},
      {"t": "0:45", "h": "1. …", "p": "…", "src": "Likoutei Si'hot vol. 9 p. 152"},
      {"t": "2:00", "h": "2. …", "p": "…", "src": "…"},
      {"t": "3:15", "h": "3. …", "p": "…", "src": "…"},
      {"t": "4:15", "h": "Chute — …", "p": "…", "src": "…"}
    ]}
 ]
}
```
- `entries` : UNE entrée par entrée HE, même ordre, même `sid`. Ne rien omettre.
- `courses` : EXACTEMENT 4 cours de 5 minutes, sur 4 angles différents, chacun s'appuyant sur 2-4 si'hot réelles de la liste (refs exactes, reprises TELLES QUELLES du champ `ref` des entrées). Le 1er = l'angle le plus fort/dominant de la paracha.
- **Durée réelle** : un chiour de 5 minutes dit à voix haute fait **650 à 780 mots** (≈145 mots/minute). La somme des champs `p` d'un cours doit tomber dans cette fourchette — en dessous de 620 mots le cours ne tient pas ses 5 minutes et sera refusé. Écris donc des étapes pleines (110-160 mots chacune), pas des notes.

Règles de style (impératives) :
- Français soigné, accents corrects. Public : francophones 'Habad/traditionalistes, niveau farbrenguen.
- Translittération : ח = 'h ('Habad, 'hassidout, 'Haï Elloul, Ma'hachava) ; « Likoutei Si'hot », « si'ha / si'hot », « Roch Hachana », « Chabbat », « Machia'h », « techouva », « mitsva/mitsvot », « bikkourim », « pchat », « Rachi », « Rambam », « Admour Hazaken », « le Baal Chem Tov », « le Rabbi » (JAMAIS « le Rabbi vivant », jamais de slogan messianique), « le Rabbi précédent ». « D.ieu » avec le point.
- Fidélité absolue : ne rien inventer qui ne soit pas dans le kitzur/oneliner. Si un point est obscur, rester général plutôt que d'inventer. Pas de numéros de pages ou d'idées non présents dans la source.
- Pas d'emoji. Pas de majuscules criardes. Pas de « en conclusion ».
