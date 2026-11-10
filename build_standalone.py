#!/usr/bin/env python3
"""Create a stand-alone, offline-friendly prototype from the current source files.

Run from this project folder: python3 build_standalone.py
The result is an independent demonstration, not the Android release package.
"""
from pathlib import Path
import json
import re
from urllib.parse import quote

ROOT=Path(__file__).resolve().parent
HTML=ROOT/'index.html'
output=ROOT/'luma-drift-standalone-v8.2.html'

def svg_data(relative_path):
    return 'data:image/svg+xml;charset=utf-8,' + quote((ROOT/relative_path).read_text(encoding='utf-8'),safe='')

html=HTML.read_text(encoding='utf-8')
for stylesheet in ('style.css','polish.css'):
    anchor=f'<link rel="stylesheet" href="{stylesheet}">'
    assert anchor in html, f'missing stylesheet link {anchor}'
    html=html.replace(anchor,'<style>\n'+(ROOT/stylesheet).read_text(encoding='utf-8')+'\n</style>',1)
# Keep CSS image URLs self-contained, including all embedded world illustrations.
html=html.replace("url('assets/drift-world.svg')", "url(\""+svg_data('assets/drift-world.svg')+"\")")
html=html.replace('url("assets/drift-world.svg")', 'url("'+svg_data('assets/drift-world.svg')+'")')
html=html.replace('<link rel="manifest" href="manifest.webmanifest">','')
html=html.replace('<link rel="icon" href="icon.svg" type="image/svg+xml">',
                  '<link rel="icon" href="'+svg_data('icon.svg')+'" type="image/svg+xml">')
for artwork in ('bloom','pearl','kite','lantern','key','crown'):
    html=html.replace(f'src="assets/relic-{artwork}.svg"',f'src="{svg_data("assets/relic-"+artwork+".svg")}"')
js=(ROOT/'game.js').read_text(encoding='utf-8')
assets={name:svg_data('assets/relic-'+name+'.svg') for name in ('bloom','pearl','kite','lantern','key','crown')}
anchor="  const atlasArt=id=>`assets/relic-${id}.svg`;"
assert anchor in js
js=js.replace(anchor,'  const embeddedRelics='+json.dumps(assets,separators=(',',':'))+';\n  const atlasArt=id=>embeddedRelics[id]||\'\';',1)
# Closing script tags in source are harmless now, but escape if included in future assets.
js=js.replace('</script','<\\/script')
anchor='<script defer src="game.js"></script>'
assert anchor in html
html=html.replace(anchor,'',1)
html=html.replace('</body>', '<script>\n'+js+'\n</script>\n</body>',1)
# Ensure no local stylesheet, script, SVG file dependency remains in the demo.
assert not re.search(r'(?:src|href)="(?:assets/|game\.js|polish\.css|style\.css|manifest\.webmanifest)',html)
assert 'url(\'assets/' not in html and 'url("assets/' not in html
output.write_text(html,encoding='utf-8')
print(f'Created {output} ({output.stat().st_size:,} bytes)')
