import { prisma } from "./lib/prisma";

async function main() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        nama: true,
        email: true,
        role: true,
        status_akun: true,
      }
    });
    console.log("USERS:", JSON.stringify(users, null, 2));

    const pengurus = await prisma.pengurusMasjid.findMany({
      include: {
        user: { select: { nama: true } },
        masjid: { select: { nama_masjid: true } }
      }
    });
    console.log("PENGURUS MASJID RELATIONS:", JSON.stringify(pengurus, null, 2));

    const masjids = await prisma.masjid.findMany({
      select: {
        id: true,
        nama_masjid: true,
      }
    });
    console.log("MASJIDS:", JSON.stringify(masjids, null, 2));
  } catch (err) {
    console.error("Error debugging DB:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
