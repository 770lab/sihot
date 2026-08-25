import json,os,re,subprocess,hashlib
# 1) valider les fichiers FR
fr=sorted(f[:-5] for f in os.listdir('data/fr') if f.endswith('.json') and f!='index.json')
ok=[]
for s in fr:
    r=subprocess.run(['python3','validate.py',s],capture_output=True,text=True)
    if r.stdout.startswith('OK'): ok.append(s)
    else: print('INVALID',s,r.stdout.replace('\n',' | ')[:200])
json.dump(ok,open('data/fr/index.json','w'))

# 2) empreinte de contenu -> cache-bust (sinon un visiteur déjà venu garde l'ancien index)
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
