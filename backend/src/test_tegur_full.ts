import { prisma } from "./lib/prisma";
import { AksiAudit } from "@prisma/client";
import { recordAudit } from "./middlewares/auditLogger";

async function main() {
  try {
    console.log("Starting full diagnostic test...");
    const firstBlock = await prisma.blokWilayah.findFirst({
      include: { wilayah_rw: true }
    });
    if (!firstBlock) {
      console.log("No blocks found in DB!");
      return;
    }
    console.log("Found block:", firstBlock.nama_blok, firstBlock.id);

    const firstRwUser = await prisma.user.findFirst({
      where: { role: "RW" }
    });
    if (!firstRwUser) {
      console.log("No RW user found in DB!");
      return;
    }
    console.log("Found RW User:", firstRwUser.nama, firstRwUser.id);

    // Mock Express Request
    const mockReq: any = {
      user: {
        id: firstRwUser.id,
        role: "RW"
      },
      ip: "127.0.0.1"
    };

    console.log("1. Performing Prisma update...");
    const updated = await prisma.blokWilayah.update({
      where: { id: firstBlock.id },
      data: {
        tegur_ronda: true,
        tegur_ronda_pesan: "Test Warning Message"
      }
    });
    console.log("Prisma update successful!");

    console.log("2. Performing recordAudit...");
    await recordAudit(mockReq, {
      aksi: AksiAudit.UPDATE,
      entitas: "BlokWilayah",
      entitas_id: firstBlock.id,
      data_baru: { tegur_ronda: true, tegur_ronda_pesan: "Test Warning Message" },
      keterangan: `RW memberikan teguran ronda elektronik kepada RT ${firstBlock.no_rt || ""} Blok ${firstBlock.nama_blok}`,
    });
    console.log("recordAudit successful! Full diagnostic completed successfully.");
  } catch (err: any) {
    console.error("CRITICAL DIAGNOSTIC ERROR CAUGHT:");
    console.error(err);
    if (err.stack) console.error(err.stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
