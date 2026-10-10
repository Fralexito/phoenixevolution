import re, sys, pathlib
dist = pathlib.Path('/home/claude/phoenixevolution/dist')
mock = pathlib.Path('/home/claude/capturas/mock')
base = open(mock/'base.css').read()
for f in sorted(mock.glob('m*-*.html')):
    if f.name.endswith('.out.html'): continue
    src = f.read_text()
    # plantilla: index por defecto; permite "<!-- plantilla: duelos -->" en la primera línea
    m = re.match(r'\s*<!--\s*plantilla:\s*(\S+)\s*-->', src)
    tpl = dist/((m.group(1)+'/index.html') if m else 'index.html')
    h = tpl.read_text()
    i = h.find('<main'); j = h.find('>', i)+1; k = h.find('</main>')
    cuerpo = f'<style>{base} [data-reveal]{{opacity:1!important;transform:none!important}}</style>' + src + '<div class="x-aviso-mock">Propuesta · maqueta</div>'
    h = h[:j] + cuerpo + h[k:]
    h = h.replace('href="/', 'href="http://localhost:4399/').replace('src="/', 'src="http://localhost:4399/')
    out = dist/f'_mock_{f.stem}.html'
    out.write_text(h)
    print(out.name)
