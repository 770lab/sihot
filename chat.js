/* Fenêtre de conversation — parler à Claude depuis 770lab.com/sihot
   L'endpoint est lu dans data/chat.json ; sans endpoint, on retombe sur le
   dépôt / l'e-mail plutôt que d'afficher un chat muet. */
(function () {
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const REPO = '770lab/sihot', MAIL = 'chabadclub770@gmail.com';
  const KEY = 'sihot_chat_v1';
  let cfg = null, msgs = [], busy = false, ctrl = null;

  /* ---------- éléments ---------- */
  const fab = document.createElement('button');
  fab.className = 'chat-fab'; fab.type = 'button';
  fab.innerHTML = '<span aria-hidden="true">✦</span> Parler à Claude';
  fab.setAttribute('aria-haspopup', 'dialog');
  document.body.appendChild(fab);

  const win = document.createElement('section');
  win.className = 'chat'; win.hidden = true;
  win.setAttribute('role', 'dialog'); win.setAttribute('aria-label', 'Conversation avec Claude');
  document.body.appendChild(win);

  /* ---------- contexte de la page ---------- */
  function ctx() {
    const h = decodeURIComponent(location.hash.replace('#', '')).trim();
    const p = (window.PARSHIOT || []).find(x => x[0] === h);
    const tab = document.querySelector('.tabs button.on');
    return {
      slug: p ? p[0] : '',
      label: p ? `${p[1]} (${p[2]})` : 'page d’accueil',
      view: tab ? tab.textContent.trim() : ''
    };
  }

  /* ---------- mémoire courte (par paracha) ---------- */
  function load(slug) {
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '{}');
      return Array.isArray(all[slug]) ? all[slug] : [];
    } catch (e) { return []; }
  }
  function save(slug) {
    try {
      const all = JSON.parse(localStorage.getItem(KEY) || '{}');
      all[slug] = msgs.slice(-20);
      localStorage.setItem(KEY, JSON.stringify(all));
    } catch (e) { /* navigation privée : on continue sans mémoire */ }
  }

  /* ---------- rendu ---------- */
  function shell(c) {
    win.innerHTML = `
      <header class="chat-head">
        <div><b>Claude</b><small>${esc(c.label)}${c.view ? ' · ' + esc(c.view) : ''}</small></div>
        <div class="chat-head-x">
          <button class="chat-clear" title="Effacer la conversation" aria-label="Effacer la conversation">Effacer</button>
          <button class="chat-x" aria-label="Fermer">×</button>
        </div>
      </header>
      <div class="chat-log" id="chat-log" aria-live="polite"></div>
      <form class="chat-form">
        <textarea id="chat-in" rows="1" placeholder="Une question sur cette paracha, une si'ha à ajouter, une correction…" aria-label="Votre message"></textarea>
        <button class="chat-send" type="submit" aria-label="Envoyer">↑</button>
      </form>
      <p class="chat-foot"></p>`;
    win.querySelector('.chat-x').onclick = close;
    win.querySelector('.chat-clear').onclick = () => { msgs = []; save(c.slug); draw(); };
    const ta = win.querySelector('#chat-in');
    ta.addEventListener('input', () => { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight, 150) + 'px'; });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); win.querySelector('.chat-form').requestSubmit(); }
    });
    win.querySelector('.chat-form').onsubmit = e => { e.preventDefault(); ask(); };
  }

  function draw() {
    const log = win.querySelector('#chat-log');
    if (!log) return;
    if (!msgs.length) {
      const c = ctx();
      log.innerHTML = `<div class="chat-empty">
        <p>Posez-moi une question sur ${c.slug ? '<b>' + esc(c.label) + '</b>' : 'les si\'hot'} — je connais les si'hot indexées ici, leurs références et leurs résumés.</p>
        <div class="chat-sugg">
          ${(c.slug
            ? ['Quelles si\'hot parlent des bikkourim ?', 'Résume-moi la si\'ha du volume 19', 'De quoi je pourrais parler à un farbrenguen ?']
            : ['Quelle est la paracha de la semaine ?', 'Trouve-moi une si\'ha sur la joie', 'Comment ce site est-il construit ?']
          ).map(s => `<button type="button" data-s="${esc(s)}">${esc(s)}</button>`).join('')}
        </div></div>`;
      log.querySelectorAll('[data-s]').forEach(b => b.onclick = () => {
        win.querySelector('#chat-in').value = b.dataset.s; ask();
      });
      return;
    }
    log.innerHTML = msgs.map(m => `<div class="chat-m ${m.role}">${
      m.role === 'assistant' ? md(m.content) : `<p>${esc(m.content)}</p>`}</div>`).join('')
      + (busy ? '<div class="chat-m assistant pending"><span class="dot"></span><span class="dot"></span><span class="dot"></span></div>' : '');
    log.scrollTop = log.scrollHeight;
  }

  /* mise en forme minimale : gras, italique, listes, paragraphes */
  function md(t) {
    const lines = esc(t).split('\n');
    let out = '', ul = false;
    for (let l of lines) {
      l = l.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/(?<!\*)\*(?!\s)(.+?)(?<!\s)\*(?!\*)/g, '<i>$1</i>');
      if (/^\s*[-–•]\s+/.test(l)) { if (!ul) { out += '<ul>'; ul = true; } out += `<li>${l.replace(/^\s*[-–•]\s+/, '')}</li>`; continue; }
      if (ul) { out += '</ul>'; ul = false; }
      if (l.trim()) out += `<p>${l}</p>`;
    }
    if (ul) out += '</ul>';
    return out || '<p></p>';
  }

  /* ---------- envoi ---------- */
  async function ask() {
    if (busy) return;
    const ta = win.querySelector('#chat-in');
    const text = ta.value.trim();
    if (!text) return;
    const c = ctx();
    msgs.push({ role: 'user', content: text });
    ta.value = ''; ta.style.height = 'auto';
    busy = true; draw();

    try {
      ctrl = new AbortController();
      const r = await fetch(cfg.endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: msgs.slice(-12), slug: c.slug, view: c.view }),
        signal: ctrl.signal
      });
      if (!r.ok) throw new Error(r.status === 429
        ? 'Trop de messages d’affilée — laissez passer une minute.'
        : `Le serveur a répondu ${r.status}.`);

      msgs.push({ role: 'assistant', content: '' });
      const reader = r.body.getReader(), dec = new TextDecoder();
      let buf = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split('\n\n'); buf = parts.pop();
        for (const p of parts) {
          const line = p.split('\n').find(x => x.startsWith('data:'));
          if (!line) continue;
          const raw = line.slice(5).trim();
          if (raw === '[DONE]') continue;
          try {
            const j = JSON.parse(raw);
            if (j.text) { msgs[msgs.length - 1].content += j.text; busy = false; draw(); }
            if (j.error) throw new Error(j.error);
          } catch (e) { if (e instanceof SyntaxError) continue; throw e; }
        }
      }
      if (!msgs[msgs.length - 1].content) msgs[msgs.length - 1].content = '(réponse vide)';
    } catch (e) {
      if (e.name === 'AbortError') return;
      msgs.push({ role: 'assistant', content: `Je n’ai pas pu répondre : ${e.message}\n\nVous pouvez réessayer, ou m’écrire autrement — le bouton « Effacer » repart de zéro.` });
    } finally {
      busy = false; ctrl = null; draw(); save(c.slug);
      win.querySelector('#chat-in')?.focus();
    }
  }

  /* ---------- repli sans serveur ---------- */
  function fallback(prefill) {
    const c = ctx();
    const line = `Paracha : ${c.label}${c.view ? ' · vue « ' + c.view + ' »' : ''}${prefill ? '\nSi\'ha : ' + prefill : ''}`;
    win.innerHTML = `
      <header class="chat-head"><div><b>Écrire à Claude</b><small>réponse en différé</small></div>
        <div class="chat-head-x"><button class="chat-x" aria-label="Fermer">×</button></div></header>
      <div class="chat-body">
        <p class="chat-ctx">${esc(line).replace(/\n/g, '<br>')}</p>
        <label class="chat-l" for="fb">Votre question, ou l'information à ajouter</label>
        <textarea id="fb" rows="5" placeholder="Ex. : ajoute la si'ha du volume 19 sur… / d'où vient cette citation ? / ce résumé me semble inexact parce que…"></textarea>
        <div class="chat-go">
          <button class="chat-primary" data-go="gh">Envoyer</button>
          <button data-go="mail">Par e-mail</button>
          <button data-go="copy">Copier</button>
        </div>
        <p class="chat-note">La conversation en direct n'est pas encore branchée sur ce site : votre message ouvre un ticket sur le dépôt, où je le lis et j'y réponds. Le contexte ci-dessus est joint.</p>
      </div>`;
    win.querySelector('.chat-x').onclick = close;
    const body = () => {
      const t = win.querySelector('#fb').value.trim();
      return `${t || '(sans texte)'}\n\n---\n${line}\n${location.href}`;
    };
    win.querySelectorAll('[data-go]').forEach(b => b.onclick = () => {
      const t = win.querySelector('#fb').value.trim();
      if (!t) { win.querySelector('#fb').focus(); return; }
      const title = t.split('\n')[0].slice(0, 70);
      if (b.dataset.go === 'gh') { window.open(`https://github.com/${REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body())}`, '_blank', 'noopener'); close(); }
      else if (b.dataset.go === 'mail') { location.href = `mailto:${MAIL}?subject=${encodeURIComponent("[si'hot] " + title)}&body=${encodeURIComponent(body())}`; }
      else { navigator.clipboard.writeText(body()).then(() => { b.textContent = 'Copié ✓'; setTimeout(() => b.textContent = 'Copier', 1500); }); }
    });
    win.hidden = false; fab.hidden = true;
    win.querySelector('#fb').focus();
  }

  /* ---------- ouverture / fermeture ---------- */
  function open(prefill) {
    if (!cfg || !cfg.endpoint) return fallback(prefill);
    const c = ctx();
    msgs = load(c.slug);
    shell(c); draw();
    win.hidden = false; fab.hidden = true;
    const ta = win.querySelector('#chat-in');
    if (prefill) ta.value = `À propos de ${prefill} : `;
    ta.focus();
    win.querySelector('.chat-foot').textContent = cfg.note || '';
  }
  function close() { ctrl?.abort(); win.hidden = true; fab.hidden = false; fab.focus(); }

  fab.onclick = () => open('');
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !win.hidden) close(); });
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-ask]');
    if (a) { e.preventDefault(); open(a.dataset.ask); }
  });
  window.addEventListener('hashchange', () => { if (!win.hidden && cfg?.endpoint) open(''); });

  /* ---------- configuration ---------- */
  fetch('data/chat.json?v=' + Date.now()).then(r => r.ok ? r.json() : null).then(j => {
    cfg = j && j.enabled ? j : null;
    if (cfg) fab.innerHTML = '<span aria-hidden="true">✦</span> Parler à Claude';
  }).catch(() => { cfg = null; });
})();
