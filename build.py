import json,os,re,subprocess,hashlib
# 1) valider les fichiers FR
fr=sorted(f[:-5] for f in os.listdir('data/fr') if f.endswith('.json') and f!='index.json')
ok=[]
for s in fr:
    r=subprocess.run(['python3','validate.py',s],capture_output=True,text=True)
    if r.stdout.startswith('OK'): ok.append(s)
    else: print('INVALID',s,r.stdout.replace('\n',' | ')[:200])
json.dump(ok,open('data/fr/index.json','w'))

# 2) minutage des chiourim recalculé depuis le texte réel (150 mots/minute)
WPM=150
def stamp(path):
    d=json.load(open(path)); ch=False
    for c in d.get('courses',[]):
        if c.get('verbatim') or d.get('verbatim'):
            # source signée : on garde son texte ET son minutage ; la durée suit la dernière étape
            st=c['steps'][-1] if c.get('steps') else {'t':'0:00','p':''}
            mm,ss=(int(x) for x in st.get('t','0:00').split(':'))
            end=mm*60+ss+len(st.get('p','').split())/WPM*60   # début de la dernière étape + sa durée
            m2=max(1,-(-int(end)//60))
            if c.get('minutes')!=m2: c['minutes']=m2; ch=True
            continue
        run=0
        for s in c['steps']:
            t=f"{int(run//60)}:{int(run%60):02d}"
            if s.get('t')!=t: s['t']=t; ch=True
            run+=len(s['p'].split())/WPM*60
        mins=max(1,round(run/60))
        if c.get('minutes')!=mins: c['minutes']=mins; ch=True
    if ch: json.dump(d,open(path,'w'),ensure_ascii=False,indent=1)
    return ch
n=sum(stamp(f'data/fr/{s}.json') for s in ok)
if n: print(f"minutage recalculé sur {n} parachot")

# 3) empreinte de contenu -> cache-bust (sinon un visiteur déjà venu garde l'ancien index)
h=hashlib.sha1()
for p in ['app.js','style.css','parshiot.js','data/index.json','data/fr/index.json']:
    h.update(open(p,'rb').read())
for s in ok: h.update(open(f'data/fr/{s}.json','rb').read())
v=h.hexdigest()[:8]
for p in ['index.html','app.js']:
    src=open(p).read()
    new=re.sub(r"\?v=[0-9a-f]+", f"?v={v}", src)
    if new!=src: open(p,'w').write(new)
print(f"{len(ok)}/54 FR ok · v={v}")
print(', '.join(ok))
