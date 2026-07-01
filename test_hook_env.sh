#!/bin/bash
echo "=== ENV ==="
env | grep -E "LANG|LC_|PATH" | head -10
echo "=== PYTHON ==="
python3 -c "
import sys
print(f'stdin: {sys.stdin.encoding}')
print(f'stdout: {sys.stdout.encoding}')
print(f'default: {sys.getdefaultencoding()}')
import locale
print(f'locale: {locale.getencoding()}')
"
