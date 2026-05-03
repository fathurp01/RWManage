const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'controllers', 'rtController.ts');
let content = fs.readFileSync(filePath, 'utf8');

const newFunc = `
export const bayarIuranForRt = async (req: Request, res: Response): Promise<void> => {
  try {
    const { iuran_id } = req.body as { iuran_id?: string };

    if (!req.user?.id || req.user.role !== "RT") {
      res.status(401).json({ success: false, message: "Akses ditolak. Hanya RT." });
      return;
    }

    if (!iuran_id) {
      res.status(400).json({ success: false, message: "iuran_id wajib diisi." });
      return;
    }

    const blok = await getRtBlockContext(req);
    if (!blok) {
      res.status(403).json({ success: false, message: "Data blok wilayah RT tidak ditemukan." });
      return;
    }

    const existingIuran = await prisma.iuranWarga.findUnique({
      where: { id: iuran_id },
      include: { warga: true }
    });

    if (!existingIuran || existingIuran.warga.blok_wilayah_id !== blok.id) {
      res.status(404).json({ success: false, message: "Data iuran tidak ditemukan atau bukan milik RT ini." });
      return;
    }

    if (existingIuran.status === StatusIuran.LUNAS) {
      res.status(400).json({ success: false, message: "Iuran sudah berstatus LUNAS." });
      return;
    }

    const pengaturan = await prisma.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: blok.wilayah_rw_id }
    });

    if (!pengaturan) {
      res.status(400).json({ success: false, message: "Master Data Pengaturan Iuran belum diatur oleh RW." });
      return;
    }

    const nominalBayar = Number(pengaturan.nominal_iuran);
    const pRt = Number(pengaturan.persen_rt);
    const pRw = Number(pengaturan.persen_rw);

    const nominal_kas_rt = (nominalBayar * pRt) / 100;
    const nominal_kas_rw = (nominalBayar * pRw) / 100;

    const paymentDate = new Date();
    
    // Generate kode unik helpers directly via crypto
    const { randomBytes } = require("crypto");
    const year2 = String(paymentDate.getFullYear()).slice(-2);
    const month2 = String(paymentDate.getMonth() + 1).padStart(2, "0");
    const suffixIur = randomBytes(3).toString("hex").toUpperCase();
    const kodeIuran = \`IUR-\${year2}\${month2}-\${suffixIur}\`;
    
    const suffixKas = randomBytes(3).toString("hex").toUpperCase();
    const kodeKas = \`KRT-\${year2}\${month2}-\${suffixKas}\`;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.iuranWarga.update({
        where: { id: iuran_id },
        data: {
          status: StatusIuran.LUNAS,
          tanggal_bayar: paymentDate,
          kode_unik: kodeIuran,
          nominal_kas_rt,
          nominal_kas_rw,
          nominal: nominalBayar, // update the actual nominal based on latest setting
        }
      });

      // Tambahkan ke Kas RT (70% misalnya)
      await tx.kasRT.create({
        data: {
          blok_wilayah_id: blok.id,
          jenis_transaksi: "MASUK",
          tanggal: paymentDate,
          keterangan: \`Iuran warga \${existingIuran.warga.nama_kk} bln \${updated.bulan}/\${updated.tahun}\`,
          nominal: nominal_kas_rt,
          kode_unik: kodeKas,
        }
      });

      return updated;
    });

    await recordAudit(req, {
      aksi: AksiAudit.UPDATE,
      entitas: "IuranWarga",
      entitas_id: result.id,
      data_baru: result,
    });

    res.status(200).json({
      success: true,
      message: "Pembayaran iuran berhasil. Saldo otomatis dibagi.",
      data: result,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Terjadi kesalahan saat memproses pembayaran iuran." });
  }
};
`;

content += newFunc;
fs.writeFileSync(filePath, content);
