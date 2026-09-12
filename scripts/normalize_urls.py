import re
from pathlib import Path

web_src = Path('web/src')
files = list(web_src.rglob('*.jsx')) + list(web_src.rglob('*.js'))

count = 0
for f in files:
    content = f.read_text(encoding='utf-8')
    # Replace http://localhost:8000/ and http://127.0.0.1:8000/ with relative /
    new_content = content.replace("http://localhost:8000/", "/")
    new_content = new_content.replace("http://127.0.0.1:8000/", "/")
    new_content = new_content.replace("http://localhost:8000", "/")
    new_content = new_content.replace("http://127.0.0.1:8000", "/")
    if new_content != content:
        f.write_text(new_content, encoding='utf-8')
        count += 1
        print(f"Updated: {f.relative_to(web_src)}")

print(f"Total files updated: {count}")
