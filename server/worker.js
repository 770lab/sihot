/**
 * 770lab.com/sihot — passerelle de conversation.
 *
 * Reçoit les messages de la fenêtre de chat, va chercher la paracha concernée
 * sur le site lui-même pour ancrer la réponse, puis relaie la réponse de Claude
 * en streaming. La clé API reste côté serveur : elle n'atteint jamais le
 * navigateur.
 *
 * Déploiement : voir server/README.md
 * Secret attendu : ANTHROPIC_API_KEY
 */

const MODEL = 'claude-opus-5';
const SITE = 'https://770lab.com/sihot';
const ALLOWED = ['https://770lab.com', 'https://www.770lab.com', 'http://localhost:8931'];

const MAX_CHARS = 2000;   // par message
const MAX_TURNS = 12;     // historique transmis
const WINDOW_MS = 60_000; // fenêtre du garde-fou
const MAX_REQ = 12;       // requêtes par IP et par fenêtre

const hits = new Map();   // garde-fou en mémoire (par isolat ; suffit à cet usage)

function cors(origin) {
  const ok = ALLOWED.includes(origin) ? origin : ALLOWED[0];
  return {
    'access-control-allow-origin': ok,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
    vary: 'Origin',
  };
}

function tooMany(ip) {
  const now = Date.now();
  const rec = hits.get(ip) || { n: 0, t: now };
  if (now - rec.t > WINDOW_MS) { rec.n = 0; rec.t = now; }
  rec.n += 1;
  hits.set(ip, rec);
  if (hits.size > 5000) for (const [k, v] of hits) if (now - v.t > WINDOW_MS) hits.delete(k);
  return rec.n > MAX_REQ;
}

/** Le contenu réel du site : c'est lui qui ancre les réponses. */
async function corpus(slug) {
  if (!slug) {
    const idx = await fetch(`${SITE}/data/index.json`).then(r => r.ok ? r.json() : null).catch(() => null);
    if (!idx) return '';
    return "Compteurs du site, par paracha (slug, nombre d'entrées) :\n"
      + idx.map(i => `${i.slug} : ${i.n}`).join(' · ');
  }
  const [fr, he] = await Promise.all([
    fetch(`${SITE}/data/fr/${slug}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
    fetch(`${SITE}/data/he/${slug}.json`).then(r => r.ok ? r.json() : null).catch(() => null),
  ]);
  if (!fr && !he) return '';
  const parts = [];
  if (fr) {
    parts.push(`PARACHA ${fr.fr} — ${fr.intro}`);
    parts.push('\nFILS ROUGES :\n' + (fr.threads || []).map(t => '- ' + t).join('\n'));
    parts.push('\nLES ENTRÉES (référence · thème · résumé · leçon) :');
    for (const e of fr.entries || []) {
      parts.push(`\n[${e.ref}${e.suffix ? ' ' + e.suffix : ''}] (${e.kind}) thème : ${e.theme}`
        + (e.verse ? `\nverset : ${e.verse}` : '')
        + `\n${e.resume}` + (e.lesson ? `\nleçon : ${e.lesson}` : ''));
    }
    parts.push('\nCHIOURIM PRÊTS À DONNER :\n'
      + (fr.courses || []).map(c => `- ${c.title} (${c.minutes || 5} min) — ${c.angle} [${(c.refs || []).join(' · ')}]`).join('\n'));
  }
  if (he) {
    parts.push("\nKITSOURIM HÉBREUX (source Mafteiach, à citer si l'on demande l'original) :");
    for (const e of he.entries || []) {
      if (e.kitzur) parts.push(`\n[${e.title}]\n${e.kitzur}`);
    }
  }
  return parts.join('\n');
}

const SYSTEM = (page, data) => `Tu es Claude. Tu as construit le site 770lab.com/sihot avec Anthony (Chabad Club 770 / Koulam), et tu réponds ici aux visiteurs, dans la fenêtre de conversation du site.

Le site indexe les si'hot du Rabbi de Loubavitch dans Likoutei Si'hot, paracha par paracha, d'après l'index Mafteiach : 1 498 entrées, 1 072 kitsourim, 54 parachot. Pour chaque paracha : un résumé d'une ligne par si'ha, un résumé développé en français, le kitsour hébreu d'origine, et quatre chiourim de cinq minutes prêts à donner.

Le visiteur regarde : ${page}

RÈGLES ABSOLUES
- N'invente JAMAIS une si'ha, un volume, une page, un verset, un Rachi ou une source. Si une référence ne figure pas dans les données ci-dessous, dis que tu ne la trouves pas dans l'index — c'est une réponse juste, pas un échec.
- Cite toujours tes références sous la forme du site : « vol. 19 p. 227 ».
- Les résumés viennent des kitsourim, pas des si'hot intégrales : si la question exige le détail du raisonnement, dis-le et renvoie à la si'ha elle-même.
- Écris « le Rabbi » ou « le Rabbi de Loubavitch », jamais autre chose. « D.ieu » avec le point. Translittération avec l'apostrophe : 'hassidout, 'Haï Elloul, to'ha'ha.
- Si l'on te demande d'ajouter, corriger ou compléter quelque chose sur le site : dis clairement que tu ne peux pas modifier le site depuis cette fenêtre, note précisément la demande, et invite à la déposer sur github.com/770lab/sihot/issues — Anthony l'y verra.

TON
Français soigné, direct, sans flagornerie. Réponses courtes par défaut (quelques phrases) ; développe quand on te le demande. Pas d'emoji. Ne répète pas la question.

DONNÉES DE LA PAGE CONSULTÉE
${data || '(aucune donnée chargée pour cette page — dis-le plutôt que de deviner)'}`;

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const h = cors(origin);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: h });
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: h });
    if (origin && !ALLOWED.includes(origin)) return new Response('Origine refusée', { status: 403, headers: h });

    const ip = request.headers.get('CF-Connecting-IP') || 'anon';
    if (tooMany(ip)) return new Response('Trop de requêtes', { status: 429, headers: h });

    let body;
    try { body = await request.json(); } catch { return new Response('JSON invalide', { status: 400, headers: h }); }

    const msgs = (Array.isArray(body.messages) ? body.messages : [])
      .filter(m => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-MAX_TURNS)
      .map(m => ({ role: m.role, content: m.content.slice(0, MAX_CHARS) }));
    if (!msgs.length || msgs[msgs.length - 1].role !== 'user') {
      return new Response('Aucun message', { status: 400, headers: h });
    }

    const slug = typeof body.slug === 'string' && /^[a-z-]{1,32}$/.test(body.slug) ? body.slug : '';
    const page = slug ? `la paracha « ${slug} »${body.view ? `, vue « ${String(body.view).slice(0, 40) }»` : ''}` : "la page d'accueil du site";
    const data = await corpus(slug);

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        stream: true,
        output_config: { effort: 'low' },
        system: [
          // le préambule stable est mis en cache ; les données de la page suivent
          { type: 'text', text: SYSTEM(page, data), cache_control: { type: 'ephemeral' } },
        ],
        messages: msgs,
      }),
    });

    if (!upstream.ok || !upstream.body) {
      const detail = await upstream.text().catch(() => '');
      console.error('anthropic', upstream.status, detail.slice(0, 400));
      return new Response(
        `data: ${JSON.stringify({ error: upstream.status === 429 ? 'Le service est saturé, réessayez dans un instant.' : 'Le service de réponse est indisponible.' })}\n\n`,
        { status: 200, headers: { ...h, 'content-type': 'text/event-stream; charset=utf-8' } }
      );
    }

    // Relais SSE : on ne renvoie que le texte, jamais la forme interne de l'API.
    const { readable, writable } = new TransformStream();
    (async () => {
      const w = writable.getWriter(), enc = new TextEncoder(), dec = new TextDecoder();
      const reader = upstream.body.getReader();
      let buf = '';
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += dec.decode(value, { stream: true });
          const parts = buf.split('\n\n'); buf = parts.pop();
          for (const p of parts) {
            const line = p.split('\n').find(x => x.startsWith('data:'));
            if (!line) continue;
            try {
              const j = JSON.parse(line.slice(5).trim());
              if (j.type === 'content_block_delta' && j.delta?.type === 'text_delta' && j.delta.text) {
                await w.write(enc.encode(`data: ${JSON.stringify({ text: j.delta.text })}\n\n`));
              }
              if (j.type === 'message_stop') await w.write(enc.encode('data: [DONE]\n\n'));
            } catch { /* trame partielle : on attend la suite */ }
          }
        }
      } catch (e) {
        await w.write(enc.encode(`data: ${JSON.stringify({ error: 'La réponse a été interrompue.' })}\n\n`)).catch(() => {});
      } finally {
        await w.close().catch(() => {});
      }
    })();

    return new Response(readable, {
      headers: { ...h, 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-store' },
    });
  },
};
