const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rwUsers = await prisma.user.findMany({
    where: {
      role: 'RW',
      status_akun: 'APPROVED',
      wilayah_rw: null
    }
  });

  for (const user of rwUsers) {
    await prisma.wilayahRW.create({
      data: {
        user_id: user.id,
        nama_kompleks: '-',
        no_rw: '-'
      }
    });
    console.log(`Created WilayahRW for user ${user.id}`);
  }

  console.log("Finished fixing missing WilayahRW");
}

main().catch(console.error).finally(() => prisma.$disconnect());
