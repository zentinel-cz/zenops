/**
 * Seed script - naplní databázi ukázkovými daty
 * Spuštění: pnpm --filter @workspace/api-server run seed
 *
 * VAROVÁNÍ: Smaže a znovu vytvoří záznamy seed uživatelů a číselníků!
 */

import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  workersTable,
  vehiclesTable,
  machinesTable,
  accessoriesTable,
  regionsTable,
  weatherTypesTable,
  fellingRecordsTable,
  fellingRecordWorkersTable,
  fellingRecordVehiclesTable,
  fellingRecordMachinesTable,
  fellingRecordAccessoriesTable,
  mowingRecordsTable,
  mowingRecordWorkersTable,
  mowingRecordMachinesTable,
  mowingRecordAccessoriesTable,
} from "@workspace/db";
import { sql, inArray, isNull } from "drizzle-orm";

const SEED_USERNAMES = ["admin", "jannovak", "petrsvoboda"];

async function main() {
  console.log("🌱 Zahajuji seedování databáze...");

  // ─── Číselníky ───────────────────────────────────────────────────────

  console.log("📋 Vkládám číselníky...");

  // Počasí
  await db.delete(weatherTypesTable).where(sql`1=1`);
  const [w1, w2, w3, w4, w5, w6] = await db
    .insert(weatherTypesTable)
    .values([
      { name: "Slunečno" },
      { name: "Polojasno" },
      { name: "Zataženo" },
      { name: "Déšť" },
      { name: "Mlha" },
      { name: "Mráz / Ledovka" },
    ])
    .returning();

  // Revíry
  await db.delete(regionsTable).where(isNull(regionsTable.deletedAt));
  const [r1, r2, r3, r4, r5] = await db
    .insert(regionsTable)
    .values([
      { name: "Revír Lipová", code: "LIP-01" },
      { name: "Revír Borůvka", code: "BOR-02" },
      { name: "Revír Hradiště", code: "HRA-03" },
      { name: "Revír Smrčina", code: "SMR-04" },
      { name: "Revír Dubina", code: "DUB-05" },
    ])
    .returning();

  // Pracovníci
  await db.delete(workersTable).where(isNull(workersTable.deletedAt));
  const workers = await db
    .insert(workersTable)
    .values([
      { firstName: "Jan", lastName: "Novák", isActive: true },
      { firstName: "Petr", lastName: "Svoboda", isActive: true },
      { firstName: "Martin", lastName: "Dvořák", isActive: true },
      { firstName: "Tomáš", lastName: "Kovář", isActive: true },
      { firstName: "Pavel", lastName: "Blažek", isActive: true },
      { firstName: "Josef", lastName: "Kratochvíl", isActive: true },
      { firstName: "Ondřej", lastName: "Šimánek", isActive: true },
    ])
    .returning();

  // Vozidla
  await db.delete(vehiclesTable).where(isNull(vehiclesTable.deletedAt));
  const vehicles = await db
    .insert(vehiclesTable)
    .values([
      { name: "Škoda Superb Combi", licensePlate: "2KJ 5678", isActive: true },
      { name: "VW Transporter", licensePlate: "3TP 1234", isActive: true },
      { name: "Toyota Hilux 4x4", licensePlate: "5MZ 7890", isActive: true },
      { name: "Lesnický přívěs PA 8t", isActive: true },
    ])
    .returning();

  // Stroje
  await db.delete(machinesTable).where(isNull(machinesTable.deletedAt));
  const machines = await db
    .insert(machinesTable)
    .values([
      { name: "Husqvarna 560 XP", type: "motorová pila", isActive: true },
      { name: "Stihl MS 500i", type: "motorová pila", isActive: true },
      { name: "Husqvarna T540i XP", type: "motorová pila", isActive: true },
      { name: "Stihl MS 261", type: "motorová pila", isActive: true },
      { name: "Traktor Zetor 8641", type: "traktor", isActive: true },
      { name: "Traktor John Deere 5075E", type: "traktor", isActive: true },
      { name: "Harvestor Ponsse Beaver", type: "harvestor", isActive: true },
    ])
    .returning();

  // Příslušenství
  const accessories = await db
    .insert(accessoriesTable)
    .values([
      { name: "Štěpkovač BIO 230" },
      { name: "Nakladač hydraulický" },
      { name: "Naviják lesní 6t" },
      { name: "Sekačka boční SB-3" },
      { name: "Mulčovač M-280" },
      { name: "Motorová sekačka BGP 52" },
      { name: "Motorový křovinořez FS 461" },
    ])
    .returning();

  // ─── Uživatelé ────────────────────────────────────────────────────────

  console.log("👤 Vkládám uživatele...");

  const adminHash = await bcrypt.hash("admin123", 10);
  const testHash = await bcrypt.hash("test123", 10);
  const petrHash = await bcrypt.hash("petr123", 10);

  // Remove old seed users if they exist
  await db.delete(usersTable).where(
    inArray(usersTable.username, SEED_USERNAMES),
  );

  const [admin, janUser, petrUser] = await db
    .insert(usersTable)
    .values([
      { username: "admin", passwordHash: adminHash, fullName: "Správce Systému", role: "admin" },
      { username: "jannovak", passwordHash: testHash, fullName: "Jan Novák", role: "employee" },
      { username: "petrsvoboda", passwordHash: petrHash, fullName: "Petr Svoboda", role: "employee" },
    ])
    .returning();

  // ─── Záznamy kácení ───────────────────────────────────────────────────

  console.log("🌲 Vkládám záznamy kácení...");

  const fellingData = [
    {
      date: "2026-04-01", userId: janUser.id, regionId: r1.id,
      location: "Lesní oddělení 15a", startTime: "07:00", endTime: "15:30",
      weatherTypeId: w1.id, temperature: 8, mth: "8.50", fuelConsumption: "24.0",
      note: "Těžba smrku po kalamitě. Terén mokrý.",
    },
    {
      date: "2026-04-03", userId: janUser.id, regionId: r2.id,
      location: "Oddělení 22b", startTime: "06:30", endTime: "14:00",
      weatherTypeId: w2.id, temperature: 11, mth: "7.50", fuelConsumption: "18.5",
    },
    {
      date: "2026-04-07", userId: petrUser.id, regionId: r3.id,
      location: "Výběžek Hradiště - S svah", startTime: "07:30", endTime: "16:00",
      weatherTypeId: w3.id, temperature: 5, mth: "8.50", fuelConsumption: "22.0", refueling: "30.0",
      note: "Přitankování na místě. Holina po větru.",
    },
    {
      date: "2026-04-10", userId: janUser.id, regionId: r4.id,
      location: "Smrčina - horní část", startTime: "07:00", endTime: "15:00",
      weatherTypeId: w1.id, temperature: 12, mth: "8.00", fuelConsumption: "20.0",
    },
    {
      date: "2026-04-12", userId: petrUser.id, regionId: r5.id,
      location: "Dubina - jihovýchod", startTime: "08:00", endTime: "13:30",
      weatherTypeId: w2.id, temperature: 14, mth: "5.50", fuelConsumption: "14.0",
      note: "Krátký den - přesun techniky odpoledne.",
    },
    {
      date: "2026-04-14", userId: janUser.id, regionId: r1.id,
      location: "Lesní oddělení 16b", startTime: "07:00", endTime: "14:30",
      weatherTypeId: w1.id, temperature: 10, mth: "7.50", fuelConsumption: "19.5",
    },
  ];

  const fellingRecords = await db.insert(fellingRecordsTable).values(fellingData).returning();

  // Junction data for felling
  for (let i = 0; i < fellingRecords.length; i++) {
    const fr = fellingRecords[i];
    const workerPairs = [
      [workers[0].id, workers[1].id],
      [workers[0].id, workers[2].id],
      [workers[1].id, workers[3].id],
      [workers[0].id, workers[1].id, workers[2].id],
      [workers[3].id, workers[4].id],
      [workers[0].id, workers[1].id],
    ];
    await db.insert(fellingRecordWorkersTable).values(workerPairs[i].map((wid) => ({ fellingRecordId: fr.id, workerId: wid })));

    const vehiclePairs = [[vehicles[0].id], [vehicles[1].id], [vehicles[2].id], [vehicles[0].id, vehicles[1].id], [vehicles[1].id], [vehicles[0].id]];
    await db.insert(fellingRecordVehiclesTable).values(vehiclePairs[i].map((vid) => ({ fellingRecordId: fr.id, vehicleId: vid })));

    const machinePairs = [[machines[0].id, machines[1].id], [machines[0].id], [machines[1].id, machines[2].id], [machines[0].id, machines[3].id], [machines[1].id], [machines[0].id, machines[1].id]];
    await db.insert(fellingRecordMachinesTable).values(machinePairs[i].map((mid) => ({ fellingRecordId: fr.id, machineId: mid })));

    if (i !== 4) {
      await db.insert(fellingRecordAccessoriesTable).values([{ fellingRecordId: fr.id, accessoryId: accessories[0].id }]);
    }
  }

  // ─── Záznamy sečení ────────────────────────────────────────────────────

  console.log("🌿 Vkládám záznamy sečení...");

  const mowingData = [
    { date: "2026-04-02", userId: janUser.id, regionId: r1.id, location: "Průsek pod dálnicí", startTime: "07:30", endTime: "14:30", weatherTypeId: w1.id, vehicleId: vehicles[1].id, mthStart: "1240.5", mthEnd: "1247.5", mthTotal: "7.0", fuelConsumption: "35.0" },
    { date: "2026-04-04", userId: petrUser.id, regionId: r2.id, location: "Lesní cesta - Borůvka sever", startTime: "07:00", endTime: "15:00", weatherTypeId: w2.id, vehicleId: vehicles[2].id, mthStart: "890.0", mthEnd: "899.0", mthTotal: "9.0", fuelConsumption: "42.0", note: "Mokrá tráva, pomalejší postup." },
    { date: "2026-04-08", userId: janUser.id, regionId: r4.id, location: "Smrčina - příkopová část", startTime: "08:00", endTime: "13:00", weatherTypeId: w3.id, vehicleId: vehicles[1].id, mthStart: "1247.5", mthEnd: "1252.0", mthTotal: "4.5", fuelConsumption: "22.5" },
    { date: "2026-04-11", userId: petrUser.id, regionId: r5.id, location: "Dubina - příjezdová cesta", startTime: "07:00", endTime: "14:30", weatherTypeId: w1.id, vehicleId: vehicles[2].id, mthStart: "899.0", mthEnd: "906.5", mthTotal: "7.5", fuelConsumption: "36.0", refueling: "40.0", note: "Doplnění paliva na místě." },
    { date: "2026-04-13", userId: janUser.id, regionId: r3.id, location: "Hradiště - travnaté plochy", startTime: "08:30", endTime: "14:30", weatherTypeId: w2.id, vehicleId: vehicles[1].id, mthStart: "1252.0", mthEnd: "1258.5", mthTotal: "6.5", fuelConsumption: "32.0" },
    { date: "2026-04-15", userId: petrUser.id, regionId: r1.id, location: "Lipová - okraj lesa", startTime: "07:00", endTime: "12:00", weatherTypeId: w1.id, vehicleId: vehicles[2].id, mthStart: "906.5", mthEnd: "911.5", mthTotal: "5.0", fuelConsumption: "25.0" },
  ];

  const mowingRecords = await db.insert(mowingRecordsTable).values(mowingData).returning();

  const mowingWorkerGroups = [[workers[0].id, workers[1].id], [workers[1].id, workers[2].id], [workers[0].id], [workers[2].id, workers[3].id], [workers[0].id, workers[1].id], [workers[3].id, workers[4].id]];
  const mowingMachineGroups = [[machines[4].id], [machines[5].id], [machines[4].id], [machines[5].id], [machines[4].id], [machines[5].id]];
  const mowingAccessoryGroups = [[accessories[3].id, accessories[4].id], [accessories[4].id], [accessories[3].id], [accessories[3].id, accessories[4].id], [accessories[3].id], [accessories[6].id]];

  for (let i = 0; i < mowingRecords.length; i++) {
    const mr = mowingRecords[i];
    await db.insert(mowingRecordWorkersTable).values(mowingWorkerGroups[i].map((wid) => ({ mowingRecordId: mr.id, workerId: wid })));
    await db.insert(mowingRecordMachinesTable).values(mowingMachineGroups[i].map((mid) => ({ mowingRecordId: mr.id, machineId: mid })));
    await db.insert(mowingRecordAccessoriesTable).values(mowingAccessoryGroups[i].map((aid) => ({ mowingRecordId: mr.id, accessoryId: aid })));
  }

  console.log("\n✅ Seedování dokončeno!");
  console.log("─".repeat(50));
  console.log("Přihlašovací údaje:");
  console.log("  admin        / admin123  (role: admin)");
  console.log("  jannovak     / test123   (role: uživatel)");
  console.log("  petrsvoboda  / petr123   (role: uživatel)");
  console.log("─".repeat(50));

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Chyba při seedování:", err);
  process.exit(1);
});
