# Passerelle de conversation — `sihot-chat`

La fenêtre « Parler à Claude » de <https://770lab.com/sihot> a besoin d'un serveur :
la clé API ne peut pas vivre dans une page statique. Ce Worker Cloudflare tient ce rôle.

Il est volontairement minuscule : il vérifie l'origine, limite le débit, va chercher la
paracha consultée **sur le site lui-même** pour ancrer la réponse, appelle Claude, et
relaie le texte en streaming. Il ne stocke rien.

## Déployer (une fois)

```bash
cd server
npx wrangler login                      # ouvre le navigateur, compte Cloudflare
npx wrangler deploy                     # renvoie une URL https://sihot-chat.<compte>.workers.dev
npx wrangler secret put ANTHROPIC_API_KEY   # colle la clé, elle reste chez Cloudflare
```

Puis brancher le site sur cette URL :

```bash
cd ..
cat > data/chat.json <<'JSON'
{ "enabled": true,
  "endpoint": "https://sihot-chat.<compte>.workers.dev",
  "note": "Claude répond d'après l'index du site. Vérifiez dans la si'ha avant d'enseigner." }
JSON
python3 build.py && git add -A && git commit -m "Chat branché" && git push
```

Sans `data/chat.json`, ou avec `"enabled": false`, le bouton retombe sur l'envoi
d'un message en différé (ticket sur le dépôt / e-mail) — jamais sur un chat muet.

## Garde-fous

| | |
|---|---|
| Origines admises | `770lab.com`, `www.770lab.com`, `localhost:8931` — modifiables dans `ALLOWED` |
| Débit | 20 requêtes par IP et par minute, comptées par un Durable Object (`Limiteur`) |
| Taille | 2 000 caractères par message, 12 tours d'historique |
| Réponse | 2 000 tokens maximum, effort `low` |
| Modèle | `claude-opus-5` |

Le préambule est marqué en cache éphémère : les échanges qui suivent, sur la même
paracha, coûtent nettement moins cher.

**Pourquoi un Durable Object et pas un compteur en mémoire** : Cloudflare répartit les
requêtes sur plusieurs isolats, dont chacun repart de zéro — un `Map` en mémoire laisse
donc passer une rafale entière. Le limiteur natif (`[[ratelimits]]`) n'a pas basculé non
plus à ce volume lors des essais. Un Durable Object par IP donne un compteur unique et
vérifiable : testé, il renvoie 429 à partir de la 21ᵉ requête.

**Plafond de dépense** : le vrai garde-fou financier est côté Anthropic — fixez une limite
de budget sur la clé (Console → Limits). Aucun bug de ce Worker ne peut la dépasser.

## Ce que le serveur envoie à Claude

Le contenu réel de la paracha consultée — résumés français, kitsourim hébreux, chiourim —
récupéré à chaud depuis `770lab.com/sihot/data/`. Les réponses sont donc ancrées sur
l'index, et la consigne interdit explicitement d'inventer une référence : si une si'ha
n'est pas dans les données, Claude doit le dire.

## Tester en local

```bash
npx wrangler dev            # sert le Worker sur http://localhost:8787
# puis, dans data/chat.json : "endpoint": "http://localhost:8787"
python3 -m http.server 8931 # et ouvrir http://localhost:8931
```
