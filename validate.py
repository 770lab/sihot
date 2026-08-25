import json,sys
slug=sys.argv[1]
he=json.load(open(f'data/he/{slug}.json')); fr=json.load(open(f'data/fr/{slug}.json'))
errs=[]
if fr.get('slug')!=slug: errs.append('slug')
hs=[e['sid'] for e in he['entries']]; fs=[e.get('sid') for e in fr.get('entries',[])]
if hs!=fs: errs.append(f'sids mismatch: he={len(hs)} fr={len(fs)} first diff={next((i for i,(a,b) in enumerate(zip(hs,fs)) if a!=b),None)}')
for e in fr.get('entries',[]):
    for k in ['ref','suffix','kind','verse','theme','line','resume','lesson']:
        if k not in e: errs.append(f"{e.get('sid')} missing {k}")
    if e.get('kind') not in ('sicha','hossafa'): errs.append(f"{e.get('sid')} kind")
    if e.get('kind')=='sicha' and len(e.get('resume','').split())<60: errs.append(f"{e.get('sid')} resume too short")
    if len(e.get('line',''))>260: errs.append(f"{e.get('sid')} line too long")
# les refs citées dans les cours doivent exister parmi les si'hot de la paracha
refs={e.get('ref','').strip() for e in fr.get('entries',[])}
def norm(r):
    return r.replace('Vol.','vol.').replace('  ',' ').strip().rstrip('.')
nrefs={norm(r) for r in refs}
c=fr.get('courses',[])
if len(c)!=4: errs.append(f'courses={len(c)} (need 4)')
for i,co in enumerate(c):
    if len(co.get('steps',[]))<4: errs.append(f'course {i} steps')
    for r in co.get('refs',[]):
        if norm(r) not in nrefs: errs.append(f"course {i} ref inconnue: {r}")
    w=sum(len(s.get('p','').split()) for s in co.get('steps',[]))
    if w<620: errs.append(f'course {i} trop court ({w} mots, minimum 620 pour tenir 5 min)')
if not (3<=len(fr.get('threads',[]))<=6): errs.append('threads count')
for k in ['fr','intro']:
    if not fr.get(k): errs.append(f'missing {k}')
print('OK' if not errs else 'ERRORS:\n- '+'\n- '.join(errs))
sys.exit(1 if errs else 0)
