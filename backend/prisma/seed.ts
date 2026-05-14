import 'dotenv/config';
import * as bcrypt from 'bcrypt';
import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';

async function main() {
  console.log('Seeding data...');

  await prisma.presensiRonda.deleteMany();
  await prisma.rondaPetugas.deleteMany();
  await prisma.jadwalRonda.deleteMany();
  await prisma.kasRT.deleteMany();
  await prisma.setoranIuranRT.deleteMany();
  await prisma.pengaturanIuranRW.deleteMany();
  await prisma.userPreference.deleteMany();

  await prisma.shareLink.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.laporanInsiden.deleteMany();
  await prisma.performaRonda.deleteMany();
  await prisma.cicilanIuran.deleteMany();
  await prisma.identitasWarga.deleteMany();
  await prisma.anggotaKeluarga.deleteMany();
  await prisma.kasMasjid.deleteMany();
  await prisma.pengaturanZis.deleteMany();
  await prisma.transaksiZis.deleteMany();
  await prisma.pengurusMasjid.deleteMany();
  await prisma.masjid.deleteMany();
  await prisma.iuranWarga.deleteMany();
  await prisma.warga.deleteMany();
  await prisma.kasRW.deleteMany();
  await prisma.blokWilayah.deleteMany();
  await prisma.wilayahRW.deleteMany();
  await prisma.user.deleteMany();

  const currentYear = new Date().getFullYear();
  const saltRounds = 10;

  const passwordHashRW = await bcrypt.hash('rw123', saltRounds);
  const passwordHashRT = await bcrypt.hash('rt123', saltRounds);
  const passwordHashSuperadmin = await bcrypt.hash('superadmin123', saltRounds);
  const passwordHashMasjid = await bcrypt.hash('masjid123', saltRounds);
  const passwordHashPending = await bcrypt.hash('pending123', saltRounds);
  const passwordHashRejected = await bcrypt.hash('rejected123', saltRounds);

  const rwUser = await prisma.user.create({
    data: {
      nama: 'Ketua RW 01',
      email: 'rw@rwmanage.com',
      password: passwordHashRW,
      no_hp: '081234567890',
      role: 'RW',
      status_akun: 'APPROVED',
      wilayah_rw: {
        create: {
          nama_kompleks: 'Kompleks Sukamaju',
          no_rw: '01',
        },
      },
    },
    include: {
      wilayah_rw: true,
    },
  });

  const wilayahRwId = rwUser.wilayah_rw!.id;

  const [blokA, blokB, blokC] = await Promise.all([
    prisma.blokWilayah.create({
      data: {
        wilayah_rw_id: wilayahRwId,
        nama_blok: 'Blok A',
        no_rt: '001',
      },
    }),
    prisma.blokWilayah.create({
      data: {
        wilayah_rw_id: wilayahRwId,
        nama_blok: 'Blok B',
        no_rt: '002',
      },
    }),
    prisma.blokWilayah.create({
      data: {
        wilayah_rw_id: wilayahRwId,
        nama_blok: 'Blok C',
        no_rt: '003',
      },
    }),
  ]);

  await prisma.user.update({
    where: { id: rwUser.id },
    data: { blok_wilayah_id: blokA.id },
  });

  const [masjidAlIkhlas, masjidNurHidayah] = await Promise.all([
    prisma.masjid.create({
      data: {
        blok_wilayah_id: blokA.id,
        nama_masjid: 'Masjid Jami Al-Ikhlas',
        alamat: 'Jl. Pemuda No. 1 Kompleks Sukamaju, Blok A',
      },
    }),
    prisma.masjid.create({
      data: {
        blok_wilayah_id: blokB.id,
        nama_masjid: 'Masjid Nur Hidayah',
        alamat: 'Jl. Melati No. 8 Kompleks Sukamaju, Blok B',
      },
    }),
  ]);

  const [pengurusApproved, pengurusPending, pengurusRejected] = await Promise.all([
    prisma.user.create({
      data: {
        nama: 'Ustadz Ahmad',
        email: 'masjid@rwmanage.com',
        password: passwordHashMasjid,
        no_hp: '081234567891',
        role: 'PENGURUS_MASJID',
        status_akun: 'APPROVED',
        blok_wilayah_id: blokA.id,
      },
    }),
    prisma.user.create({
      data: {
        nama: 'Bapak Taufik',
        email: 'pending@rwmanage.com',
        password: passwordHashPending,
        no_hp: '081234567892',
        role: 'PENGURUS_MASJID',
        status_akun: 'PENDING',
        blok_wilayah_id: blokB.id,
      },
    }),
    prisma.user.create({
      data: {
        nama: 'Ibu Rina',
        email: 'rejected@rwmanage.com',
        password: passwordHashRejected,
        no_hp: '081234567893',
        role: 'PENGURUS_MASJID',
        status_akun: 'REJECTED',
        alasan_penolakan: 'Dokumen pengajuan belum lengkap.',
        blok_wilayah_id: blokC.id,
      },
    }),
  ]);

  await prisma.pengurusMasjid.createMany({
    data: [
      {
        user_id: pengurusApproved.id,
        masjid_id: masjidAlIkhlas.id,
      },
      {
        user_id: pengurusPending.id,
        masjid_id: masjidNurHidayah.id,
      },
      {
        user_id: pengurusRejected.id,
        masjid_id: masjidNurHidayah.id,
      },
    ],
  });

  // RT Users for each blok
  const [rtUserA, rtUserB, rtUserC] = await Promise.all([
    prisma.user.create({
      data: {
        nama: 'Ketua RT 001 (Blok A)',
        email: 'rt001@rwmanage.com',
        password: passwordHashRT,
        no_hp: '081234567894',
        role: 'RT',
        status_akun: 'APPROVED',
        blok_wilayah_id: blokA.id,
      },
    }),
    prisma.user.create({
      data: {
        nama: 'Ketua RT 002 (Blok B)',
        email: 'rt002@rwmanage.com',
        password: passwordHashRT,
        no_hp: '081234567895',
        role: 'RT',
        status_akun: 'APPROVED',
        blok_wilayah_id: blokB.id,
      },
    }),
    prisma.user.create({
      data: {
        nama: 'Ketua RT 003 (Blok C)',
        email: 'rt003@rwmanage.com',
        password: passwordHashRT,
        no_hp: '081234567896',
        role: 'RT',
        status_akun: 'APPROVED',
        blok_wilayah_id: blokC.id,
      },
    }),
  ]);

  // SUPERADMIN User
  const superadmin = await prisma.user.create({
    data: {
      nama: 'Superadmin System',
      email: 'superadmin@rwmanage.com',
      password: passwordHashSuperadmin,
      no_hp: '081234567897',
      role: 'SUPERADMIN',
      status_akun: 'APPROVED',
      blok_wilayah_id: blokA.id,
    },
  });

  // 1. User preferences (default UI settings)
  await prisma.userPreference.createMany({
    data: [
      { user_id: rwUser.id, dark_mode: false, tema_warna: 'indigo', bahasa: 'id' },
      { user_id: rtUserA.id, dark_mode: false, tema_warna: 'indigo', bahasa: 'id' },
      { user_id: rtUserB.id, dark_mode: false, tema_warna: 'indigo', bahasa: 'id' },
      { user_id: rtUserC.id, dark_mode: false, tema_warna: 'indigo', bahasa: 'id' },
      { user_id: superadmin.id, dark_mode: false, tema_warna: 'indigo', bahasa: 'id' },
    ],
  });

  // 2. Pengaturan Iuran RW (default configuration)
  await prisma.pengaturanIuranRW.create({
    data: {
      wilayah_rw_id: wilayahRwId,
      nominal_iuran: new Prisma.Decimal(50000),
      persen_rt: 70.0,
      persen_rw: 30.0,
    },
  });

  const [jadwalA, jadwalB, jadwalC] = await Promise.all([
    prisma.jadwalRonda.create({
      data: {
        blok_wilayah_id: blokA.id,
        nama_jadwal: 'Patrol Malam A',
        hari_minggu: 0, // Minggu
        jam_mulai: '21:00',
        jam_selesai: '23:00',
        minggu_mulai: new Date(),
      },
    }),
    prisma.jadwalRonda.create({
      data: {
        blok_wilayah_id: blokB.id,
        nama_jadwal: 'Patrol Malam B',
        hari_minggu: 2, // Selasa
        jam_mulai: '22:00',
        jam_selesai: '23:30',
        minggu_mulai: new Date(),
      },
    }),
    prisma.jadwalRonda.create({
      data: {
        blok_wilayah_id: blokC.id,
        nama_jadwal: 'Patrol Pagi C',
        hari_minggu: 5, // Jumat
        jam_mulai: '05:00',
        jam_selesai: '06:00',
        minggu_mulai: new Date(),
      },
    }),
  ]);

  // 4. Assign petugas ke masing‑masing jadwal
  await prisma.rondaPetugas.createMany({
    data: [
      { jadwal_ronda_id: jadwalA.id, nama_petugas: 'Joko', no_hp: '081111111111' },
      { jadwal_ronda_id: jadwalA.id, nama_petugas: 'Budi', no_hp: '081222222222' },
      { jadwal_ronda_id: jadwalB.id, nama_petugas: 'Rudi', no_hp: '081333333333' },
      { jadwal_ronda_id: jadwalC.id, nama_petugas: 'Siti', no_hp: '081444444444' },
    ],
  });

  // 5. Simulasi presensi ronda (Hadir / Izin / Tidak Hadir)
  await prisma.presensiRonda.createMany({
    data: [
      {
        jadwal_ronda_id: jadwalA.id,
        tanggal: new Date(),
        nama_petugas: 'Joko',
        status_hadir: 'HADIR',
      },
      {
        jadwal_ronda_id: jadwalA.id,
        tanggal: new Date(),
        nama_petugas: 'Budi',
        status_hadir: 'IZIN',
      },
      {
        jadwal_ronda_id: jadwalB.id,
        tanggal: new Date(),
        nama_petugas: 'Rudi',
        status_hadir: 'ALFA',
      },
    ],
  });

  await prisma.kasRT.createMany({
    data: [
      {
        blok_wilayah_id: blokA.id,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(currentYear, 0, 5, 10, 30, 0),
        keterangan: 'Pembayaran iuran awal tahun warga Blok A',
        nominal: 150000,
        kode_unik: `KASRT-${currentYear}-A-01`,
      },
      {
        blok_wilayah_id: blokB.id,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(currentYear, 1, 7, 11, 0, 0),
        keterangan: 'Pembayaran iuran warga Blok B',
        nominal: 100000,
        kode_unik: `KASRT-${currentYear}-B-01`,
      },
    ],
  });

  await prisma.pengaturanZis.createMany({
    data: [
      {
        masjid_id: masjidAlIkhlas.id,
        harga_beras_per_kg: 15000,
        persen_fakir: 62.5,
        persen_amil: 8,
        persen_fisabilillah: 11,
        persen_lainnya: 18.5,
      },
      {
        masjid_id: masjidNurHidayah.id,
        harga_beras_per_kg: 15500,
        persen_fakir: 62.5,
        persen_amil: 8,
        persen_fisabilillah: 11,
        persen_lainnya: 18.5,
      },
    ],
  });

  const [wargaBudi, wargaSiti, wargaDeni] = await Promise.all([
    prisma.warga.create({
      data: {
        blok_wilayah_id: blokA.id,
        nama_kk: 'Budi Santoso',
      },
    }),
    prisma.warga.create({
      data: {
        blok_wilayah_id: blokB.id,
        nama_kk: 'Siti Aminah',
      },
    }),
    prisma.warga.create({
      data: {
        blok_wilayah_id: blokC.id,
        nama_kk: 'Deni Kurniawan',
      },
    }),
  ]);

  const wargaSeeds = [
    { warga: wargaBudi, nominal: 50000, prefix: 'BS', paidMonths: [1, 2, 3] },
    { warga: wargaSiti, nominal: 50000, prefix: 'SA', paidMonths: [1, 2] },
    { warga: wargaDeni, nominal: 60000, prefix: 'DK', paidMonths: [1] },
  ] as const;

  await prisma.iuranWarga.createMany({
    data: wargaSeeds.flatMap(({ warga, nominal, prefix, paidMonths }) => {
      return Array.from({ length: 12 }, (_, index) => {
        const month = index + 1;
        const isPaid = paidMonths.includes(month as any);
        const paidDate = new Date(currentYear, month - 1, 5, 9, 0, 0);

        return {
          warga_id: warga.id,
          bulan: month,
          tahun: currentYear,
          nominal,
          status: isPaid ? 'LUNAS' : 'BELUM',
          kode_unik: isPaid
            ? `IUR-${currentYear}-${String(month).padStart(2, '0')}-${prefix}`
            : null,
          tanggal_bayar: isPaid ? paidDate : null,
        };
      });
    }),
  });

  await prisma.kasRW.createMany({
    data: [
      {
        wilayah_rw_id: wilayahRwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(currentYear, 0, 5, 10, 30, 0),
        keterangan: 'Pembayaran iuran awal tahun warga Blok A',
        nominal: 150000,
        kode_unik: `KAS-${currentYear}-M-01`,
      },
      {
        wilayah_rw_id: wilayahRwId,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(currentYear, 1, 7, 11, 0, 0),
        keterangan: 'Pembayaran iuran warga Blok B',
        nominal: 100000,
        kode_unik: `KAS-${currentYear}-M-02`,
      },
      {
        wilayah_rw_id: wilayahRwId,
        jenis_transaksi: 'KELUAR',
        tanggal: new Date(currentYear, 0, 15, 8, 0, 0),
        keterangan: 'Biaya kebersihan dan pengangkutan sampah',
        nominal: 90000,
        kode_unik: `KAS-${currentYear}-K-01`,
      },
    ],
  });

  await prisma.transaksiZis.createMany({
    data: [
      {
        masjid_id: masjidAlIkhlas.id,
        kode_unik: `ZIS-${currentYear}-AI-01`,
        nama_kk: 'Andi Setiawan',
        alamat_muzaqi: 'Blok A3 No. 4',
        jumlah_jiwa: 4,
        jenis_bayar: 'UANG',
        nominal_zakat: 150000,
        nominal_infaq: 50000,
        waktu_transaksi: new Date(currentYear, 2, 10, 14, 0, 0),
      },
      {
        masjid_id: masjidAlIkhlas.id,
        kode_unik: `ZIS-${currentYear}-AI-02`,
        nama_kk: 'Ridwan Kamil',
        alamat_muzaqi: 'Blok B1 No. 2',
        jumlah_jiwa: 3,
        jenis_bayar: 'BERAS',
        total_beras_kg: 7.5,
        nominal_infaq: 20000,
        waktu_transaksi: new Date(currentYear, 2, 12, 16, 30, 0),
      },
      {
        masjid_id: masjidNurHidayah.id,
        kode_unik: `ZIS-${currentYear}-NH-01`,
        nama_kk: 'Rahmawati',
        alamat_muzaqi: 'Blok C2 No. 6',
        jumlah_jiwa: 5,
        jenis_bayar: 'UANG',
        nominal_zakat: 180000,
        nominal_infaq: 30000,
        waktu_transaksi: new Date(currentYear, 2, 14, 13, 15, 0),
      },
    ],
  });

  await prisma.kasMasjid.createMany({
    data: [
      {
        masjid_id: masjidAlIkhlas.id,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(currentYear, 2, 10, 17, 0, 0),
        keterangan: 'Setoran infaq harian',
        nominal: 750000,
        kode_unik: `KM-${currentYear}-AI-M-01`,
      },
      {
        masjid_id: masjidAlIkhlas.id,
        jenis_transaksi: 'KELUAR',
        tanggal: new Date(currentYear, 2, 20, 10, 0, 0),
        keterangan: 'Pembelian perlengkapan kebersihan',
        nominal: 210000,
        kode_unik: `KM-${currentYear}-AI-K-01`,
      },
      {
        masjid_id: masjidNurHidayah.id,
        jenis_transaksi: 'MASUK',
        tanggal: new Date(currentYear, 2, 18, 18, 0, 0),
        keterangan: 'Donasi pembangunan teras',
        nominal: 1200000,
        kode_unik: `KM-${currentYear}-NH-M-01`,
      },
    ],
  });

  await prisma.shareLink.createMany({
    data: [
      {
        token: `rw-public-${currentYear}`,
        scope: 'RW',
        scope_id: wilayahRwId,
        expires_at: new Date(currentYear, 11, 31, 23, 59, 59),
      },
      {
        token: `masjid-ai-public-${currentYear}`,
        scope: 'MASJID',
        scope_id: masjidAlIkhlas.id,
        expires_at: new Date(currentYear, 11, 31, 23, 59, 59),
      },
      {
        token: `masjid-nh-revoked-${currentYear}`,
        scope: 'MASJID',
        scope_id: masjidNurHidayah.id,
        expires_at: new Date(currentYear, 6, 1, 0, 0, 0),
        revoked_at: new Date(currentYear, 3, 1, 0, 0, 0),
      },
    ],
  });

  const iuranBudiJanuari = await prisma.iuranWarga.findFirst({
    where: {
      warga_id: wargaBudi.id,
      tahun: currentYear,
      bulan: 1,
    },
  });

  if (iuranBudiJanuari) {
    await prisma.cicilanIuran.create({
      data: {
        warga_id: wargaBudi.id,
        iuran_id: iuranBudiJanuari.id,
        total_cicilan: 50000,
        nominal_per_bulan: 25000,
        jumlah_bulan: 2,
        bulan_mulai: 1,
        tahun_mulai: currentYear,
        sudah_lunas: false,
      },
    });
  }

  await prisma.anggotaKeluarga.createMany({
    data: [
      {
        warga_id: wargaBudi.id,
        nama: 'Sari Santoso',
        hubungan: 'ISTRI',
        nik: '3210000000000001',
        tanggal_lahir: new Date('1990-05-15T00:00:00.000Z'),
        pendidikan: 'SARJANA',
        pekerjaan: 'Ibu Rumah Tangga',
      },
      {
        warga_id: wargaSiti.id,
        nama: 'Bima Amin',
        hubungan: 'ANAK',
        nik: '3210000000000002',
        tanggal_lahir: new Date('2012-08-20T00:00:00.000Z'),
        pendidikan: 'SMP',
        pekerjaan: 'Pelajar',
      },
    ],
  });

  await prisma.identitasWarga.createMany({
    data: [
      {
        warga_id: wargaBudi.id,
        tipe_dokumen: 'KTP',
        nomor_dokumen: '3171000000000001',
        tanggal_terbit: new Date('2018-01-01T00:00:00.000Z'),
        tanggal_berlaku: new Date('2033-01-01T00:00:00.000Z'),
        dokumen_url: '/uploads/sample-ktp-budi.pdf',
      },
      {
        warga_id: wargaSiti.id,
        tipe_dokumen: 'SIM',
        nomor_dokumen: 'SIM-001-2026',
        tanggal_terbit: new Date('2020-02-01T00:00:00.000Z'),
        tanggal_berlaku: new Date('2030-02-01T00:00:00.000Z'),
        dokumen_url: '/uploads/sample-sim-siti.pdf',
      },
    ],
  });

  await prisma.performaRonda.createMany({
    data: [
      {
        blok_wilayah_id: blokA.id,
        tanggal: new Date(currentYear, 0, 3, 21, 0, 0),
        nama_petugas: 'Joko',
        status_kehadiran: 'HADIR',
        catatan: 'Ronda malam berjalan lancar.',
      },
      {
        blok_wilayah_id: blokB.id,
        tanggal: new Date(currentYear, 0, 4, 21, 0, 0),
        nama_petugas: 'Rudi',
        status_kehadiran: 'IZIN',
        catatan: 'Sedang sakit.',
      },
    ],
  });

  await prisma.laporanInsiden.createMany({
    data: [
      {
        wilayah_rw_id: wilayahRwId,
        tipe_insiden: 'Penerangan jalan mati',
        tanggal_insiden: new Date(currentYear, 1, 10, 19, 30, 0),
        lokasi: 'Gang Melati Blok A',
        deskripsi: 'Lampu jalan mati sejak tiga hari lalu.',
        status: 'PROSES',
        pelapor_nama: 'Ketua RT 001',
        pelapor_no_hp: '081234567894',
        foto_bukti_url: '/uploads/sample-insiden-1.jpg',
      },
      {
        wilayah_rw_id: wilayahRwId,
        tipe_insiden: 'Genangan air',
        tanggal_insiden: new Date(currentYear, 1, 12, 7, 45, 0),
        lokasi: 'Depan Pos RW',
        deskripsi: 'Air tergenang setelah hujan deras.',
        status: 'LAPORAN',
        pelapor_nama: 'Warga Blok B',
        pelapor_no_hp: '081234567895',
        foto_bukti_url: null,
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        user_id: rwUser.id,
        aksi: 'CREATE',
        entitas: 'Seed',
        entitas_id: rwUser.id,
        data_baru: JSON.stringify({ message: 'Initial seed created' }),
        keterangan: 'Seed awal untuk pengujian',
        ip_address: '127.0.0.1',
      },
      {
        user_id: rtUserA.id,
        aksi: 'CREATE',
        entitas: 'PerformaRonda',
        entitas_id: blokA.id,
        data_baru: JSON.stringify({ blok_wilayah_id: blokA.id, nama_petugas: 'Joko' }),
        keterangan: 'Contoh audit log',
        ip_address: '127.0.0.1',
      },
    ],
  });

  console.log('Seeding selesai!');
  console.log('Akun demo:');
  console.log('- RW: rw@rwmanage.com / rw123');
  console.log('- RT Blok A: rt001@rwmanage.com / rt123');
  console.log('- RT Blok B: rt002@rwmanage.com / rt123');
  console.log('- RT Blok C: rt003@rwmanage.com / rt123');
  console.log('- Superadmin: superadmin@rwmanage.com / superadmin123');
  console.log('- Pengurus APPROVED: masjid@rwmanage.com / masjid123');
  console.log('- Pengurus PENDING: pending@rwmanage.com / pending123');
  console.log('- Pengurus REJECTED: rejected@rwmanage.com / rejected123');
  console.log('- Seed RT/RW feature data: warga, ronda, insiden, anggota keluarga, identitas, cicilan, audit');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
