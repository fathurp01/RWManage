import 'dotenv/config';
import { prisma } from '../src/lib/prisma';

async function main() {
  console.log("Adding more demo data to complete the dashboard widgets...");

  // 1. Get the primary RW Wilayah
  const rw = await prisma.wilayahRW.findFirst();
  if (!rw) {
    console.error("No RW found in database!");
    return;
  }
  const rwId = rw.id;

  // 2. Get/Create blocks so we have at least 10 blocks
  console.log("Ensuring at least 10 blocks (RTs) exist...");
  const bloks = await prisma.blokWilayah.findMany({
    where: { wilayah_rw_id: rwId }
  });

  let currentBloks = [...bloks];
  if (currentBloks.length < 10) {
    const needed = 10 - currentBloks.length;
    const names = ['Blok D', 'Blok E', 'Blok F', 'Blok G', 'Blok H', 'Blok I', 'Blok J', 'Blok K', 'Blok L'];
    for (let i = 0; i < needed; i++) {
      const nextRtNum = currentBloks.length + 1;
      const nextRtStr = `00${nextRtNum}`.slice(-3);
      const newBlok = await prisma.blokWilayah.create({
        data: {
          wilayah_rw_id: rwId,
          nama_blok: names[i] || `Blok ${String.fromCharCode(68 + i)}`,
          no_rt: nextRtStr,
        }
      });
      currentBloks.push(newBlok);
    }
  }

  const blokA = currentBloks[0];
  const blokB = currentBloks[1];
  const blokC = currentBloks[2];

  // 3. Add more Laporan Kejadian (Incidents) - Exactly 10
  console.log("Populating exactly 10 incident reports...");
  await prisma.laporanInsiden.deleteMany({
    where: { wilayah_rw_id: rwId }
  });

  const currentYear = new Date().getFullYear();

  await prisma.laporanInsiden.createMany({
    data: [
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokA.id,
        tipe_insiden: 'Pencurian Helm',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 1)),
        lokasi: 'Parkiran Masjid Al-Ikhlas Blok A',
        deskripsi: 'Helm pengunjung masjid hilang saat sholat Isya.',
        status: 'LAPORAN',
        pelapor_nama: 'Budi Santoso',
        pelapor_no_hp: '081234567890',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 2), // 2 hours ago
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokB.id,
        tipe_insiden: 'Sampah Menumpuk',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 2)),
        lokasi: 'Tempat Pembuangan Blok B',
        deskripsi: 'Sampah belum diangkut selama seminggu menimbulkan bau tak sedap.',
        status: 'PROSES',
        pelapor_nama: 'Ibu Ratna',
        pelapor_no_hp: '08987654321',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 24), // 1 day ago
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokC.id,
        tipe_insiden: 'Pohon Tumbang',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 4)),
        lokasi: 'Jalan Utama Blok C',
        deskripsi: 'Dahan pohon rindang patah menghalangi sebagian jalan.',
        status: 'SELESAI',
        pelapor_nama: 'Bapak Joko',
        pelapor_no_hp: '081122334455',
        tindakan_diambil: 'Dahan pohon telah dipotong dan dibersihkan oleh petugas ronda.',
        ditindaklanjuti_tanggal: new Date(),
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 48), // 2 days ago
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokA.id,
        tipe_insiden: 'Penerangan jalan mati',
        tanggal_insiden: new Date(currentYear, 1, 10, 19, 30, 0),
        lokasi: 'Gang Melati Blok A',
        deskripsi: 'Lampu jalan mati sejak tiga hari lalu.',
        status: 'PROSES',
        pelapor_nama: 'Ketua RT 001',
        pelapor_no_hp: '081234567894',
        foto_bukti_url: '/uploads/sample-insiden-1.jpg',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 72), // 3 days ago
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokB.id,
        tipe_insiden: 'Genangan air',
        tanggal_insiden: new Date(currentYear, 1, 12, 7, 45, 0),
        lokasi: 'Depan Pos RW',
        deskripsi: 'Air tergenang setelah hujan deras.',
        status: 'LAPORAN',
        pelapor_nama: 'Warga Blok B',
        pelapor_no_hp: '081234567895',
        foto_bukti_url: null,
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 96), // 4 days ago
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokA.id,
        tipe_insiden: 'Pencurian Sepeda',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 5)),
        lokasi: 'Teras Rumah No. 12 Blok A',
        deskripsi: 'Sepeda lipat yang di parkir di teras rumah hilang pada malam hari.',
        status: 'LAPORAN',
        pelapor_nama: 'Soni',
        pelapor_no_hp: '081234567896',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 120),
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokB.id,
        tipe_insiden: 'Kerusakan Jalan',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 6)),
        lokasi: 'Jalan Melati Raya Blok B',
        deskripsi: 'Lubang jalan yang cukup dalam membahayakan pengendara motor.',
        status: 'PROSES',
        pelapor_nama: 'Fahri',
        pelapor_no_hp: '081234567897',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 144),
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokC.id,
        tipe_insiden: 'Saluran Air Sumbat',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 7)),
        lokasi: 'Got Blok C Depan Warung',
        deskripsi: 'Got tersumbat tumpukan sampah plastik menyebabkan air meluap.',
        status: 'LAPORAN',
        pelapor_nama: 'Bu Ani',
        pelapor_no_hp: '081234567898',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 168),
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokA.id,
        tipe_insiden: 'Kucing Terjebak',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 8)),
        lokasi: 'Atap Ruko Blok A',
        deskripsi: 'Kucing warga terjebak di atap ruko tinggi selama dua hari.',
        status: 'SELESAI',
        pelapor_nama: 'Doni',
        pelapor_no_hp: '081234567899',
        tindakan_diambil: 'Telah diselamatkan dengan menggunakan tangga darurat pos ronda.',
        ditindaklanjuti_tanggal: new Date(),
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 192),
      },
      {
        wilayah_rw_id: rwId,
        blok_wilayah_id: blokB.id,
        tipe_insiden: 'Pencurian Jemuran',
        tanggal_insiden: new Date(new Date().setDate(new Date().getDate() - 9)),
        lokasi: 'Halaman Depan Blok B',
        deskripsi: 'Beberapa pakaian jemuran hilang dicuri orang tidak dikenal siang hari.',
        status: 'LAPORAN',
        pelapor_nama: 'Ibu Tina',
        pelapor_no_hp: '081234567800',
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * 216),
      }
    ]
  });

  // 4. Add exactly 10 Kas RW transactions
  console.log("Populating exactly 10 Kas RW transactions...");
  await prisma.kasRW.deleteMany({
    where: { wilayah_rw_id: rwId }
  });

  await prisma.kasRW.createMany({
    data: [
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(new Date().getTime() - 1000 * 60 * 30), // 30 mins ago
        keterangan: 'Iuran Khusus - pembangunan gapura utama',
        nominal: 50000,
        kode_unik: `KAS-${currentYear}-M-01`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(new Date().getTime() - 1000 * 60 * 120), // 2 hours ago
        keterangan: 'Pembayaran iuran warga RT 002 / Blok B',
        nominal: 100000,
        kode_unik: `KAS-${currentYear}-M-02`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'KELUAR',
        tanggal: new Date(new Date().getTime() - 1000 * 60 * 360), // 6 hours ago
        keterangan: 'Biaya kebersihan bulanan dan pengangkutan sampah',
        nominal: 90000,
        kode_unik: `KAS-${currentYear}-K-01`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(new Date().getTime() - 1000 * 60 * 720), // 12 hours ago
        keterangan: 'Pembayaran iuran warga RT 001 / Blok A',
        nominal: 150000,
        kode_unik: `KAS-${currentYear}-M-03`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'KELUAR',
        tanggal: new Date(new Date().setDate(new Date().getDate() - 1)),
        keterangan: 'Pembelian Cat & Perlengkapan Pos Ronda Blok B',
        nominal: 75000,
        kode_unik: `KAS-${currentYear}-K-02`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(new Date().setDate(new Date().getDate() - 2)),
        keterangan: 'Sumbangan Donatur Warga Blok A',
        nominal: 500000,
        kode_unik: `KAS-${currentYear}-M-04`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'KELUAR',
        tanggal: new Date(new Date().setDate(new Date().getDate() - 3)),
        keterangan: 'Konsumsi Rapat Koordinasi Bulanan RT/RW',
        nominal: 120000,
        kode_unik: `KAS-${currentYear}-K-03`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(new Date().setDate(new Date().getDate() - 4)),
        keterangan: 'Iuran Warga Periode Mei - Blok C',
        nominal: 200000,
        kode_unik: `KAS-${currentYear}-M-05`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'KELUAR',
        tanggal: new Date(new Date().setDate(new Date().getDate() - 5)),
        keterangan: 'Perbaikan Pagar Pembatas Kompleks Rusak',
        nominal: 350000,
        kode_unik: `KAS-${currentYear}-K-04`,
      },
      {
        wilayah_rw_id: rwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(new Date().setDate(new Date().getDate() - 6)),
        keterangan: 'Bantuan Sosial Operasional dari Kelurahan',
        nominal: 1000000,
        kode_unik: `KAS-${currentYear}-M-06`,
      }
    ]
  });

  // 5. Add Ronda schedules & presensi for all 10 blocks
  console.log("Populating Ronda schedules & presensi for all 10 blocks...");
  for (let i = 0; i < 10; i++) {
    const blok = currentBloks[i];
    const existingJadwals = await prisma.jadwalRonda.findMany({
      where: { blok_wilayah_id: blok.id }
    });

    const jadwal = existingJadwals[0] || await prisma.jadwalRonda.create({
      data: {
        blok_wilayah_id: blok.id,
        nama_jadwal: `Patroli Malam ${blok.nama_blok}`,
        hari_minggu: (i % 7),
        jam_mulai: '22:00',
        jam_selesai: '23:59',
        minggu_mulai: new Date(),
        created_at: new Date(new Date().getTime() - 1000 * 60 * 60 * (i + 1)), // staggered created_at for deterministic sorting
      }
    });

    // Clear existing presensi for this schedule
    await prisma.presensiRonda.deleteMany({
      where: {
        jadwal_ronda_id: jadwal.id
      }
    });

    // Create some presensi for each
    const today = new Date();
    await prisma.presensiRonda.createMany({
      data: [
        { jadwal_ronda_id: jadwal.id, tanggal: new Date(new Date().setDate(today.getDate() - 7)), nama_petugas: 'Slamet', status_hadir: 'HADIR' },
        { jadwal_ronda_id: jadwal.id, tanggal: new Date(new Date().setDate(today.getDate() - 7)), nama_petugas: 'Supri', status_hadir: 'HADIR' },
        { jadwal_ronda_id: jadwal.id, tanggal: new Date(new Date().setDate(today.getDate() - 14)), nama_petugas: 'Slamet', status_hadir: 'HADIR' },
        { jadwal_ronda_id: jadwal.id, tanggal: new Date(new Date().setDate(today.getDate() - 14)), nama_petugas: 'Supri', status_hadir: (i % 3 === 0 ? 'IZIN' : i % 3 === 1 ? 'ALFA' : 'HADIR') },
      ]
    });
  }

  console.log("Seeding of rich demo data finished successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
