const fs = require('fs');
const path = require('path');

const rwControllerPath = path.join(__dirname, 'src', 'controllers', 'rwController.ts');
const rtControllerPath = path.join(__dirname, 'src', 'controllers', 'rtController.ts');

let rwContent = fs.readFileSync(rwControllerPath, 'utf8');

// 1. Remove from interfaces
rwContent = rwContent.replace(/tarif_iuran_bulanan\?: number \| string;/g, '');

// 2. Fix createWargaWithClient
rwContent = rwContent.replace(
  /const { blok_wilayah_id, nama_kk, tarif_iuran_bulanan } =[\s\S]*?req\.body as CreateWargaBody;[\s\S]*?const nominalIuran = parsePositiveNumber\(tarif_iuran_bulanan\);[\s\S]*?if \(!blok_wilayah_id \|\| !nama_kk \|\| nominalIuran === null\) \{[\s\S]*?res\.status\(400\)\.json\(\{[\s\S]*?success: false,[\s\S]*?message:[\s\S]*?"blok_wilayah_id, nama_kk, dan tarif_iuran_bulanan \(angka > 0\) wajib diisi.",[\s\S]*?\}\);[\s\S]*?return;[\s\S]*?\}/,
  `const { blok_wilayah_id, nama_kk } = req.body as CreateWargaBody;
    if (!blok_wilayah_id || !nama_kk) {
      res.status(400).json({
        success: false,
        message: "blok_wilayah_id dan nama_kk wajib diisi.",
      });
      return;
    }`
);

// 3. Fix createWargaWithClient transaction
rwContent = rwContent.replace(
  /const currentYear = new Date\(\)\.getFullYear\(\);[\s\S]*?const result = await client\.\$transaction\(async \(tx\) => \{[\s\S]*?const warga = await tx\.warga\.create\(\{[\s\S]*?data: \{[\s\S]*?blok_wilayah_id,[\s\S]*?nama_kk,[\s\S]*?tarif_iuran_bulanan: new Prisma\.Decimal\(nominalIuran\),[\s\S]*?\},[\s\S]*?\}\);/,
  `const pengaturanIuran = await client.pengaturanIuranRW.findUnique({
      where: { wilayah_rw_id: rwWilayah.id }
    });

    if (!pengaturanIuran) {
      res.status(400).json({
        success: false,
        message: "Pengaturan Iuran RW belum dikonfigurasi. Harap atur Master Data Iuran terlebih dahulu.",
      });
      return;
    }

    const nominalIuran = pengaturanIuran.nominal_iuran;
    const currentYear = new Date().getFullYear();

    const result = await client.$transaction(async (tx) => {
      const warga = await tx.warga.create({
        data: {
          blok_wilayah_id,
          nama_kk,
        },
      });`
);

rwContent = rwContent.replace(
  /tarif_iuran_bulanan: result\.tarif_iuran_bulanan,/g,
  ''
);

// Remove select tarif_iuran_bulanan
rwContent = rwContent.replace(/tarif_iuran_bulanan:\s*(true|warga\.tarif_iuran_bulanan),/g, '');

// updateWarga
rwContent = rwContent.replace(
  /const { nama_kk, tarif_iuran_bulanan } = req\.body as UpdateWargaBody;/,
  `const { nama_kk } = req.body as UpdateWargaBody;`
);

rwContent = rwContent.replace(
  /if \(nama_kk === undefined && tarif_iuran_bulanan === undefined\) \{[\s\S]*?res\.status\(400\)\.json\(\{[\s\S]*?success: false,[\s\S]*?message: "Minimal satu field harus dikirim untuk update warga\.",[\s\S]*?\}\);[\s\S]*?return;[\s\S]*?\}/,
  `if (nama_kk === undefined) {
      res.status(400).json({
        success: false,
        message: "nama_kk wajib dikirim untuk update warga.",
      });
      return;
    }`
);

rwContent = rwContent.replace(
  /tarif_iuran_bulanan\?: Prisma\.Decimal;[\s\S]*?iuran_warga\?: \{[\s\S]*?updateMany: \{[\s\S]*?where: \{[\s\S]*?status: StatusIuran;[\s\S]*?\};[\s\S]*?data: \{[\s\S]*?nominal: Prisma\.Decimal;[\s\S]*?\};[\s\S]*?\};[\s\S]*?\};/g,
  ''
);

rwContent = rwContent.replace(
  /if \(tarif_iuran_bulanan !== undefined\) \{[\s\S]*?const parsedTarif = parsePositiveNumber\(tarif_iuran_bulanan\);[\s\S]*?if \(parsedTarif === null\) \{[\s\S]*?res\.status\(400\)\.json\(\{[\s\S]*?success: false,[\s\S]*?message: "tarif_iuran_bulanan harus berupa angka lebih dari 0\.",[\s\S]*?\}\);[\s\S]*?return;[\s\S]*?\}[\s\S]*?const decimalTarif = new Prisma\.Decimal\(parsedTarif\);[\s\S]*?dataToUpdate\.tarif_iuran_bulanan = decimalTarif;[\s\S]*?dataToUpdate\.iuran_warga = \{[\s\S]*?updateMany: \{[\s\S]*?where: \{[\s\S]*?status: StatusIuran\.BELUM,[\s\S]*?\},[\s\S]*?data: \{[\s\S]*?nominal: decimalTarif,[\s\S]*?\},[\s\S]*?\},[\s\S]*?\};[\s\S]*?\}/,
  ''
);

// Fix GetIuranWarga
rwContent = rwContent.replace(
  /nominal: warga\.tarif_iuran_bulanan,/g,
  'nominal: new Prisma.Decimal(0), // Will be fetched properly or can be ignored since it defaults'
);


fs.writeFileSync(rwControllerPath, rwContent);
console.log('Fixed rwController.ts');

let rtContent = fs.readFileSync(rtControllerPath, 'utf8');
rtContent = rtContent.replace(/tarif_iuran_bulanan:\s*(true|warga\.tarif_iuran_bulanan),/g, '');
rtContent = rtContent.replace(/tarif_iuran_bulanan:\s*warga\.tarif_iuran_bulanan\.toString\(\),/g, '');
rtContent = rtContent.replace(/tarif_iuran_bulanan\?: number \| string;/g, '');

rtContent = rtContent.replace(
  /const { nama_kk, tarif_iuran_bulanan } = req\.body as \{ nama_kk\?: string; \};/,
  'const { nama_kk } = req.body as { nama_kk?: string };'
);

rtContent = rtContent.replace(
  /const { nama_kk, tarif_iuran_bulanan } = req\.body as \{ nama_kk\?: string; tarif_iuran_bulanan\?: number \| string \};/,
  'const { nama_kk } = req.body as { nama_kk?: string };'
);

rtContent = rtContent.replace(
  /if \(!nama_kk \|\| tarif_iuran_bulanan === undefined\) \{[\s\S]*?res\.status\(400\)\.json\(\{ success: false, message: "nama_kk dan tarif_iuran_bulanan wajib diisi\." \}\);[\s\S]*?return;[\s\S]*?\}/,
  `if (!nama_kk) {
      res.status(400).json({ success: false, message: "nama_kk wajib diisi." });
      return;
    }`
);

rtContent = rtContent.replace(
  /const nominal = Number\(tarif_iuran_bulanan\);[\s\S]*?if \(!Number\.isFinite\(nominal\) \|\| nominal <= 0\) \{[\s\S]*?res\.status\(400\)\.json\(\{ success: false, message: "tarif_iuran_bulanan harus berupa angka lebih dari 0\." \}\);[\s\S]*?return;[\s\S]*?\}/,
  ``
);

rtContent = rtContent.replace(
  /tarif_iuran_bulanan: new Prisma\.Decimal\(nominal\),/g,
  ''
);

fs.writeFileSync(rtControllerPath, rtContent);
console.log('Fixed rtController.ts');
