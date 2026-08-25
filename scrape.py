import re,html,json,urllib.request,time,sys
UA={'User-Agent':'Mozilla/5.0'}
def get(u):
    err=None
    for i in range(3):
        try: return urllib.request.urlopen(urllib.request.Request(u,headers=UA),timeout=30).read().decode('utf-8','ignore').replace('\\"','"').replace('\\/','/')
        except Exception as e: time.sleep(2); err=e
    print('FAIL',u,err); return ''
def text(m):
    m=re.sub(r'<script.*?</script>','',m,flags=re.S)
    t=html.unescape(re.sub(r'<[^>]+>','\n',m)); return re.sub(r'\n\s*\n+','\n',t).strip()
base=get('https://www.mafteiach.app/likkutei_sichos/by_parsha')
slugs=re.findall(r"id=\"parsha_([a-z\-]+)\"[^>]*>\s*([^<]+?)\s*</button>",base)
print(len(slugs),'parshiot')
out={}
for slug,he in slugs:
    s=get(f'https://www.mafteiach.app/likkutei_sichos/by_parsha/{slug}')
    a=s.find('<div id="parshiyos"');m=s[a:]
    entries=[]
    for vol in re.finditer(r'<button id="parsha_\d+_button"[^>]*>\s*(.*?)<span[^>]*>\((\d+)\s*שיח[^<]*</span>(.*?)(?=<button id="parsha_\d+_button"|$)',m,flags=re.S):
        volname=html.unescape(vol.group(1)).strip(); body=vol.group(3)
        for it in re.finditer(r'<button id="([^"]+)__button"[^>]*>\s*(.*?)\s*</button>\s*<div id="[^"]+__content"(.*?)(?=<button id="[^"]+__button"|$)',body,flags=re.S):
            sid,title,c=it.group(1),html.unescape(it.group(2)).strip(),it.group(3)
            kid=re.search(r'/likkutei_sichos/(\d+)/kitzur',c)
            links=[{'url':u,'label':html.unescape(l).strip()} for u,l in re.findall(r'href="(https?://[^"]+)"[^>]*>\s*([^<]+?)\s*<',c)]
            summ=re.search(r'<div class="trix-content">(.*?)</div>\s*</div>',c,flags=re.S)
            e={'sid':sid,'vol':volname,'title':title,'oneliner':text(summ.group(1)) if summ else '','links':links}
            if kid:
                e['id']=int(kid.group(1))
                k=get(f'https://www.mafteiach.app/likkutei_sichos/{kid.group(1)}/kitzur')
                a2=k.find('<main');b2=k.find('</main>',a2);km=k[a2:b2]
                km=re.sub(r'<div id="parshios".*?</div>\s*</div>','',km,flags=re.S)
                kt=text(km)
                kt=re.sub(r'^לקוטי שיחות\s*\n.*?\n\s*קיצור\s*\n','',kt,flags=re.S)
                e['kitzur']=kt.strip()
            entries.append(e)
    out[slug]={'he':html.unescape(he).strip(),'entries':entries}
    print(slug,he,len(entries),sum(1 for e in entries if 'kitzur' in e)); sys.stdout.flush()
json.dump(out,open('data/sihot-he.json','w'),ensure_ascii=False,indent=1)
print('TOTAL',sum(len(v['entries']) for v in out.values()),sum(1 for v in out.values() for e in v['entries'] if 'kitzur' in e))
