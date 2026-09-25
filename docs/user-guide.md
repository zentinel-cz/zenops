# ZenOps V1 — Uživatelská příručka

Tato příručka popisuje aktuálně implementované funkce nové verze ZenOps. Bude
se rozšiřovat současně s aplikací. Testovací náhled běží na adrese
`https://zenops.zentinel.cz`.

## Přihlášení a odhlášení

1. Otevřete přihlašovací stránku ZenOps.
2. Zadejte firemní e-mail a heslo s nejméně 12 znaky.
3. Po přihlášení se zobrazí dashboard podle vašich oprávnění.
4. Pro bezpečné ukončení relace použijte tlačítko **Odhlásit** vpravo nahoře.

Přístup vytváří Admin. Neexistuje žádný společný ani výchozí účet.

## Role

### Pracovník

- má jednoduchý dashboard s hlavní volbou **Přidat denní záznam**;
- vidí všechny otevřené zakázky až uvnitř formuláře denního záznamu;
- spravuje vlastní pracovní den, úseky práce, jízdy a přestávky;
- zvolí ranní nebo noční směnu; noční směna může pokračovat přes půlnoc.

### Vedoucí

Vedoucí nevytváří vlastní denní záznamy. Zakládá zakázky, spravuje denní údaje,
techniku a provozní palivo a schvaluje jednotlivé pracovní úseky pracovníků na
zakázkách, které aktuálně vede.

### Admin

Admin nevytváří vlastní denní záznamy. Má globální provozní dashboard se
seznamem otevřených i uzavřených zakázek, techniky, příslušenství a vozidel.
Může zakázky uzavřít nebo znovu otevřít, spravuje zaměstnance a jejich přístupy
a administrativní schvalování.

## Zakázky

- Otevřené zakázky jsou dostupné pracovníkům při vytváření denního záznamu.
- Vedoucí nebo Admin vytvoří zakázku tlačítkem **Nová zakázka**.
- Každá zakázka má právě jednoho aktuálního Vedoucího.
- Zakázku může uzavřít nebo znovu otevřít pouze Admin.
- Uzavřená zakázka zůstává v administrátorském přehledu; nemaže se.
- Změna Vedoucího existující zakázky zatím není dostupná, protože pravidla
  oprávnění k této operaci čekají na rozhodnutí.

## Můj pracovní den

1. Na jednoduchém dashboardu zvolte **Přidat denní záznam**.
2. Pokud pracovní den ještě neexistuje, zvolte ranní nebo noční směnu.
3. Vyberte Strojní sečení, Kácení, Reprofilaci nebo Ruční sečení.
4. Teprve v otevřeném formuláři vyberte Zakázku a zadejte čas práce.
5. Přidejte případné další pracovní úseky, přestávky, stroj nebo jízdu.
6. U Kácení vyberte aktivitu (například Pilař nebo Manipulace).
7. Přestávku zapište jako samostatný časový interval.
8. Chybný rozpracovaný úsek nebo přestávku lze odstranit a zadat znovu.
9. Po dokončení použijte **Odeslat pracovní den**.

Práce ani přestávky se nesmějí časově překrývat. Uzavřenou zakázku nelze
použít pro nový úsek. Po odeslání je pracovní den uzamčen pro běžné úpravy a
čeká na schválení podle zakázky.

## Schvalování práce — Vedoucí a Admin

1. V části **Práce ke schválení** otevřete čekající pracovní úsek.
2. Zkontrolujte pracovníka, zakázku, druh práce a vykázaný čas.
3. Správný úsek potvrďte tlačítkem **Schválit**.
4. Chybný úsek vraťte a povinně napište konkrétní důvod.

Vedoucí vidí práci pracovníků pouze na zakázkách, které právě vede. Každý úsek
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
2. Vyplňte osobní číslo, jméno, e-mail a dočasné heslo.
3. Přiřaďte nejméně jednu roli: Pracovník, Vedoucí nebo Admin.
4. Účet vytvořte. E-mail i osobní číslo musí být jedinečné.

Admin může účet deaktivovat nebo znovu aktivovat. Vždy musí uvést důvod.
Deaktivovaný zaměstnanec ani jeho účet se nemažou a nemůže se přihlásit.
Aktuálně přihlášený Admin nemůže deaktivovat sám sebe.

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
