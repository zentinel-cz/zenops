# ZenOps V1 — Uživatelská příručka

Tato příručka popisuje aktuálně implementované funkce nové verze ZenOps. Bude
se rozšiřovat současně s aplikací. Testovací náhled běží na adrese
`https://zenops.zentinel.cz`.

## Přihlášení a odhlášení

1. Otevřete přihlašovací stránku ZenOps.
2. Zadejte své uživatelské jméno nebo firemní e-mail a heslo.
3. Tlačítkem **Zobrazit** vedle hesla můžete zkontrolovat jeho zápis; tlačítkem
   **Skrýt** jej opět skryjete. Poté zvolte **Přihlásit se**. Během ověřování
   tlačítko zobrazuje **Přihlašuji…**. Případná chyba se objeví nad tlačítkem.
   Po přihlášení se zobrazí dashboard podle vašich oprávnění.
4. Pro bezpečné ukončení relace použijte tlačítko **Odhlásit** vpravo nahoře.

### Změna vlastního hesla

1. Po přihlášení otevřete vpravo nahoře **Můj účet**.
2. Zadejte současné heslo a dvakrát nové heslo.
3. Po úspěšné změně systém ukončí všechna přihlášení tohoto účtu.
4. Přihlaste se znovu novým heslem.

Změna se auditovaně zaznamená bez uložení samotného hesla. Ukončení všech
relací chrání účet i v případě, že zůstal přihlášený na jiném zařízení.

Přístup vytváří Admin. Neexistuje žádný společný ani výchozí účet.
Každý účet má právě jednu roli; role Pracovník, Vedoucí, Admin a Účetní se
nekombinují.
Každý účet má svůj profil zaměstnance, který při založení účtu vytváří Admin.

## Role

### Pracovník

- má jednoduchý dashboard s hlavní volbou **Kde dnes pracuji?** a odkazem
  **Můj profil a svěřené věci**;
- denní záznam, profil i formuláře zobrazuje v přehledném sloupci vycentrovaném
  na stránce; na telefonu skládá související údaje pod sebe;
- vidí všechny otevřené zakázky až uvnitř formuláře denního záznamu;
- spravuje vlastní pracovní den, úseky práce, jízdy a přestávky;
- zvolí ranní nebo noční směnu; noční směna může pokračovat přes půlnoc;
- ve svém profilu může pouze prohlížet kontaktní údaje, velikosti a historii
  pracovních oděvů a vybavení; v delší historii může záznamy vyhledat podle názvu, data, velikosti nebo místa výdeje.

### Vedoucí

Vedoucí nevytváří vlastní denní záznamy. Zakládá zakázky, spravuje denní údaje,
techniku a provozní palivo a schvaluje jednotlivé pracovní úseky pracovníků na
zakázkách, které aktuálně vede.

Po přihlášení uvidí přehled s rychlými odkazy na své agendy. V postranní
navigaci na počítači nebo v pojmenované vodorovné nabídce na telefonu otevře
vždy jednu sekci:

- **Schvalování**: kontrola a schválení nebo vrácení práce čekající na jeho
  rozhodnutí. Vidí pouze práci na zakázkách, které aktuálně vede. Seznam lze
  vyhledat podle pracovníka, zakázky nebo druhu práce.
- **Zakázky**: přehled otevřených zakázek a jejich založení. Seznam lze
  vyhledat podle kódu, názvu nebo místa.
- **Denní provoz**: počasí, teplota, poznámka a společné palivo zakázky.
- **Reporty**: denní i měsíční provozní přehledy na jednom místě.
- **Technika**: správa strojů, příslušenství a vozidel. Každý katalog lze
  samostatně vyhledat podle kódu, názvu, typu nebo SPZ.

Přehled nabízí přímé tlačítko pro každou dostupnou agendu. Obsah ostatních
sekcí se při otevření vybrané agendy skryje.

### Admin

Admin nevytváří vlastní denní záznamy ani neschvaluje práci. Má globální provozní dashboard se
seznamem otevřených i uzavřených zakázek, techniky, příslušenství a vozidel.
Může zakázky uzavřít nebo znovu otevřít, spravuje zaměstnance a jejich přístupy
auditované administrativní opravy provozních záznamů.
V části **Zaměstnanci** může vytvořit uživatelský účet a zvolit roli **Účetní**.
Seznam zaměstnanců lze vyhledat podle jména, osobního čísla, přihlašovacího
jména, e-mailu, role nebo stavu účtu.
V části **Vybavení uživatelů** má stejný přístup jako Účetní: může prohlížet
a spravovat profily, katalog a evidenci vydaných a vrácených věcí.
Admin má přístup ke všem oprávněním aplikace. Pracovní den za něj vytváří
Pracovník a odeslanou práci schvaluje příslušný Vedoucí; Admin může použít
administrativní opravy.

### Účetní

Admin v části **Zaměstnanci** zvolí **Vytvořit uživatelský účet**, vyplní
osobní údaje, přihlašovací údaje a jako jedinou roli vybere **Účetní**. Účetní
pak spravuje katalog pracovních oděvů a vybavení a záznamy o vydání a vrácení
pro uživatele všech rolí. Účetní nemůže vytvářet uživatele ani jejich profily,
spravovat přihlašovací údaje nebo role. Nemá přístup ke směnám ani schvalování
práce.

Pokud vybraná role není v databázi správně připravena, ZenOps vytvoření nebo
úpravu účtu odmítne a nezanechá aktivní účet bez role. Správce musí nejprve
dokončit databázovou migraci.

1. Otevře se samostatný seznam **Všichni uživatelé**. Klepnutím na řádek
   otevřete detail vybrané osoby. Seznam obsahuje Pracovníky, Vedoucí, Adminy
   i Účetní. Neaktivní uživatelé zůstávají dostupní pro kontrolu historie;
   nové věci jim vydat nelze.
1. Seznam uživatelů lze vyhledat podle jména, osobního čísla, role, kontaktu
   nebo stavu. Katalog věcí má vlastní vyhledávání podle názvu a stavu.
2. V detailu uživatele zkontrolujte jeho údaje a evidenci věcí. Delší historii
   výdejek lze vyhledat podle názvu, data, místa, velikosti nebo poznámky. Tlačítkem
   **Zpět na seznam uživatelů** se kdykoli vrátíte do seznamu.
   Účetní může upravit kontaktní údaje a velikosti profilu Pracovníka; každá
   změna vyžaduje důvod.
3. Katalog rozšiřte zadáním názvu nové věci. Položku lze upravit nebo vyřadit;
   její starší výdejky zůstanou zachované.
4. Ve formuláři **Zaznamenat výdej uživateli** vyberte druh, množství, případnou
   velikost, datum a místo výdeje. Vydání se objeví v historii uživatele;
   uvidíte v ní co, kdy, kde a v jakém množství převzal.
5. U nevydaného zbytku zvolte **Zapsat vrácení**. Lze vrátit část nebo celé
   množství; vrácený součet nesmí překročit vydané množství.
6. Datum výdeje opravte přes **Opravit vydání** a uveďte důvod. Datum konkrétního
   vrácení opravte tlačítkem **Opravit datum** a také uveďte důvod. Opravy se
   auditují; vrácení nelze smazat ani změnit jeho množství.

### Profil pracovníka

Pracovník si přes **Můj profil** může zobrazit své kontaktní údaje, velikosti
oděvů a obuvi a historii svěřených věcí. Tyto údaje může měnit Účetní.
Vydání obsahuje věc, množství, velikost, datum a místo. Vrácení se zapisuje zvlášť,
takže zůstane zachována historie a přehled toho, co má pracovník stále u sebe.

### Orientace v administraci

Administrátorské rozhraní používá stálý boční panel, který rozděluje agendu do
samostatných provozních sekcí: Přehled, Zakázky, Denní provoz, Denní report,
Měsíční přehled, Opravy záznamů, Technika a Zaměstnanci. Volba zobrazí pouze
vybranou agendu; ostatní sekce zůstanou skryté a stránka mezi nimi neroluje.
Na menším displeji se panel změní na vodorovnou lištu ikon se stejným
přepínáním. Schvalování práce je dostupné pouze Vedoucímu v jeho dashboardu.

Horní přehled ukazuje celkový počet Zakázek a odděleně otevřené a uzavřené
Zakázky. Uživatelský účet, změna hesla a bezpečné odhlášení zůstávají v horní
liště. Změna vzhledu nemění oprávnění ani schvalovací pravidla jednotlivých
sekcí.

## Zakázky

Admin může u existující zakázky použít tlačítko **Upravit**. Lze změnit kód,
název, místo, začátek a konec, poznámku a příznak BESIP. Každá změna vyžaduje
důvod. Vedoucího může později změnit pouze Admin s uvedením důvodu.

- Otevřené zakázky jsou dostupné pracovníkům při vytváření denního záznamu.
- Vedoucí nebo Admin vytvoří zakázku tlačítkem **Nová zakázka**.
- Každá zakázka má právě jednoho aktuálního Vedoucího.
- Zakázku může uzavřít nebo znovu otevřít pouze Admin.
- Uzavřená zakázka zůstává v administrátorském přehledu; nemaže se.
- Admin může při úpravě zakázky vybrat nového aktivního Vedoucího; předání se audituje.

## Můj pracovní den

1. Na úvodní obrazovce klepněte na **Kde dnes pracuji?**. Tato nabídka se zavře a otevře se výběr směny.
2. Klepněte na **Ranní směna** nebo **Noční směna**. Volba se ihned uloží a zobrazí se další krok.
3. Vyberte druh práce: Strojní sečení, Kácení, Reprofilace nebo Ruční sečení. Nabídka po výběru zmizí.
4. Ve formuláři vyberte otevřenou Zakázku a zadejte skutečný začátek a konec práce. U Kácení vyberte také činnost.
5. Potvrďte **Uložit pracovní úsek**. Další práci přidáte stejným postupem; záznamy uvidíte v seznamu dne.
6. Přestávku přidávejte přes **Přidat přestávku**. Tlačítkem **Přidat stroj**
   u příslušného pracovního úseku otevřete formulář, který ukáže vybranou
   zakázku, druh práce a čas. Vyberte stroj; u strojů se sledováním MTH je
   počáteční stav předvyplněný posledním známým údajem a lze jej upravit.
   Příslušenství zaškrtněte jen tehdy, pokud jste ho použili. Formulář uložte
   tlačítkem **Uložit stroj k úseku**, nebo jej zavřete přes **Zrušit**.
7. Jízdu přes **Zapsat jízdu vozidlem** zaznamenává řidič. Vyplní vozidlo, časy a stavy tachometru; cestující označí jednotlivě. Řidič sám sebe jako cestujícího vybírat nemůže.
8. Před odesláním zkontrolujte seznam úseků a časů. Tlačítko **Zkontrolovat a odeslat pracovní den** zobrazí potvrzení. Po odeslání už běžné úpravy nejsou možné.

Práce a přestávky se nesmějí časově překrývat. Uzavřenou zakázku nelze použít
pro nový úsek. Chybové hlášení se zobrazí nad formulářem; při chybě spojení
zkontrolujte připojení a operaci zopakujte. Odstranění úseku nebo přestávky
vyžaduje potvrzení.

## Schvalování práce — Vedoucí

1. V části **Práce ke schválení** otevřete čekající pracovní úsek.
2. Zkontrolujte pracovníka, zakázku, druh práce a vykázaný čas.
3. Správný úsek potvrďte tlačítkem **Schválit**.
4. Chybný úsek vraťte a povinně napište konkrétní důvod.

Vedoucí vidí práci pracovníků pouze na zakázkách, které vede. Každý úsek
se posuzuje samostatně:
část dne tedy může být schválena a část vrácena. Pracovník upraví pouze vrácené
úseky a den znovu odešle; již schválené úseky zůstávají uzamčené. Rozhodnutí se
uchovávají jako neměnná historie a nelze je zpětně přepsat ani smazat.

## Denní údaje zakázky — Vedoucí a Admin

V části **Údaje zakázky** vyberte otevřenou zakázku a zapište počasí, teplotu a
poznámku pro dnešní den. Údaje se vedou jen jednou za zakázku a datum. Vedoucí
smí upravit pouze zakázku, kterou aktuálně vede; Admin může spravovat všechny.

Ve stejném formuláři může Vedoucí nebo Admin zapsat společnou spotřebu a
tankování paliva pro křovinořezy. Tento údaj patří zakázce a dni, nikoli
jednotlivému pracovníkovi. Pro stejnou zakázku, datum a kategorii existuje jen
jeden aktuální záznam; při opravě se původní a nový stav uchovají v auditu.
Systém eviduje také zaměstnance, který údaj naposledy zapsal, ale ten není
vlastníkem společného palivového záznamu.

## Zaměstnanci a účty — Admin

1. V sekci **Zaměstnanci** zvolte **Nový zaměstnanec**.
2. Vyplňte osobní číslo, jméno, unikátní uživatelské jméno, e-mail a dočasné heslo.
3. Vyberte právě jednu roli: Pracovník, Vedoucí nebo Admin.
4. Účet vytvořte. Uživatelské jméno, e-mail i osobní číslo musí být jedinečné.

Admin může účet deaktivovat nebo znovu aktivovat. Vždy musí uvést důvod.
Deaktivovaný zaměstnanec ani jeho účet se nemažou a nemůže se přihlásit.
Aktuálně přihlášený Admin nemůže deaktivovat sám sebe.

Admin může tlačítkem **Upravit** změnit osobní číslo, jméno, uživatelské jméno, e-mail a roli
kteréhokoli zaměstnance. Každá změna vyžaduje důvod, zapisuje se do auditu a
ukončí dosavadní relace upraveného účtu, aby se nová oprávnění použila ihned.

## Audit a bezpečnost

- Vytvoření zaměstnance a zakázky, změny aktivního stavu i schvalovací
  rozhodnutí se auditují.
- Hesla jsou ukládána jako Argon2id hash, nikoli čitelně.
- Přihlášení používá serverovou relaci v bezpečné HTTP-only cookie.
- Oprávnění kontroluje backend; skrytí tlačítka v rozhraní není jediná ochrana.

## Stroje a příslušenství

Vedoucí nebo Admin vytvoří položky v sekci **Stroje a příslušenství**. U stroje
určí, zda se sleduje MTH; u příslušenství, zda jde o unikátně sledovaný fyzický
kus.

Každá položka seznamu má volbu **Upravit**. Lze změnit kód, název, typ,
sledování, SPZ i aktivní stav. Historicky použitá položka se nemaže; deaktivace
ji skryje z nových záznamů a minulá data zůstanou zachována. Oprava vyžaduje
důvod a ukládá původní i nový stav do auditu.

## Administrativní opravy denních záznamů — Admin

Admin má sekci **Denní záznamy zaměstnanců**, kde vybere datum a vidí práci
všech zaměstnanců. Může opravit Zakázku, druh práce, aktivitu, čas a popis a
také přidat nové opravné rozhodnutí Schválit/Vrátit. Původní schválení se
nepřepisuje ani nemaže. Každá korekce vyžaduje důvod a vytváří auditní stopu.
Uzavřený měsíc je chráněný; před opravou jej musí Admin vědomě znovu otevřít.
Záznamy vybraného dne lze vyhledat podle pracovníka, směny, stavu, zakázky nebo
druhu práce.
Ve stejném přehledu může opravit přestávku, MTH a palivo stroje, přiřazené
příslušenství i kilometry, palivo, cestující a poznámku jízdy vozidlem.

Seznam dnešních pracovních úseků, přestávek a jízd lze vyhledat podle zakázky,
druhu práce, stroje nebo vozidla.

Pracovník u rozpracovaného pracovního úseku zvolí **Přidat stroj** a vyplní:

- stroj a případné příslušenství;
- počáteční a konečný MTH u sledovaného stroje;
- samostatně spotřebu a natankované množství.

Formulář ukazuje poslední známý konečný MTH jako návrh. Pracovník jej může
opravit, ale změna se auditovaně uloží. Stejný stroj ani unikátní příslušenství
nelze v překrývajícím se čase přiřadit dvěma pracovníkům.

## Vozidla a společné jízdy

Vedoucí nebo Admin nejprve vytvoří vozidlo v části **Provozní prostředky**.
Každé aktivní vozidlo má jedinečný kód, název a SPZ.

Jízdu zapisuje do svého rozpracovaného pracovního dne pouze řidič:

1. vybere vozidlo a zadá čas od–do;
2. zapíše počáteční a konečný stav kilometrů;
3. případně uvede spotřebu, tankování a poznámku;
4. vybere ostatní zaměstnance, kteří jeli jako cestující.

Kilometry a palivo se ukládají právě jednou u společné jízdy řidiče. Cestující
se k ní pouze přiřadí a stejné provozní údaje neopisují do svého pracovního
dne. Řidič nemůže vybrat sám sebe jako cestujícího a stejné vozidlo nelze
použít ve dvou časově se překrývajících jízdách.

## Denní report — Vedoucí a Admin

Sekce **Denní report** zobrazuje vždy aktuální provozní data pro zvolené datum.
Nejde o ručně vytvořenou kopii. Vedoucí vidí pouze práci ze zakázek, které
aktuálně vede; Admin má globální přehled.

Report rozlišuje:

- **Schváleno** — potvrzené pracovní úseky;
- **Předběžné** — rozpracované, odeslané nebo vrácené úseky.

Souhrn ukazuje počet pracovníků a úseků, schválený a předběžný čas. Detail
obsahuje Zakázku, pracovníka, druh práce, přestávky, stroje, MTH, příslušenství,
palivo, vozidla, kilometry a společné palivo zakázky. Seznam úseků lze vyhledat podle zakázky, pracovníka, druhu práce, stroje nebo
stavu. Tlačítkem **Stáhnout PDF** se stáhne report za celé vybrané datum ve stejném oprávněném rozsahu; textové hledání export neomezuje.
Během tvorby souboru tlačítko zobrazuje **Připravuji PDF…** a nelze spustit další
stažení ani změnit datum. Při chybě se zobrazí zpráva a stažení lze opakovat.
Pokud přihlášení vypršelo, přihlaste se znovu. Čas vytvoření PDF je uveden
v časovém pásmu Europe/Prague. Přestávky dne jsou informativní: opakují se
u úseků téhož dne a nesčítají se ani znovu neodečítají od času práce.

## Měsíční report — Vedoucí a Admin

Sekce **Souhrny a uzávěrka** nabízí pro vybraný měsíc:

- hodiny podle pracovníků a směn;
- hodiny a počty pracovníků podle Zakázek;
- MTH, spotřebu a tankování podle strojů;
- kilometry a palivo podle vozidel;
- společné palivo podle Zakázek.

Vedoucí vidí pouze Zakázky, které vede. Admin vidí globální souhrn. V každém
souhrnném seznamu lze vyhledávat podle názvu, kódu nebo zobrazených údajů. Report je
provozní podklad pro odměny a mzdy, ale ZenOps mzdy sám nepočítá. Celkové hodiny
zahrnují i předběžné úseky; schválený čas je u pracovníků uveden zvlášť.
Měsíční přehled zatím nemá export do PDF ani XLSX.

### Uzávěrka měsíce — Admin

Admin vidí stav **Otevřený/Uzavřený**, počet pracovních dnů a počet
nevyřešených záznamů. Měsíc lze uzavřít pouze tehdy, když jsou všechny
pracovní dny plně schválené. Rozpracovaný, odeslaný, částečně schválený nebo
vrácený den uzávěrku zablokuje.

Uzavřený měsíc nepovolí běžné provozní změny. Pokud je nutná oprava, Admin
musí uvést důvod znovuotevření. Uzavření i znovuotevření se auditují.


## České názvy a hlášení

Nabídky činností, role, stavy práce, směny a stavy zakázek se zobrazují česky
v jednotlivých rolích i v exportovaném PDF. V administrativní opravě práce
vybíráte aktivitu kácení z možností **Pilař**, **Řidič traktoru**, **Manipulace**,
**Úklid** a **Ostatní**. Stavy pracovního dne jsou **Rozpracováno**,
**Odesláno ke schválení**, **Částečně schváleno**, **Schváleno** a **Vráceno k opravě**.
V měsíčním přehledu vidíte **Ranní směna** nebo **Noční směna** a zakázky jako
**Otevřená** nebo **Uzavřená**. Vyhledávání podle těchto údajů přijímá české názvy.

Pokud překročíte počet povolených pokusů o přihlášení nebo změnu hesla, zobrazí
se česká výzva k vyčkání. Technické chyby serveru se zobrazují jako české hlášení.
Názvy a poznámky zadané uživateli se zobrazují tak, jak byly uloženy.

## Opravy a přehlednost pracovních postupů

- V části **Zakázky** je seznam přes celou šířku obsahu. Administrátor vidí
  všechny dostupné zakázky; seznam už není omezen na prvních pět položek.
- Denní report se na telefonu skládá do karet s popisky údajů. Seznamy a
  formuláře zalamují dlouhé názvy a ovládací tlačítka.
- V **Moje směna** zvolíte datum pracovního dne. Můžete otevřít i starší den.
  U vráceného úseku vidíte důvod vedoucího a tlačítko **Opravit práci**.
  Opravený úsek znovu odešlete ke schválení. Schválené úseky jsou zamčené;
  úseky s historií rozhodnutí se opravují bez mazání této historie.
- Při změně času úseku se upraví i čas obsazení připojeného stroje a
  příslušenství. Pokud by vznikl souběh techniky, celá oprava se odmítne.
- Uzavřený měsíc chrání i databáze. Pro opravu jej musí administrátor nejprve
  znovu otevřít s uvedením důvodu.
- Při změně zakázky v denním provozu vyčkejte na načtení údajů. Uložit lze
  až načtenou zakázku. Pokud se uloží údaje dne, ale selže uložení paliva,
  aplikace tuto skutečnost výslovně oznámí.
- Po změně data nebo měsíce reportu se předchozí údaje skryjí. Při selhání
  načítání aplikace nezobrazuje starý report jako aktuální.
- Během ukládání je opakovaný zápis zablokován. Při přerušení spojení
  ověřte uložený stav před opakováním operace.

Denní report zobrazuje pod pracovními úseky také jízdy, řidiče, spolucestující, tachometr a palivo. Samostatná část uvádí sdílené palivo zakázek včetně autora a poznámky. Počet pracovníků rozlišuje i osoby se stejným jménem.

### Ochrana záznamů a přihlášení při souběžných změnách

Zápis a odstranění práce či přestávky se zpracovává postupně vůči odeslání
a schvalování téhož pracovního dne. Pokud se stav mezitím změní, aplikace
změnu odmítne; načtěte aktuální den znovu. Stroj lze připojit pouze k vlastnímu
rozpracovanému nebo vrácenému úseku, nikoli ke schválené práci v částečně
vráceném dni.

Deaktivace účtu ukončí jeho dosavadní přihlášení. Po opětovné aktivaci se musí
uživatel znovu přihlásit. Historie administrativních oprav techniky a jízd
nově zachycuje také seznam příslušenství a cestujících před opravou a po ní.
Starší auditní záznamy se zpětně nedoplňují.


## Předání zakázky a opravy vedoucím

Admin otevře **Zakázky → Upravit zakázku**, vybere nového Vedoucího a uvede
 důvod změny. Předání zahrnuje historii i čekající schvalování. Původní vedoucí
 ztratí přístup k dané zakázce; starší schválení si ponechají původního autora.
 Odebrání role Vedoucí zruší existující přihlášení a další přístup podle této role.

Vedoucí najde **Opravy práce** v hlavní navigaci. Vybere datum a schválený
úsek své zakázky. Může změnit čas, druh práce, aktivitu a popis, vždy s důvodem.
Zakázku úseku nepřevádí; tuto opravu provádí Admin. Uzavřený měsíc změny odmítne.
Přestávky, sdílené jízdy a opravy motohodin zůstávají v administraci.

V **Denním provozu** lze vybrat datum a zobrazit i uzavřenou zakázku pouze
pro čtení. Admin vidí všechny zakázky, Vedoucí pouze aktuálně přiřazené.
Pracovník nemá přístup ke společným poznámkám ani souhrnům paliva; vlastní
historii práce a nabídku otevřených zakázek má nadále dostupnou.

### Délka hesla

Při založení účtu, přihlášení ani změně hesla není vyžadováno 12 znaků.
Heslo musí být neprázdné a může mít nejvýše 200 znaků. Při změně musí být nové
heslo odlišné od současného. Změna validace nevyžaduje migraci databáze;
uložená hesla zůstávají platná.

### Úprava přihlašovací obrazovky

Přihlášení se zobrazuje v jedné vycentrované kartě na počítači i telefonu.
Tato úprava vzhledu nevyžaduje změnu databáze ani novou migraci.
