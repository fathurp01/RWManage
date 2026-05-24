const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    console.log("Testing getUsers query...");
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['RW', 'RT', 'PENGURUS_MASJID'],
        },
      },
      select: {
        id: true,
        nama: true,
        email: true,
        no_hp: true,
        role: true,
        status_akun: true,
        created_at: true,
        blok_wilayah_id: true,
      },
      orderBy: { created_at: "desc" },
    });
    console.log('Users OK:', users.length);
  } catch (e) {
    console.error('ERROR in getUsers query:', e);
  }

  try {
    console.log("Testing getPasswordResets query...");
    const reqs = await prisma.passwordResetRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        user: {
          select: { email: true, nama: true, role: true },
        },
      },
      orderBy: { created_at: "desc" },
    });
    console.log('Resets OK:', reqs.length);
  } catch (e) {
    console.error('ERROR in getPasswordResets query:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
