import { db, usersTable, workersTable, vehiclesTable, machinesTable, accessoriesTable, regionsTable, weatherTypesTable } from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("Spouštím seed...");

  const adminPassword = process.env.ADMIN_PASSWORD ?? "admin123";
  const adminHash = await bcrypt.hash(adminPassword, 10);

  const [existingAdmin] = await db.select({ id: usersTable.id }).from(usersTable).where(
    eq(usersTable.username, "admin")
  ).limit(1);

  if (!existingAdmin) {
    await db.insert(usersTable).values({
      username: "admin",
      passwordHash: adminHash,
      fullName: "Správce systému",
      role: "admin",
      isActive: true,
    });
    console.log(`Admin vytvořen: username=admin, password=${adminPassword}`);
  } else {
    console.log("Admin již existuje, přeskakuji...");
  }

  const weatherCount = await db.select({ id: weatherTypesTable.id }).from(weatherTypesTable);
  if (weatherCount.length === 0) {
    await db.insert(weatherTypesTable).values([
      { name: "Slunečno", icon: "sun", isActive: true },
      { name: "Polojasno", icon: "cloud-sun", isActive: true },
      { name: "Zataženo", icon: "cloud", isActive: true },
      { name: "Déšť", icon: "cloud-rain", isActive: true },
      { name: "Silný déšť", icon: "cloud-rain", isActive: true },
      { name: "Bouřka", icon: "cloud-lightning", isActive: true },
      { name: "Sněžení", icon: "snowflake", isActive: true },
      { name: "Náledí", icon: "snowflake", isActive: true },
      { name: "Mlha", icon: "wind", isActive: true },
      { name: "Vítr", icon: "wind", isActive: true },
    ]);
    console.log("Typy počasí vytvořeny");
  }

  const regionsCount = await db.select({ id: regionsTable.id }).from(regionsTable);
  if (regionsCount.length === 0) {
    await db.insert(regionsTable).values([
      { name: "Revír 1 - Sever", code: "R01", isActive: true },
      { name: "Revír 2 - Jih", code: "R02", isActive: true },
      { name: "Revír 3 - Východ", code: "R03", isActive: true },
      { name: "Revír 4 - Západ", code: "R04", isActive: true },
      { name: "Revír 5 - Střed", code: "R05", isActive: true },
      { name: "Revír 6 - Hora", code: "R06", isActive: true },
    ]);
    console.log("Revíry/Kraje vytvořeny");
  }

  const workersCount = await db.select({ id: workersTable.id }).from(workersTable);
  if (workersCount.length === 0) {
    await db.insert(workersTable).values([
      { firstName: "Jan", lastName: "Novák", note: "Hlavní dělník", isActive: true },
      { firstName: "Petr", lastName: "Dvořák", note: "Řidič harvestoru", isActive: true },
      { firstName: "Pavel", lastName: "Procházka", isActive: true },
      { firstName: "Martin", lastName: "Krejčí", isActive: true },
      { firstName: "Tomáš", lastName: "Blažek", isActive: true },
      { firstName: "Lukáš", lastName: "Havel", note: "Brigádník", isActive: true },
      { firstName: "Jiří", lastName: "Malý", isActive: true },
    ]);
    console.log("Pracovníci vytvořeni");
  }

  const vehiclesCount = await db.select({ id: vehiclesTable.id }).from(vehiclesTable);
  if (vehiclesCount.length === 0) {
    await db.insert(vehiclesTable).values([
      { name: "Traktor Zetor 7745", licensePlate: "1AB 2345", note: "Hlavní traktor", isActive: true },
      { name: "Traktor John Deere 6130M", licensePlate: "4GH 5678", isActive: true },
      { name: "Nákladní Mercedes Atego", licensePlate: "2CD 6789", note: "Transport dřeva", isActive: true },
      { name: "Terénní Land Rover Defender", licensePlate: "3EF 0123", isActive: true },
      { name: "Vyvážeč Ponsse Buffalo", licensePlate: "5IJ 9012", isActive: true },
    ]);
    console.log("Vozidla vytvořena");
  }

  const machinesCount = await db.select({ id: machinesTable.id }).from(machinesTable);
  if (machinesCount.length === 0) {
    await db.insert(machinesTable).values([
      { name: "Motorová pila Stihl MS 362", type: "kácení", note: "Výkon 3,5 kW", isActive: true },
      { name: "Motorová pila Husqvarna 550 XP", type: "kácení", isActive: true },
      { name: "Motorová pila Stihl MS 261", type: "kácení", isActive: true },
      { name: "Vyvážecí vlek 6t", type: "transport", note: "Max. nosnost 6 tun", isActive: true },
      { name: "Vyvážecí vlek 10t", type: "transport", isActive: true },
      { name: "Křovinořez Stihl FS 310", type: "sečení", isActive: true },
      { name: "Křovinořez Husqvarna 545FX", type: "sečení", isActive: true },
      { name: "Mulčovač Pfanzelt M7", type: "sečení", note: "Traktorový mulčovač", isActive: true },
      { name: "Harvestor Ponsse Ergo", type: "kácení", note: "8-kol harvestor", isActive: true },
      { name: "Processor Kesla C6", type: "kácení", note: "Vyvážecí procesor", isActive: true },
    ]);
    console.log("Stroje vytvořeny");
  }

  const accessoriesCount = await db.select({ id: accessoriesTable.id }).from(accessoriesTable);
  if (accessoriesCount.length === 0) {
    await db.insert(accessoriesTable).values([
      { name: "Hydraulická ruka Tajfun RCA 480", type: "nakládač", note: "Dosah 4,8 m", isActive: true },
      { name: "Lesnická lanovka Larix 3T", type: "lanovka", note: "Nosnost 3 tuny", isActive: true },
      { name: "Štěpkovač Pezzolato PTH 700", type: "štěpkování", isActive: true },
      { name: "Kleštinový nakladač OPK", type: "nakladač", isActive: true },
      { name: "Ochranná výstroj SET A", type: "OOPP", note: "Helma + kalhoty + boty", isActive: true },
      { name: "Přívěs na kmenový sortiment", type: "transport", isActive: true },
      { name: "Lesnický navijak 5t", type: "navijak", isActive: true },
    ]);
    console.log("Příslušenství vytvořeno");
  }

  console.log("Seed dokončen!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Chyba při seedování:", err);
  process.exit(1);
});
