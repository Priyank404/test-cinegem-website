import re

with open('src/components/ui/ring-assemble.css', 'r', encoding='utf-8') as f:
    raw_css = f.read()

# remove comments
css = re.sub(r'/\*.*?\*/', '', raw_css, flags=re.DOTALL)
# collapse whitespace
css = re.sub(r'\s+', ' ', css)
css = re.sub(r'\s*([\{\}\:\;\,])\s*', r'\1', css)
css = re.sub(r'\s*>\s*', '>', css)
css = css.strip()

base_boot_css = """#cg-boot{position:fixed;inset:0;z-index:100000000;background:#000;display:flex;align-items:center;justify-content:center;transition:opacity .6s cubic-bezier(.16,1,.3,1);touch-action:none;user-select:none;-webkit-user-select:none}
.cg-boot--out{opacity:0!important;pointer-events:none!important}
.cg-col{display:flex;flex-direction:column;align-items:center;justify-content:center;padding:0 1.5rem}
.cg-logo{position:relative;display:flex;align-items:center;justify-content:center;margin-top:-1rem;margin-bottom:-1.5rem}
@media(min-width:640px){.cg-logo{margin-top:-1.5rem;margin-bottom:-2rem}}
@media(min-width:768px){.cg-logo{margin-top:-2rem;margin-bottom:-2.5rem}}
.cg-logo img{width:12rem;height:auto;object-fit:contain;pointer-events:none;user-select:none;display:block}
@media(min-width:640px){.cg-logo img{width:14rem}}
@media(min-width:768px){.cg-logo img{width:15rem}}"""

full_style = f"<style id=\"cg-boot-style\">\n{base_boot_css}\n{css}\n    </style>"

with open('perf/phase3/boot-style.html', 'w', encoding='utf-8') as out:
    out.write(full_style)

print('Generated boot style:', len(full_style), 'bytes')
