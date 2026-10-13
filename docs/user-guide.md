# ZenOps V1 — Uživatelská příručka

Tato příručka popisuje aktuálně implementované funkce nové verze ZenOps. Bude
se rozšiřovat současně s aplikací. Testovací náhled běží na adrese
`https://zenops.zentinel.cz`.

## Přihlášení a odhlášení

1. Otevřete přihlašovací stránku ZenOps.
2. Zadejte své uživatelské jméno nebo firemní e-mail a heslo s nejméně 12 znaky.
3. Po přihlášení se zobrazí dashboard podle vašich oprávnění.
4. Pro bezpečné ukončení relace použijte tlačítko **Odhlásit** vpravo nahoře.

### Změna vlastního hesla

1. Po přihlášení otevřete vpravo nahoře **Můj účet**.
2. Zadejte současné heslo a dvakrát nové heslo s nejméně 12 znaky.
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
důvod. Vedoucí se určí při založení zakázky a později se nemění.

- Otevřené zakázky jsou dostupné pracovníkům při vytváření denního záznamu.
- Vedoucí nebo Admin vytvoří zakázku tlačítkem **Nová zakázka**.
- Každá zakázka má právě jednoho neměnného Vedoucího.
- Zakázku může uzavřít nebo znovu otevřít pouze Admin.
- Uzavřená zakázka zůstává v administrátorském přehledu; nemaže se.
- Při auditované úpravě zakázky nelze jejího Vedoucího změnit.

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
stavu. Tlačítkem **Stáhnout PDF** se stáhne profesionální report ve stejném oprávněném rozsahu.

## Měsíční report — Vedoucí a Admin

Sekce **Souhrny a uzávěrka** nabízí pro vybraný měsíc:

- hodiny podle pracovníků a směn;
- hodiny a počty pracovníků podle Zakázek;
- MTH, spotřebu a tankování podle strojů;
- kilometry a palivo podle vozidel;
- společné palivo podle Zakázek.

Vedoucí vidí pouze Zakázky, které vede. Admin vidí globální souhrn. V každém
souhrnném seznamu lze vyhledávat podle názvu, kódu nebo zobrazených údajů. Report je
provozní podklad pro odměny a mzdy, ale ZenOps mzdy sám nepočítá.

### Uzávěrka měsíce — Admin

Admin vidí stav **Otevřený/Uzavřený**, počet pracovních dnů a počet
nevyřešených záznamů. Měsíc lze uzavřít pouze tehdy, když jsou všechny
pracovní dny plně schválené. Rozpracovaný, odeslaný, částečně schválený nebo
vrácený den uzávěrku zablokuje.

Uzavřený měsíc nepovolí běžné provozní změny. Pokud je nutná oprava, Admin
musí uvést důvod znovuotevření. Uzavření i znovuotevření se auditují.
