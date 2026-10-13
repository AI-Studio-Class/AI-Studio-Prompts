#!/usr/bin/env python3
"""Inventory design evidence inside one project; never execute source or infer an active theme."""
import argparse,json,os,re
from pathlib import Path
SKIP={'.git','.hg','.svn','node_modules','vendor','dist','build','.next','.nuxt','.cache','coverage','__pycache__','.venv','venv','founder-pitch-output','_working','.studio-history'}
STYLES={'.css','.scss','.sass','.less'}
UI={'.html','.tsx','.jsx','.vue','.svelte','.swift','.kt'}
MEDIA={'.png','.jpg','.jpeg','.webp','.svg','.avif','.woff','.woff2','.ttf','.otf'}
SECRET=re.compile(r'(^\.env($|\.)|credential|secret|private.?key|\.pem$|\.key$)',re.I)
TOKEN=re.compile(r'(?P<name>--[\w-]+|font-family|border-radius|box-shadow)\s*:\s*(?P<value>[^;{}\n]{1,200})')
def scan(root,limit=2500):
    rows=[];count=0;truncated=False
    for current,dirs,files in os.walk(root,followlinks=False):
        dirs[:]=sorted(d for d in dirs if d not in SKIP and not d.startswith('.') and not (Path(current)/d).is_symlink())
        for name in sorted(files):
            path=Path(current)/name
            if path.is_symlink() or SECRET.search(name):continue
            count+=1
            if count>limit:truncated=True;break
            rel=path.relative_to(root).as_posix();low=rel.lower();ext=path.suffix.lower()
            design_config=any(x in name.lower() for x in ['tailwind.config','theme','tokens','design-system','typography']) and ext in {'.js','.ts','.json','.mjs','.cjs','.yaml','.yml'}
            if ext in STYLES:kind='stylesheet';score=80
            elif design_config:kind='theme-config';score=90
            elif ext in UI:kind='ui-source';score=60
            elif ext in MEDIA:kind='brand-or-media';score=20
            elif name in ['package.json','README.md','项目主文件.md']:kind='entry-document';score=70
            else:continue
            if any(w in low for w in ['global','app.','layout.','index.','brand','logo','screenshot','screen-shot','homepage']):score+=15
            try:stat=path.stat()
            except OSError:continue
            row={'path':rel,'kind':kind,'bytes':stat.st_size,'priority':score}
            if kind=='stylesheet' and stat.st_size<=256000:
                try:text=path.read_text(encoding='utf-8')
                except (OSError,UnicodeError):text=''
                row['token_candidates']=[{'name':m['name'],'value':m['value'].strip(),'line':text.count('\n',0,m.start())+1} for m in list(TOKEN.finditer(text))[:30]]
            rows.append(row)
        if truncated:break
    rows.sort(key=lambda x:(-x['priority'],x['path']))
    return {'scope':'current-project-only','files_visited':min(count,limit),'truncated':truncated,'candidate_count':len(rows),'warning':'Candidates only: inspect active imports, selected theme and actual UI before applying. No project source was executed.','candidates':rows}
def main():
    p=argparse.ArgumentParser();p.add_argument('--root',default='.');p.add_argument('--output',required=True);p.add_argument('--limit',type=int,default=2500);a=p.parse_args()
    root=Path(a.root).expanduser().resolve()
    if not root.is_dir() or a.limit<1:p.error('root must be a directory and limit positive')
    out=Path(a.output).expanduser();out=out if out.is_absolute() else root/out
    result=scan(root,a.limit);out.parent.mkdir(parents=True,exist_ok=True);out.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n');print(out)
if __name__=='__main__':main()
