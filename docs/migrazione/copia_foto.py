"""Copia le foto profilo dal vecchio progetto (bucket pubblico) al nuovo. Stampa solo conteggi, mai nomi di file."""
import os, re, sys, urllib.parse, urllib.request

SRC = "https://cqmrrapkaikixowowffe.supabase.co"
REF = os.environ["PROGETTO_ATTESO"]
DST = f"https://{REF}.supabase.co"
BUCKET = "profile-photos"
KEY = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

sql = open("storage_objects.sql", encoding="utf-8").read()
m = re.search(r"^COPY storage\.objects \((.*?)\) FROM stdin;\n(.*?)\n\\\.\n", sql, re.S | re.M)
if not m:
    print("Nessuna riga di storage.objects trovata nell'esportazione.")
    sys.exit(0)
cols = [c.strip().strip('"') for c in m.group(1).split(",")]
ib, inm = cols.index("bucket_id"), cols.index("name")
names = []
for line in m.group(2).split("\n"):
    f = line.split("\t")
    if len(f) > max(ib, inm) and f[ib] == BUCKET and f[inm] != "\\N":
        names.append(f[inm])
print(f"Foto da copiare: {len(names)}")

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
    except Exception as e:  # nessun nome di file nei registri
        fail += 1
        print(f"errore: {type(e).__name__} {getattr(e, 'code', '')}")
print(f"Copiate: {ok}, errori: {fail}")
sys.exit(1 if fail else 0)
