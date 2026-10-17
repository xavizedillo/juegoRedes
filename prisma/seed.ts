import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomStatus(): string {
  const statuses = ['GAME_OVER', 'VICTORY'];
  return statuses[Math.floor(Math.random() * statuses.length)];
}

function generateInventory(): any {
  const items = ['sword', 'shield', 'potion', 'bow', 'armor', 'ring', 'staff', 'key'];
  const inventory: any = {};
  const numItems = getRandomInt(0, 5);
  for (let i = 0; i < numItems; i++) {
    const item = items[Math.floor(Math.random() * items.length)];
    inventory[item] = getRandomInt(1, 5);
  }
  return inventory;
}

function generateTelemetryData(count: number) {
  const data = [];
  for (let i = 0; i < count; i++) {
    data.push({
      playerId: `player_${getRandomInt(1, 1000)}`,
      partySize: getRandomInt(1, 4),
      floorReached: getRandomInt(1, 20),
      bossesDefeated: getRandomInt(0, 5),
      goldCollected: getRandomInt(0, 10000),
      status: getRandomStatus(),
      playtimeMinutes: getRandomInt(5, 120),
      inventory: generateInventory(),
      createdAt: new Date(Date.now() - getRandomInt(0, 86400000 * 30)), // Random date in last 30 days
    });
  }
  return data;
}

async function main() {
  console.log('Starting seed...');

  const batchSize = 1000;
  const totalRecords = 10000;
  const batches = Math.ceil(totalRecords / batchSize);

  for (let i = 0; i < batches; i++) {
    const recordsToCreate = Math.min(batchSize, totalRecords - i * batchSize);
    const data = generateTelemetryData(recordsToCreate);

    await prisma.matchTelemetry.createMany({
      data,
      skipDuplicates: true,
    });

    console.log(`Batch ${i + 1}/${batches} completed: ${recordsToCreate} records inserted`);
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
