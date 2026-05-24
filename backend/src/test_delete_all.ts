import { prisma } from "./lib/prisma";

async function testDelete() {
  console.log("=== RUNNING DRY-RUN DELETION DEBUGS ===");
  try {
    const users = await prisma.user.findMany();
    for (const u of users) {
      if (u.role === "SUPERADMIN") continue;
      console.log(`\nAttempting to delete ${u.email} (${u.role})...`);
      try {
        await prisma.$transaction(async (tx) => {
          // Clear related records first
          await tx.auditLog.deleteMany({ where: { user_id: u.id } });
          await tx.userPreference.deleteMany({ where: { user_id: u.id } });
          await tx.passwordResetRequest.deleteMany({ where: { user_id: u.id } });
          await tx.pengurusMasjid.deleteMany({ where: { user_id: u.id } });
          
          // Find if they have wilayah_rw
          const rw = await tx.wilayahRW.findUnique({
            where: { user_id: u.id },
            include: { blok_wilayah: true }
          });
          if (rw) {
            if (rw.blok_wilayah.length > 0) {
              throw new Error("RW still has active blocks.");
            }
            await tx.kasRW.deleteMany({ where: { wilayah_rw_id: rw.id } });
            await tx.laporanInsiden.deleteMany({ where: { wilayah_rw_id: rw.id } });
            await tx.shareLink.deleteMany({ where: { scope: "RW", scope_id: rw.id } });
            await tx.pengaturanIuranRW.deleteMany({ where: { wilayah_rw_id: rw.id } });
            await tx.wilayahRW.delete({ where: { id: rw.id } });
          }

          await tx.user.delete({ where: { id: u.id } });
          console.log(`  -> DRY-RUN DELETE SUCCESS FOR ${u.email}`);
          throw new Error("ROLLBACK_DRY_RUN"); // Rollback so we don't actually delete data
        });
      } catch (err: any) {
        if (err.message === "ROLLBACK_DRY_RUN") {
          continue;
        }
        console.error(`  -> FAILED FOR ${u.email}:`, err.message || err);
      }
    }
  } catch (err: any) {
    console.error("Global test failure:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testDelete();
