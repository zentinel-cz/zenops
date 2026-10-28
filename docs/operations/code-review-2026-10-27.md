# Kontrola kódu — 27. 10. 2026

Základ: commit c17690e, pravidla v docs/10-business-rules.md, workflow dne,
specifikace schvalování, techniky, dopravy a přijatá ADR-001, 002, 004, 006, 009.
Kontrola se zaměřila na API a návazné formuláře. Nejde o certifikaci všech
obrazovek ani úplný bezpečnostní audit.

## Opravené nálezy

1. **Souběh zápisu a odeslání dne.** Přidání úseku/přestávky ověřovalo stav
   před transakcí, odstranění nezamykalo rodičovský den a odeslání počítalo
   úseky před zámkem. Nově tyto operace nejprve zamykají den ve své transakci.
   Kontrola počtu úseků při odeslání následuje až po zámku. Připojení stroje
   používá stejné pořadí den → úsek. Oprava úseku sdílí společný pomocný kód.
2. **Stroj u schválené práce.** API kontrolovalo jen stav dne, takže vrácený
   sourozenecký úsek odemkl připojení stroje i ke schválené práci. API nyní
   navíc vyžaduje stav konkrétního úseku DRAFT/RETURNED.
3. **Nedostatečný audit vztahů.** Oprava příslušenství nebo cestujících
   nezachovávala jejich seznam v before/after auditním JSON. Nové události
   obsahují oba seznamy. Historické události nejsou měněny.
4. **Přihlášení po reaktivaci.** Deaktivace blokovala přístup jen přes aktivitu
   účtu; neexpirovaná stará session by po reaktivaci znovu fungovala. Nově
   deaktivace ve stejné transakci revokuje existující sessions.
5. Kontrola povinného popisu ostatní práce používá trim stejně jako opravy.

## Zbývající konkrétní nálezy

- **Překryvy napříč pracovními dny:** migrace 0005 porovnává intervaly přes
  work_day_id, nikoli napříč dny stejného zaměstnance. Noční směna tak může
  kolidovat s intervalem evidovaným v dalším dni. BR-008 vyžaduje širší ochranu;
  následující oprava musí zahrnout novou migraci a test hranice půlnoci.
- **Časové pásmo klienta:** WorkDayPanel a další formuláře používají místní
  čas zařízení. BR vyžaduje nakonfigurované provozní pásmo. Nutné sjednotit
  renderování i převod vstupů, včetně změny letního času.
- **Údaje dne a palivo:** ProjectDayPanel odesílá dvě samostatné operace;
  vyprázdnění obou palivových polí přeskočí ukládání paliva a ponechá původní
  hodnoty. Je třeba doplnit jednoznačnou validaci a sjednotit uložení.
- **Opravy vedoucím:** docs/07-approvals.md připouští opravy schválené práce
  vedoucím v jeho zakázce; implementované opravy používají administrátorské
  oprávnění. Chybí samostatný omezený postup pro vedoucího.
- **Deaktivace/změna role vedoucího:** přiřazení vedoucího zakázce je neměnné,
  ale účet lze deaktivovat nebo změnit na jinou roli. Zbývající práce potom
  nemá dostupného schvalovatele. Nezavádět převzetí administrátorem bez ADR.
- **Rozsah čtení ProjectDay:** GET kontroluje obecné project.read_open,
  nikoli status ani přiřazeného vedoucího. Je třeba výslovně určit rozsah čtení
  historických údajů pro role a poté doplnit kontrolu v dotazu.

## Databáze a nasazení tohoto balíku

Tyto opravy mění aplikační transakce a obsah nových auditních JSON, nikoli
schéma. Nová migrace není potřebná. Předpokladem zůstává sada migrací do 0017,
která byla na serveru již ověřena. Budoucí ochrana překryvů mezi dny potřebuje
novou migraci; neupravovat již aplikovanou 0005.

Ověřování probíhá v Dockeru na serveru, ve vlastní kopii
/opt/zenops/reviews/code-review-20261027 a Compose projektu zenops-code-review.
Běžící projekt zenops ani ostatní aplikace nejsou nahrazeny. Nejde o deploy.

## Výsledek ověření

Sestavení contracts a API proběhlo úspěšně v Dockeru na serveru. Závěrečný
běh API suite: 31 testů prošlo, 0 přeskočeno, včetně 20 integračních testů
nad PostgreSQL s úplnou sadou migrací. Existující scénáře byly rozšířeny
na zákaz stroje u schváleného úseku ve vráceném dni, revokaci sessions při
deaktivaci a seznamy v auditu oprav. Samostatný deterministický souběžný
regresní test není součástí tohoto balíku; transakční opravy byly zkontrolovány
v kódu a prošly existujícími funkčními scénáři.

Dočasné kontejnery a síť zenops-code-review byly po kontrole odstraněny.
Kopie zdrojů a check.log zůstávají v adresáři kontroly na serveru. Běžící
kontejnery zenops zůstaly healthy. Vizuální kontrola přihlášených obrazovek
nebyla provedena; fáze 0 není uzavřena.

## Navazující ADR-010 — 28. 10. 2026

Nálezy týkající se předání zakázky, oprav vedoucím a rozsahu čtení ProjectDay
řeší navazující implementace ADR-010 s migrací 0018. Nálezy časového pásma,
překryvů mezi dny a ukládání paliva zůstávají otevřené.
