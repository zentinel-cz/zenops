# ZenOps – uživatelská příručka

**Platnost:** aktuální stav aplikace k 23. 9. 2026

**Produkce:** <https://zenops.zentinel.cz>

**Určeno pro:** administrátory, vedoucí, pracovníky, křováky a subdodavatele

> Tato příručka je živá dokumentace. Každá změna uživatelského rozhraní, rolí, oprávnění, formulářů, pracovních postupů, stavů nebo exportů musí ve stejné změně aktualizovat také tento soubor.

## 1. K čemu ZenOps slouží

ZenOps je systém pro evidenci lesnických a terénních prací. Spojuje denní pracovní záznamy, pracovníky, techniku, motohodiny, vozidla, provozní údaje, schvalování a exporty.

Současný systém pracuje zejména s těmito oblastmi:

- strojní sečení,
- ruční sečení křovinořezy,
- kácení,
- denní výkazy subdodavatelů,
- správa pracovníků, techniky a dalších číselníků,
- audit změn a exporty.

## 2. Přihlášení a odhlášení

1. Otevřete `https://zenops.zentinel.cz`.
2. Zadejte **uživatelské jméno** a **heslo**.
3. Stiskněte **Přihlásit se**.
4. Systém vás podle role přesměruje do odpovídajícího portálu.

Odhlášení provedete tlačítkem **Odhlásit** v horní části portálu nebo v uživatelském menu administrace.

Pokud přihlášení nefunguje:

- zkontrolujte překlepy a velikost písmen v hesle,
- ověřte u administrátora, že je účet aktivní,
- požádejte administrátora o nastavení nového hesla.

## 3. Role a jejich oprávnění

ZenOps má pět aktivních rolí.

### Admin

Spravuje celý systém. Vidí hlavní administrátorské rozhraní, provozní záznamy kácení a sečení, denní záznamy strojního sečení i subdodavatelů, uživatele, číselníky a auditní log. Může vytvářet, upravovat, mazat a exportovat provozní záznamy podle dostupných tlačítek.

### Vedoucí

Organizuje denní práci:

- u **Strojního sečení** zakládá záznam, přiřazuje pracovníky, otevírá nebo uzavírá záznam a kontroluje jejich zápisy,
- u **Křováků kmenových** kontroluje a upravuje záznamy křováků, schvaluje je nebo je znovu otevírá,
- u **Kácení** může založit nový denní záznam,
- **Reprofilace** je zatím připravovaná.

### Pracovník

Po přihlášení vidí rozcestník činností. Funkční je nyní **Strojní sečení**, kde pracovník otevře záznam přiřazený vedoucím a doplní svůj stroj, MTH, vozidlo a poznámku. Karty Křováci kmenoví, Reprofilace a Kácení jsou na jeho rozcestníku zavedené, ale pracovní formuláře se ještě připravují.

### Křovák

Má samostatný portál **Křováci kmenoví**. Vytváří a upravuje vlastní denní záznamy ručního sečení, odevzdává je vedoucímu a vidí jejich stav. Nemá přístup do ostatních sekcí ZenOps.

### Subdodavatel

Má oddělený portál vlastní firmy. Zadává a upravuje pouze denní záznamy firmy propojené s jeho účtem. Nevidí data jiných firem ani běžné provozní sekce ZenOps.

## 4. Přehled dostupnosti

| Oblast | Admin | Vedoucí | Pracovník | Křovák | Subdodavatel |
|---|---:|---:|---:|---:|---:|
| Provozní přehled | ano | ne | ne | ne | ne |
| Provozní záznamy kácení a sečení | ano | ne | ne | ne | ne |
| Strojní sečení – vedení denního záznamu | kontrola | ano | vlastní zápis | ne | ne |
| Křováci kmenoví – vlastní záznam | provozní evidence | kontrola | připravuje se | ano | ne |
| Kácení – nový denní záznam | ano | ano | připravuje se | ne | ne |
| Reprofilace | připravuje se | připravuje se | připravuje se | ne | ne |
| Záznamy subdodavatele | kontrola a export | ne | ne | ne | vlastní firma |
| Uživatelé, číselníky, audit | ano | ne | ne | ne | ne |

## 5. Portál pracovníka a vedoucího

Po přihlášení se zobrazí rozcestník **Co dnes budeme zapisovat?** se čtyřmi kartami:

1. **Strojní sečení**
2. **Křováci kmenoví**
3. **Reprofilace**
4. **Kácení**

Tlačítkem **Zpět na výběr** se kdykoli vrátíte na rozcestník.

### 5.1 Strojní sečení – postup vedoucího

#### Založení záznamu

1. Na rozcestníku otevřete **Strojní sečení**.
2. Zvolte vytvoření nového denního záznamu.
3. Vyplňte povinné **Datum** a **Revír**.
4. Podle potřeby doplňte místo práce, počasí a teplotu.
5. Zaškrtněte pracovníky, kteří mají záznam vidět a vyplnit.
6. Vyberte stav:
   - **Ihned otevřít pracovníkům** – pracovníci záznam ihned uvidí;
   - **Uložit jako rozpracovaný** – pracovníci ho zatím neuvidí.
7. Stiskněte **Vytvořit denní záznam**.

#### Správa vytvořeného záznamu

- **Upravit záznam** mění datum, revír, místo, počasí, teplotu a přiřazené pracovníky.
- Pracovníka, který již uložil svůj zápis, nelze odebrat. Chrání se tím jeho data.
- **Otevřít** zpřístupní záznam přiřazeným pracovníkům.
- **Uzavřít** přesune záznam do archivu a pracovníci jej už nemohou měnit.
- Detail ukazuje u každého pracovníka stav **Čeká na zápis** nebo **Zápis uložen** a jeho techniku, MTH, vozidla a poznámku.

#### Stavy strojního sečení

- **Rozpracovaný** – připravuje ho vedoucí, pracovníci jej nevyplňují.
- **Otevřený** – přiřazení pracovníci mohou ukládat a opravovat své údaje.
- **Uzavřený** – záznam je pouze ke čtení a je dostupný v archivu.

### 5.2 Strojní sečení – postup pracovníka

1. Otevřete **Strojní sečení**.
2. V části **Moje denní záznamy** vyberte záznam připravený vedoucím.
3. V části **Stroje a motohodiny** vyberte stroj a případné příslušenství.
4. Zadejte **MTH začátek** a **MTH konec**. Rozdíl se vypočítá automaticky.
5. Podle potřeby vyplňte spotřebu a tankování.
6. Tlačítkem **Přidat stroj** přidejte další techniku.
7. V části vozidel můžete přidat auto, počáteční a koncové kilometry a tankování.
8. Doplňte poznámku.
9. Stiskněte **Uložit můj zápis**.

Uložený otevřený záznam lze znovu upravit. Po uzavření vedoucím je jen ke čtení. Starší uzavřené záznamy najdete přes **Archiv uzavřených**.

### 5.3 Křováci kmenoví – postup křováka

1. Po přihlášení otevřete kartu **Křováci kmenoví**.
2. Založte nový denní záznam.
3. Vyplňte datum, revír, místo zakázky, začátek a konec práce a přestávku.
4. Vyberte druh práce:
   - Vyžínání,
   - Sečení buřeně,
   - Čištění porostu,
   - Údržba cest,
   - Ostatní.
5. Volitelně doplňte výkon a jednotku (`ha`, `m²` nebo hodiny) a poznámku.
6. Podle potřeby zadejte techniku, MTH, spotřebu, tankování, servisní údaje a jízdy vozidel.
7. Uložte záznam. Nový záznam se uloží jako **Rozpracováno**.
8. Po kontrole stiskněte **Odevzdat**.

#### Stavy záznamu křováka

- **Rozpracováno** – křovák může záznam upravovat.
- **Odevzdáno** – záznam čeká na kontrolu vedoucím.
- **Schváleno** – vedoucí záznam schválil.
- Vedoucí může odevzdaný nebo schválený záznam vrátit tlačítkem **Znovu otevřít**.

### 5.4 Křováci kmenoví – postup vedoucího

1. Otevřete **Křováci kmenoví**.
2. V seznamu vyberte záznam pracovníka.
3. Tlačítkem **Upravit** opravte potřebné údaje.
4. Odevzdaný záznam potvrďte přes **Schválit**.
5. Je-li nutná oprava pracovníkem, použijte **Znovu otevřít**.

Vedoucí záznamy křováků kontroluje; nový křovácký záznam zakládá samotný křovák.

### 5.5 Kácení – postup vedoucího

Vedoucí může na kartě **Kácení** vytvořit nový denní záznam. Formulář obsahuje zejména:

- typ práce,
- datum, revír a místo,
- čas práce, teplotu a až tři typy počasí,
- ruční a strojní obsluhu včetně individuálních časů,
- přiřazený průměr,
- vozidla a kilometry,
- stroje, MTH, spotřebu a tankování,
- příslušenství a sestavy,
- dopravní značení a poznámku.

Po vyplnění stiskněte **Uložit záznam**. Tlačítko **Zrušit** formulář vyčistí.

> Pracovní formulář Kácení pro roli Pracovník se zatím připravuje.

### 5.6 Reprofilace

Sekce je zavedena v rozcestníku, ale vlastní formulář a pracovní postup zatím nejsou dokončené. Nezadávejte data Reprofilace do jiné sekce jako náhradu; vyčkejte na dokončení modulu.

## 6. Portál subdodavatele

Subdodavatel vidí pouze záznamy vlastní firmy.

### Nový denní záznam

1. Vyplňte **Datum**.
2. Zadejte **Počet lidí na zakázce**.
3. Vyplňte **Místo zakázky**.
4. Zadejte čas **Práce od** a **Práce do**.
5. Stiskněte **Uložit denní záznam**.

### Oprava záznamu

1. V seznamu vybraného měsíce najděte záznam.
2. Stiskněte **Upravit**.
3. Opravte údaje a změny uložte.

Firma se k záznamu doplní automaticky podle přihlášeného účtu. Systém nepovolí přístup k záznamům jiné firmy.

## 7. Administrátorské rozhraní

### 7.1 Přehled

Úvodní obrazovka zobrazuje provozní statistiky, počet záznamů, pracovníky, MTH a poslední aktivitu. Rychlé akce vedou na nový záznam kácení nebo sečení.

### 7.2 Kácení a Sečení – provozní záznamy

V seznamech lze:

- filtrovat podle data od–do a revíru,
- otevřít detail,
- vytvořit nový záznam,
- upravit nebo odstranit záznam, pokud je příslušná akce dostupná,
- exportovat aktuální výsledek do **Excelu** nebo **PDF**.

Mazání vždy potvrďte až po kontrole data a záznamu. Smazání je v uživatelském rozhraní označeno jako nevratné.

### 7.3 Sečení – denní záznamy

V sekci **Sečení** přepněte z **Provozních záznamů** na **Denní záznamy**.

#### Strojní sečení

- vyberte kontrolovaný měsíc,
- otevřete detail libovolného vedoucího,
- sledujte poměr vyplněných a přiřazených pracovníků,
- vyberte jednotlivé záznamy nebo celý měsíc,
- spusťte **Exportovat vybrané**.

Excel obsahuje souhrnný přehled a samostatný list s výkony pracovníků.

#### Subdodavatelé

- vyberte měsíc,
- kontrolujte firmu, místo, počet lidí, pracovní dobu a člověkohodiny,
- označte jednotlivé záznamy nebo celý měsíc,
- exportujte vybrané záznamy do Excelu.

### 7.4 Uživatelé

Admin může vytvořit, upravit nebo odstranit uživatele.

Při založení účtu vyplňte:

- uživatelské jméno,
- heslo o délce nejméně 6 znaků,
- celé jméno,
- roli,
- aktivní stav.

Role Pracovník, Vedoucí a Křovák musí mít pracovní profil. Lze propojit existující profil nebo jej nechat vytvořit z celého jména. Role Subdodavatel musí být propojena s konkrétní subdodavatelskou firmou.

Při úpravě lze změnit jméno, roli, vazbu, aktivní stav a volitelně nastavit nové heslo. Deaktivace účtu je vhodnější než odstranění, pokud mají zůstat zachované historické vazby.

### 7.5 Číselníky

Admin spravuje data nabízená ve formulářích:

- subdodavatelské firmy,
- pracovníky,
- vozidla,
- stroje,
- příslušenství,
- kraje a revíry,
- typy počasí.

Než položku odstraníte, ověřte, zda ji nepoužívají starší záznamy. Pro dočasně nepoužívané položky upřednostněte deaktivaci, pokud ji daný číselník nabízí.

### 7.6 Audit log

Audit log eviduje vytvoření, úpravy a mazání. Lze jej filtrovat podle:

- entity,
- typu akce,
- uživatele,
- data od–do.

Rozbalením záznamu zobrazíte podrobnosti změny. Audit používejte při dohledávání, kdo a kdy údaj změnil.

## 8. Doporučený denní provoz

### Vedoucí

1. Ráno založí a otevře denní záznam strojního sečení.
2. Přiřadí správné pracovníky a zkontroluje revír, místo a počasí.
3. Během dne sleduje, kdo zápis uložil.
4. Zkontroluje odevzdané záznamy křováků.
5. Po dokončení a kontrole záznam uzavře nebo schválí.

### Pracovník

1. Otevře záznam přiřazený vedoucím.
2. Zapíše skutečně použitou techniku a počáteční i koncové hodnoty.
3. Před uložením zkontroluje MTH, kilometry a poznámku.
4. Uloží zápis ještě před uzavřením vedoucím.

### Křovák

1. Průběžně uloží rozpracovaný záznam.
2. Po skončení směny doplní výkon a technické údaje.
3. Zkontroluje časy a přestávku.
4. Odevzdá záznam vedoucímu.

### Admin

1. Kontroluje úplnost denních záznamů.
2. Spravuje účty a číselníky.
3. Provádí měsíční exporty.
4. Při nesrovnalostech používá audit log.

## 9. Nejčastější problémy

### Nevidím očekávaný záznam

- Pracovník: záznam musí být otevřený a musíte k němu být přiřazen.
- Uzavřený záznam hledejte v archivu.
- Subdodavatel: zkontrolujte vybraný měsíc; uvidíte jen vlastní firmu.
- Ověřte, že jste přihlášeni správným účtem a rolí.

### Záznam nelze upravit

- Strojní sečení může být uzavřené.
- Křovácký záznam může být odevzdaný nebo schválený; vedoucí ho musí znovu otevřít.
- Účet může být neaktivní nebo nemusí mít správnou vazbu na pracovní profil či firmu.

### Nelze odebrat pracovníka ze strojního sečení

Pracovník už má uložený zápis. Systém odebrání blokuje, aby nedošlo ke ztrátě dat.

### Chybí položka ve formuláři

Požádejte administrátora o kontrolu příslušného číselníku a aktivního stavu položky.

### Export je prázdný

Zkontrolujte filtr a výběr záznamů. U měsíčních denních záznamů je nutné před exportem označit alespoň jeden záznam.

## 10. Pravidla správného zápisu

- Každý pracuje pod vlastním účtem; účty a hesla se nesdílejí.
- Datum, revír, pracovníci a technika musí odpovídat skutečnosti.
- Počáteční hodnoty MTH nebo kilometrů nesmí být vyšší než koncové.
- Poznámka má vysvětlit odchylky, poruchy, tankování nebo nestandardní situace.
- Vedoucí uzavírá či schvaluje záznam až po kontrole úplnosti.
- Chybné nebo chybějící možnosti ve formuláři řeší admin přes číselníky, nikoli zápisem náhradní hodnoty do jiné kolonky.

## 11. Stav připravovaných funkcí

K datu této verze nejsou dokončené:

- pracovní formulář Reprofilace,
- pracovní formulář Kácení pro roli Pracovník,
- pracovní formulář Křováci kmenoví pro běžnou roli Pracovník.

Tyto položky jsou na rozcestníku záměrně viditelné jako připravované. Příručka musí být po jejich zprovoznění upravena ve stejné vývojové změně.

## 12. Údržba této příručky

Při každé změně ZenOps vývojář zkontroluje, zda změna ovlivňuje:

- roli nebo oprávnění,
- navigaci a názvy tlačítek,
- pole formulářů a validaci,
- stavový postup,
- export, filtr nebo audit,
- dostupnost připravované funkce,
- řešení běžných problémů.

Pokud ano, upraví tuto příručku ve stejném commitu. Změna uživatelského chování není dokončená, dokud dokumentace neodpovídá aplikaci.
