# Fáze 0 — ověření serveru 27. 10. 2026

## Účel prostředí

Majitel dne 27. 10. 2026 potvrdil, že serverová instalace ZenOps je testovací,
není používána v ostrém provozu a lze ji využít pro fázi 0. Starší označení
„production/preview“ v dokumentaci nevyjadřuje aktuální účel této instalace.
Doména je přesto veřejně dostupná; testovací účel neznamená neveřejný přístup.
Existující data se nesmějí automaticky mazat.

## Ověřený stav

- Přístup: SSH přes Tailscale, `root@openclaw-server.tail9762fc.ts.net`.
  Tailscale může vyžadovat potvrzení identity; během kontroly bylo schváleno.
- Checkout `/opt/zenops/app`, čistý pracovní strom, commit
  `c17690efdd96be8a0698b456671b977e1288f510` shodný s lokálním HEAD.
- Compose projekt `zenops`: `zenops-web-1`, `zenops-api-1`,
  `zenops-postgres-1`; všechny healthy, bez restartů v aktuálním běhu.
- Web port `127.0.0.1:3000`; API a PostgreSQL nemají publikované hostitelské
  porty. Databáze PostgreSQL 16 je v síti `zenops_backend`.
- Sdílený Caddy `zentinel-web-caddy` obsluhuje veřejný přístup. Na serveru
  běží další aplikace, jejich kontejnery ani konfiguraci neměnit.
- `https://zenops.zentinel.cz/` vrací 200, `/api/auth/me` bez přihlášení 401.
  Lokální `/health` a `/ready` vracejí 200.
- Všech 18 migrací včetně `0017` má shodné SHA-256 v checkoutu, API kontejneru
  a tabulce `schema_migrations`. Historicky existují dva názvy s prefixem
  `0013`; nepřejmenovávat již aplikované soubory. Další migrace musí mít unikátní číslo.
- Aktivních databázových triggerů `operational_period_guard`: 10.
- Kontrolní součty runtime `dist/workdays.js`, `dist/reports.js` a obou webových
  JS/CSS bundle souhlasí s odpovídajícími lokálními build artefakty.
  Nejde o kontrolu všech souborů runtime.
- Databáze obsahuje 4 účty, 4 pracovní dny, 1 zakázku, 1 rozhodnutí schválení
  a 0 výdejek. Osobní údaje ani přihlašovací tajemství nebyly vypisovány.
- Aktivní účty: 1 Admin, 1 Vedoucí, 1 Pracovník; žádná aktivní Účetní.
  Aktivních účtů s neplatným počtem rolí: 0; účtů bez profilu: 0.
- Neshod časů strojů/příslušenství proti pracovnímu úseku: 0.
- Databázové časové pásmo: Europe/Prague.
- Compose konfigurace prošla validací, `compose.test.yaml` je přítomen.
- Zálohovací timer je aktivní, poslední služba skončila úspěšně.
  Dump `/opt/zenops/backups/automatic/20261027T012619Z/database.dump`
  prošel SHA-256 kontrolou a čtením seznamu přes `pg_restore --list`.
- Disk měl přibližně 249 GiB volných a RAM 25 GiB available. Jde o okamžitý
  snímek sdíleného serveru, nikoli rezervovanou kapacitu.
- V omezeném vzorku posledních 2000 řádků logů API a webu za 24 hodin nebyly
  nalezeny řádky úrovně error/fatal. Toto není úplná kontrola historie logů.

## Navazující práce fáze 0

1. Spustit integrační testy v odděleném jednorázovém Compose projektu
   `zenops-test`; nikdy nesměrovat TEST_DATABASE_URL na běžící databázi ZenOps.
2. Provést skutečnou obnovu dumpu do izolované databáze. Kontrola seznamu
   zálohy výše není důkazem úspěšné obnovy.
3. Připravit bezpečné testovací identity všech rolí včetně Účetní; existujícím
   účtům neměnit hesla bez potřeby a dohody.
4. Ověřit přihlášené scénáře, noční směny, opravy, uzávěrky a mobilní UI.
5. Sjednotit starší dokumentaci o stavu nasazení podle výsledků těchto kontrol.

Tento audit byl pouze čtecí. Nebyly spuštěny migrace, testovací zápisy,
restarty, deploy ani změny Caddy. Integrační testy a obnova nebyly v rámci
inventury provedeny. Provedení inventury samo o sobě neuzavírá fázi 0.
