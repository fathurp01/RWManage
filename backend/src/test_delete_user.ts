import { prisma } from "./lib/prisma";

async function runTest() {
  console.log("=== RUNNING DATABASE CONSTRAINT TEST ===");
  try {
    const users = await prisma.user.findMany({
      include: {
        wilayah_rw: {
          include: {
            blok_wilayah: true,
            kas_rw: true,
            setoran_iuran: true,
            pengaturan_iuran: true,
            laporan_insiden: true
          }
        },
        pengurus_masjid: {
          include: {
            masjid: true
          }
        },
        audit_logs: { take: 5 }
      }
    });

    console.log(`Found ${users.length} users in database.`);
    for (const u of users) {
      console.log(`- User ID: ${u.id} | Email: ${u.email} | Role: ${u.role}`);
      if (u.wilayah_rw) {
        console.log(`  * Linked RW: ${u.wilayah_rw.nama_kompleks}`);
        console.log(`    Bloks: ${u.wilayah_rw.blok_wilayah.length}`);
        console.log(`    KasRW: ${u.wilayah_rw.kas_rw.length}`);
        console.log(`    Setoran: ${u.wilayah_rw.setoran_iuran.length}`);
        console.log(`    Incidents: ${u.wilayah_rw.laporan_insiden.length}`);
      }
      if (u.pengurus_masjid.length > 0) {
        console.log(`  * Linked Mosque Admin: ${u.pengurus_masjid.map(p => p.masjid.nama_masjid).join(", ")}`);
      }
      console.log(`  * Audit logs count: ${u.audit_logs.length}`);
    }

  } catch (err: any) {
    console.error("Test failed with error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

runTest();
