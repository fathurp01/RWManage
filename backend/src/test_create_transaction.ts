import { prisma } from "./lib/prisma";
import bcrypt from "bcrypt";
import { Role, StatusAkun, AksiAudit } from "@prisma/client";

async function testTransaction() {
  console.log("=== RUNNING DETAILED TRANSACTION CREATION TEST ===");
  const SALT_ROUNDS = 12;

  // Let's test creating an RT user
  try {
    const nama = "Test RT User";
    const email = `test_rt_${Date.now()}@example.com`;
    const password = "password123";
    const no_hp = "08123456789";
    const role = Role.RT;
    const blok_wilayah_id = null; // or get first block id

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    console.log(`\n1. Creating RT user: ${email}...`);
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama,
          email,
          password: hashedPassword,
          no_hp,
          role,
          blok_wilayah_id: role === Role.RT ? (blok_wilayah_id || null) : null,
          status_akun: StatusAkun.APPROVED,
        },
        select: {
          id: true,
          nama: true,
          email: true,
          role: true,
          status_akun: true,
        },
      });

      if (user.role === Role.RW) {
        await tx.wilayahRW.create({
          data: {
            user_id: user.id,
            nama_kompleks: user.nama,
            no_rw: "-",
          },
        });
      }

      return user;
    });

    console.log("   -> TRANSACTION SUCCESS:", newUser);

    // Clean up
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log("   -> CLEANUP SUCCESS");
  } catch (err: any) {
    console.error("   -> RT CREATION FAILED:", err.message || err);
  }

  // Let's test creating an RW user
  try {
    const nama = "Test RW User";
    const email = `test_rw_${Date.now()}@example.com`;
    const password = "password123";
    const no_hp = "08123456789";
    const role = Role.RW;

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    console.log(`\n2. Creating RW user: ${email}...`);
    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          nama,
          email,
          password: hashedPassword,
          no_hp,
          role,
          blok_wilayah_id: null,
          status_akun: StatusAkun.APPROVED,
        },
        select: {
          id: true,
          nama: true,
          email: true,
          role: true,
          status_akun: true,
        },
      });

      if (user.role === Role.RW) {
        await tx.wilayahRW.create({
          data: {
            user_id: user.id,
            nama_kompleks: user.nama,
            no_rw: "-",
          },
        });
      }

      return user;
    });

    console.log("   -> TRANSACTION SUCCESS:", newUser);

    // Clean up
    // First delete WilayahRW
    await prisma.wilayahRW.delete({ where: { user_id: newUser.id } });
    await prisma.user.delete({ where: { id: newUser.id } });
    console.log("   -> CLEANUP SUCCESS");
  } catch (err: any) {
    console.error("   -> RW CREATION FAILED:", err.message || err);
  }

  await prisma.$disconnect();
}

testTransaction();
