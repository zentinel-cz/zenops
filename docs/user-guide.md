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
- později bude spravovat vlastní pracovní dny, úseky práce a přestávky.

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
