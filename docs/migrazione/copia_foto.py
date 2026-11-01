"""Copia le foto profilo dal vecchio progetto (bucket pubblico) al nuovo.
I nomi dei file si ricavano dagli indirizzi salvati nei profili (foto_urls.txt), qualunque sia il progetto indicato.
Stampa solo conteggi, mai nomi o indirizzi."""
import os, sys, urllib.parse, urllib.request

SRC = "https://cqmrrapkaikixowowffe.supabase.co"
REF = os.environ["PROGETTO_ATTESO"]
DST = f"https://{REF}.supabase.co"
BUCKET = "profile-photos"
MARK = f"/storage/v1/object/public/{BUCKET}/"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

names = set()
for line in open("foto_urls.txt", encoding="utf-8"):
    line = line.strip()
    if MARK in line:
        path = line.split(MARK, 1)[1].split("?", 1)[0]
        names.add(urllib.parse.unquote(path))
names = sorted(names)
print(f"Profili con foto: {len(names)}")
if not names:
    sys.exit(0)

headers_auth = {"apikey": KEY}
if KEY.startswith("eyJ"):  # chiave in formato JWT (legacy); le chiavi sb_secret_ vanno solo in apikey
    headers_auth["Authorization"] = f"Bearer {KEY}"

ok = fail = 0
for n in names:
    q = urllib.parse.quote(n, safe="/")
    try:
        with urllib.request.urlopen(f"{SRC}/storage/v1/object/public/{BUCKET}/{q}", timeout=60) as r:
            data = r.read()
            ctype = r.headers.get("Content-Type", "application/octet-stream")
        req = urllib.request.Request(
            f"{DST}/storage/v1/object/{BUCKET}/{q}", data=data, method="POST",
            headers={**headers_auth, "Content-Type": ctype, "x-upsert": "true"},
        )
        urllib.request.urlopen(req, timeout=60).read()
        ok += 1
    except Exception as e:
        fail += 1
        print(f"errore: {type(e).__name__} {getattr(e, 'code', '')}")
print(f"Copiate: {ok}, errori: {fail}")
sys.exit(1 if fail else 0)
