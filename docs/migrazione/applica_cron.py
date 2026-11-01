"""Prepara 04-cron.sql con il codice progetto e il segreto del cron, senza stampare il segreto."""
import os
sql = open("docs/migrazione/04-cron.sql", encoding="utf-8").read()
sql = sql.replace("__REF__", os.environ["PROGETTO_ATTESO"]).replace("__CRON_SECRET__", os.environ["CRON_SECRET"].replace("'", "''"))
open("cron_pronto.sql", "w", encoding="utf-8").write(sql)
