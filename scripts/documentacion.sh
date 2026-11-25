#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
WEB_DOCS=${WEB_DOCS:-../TesisFrontend/docs}
[ -f "$WEB_DOCS/README.md" ] || { echo "No está la documentación de la web en $WEB_DOCS (variable WEB_DOCS)"; exit 1; }

rm -rf .sitio
mkdir -p .sitio
cp -R docs/. .sitio/
cp -R "$WEB_DOCS" .sitio/web
rm .sitio/README.md .sitio/web/README.md
cp -R sitio/index.md sitio/estilos .sitio/

python3 - <<'PY'
import pathlib
root = pathlib.Path('.sitio')
front = 'https://github.com/HansOr04/TesisFrontend/blob/main/docs/'
back = 'https://github.com/HansOr04/TesisProyectoBack/blob/main/docs/'
for page in root.rglob('*.md'):
    text = page.read_text()
    depth = len(page.relative_to(root).parts) - 1
    up = '../' * depth
    text = text.replace('](README.md)', '](' + ('../index.md' if 'web' in page.parts else 'index.md') + ')')
    text = text.replace('](' + front, '](' + up + 'web/').replace('](' + back, '](' + up)
    text = text.replace('https://github.com/HansOr04/TesisFrontend/tree/main/docs', up + 'web/arquitectura.md')
    text = text.replace('https://github.com/HansOr04/TesisProyectoBack/tree/main/docs', up + 'index.md')
    page.write_text(text)
PY

exec "${MKDOCS:-mkdocs}" "${1:-build}" --strict "${@:2}"
