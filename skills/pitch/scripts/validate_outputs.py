#!/usr/bin/env python3
"""Check package structure and local assets; semantic and visual review remain separate."""
import argparse, json, re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote
class Deck(HTMLParser):
    def __init__(self):
        super().__init__(); self.pages=0; self.assets=[]; self.remote=[]
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'slide' in a.get('class','').split(): self.pages+=1
        for key in ('src','poster'):
            if a.get(key): self.assets.append(a[key])
        if tag=='link' and a.get('rel')=='stylesheet': self.assets.append(a.get('href',''))
def main():
    p=argparse.ArgumentParser();p.add_argument('--output',required=True);p.add_argument('--expected-pages',type=int,default=6);a=p.parse_args()
    root=Path(a.output).resolve();errors=[];warnings=[]
    for name in ['02_Founder_Pitch.html','演讲提示卡.md','_working/outline.md','_working/evidence.md','_working/pitch-settings.json']:
        if not (root/name).is_file():errors.append('缺少文件：'+name)
    html=root/'02_Founder_Pitch.html'
    if html.exists():
        text=html.read_text(); d=Deck();d.feed(text)
        if d.pages!=a.expected_pages: errors.append(f'页数 {d.pages}，预期 {a.expected_pages}')
        if re.search(r'\{\{[A-Z_]+\}\}',text):errors.append('仍有模板占位符')
        for asset in d.assets:
            if asset.startswith('data:'):continue
            if asset.startswith(('http:','https:','//')):errors.append('离线演示依赖远程资源：'+asset);continue
            if not (root/unquote(asset.split('#')[0].split('?')[0])).is_file():errors.append('资源缺失：'+asset)
    settings=root/'_working/pitch-settings.json'
    if settings.exists():
        try:
            obj=json.loads(settings.read_text())
            if not obj.get('style_id'):errors.append('未记录风格')
            if obj.get('style_id')=='product-ui':
                relative=obj.get('product_style_path','_working/product-style.json')
                style_path=(root/relative).resolve()
                if root not in style_path.parents:
                    errors.append('产品风格记录必须在交付目录内')
                elif not style_path.is_file():
                    errors.append('product-ui缺少实际产品风格记录')
                else:
                    try:
                        evidence=json.loads(style_path.read_text())
                        if not evidence.get('sources') or not evidence.get('tokens'):
                            errors.append('产品风格记录缺少来源或设计参数')
                        if evidence.get('evidence_status') not in {'rendered','source-and-screenshots','source-only'}:
                            errors.append('产品风格证据不足，不能声称已沿用产品UI')
                        if evidence.get('evidence_status')=='source-only':
                            warnings.append('产品风格仅按源码提取，尚未核实运行时画面')
                    except (ValueError,OSError):
                        errors.append('产品风格记录不可读取')
        except ValueError:errors.append('设置JSON格式错误')
    warnings.append('本检查不证明内容正确、交互有效或视觉合格；需实际浏览器与逐页看图')
    print(json.dumps({'ok':not errors,'errors':errors,'warnings':warnings},ensure_ascii=False,indent=2));return int(bool(errors))
if __name__=='__main__':raise SystemExit(main())
