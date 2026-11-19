import os
import urllib.request

FONTS_DIR = 'public/fonts'
os.makedirs(FONTS_DIR, exist_ok=True)

FONTS = {
    '300': ('poppins-latin-300-normal.woff2', 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLDz8Z1JlFc-K.woff2'),
    '400': ('poppins-latin-400-normal.woff2', 'https://fonts.gstatic.com/s/poppins/v24/pxiEyp8kv8JHgFVrJJnecmNE.woff2'),
    '500': ('poppins-latin-500-normal.woff2', 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLGT9Z1JlFc-K.woff2'),
    '600': ('poppins-latin-600-normal.woff2', 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLEj6Z1JlFc-K.woff2'),
    '700': ('poppins-latin-700-normal.woff2', 'https://fonts.gstatic.com/s/poppins/v24/pxiByp8kv8JHgFVrLCz7Z1JlFc-K.woff2'),
}

for weight, (filename, url) in FONTS.items():
    filepath = os.path.join(FONTS_DIR, filename)
    if not os.path.exists(filepath):
        print(f'Downloading {filename}...')
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as resp, open(filepath, 'wb') as out:
            out.write(resp.read())
        print(f'  Saved {filepath} ({os.path.getsize(filepath)} bytes)')
    else:
        print(f'{filename} already exists ({os.path.getsize(filepath)} bytes)')

print('All fonts ready in public/fonts/')
