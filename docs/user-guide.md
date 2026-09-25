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
se ukládá velkými písmeny a musí být jedinečný.

### Admin

Má globální oprávnění. Na dashboardu vidí otevřené i uzavřené projekty a může
je uzavřít nebo znovu otevřít. Dále spravuje zaměstnance a jejich přístupy.

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
pozdější projektové schválení.

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

- Vytvoření zaměstnance a projektu i všechny změny aktivního stavu se auditují.
- Hesla jsou ukládána jako Argon2id hash, nikoli čitelně.
- Přihlášení používá serverovou relaci v bezpečné HTTP-only cookie.
- Oprávnění kontroluje backend; skrytí tlačítka v rozhraní není jediná ochrana.

## Stroje a příslušenství — připravovaná obrazovka

Backend již eviduje fyzické stroje, jejich typy, příslušenství, MTH, spotřebu a
tankování. Hlídá souběžné použití stejného stroje i unikátního příslušenství a
audituje opravu navrženého počátečního MTH. Uživatelský formulář pro tuto část
ještě není součástí náhledu; funkce proto zatím není označena jako dokončená.
