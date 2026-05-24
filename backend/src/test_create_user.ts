import { prisma } from "./lib/prisma";
import bcrypt from "bcrypt";

async function testCreate() {
  console.log("=== TESTING USER CREATION ===");
  try {
    const hashedPassword = await bcrypt.hash("password123", 12);
    const user = await prisma.user.create({
      data: {
        nama: "Test RT User",
        email: "test_rt@example.com",
        password: hashedPassword,
        no_hp: "08123456789",
        role: "RT",
        blok_wilayah_id: null,
        status_akun: "APPROVED",
      }
    });
    console.log("CREATED USER SUCCESS:", user);
    
    console.log("=== TESTING USER DELETION ===");
    await prisma.user.delete({ where: { id: user.id } });
    console.log("DELETED SUCCESS");
  } catch (err: any) {
    console.error("TEST FAILED WITH ERROR:", err);
  } finally {
    await prisma.$disconnect();
  }
}

testCreate();
