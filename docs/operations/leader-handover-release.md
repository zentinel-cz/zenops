# ADR-010 — předání zakázky a opravy vedoucím

Připraveno 28. 10. 2026. Dosud nenasazeno do běžícího projektu `zenops`.

## Obsah

- Admin mění Vedoucího přes úpravu zakázky s povinným důvodem.
- Migrace 0018 přidává důvod do historie přiřazení a nahrazuje původní trigger.
  Ověřuje aktivního Admina z transakčního kontextu a aktivního nového Vedoucího.
  V téže transakci ukončí staré přiřazení, uloží nové a audit. Bez kontextu
  Admina a důvodu přímý UPDATE změny vedoucího selže. Kontext nastavuje backend,
  nikoli klient. Databázové přihlašovací údaje nejsou určeny koncovým uživatelům.
- Předání nemění historická schválení ani provozní údaje uzavřeného měsíce.
- Čtení historie a schvalování se řídí aktuálním přiřazením. Předání je
  serializováno vůči schvalování, opravám vedoucím a zápisu ProjectDay/paliva.
- Vedoucí dostává sekci Opravy práce; opravuje pouze schválené vlastní úseky
  v otevřeném měsíci. Převod úseku mezi zakázkami zůstává administrátorovi.
- API historie nepředává vedoucímu úseky jiných zakázek, přestávky ani jízdy.
- Odebrání role již revokuje sessions; nové požadavky používají aktuální role.
  Již doručená data v otevřeném prohlížeči nelze zpětně odebrat.

## Nasazení aplikace a databáze

Použít stejný checkout pro `migrate`, `api` a `web`. Spustit existující
`ops/deploy-production.sh`, který sestaví všechny tři image, aplikuje migrace
včetně `0018_project_leader_handover.sql` a teprve poté obnoví API a web.
Navzdory historickému názvu skriptu je aktuální serverové prostředí dle
majitele testovací. Tento dokument sám není potvrzení provedeného deploye.

Neměnit již aplikovanou migraci 0012. Nevracet starý API image po předání
zakázek bez kontroly kompatibility; případné opravy schématu jsou forward-only.

Po nasazení ověřit checksum 0018 v schema_migrations a runtime image, zdraví
kontejnerů a právě jedno aktuální přiřazení v historii každé zakázky:

```sql
select p.id from projects p left join project_leader_history h
  on h.project_id=p.id and h.effective_to is null
group by p.id,p.current_leader_employee_id
having count(h.id)<>1 or bool_or(h.leader_employee_id<>p.current_leader_employee_id);
```

## Ověření

V oddělené kopii `/opt/zenops/reviews/handover-20261028` na serveru proběhl
Docker build API/contracts a webu (včetně TypeScriptu). API suite používá
jednorázový Compose projekt `zenops-handover-check`, PostgreSQL 16 a celou sadu
migrací. Běžící databázi ZenOps ani Caddy nemění.

Integrační scénář kontroluje Admin-only předání, neplatného nástupce, povinný
důvod, databázové zamítnutí změny bez kontextu, historii přiřazení, starý/nový
přístup, převzetí čekající práce, zachování autorů schválení, opravy schválených
úseků, zákaz opravy čekající práce a změny zakázky vedoucím, uzavřený měsíc,
čtení uzavřené zakázky a ztrátu přístupu po odebrání role.

Vizuální ověření přihlášených obrazovek v prohlížeči zatím neproběhlo.

Závěrečný běh 28. 10. 2026: **32 testů prošlo, 0 přeskočeno**, z toho 21
integračních scénářů. Dočasné kontejnery a síť byly odstraněny; kopie kódu
a logy zůstávají v adresáři kontroly. Původní kontejnery ZenOps zůstaly healthy.
