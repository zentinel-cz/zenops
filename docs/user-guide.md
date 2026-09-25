# ZenOps V1 — Uživatelská příručka

Tato příručka popisuje aktuálně implementované funkce nové verze ZenOps. Bude
se rozšiřovat současně s aplikací. ZenOps zatím není produkčně nasazen.

## Přihlášení a odhlášení

1. Otevřete přihlašovací stránku ZenOps.
2. Zadejte firemní e-mail a heslo s nejméně 12 znaky.
3. Po přihlášení se zobrazí dashboard podle vašich oprávnění.
4. Pro bezpečné ukončení relace použijte tlačítko **Odhlásit** vpravo nahoře.

Přístup vytváří Admin. Neexistuje žádný společný ani výchozí účet.

## Role

### Pracovník

- vidí všechny otevřené projekty;
- spravuje vlastní pracovní den, úseky práce a přestávky;
- zvolí ranní nebo noční směnu; noční směna může pokračovat přes půlnoc.

### Vedoucí

Má možnosti Pracovníka a navíc může založit projekt. Při založení vyplní kód,
název, místo, vedoucího, datum zahájení a případně označení BESIP. Kód projektu
se ukládá velkými písmeny a musí být jedinečný. Vedoucí schvaluje jednotlivé
pracovní úseky ostatních pracovníků na projektech, které aktuálně vede.

### Admin

Má globální oprávnění. Na dashboardu vidí otevřené i uzavřené projekty a může
je uzavřít nebo znovu otevřít. Dále spravuje zaměstnance a jejich přístupy a
schvaluje vlastní práci Vedoucích, aby nikdo neschvaloval sám sebe.

## Projekty

- Otevřené projekty jsou dostupné všem přihlášeným pracovníkům.
- Vedoucí nebo Admin vytvoří projekt tlačítkem **Nový projekt**.
- Každý projekt má právě jednoho aktuálního Vedoucího.
- Projekt může uzavřít nebo znovu otevřít pouze Admin.
- Uzavřený projekt zůstává v administrátorském přehledu; nemaže se.
- Změna Vedoucího existujícího projektu zatím není dostupná, protože pravidla
  oprávnění k této operaci čekají na rozhodnutí.

## Můj pracovní den

1. Na dashboardu v části **Pracovní den** zvolte ranní nebo noční směnu a
   pracovní den zahajte.
2. Přidejte jeden nebo více pracovních úseků. Každý úsek má projekt, čas od–do
   a druh práce: Strojní sečení, Křovinořez, Kácení, Reprofilace nebo Ostatní.
3. U Kácení vyberte aktivitu (například Pilař nebo Manipulace). U druhu Ostatní
   je povinný vlastní popis.
4. Přestávku zapište jako samostatný časový interval.
5. Chybný rozpracovaný úsek nebo přestávku lze odstranit a zadat znovu.
6. Po dokončení použijte **Odeslat pracovní den**.

Práce ani přestávky se nesmějí časově překrývat. Uzavřený projekt nelze použít
pro nový úsek. Po odeslání je pracovní den uzamčen pro běžné úpravy a čeká na
projektové schválení.

## Schvalování práce — Vedoucí a Admin

1. V části **Práce ke schválení** otevřete čekající pracovní úsek.
2. Zkontrolujte pracovníka, projekt, druh práce a vykázaný čas.
3. Správný úsek potvrďte tlačítkem **Schválit**.
4. Chybný úsek vraťte a povinně napište konkrétní důvod.

Vedoucí vidí práci ostatních pracovníků pouze na projektech, které právě vede.
Vlastní práci Vedoucího schvaluje Admin. Každý úsek se posuzuje samostatně:
část dne tedy může být schválena a část vrácena. Pracovník upraví pouze vrácené
úseky a den znovu odešle; již schválené úseky zůstávají uzamčené. Rozhodnutí se
uchovávají jako neměnná historie a nelze je zpětně přepsat ani smazat.

## Denní údaje projektu — Vedoucí a Admin

V části **Údaje projektu** vyberte otevřený projekt a zapište počasí, teplotu a
poznámku pro dnešní den. Údaje se vedou jen jednou za projekt a datum, nikoli
zvlášť u každého pracovníka. Vedoucí smí upravit pouze projekt, který aktuálně
vede; Admin může spravovat všechny projekty. Uložení i změna se auditují.

## Zaměstnanci a účty — Admin

1. V sekci **Zaměstnanci** zvolte **Nový zaměstnanec**.
2. Vyplňte osobní číslo, jméno, e-mail a dočasné heslo.
3. Přiřaďte nejméně jednu roli: Pracovník, Vedoucí nebo Admin.
4. Účet vytvořte. E-mail i osobní číslo musí být jedinečné.

Admin může účet deaktivovat nebo znovu aktivovat. Vždy musí uvést důvod.
Deaktivovaný zaměstnanec ani jeho účet se nemažou a nemůže se přihlásit.
Aktuálně přihlášený Admin nemůže deaktivovat sám sebe.

## Audit a bezpečnost

- Vytvoření zaměstnance a projektu, změny aktivního stavu i schvalovací
  rozhodnutí se auditují.
- Hesla jsou ukládána jako Argon2id hash, nikoli čitelně.
- Přihlášení používá serverovou relaci v bezpečné HTTP-only cookie.
- Oprávnění kontroluje backend; skrytí tlačítka v rozhraní není jediná ochrana.

## Stroje a příslušenství

Vedoucí nebo Admin vytvoří položky v sekci **Stroje a příslušenství**. U stroje
určí, zda se sleduje MTH; u příslušenství, zda jde o unikátně sledovaný fyzický
kus.

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
