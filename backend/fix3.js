const fs = require('fs');
const path = require('path');

let rw = fs.readFileSync(path.join(__dirname, 'src', 'controllers', 'rwController.ts'), 'utf8');
rw = rw.replace(/const \{ blok_wilayah_id, nama_kk, tarif_iuran_bulanan \} =[\s\S]*?req\.body as CreateWargaBody;/, 'const { blok_wilayah_id, nama_kk } = req.body as CreateWargaBody;');
fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'rwController.ts'), rw);

let rt = fs.readFileSync(path.join(__dirname, 'src', 'controllers', 'rtController.ts'), 'utf8');
rt = rt.replace(/const \{ nama_kk, tarif_iuran_bulanan \} = req\.body as \{ nama_kk\?: string; tarif_iuran_bulanan\?: number \| string \};/, 'const { nama_kk } = req.body as { nama_kk?: string };');
fs.writeFileSync(path.join(__dirname, 'src', 'controllers', 'rtController.ts'), rt);
