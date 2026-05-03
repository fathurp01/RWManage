const fs = require('fs');
const path = require('path');

let rwPath = path.join(__dirname, 'src', 'controllers', 'rwController.ts');
let rw = fs.readFileSync(rwPath, 'utf8');

// Inside createWargaWithClient in rwController.ts, we need to fetch pengaturan
const rwSearch = `    const currentYear = new Date().getFullYear();

    const result = await client.$transaction(async (tx) => {`;
const rwReplace = `    const pengaturan = await client.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id }
    });
    if (!pengaturan) {
      res.status(400).json({ success: false, message: "Pengaturan Iuran RW belum dikonfigurasi." });
      return;
    }
    const currentYear = new Date().getFullYear();

    const result = await client.$transaction(async (tx) => {`;

rw = rw.replace(rwSearch, rwReplace);
rw = rw.replace(/nominal: new Prisma\.Decimal\(nominalIuran\),/g, 'nominal: pengaturan.nominal_iuran,');
fs.writeFileSync(rwPath, rw);

let rtPath = path.join(__dirname, 'src', 'controllers', 'rtController.ts');
let rt = fs.readFileSync(rtPath, 'utf8');
rt = rt.replace(/nominal: new Prisma\.Decimal\(nominal\),/g, 'nominal: pengaturan.nominal_iuran,');
fs.writeFileSync(rtPath, rt);
