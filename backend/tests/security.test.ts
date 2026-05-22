import jwt from "jsonwebtoken";
import request from "supertest";
import { createWargaWithClient } from "../src/controllers/rwController";

jest.mock("../src/lib/prisma", () => {
  type PrismaMock = {
    user: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    wilayahRW: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    blokWilayah: {
      findUnique: jest.Mock;
    };
    masjid: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
    };
    pengurusMasjid: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
    };
    warga: {
      create: jest.Mock;
      findMany: jest.Mock;
    };
    iuranWarga: {
      createMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    kasRW: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    kasRT: {
      create: jest.Mock;
      findUnique: jest.Mock;
    };
    transaksiZis: {
      create: jest.Mock;
      findUnique: jest.Mock;
      aggregate: jest.Mock;
    };
    pengaturanZis: {
      findUnique: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockPrisma: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    wilayahRW: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    blokWilayah: {
      findUnique: jest.fn(),
    },
    masjid: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
    },
    pengurusMasjid: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    warga: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    iuranWarga: {
      createMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    kasRW: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    kasRT: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    transaksiZis: {
      create: jest.fn(),
      findUnique: jest.fn(),
      aggregate: jest.fn(),
    },
    pengaturanZis: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(async (callback: (tx: PrismaMock) => Promise<unknown>) => {
      return callback(mockPrisma);
    }),
  };

  return {
    prisma: mockPrisma,
  };
});

import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";

type MockedPrisma = {
  user: { findUnique: jest.Mock; create: jest.Mock; update: jest.Mock };
  wilayahRW: { findUnique: jest.Mock; findMany: jest.Mock };
  blokWilayah: { findUnique: jest.Mock };
  masjid: { findUnique: jest.Mock; findMany: jest.Mock };
  pengurusMasjid: { findFirst: jest.Mock; findMany: jest.Mock };
  warga: { create: jest.Mock; findMany: jest.Mock };
  iuranWarga: { createMany: jest.Mock; findUnique: jest.Mock; update: jest.Mock };
  kasRW: { create: jest.Mock; findUnique: jest.Mock };
  kasRT: { create: jest.Mock; findUnique: jest.Mock };
  transaksiZis: { create: jest.Mock; findUnique: jest.Mock; aggregate: jest.Mock };
  pengaturanZis: { findUnique: jest.Mock };
  $transaction: jest.Mock;
};

const mockedPrisma = prisma as unknown as MockedPrisma;

const jwtSecret = "test-secret";
const rwWilayahId = "550e8400-e29b-41d4-a716-446655440010";
const blokWilayahId = "550e8400-e29b-41d4-a716-446655440011";
const blokWilayahOtherId = "550e8400-e29b-41d4-a716-446655440012";
const masjidId = "550e8400-e29b-41d4-a716-446655440013";

const signToken = (payload: object) => {
  return jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
};

const resetMocks = () => {
  // Clear all direct function mocks
  Object.values(mockedPrisma).forEach((value) => {
    if (typeof value === "function" && "mockClear" in value) {
      value.mockClear();
    }
  });

  // Clear all nested mocks
  if (mockedPrisma.user?.findUnique?.mockClear) mockedPrisma.user.findUnique.mockClear();
  if (mockedPrisma.user?.create?.mockClear) mockedPrisma.user.create.mockClear();
  if (mockedPrisma.user?.update?.mockClear) mockedPrisma.user.update.mockClear();
  if (mockedPrisma.wilayahRW?.findUnique?.mockClear) mockedPrisma.wilayahRW.findUnique.mockClear();
  if (mockedPrisma.wilayahRW?.findMany?.mockClear) mockedPrisma.wilayahRW.findMany.mockClear();
  if (mockedPrisma.blokWilayah?.findUnique?.mockClear) mockedPrisma.blokWilayah.findUnique.mockClear();
  if (mockedPrisma.masjid?.findUnique?.mockClear) mockedPrisma.masjid.findUnique.mockClear();
  if (mockedPrisma.masjid?.findMany?.mockClear) mockedPrisma.masjid.findMany.mockClear();
  if (mockedPrisma.pengurusMasjid?.findFirst?.mockClear) mockedPrisma.pengurusMasjid.findFirst.mockClear();
  if (mockedPrisma.pengurusMasjid?.findMany?.mockClear) mockedPrisma.pengurusMasjid.findMany.mockClear();
  if (mockedPrisma.iuranWarga?.findUnique?.mockClear) mockedPrisma.iuranWarga.findUnique.mockClear();
  if (mockedPrisma.iuranWarga?.createMany?.mockClear) mockedPrisma.iuranWarga.createMany.mockClear();
  if (mockedPrisma.iuranWarga?.update?.mockClear) mockedPrisma.iuranWarga.update.mockClear();
  if (mockedPrisma.kasRW?.findUnique?.mockClear) mockedPrisma.kasRW.findUnique.mockClear();
  if (mockedPrisma.kasRT?.findUnique?.mockClear) mockedPrisma.kasRT.findUnique.mockClear();
  if (mockedPrisma.transaksiZis?.findUnique?.mockClear) mockedPrisma.transaksiZis.findUnique.mockClear();
  if (mockedPrisma.transaksiZis?.aggregate?.mockClear) mockedPrisma.transaksiZis.aggregate.mockClear();
  if (mockedPrisma.pengaturanZis?.findUnique?.mockClear) mockedPrisma.pengaturanZis.findUnique.mockClear();
  if (mockedPrisma.$transaction?.mockClear) mockedPrisma.$transaction.mockClear();

  process.env.JWT_SECRET = jwtSecret;
};

describe("Backend security suite", () => {
  beforeEach(() => {
    resetMocks();
    jest.clearAllMocks();
  });

  it("rejects invalid login payload", async () => {
    const response = await request(app).post("/api/auth/login").send({ email: "bad" });

    expect(response.status).toBe(400);
  });

  it("rate limits public auth surface", async () => {
    mockedPrisma.user.findUnique.mockResolvedValueOnce(null);

    const first = await request(app)
      .post("/api/auth/login")
      .send({ email: "user@test.com", password: "12345678" });

    expect([400, 401, 403]).toContain(first.status);

    const limiterApp = app;
    const responses: number[] = [];
    for (let index = 0; index < 11; index += 1) {
      const response = await request(limiterApp)
        .post("/api/auth/login")
        .send({ email: "user@test.com", password: "12345678" });
      responses.push(response.status);
    }

    expect(responses).toContain(429);
  });

  it("rejects protected RW route without token", async () => {
    const response = await request(app).get("/api/rw/iuran-warga").query({
      blok_wilayah_id: blokWilayahId,
    });

    expect(response.status).toBe(401);
  });

  it("rejects forged JWT payload role spoofing", async () => {
    const forged = jwt.sign(
      { id: "user-1", role: "RW" },
      "wrong-secret"
    );

    const response = await request(app)
      .get("/api/rw/iuran-warga")
      .set("Authorization", `Bearer ${forged}`)
      .query({ blok_wilayah_id: blokWilayahId });

    expect(response.status).toBe(401);
  });

  it("rejects PENGURUS_MASJID privilege escalation to RW cash endpoint", async () => {
    const token = signToken({ id: "pengurus-1", role: "PENGURUS_MASJID" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "APPROVED" });

    const response = await request(app)
      .post("/api/rw/kas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        wilayah_rw_id: rwWilayahId,
        jenis_transaksi: "MASUK",
        keterangan: "uji",
        nominal: 1000,
      });

    expect(response.status).toBe(403);
  });

  it("rejects PENDING approval bypass", async () => {
    const token = signToken({ id: "pengurus-2", role: "PENGURUS_MASJID" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "PENDING" });

    const response = await request(app)
      .post("/api/zis/transaksi")
      .set("Authorization", `Bearer ${token}`)
      .send({
        masjid_id: masjidId,
        nama_kk: "Kelurahan",
        alamat_muzaqi: "Alamat",
        jumlah_jiwa: 3,
        jenis_bayar: "UANG",
        nominal_zakat: 10000,
        nominal_infaq: 0,
        total_beras_kg: 0,
      });

    expect(response.status).toBe(403);
  });

  it("rejects IDOR attempt against another RW wilayah", async () => {
    const token = signToken({ id: "rw-1", role: "RW" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "APPROVED" });
    mockedPrisma.wilayahRW.findUnique.mockResolvedValueOnce({ id: rwWilayahId });
    mockedPrisma.blokWilayah.findUnique.mockResolvedValueOnce({
      id: blokWilayahOtherId,
      wilayah_rw_id: "550e8400-e29b-41d4-a716-446655440020",
    });

    const response = await request(app)
      .post("/api/rw/warga")
      .set("Authorization", `Bearer ${token}`)
      .send({
        blok_wilayah_id: blokWilayahOtherId,
        nama_kk: "Keluarga A",
        tarif_iuran_bulanan: 50000,
      });

    expect(response.status).toBe(403);
  });

  it("rejects negative nominal values", async () => {
    const token = signToken({ id: "rw-1", role: "RW" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "APPROVED" });
    mockedPrisma.wilayahRW.findUnique.mockResolvedValueOnce({ id: rwWilayahId });
    mockedPrisma.blokWilayah.findUnique.mockResolvedValueOnce({
      id: blokWilayahId,
      wilayah_rw_id: rwWilayahId,
    });

    const response = await request(app)
      .post("/api/rw/kas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        wilayah_rw_id: rwWilayahId,
        jenis_transaksi: "MASUK",
        keterangan: "Kas negatif",
        nominal: -1,
      });

    expect(response.status).toBe(400);
  });

  it("rejects string type bypass for decimal/integer fields", async () => {
    const token = signToken({ id: "pengurus-1", role: "PENGURUS_MASJID" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "APPROVED" });
    mockedPrisma.pengurusMasjid.findFirst.mockResolvedValueOnce({
      masjid_id: masjidId,
    });

    const response = await request(app)
      .post("/api/zis/transaksi")
      .set("Authorization", `Bearer ${token}`)
      .send({
        masjid_id: masjidId,
        nama_kk: "Warga",
        alamat_muzaqi: "Alamat",
        jumlah_jiwa: "abc",
        jenis_bayar: "UANG",
        nominal_zakat: "zzz",
        nominal_infaq: "0",
        total_beras_kg: "0",
      });

    expect(response.status).toBe(400);
  });

  it("rolls back createWarga if transaction fails", async () => {
    const clientMock = {
      wilayahRW: {
        findUnique: jest.fn().mockResolvedValue({ id: rwWilayahId }),
      },
      blokWilayah: {
        findUnique: jest.fn().mockResolvedValue({
          id: blokWilayahId,
          wilayah_rw_id: rwWilayahId,
        }),
      },
      $transaction: jest.fn(async (callback) => {
        return callback({
          warga: {
            create: jest.fn().mockResolvedValue({ id: "warga-1", nama_kk: "A" }),
          },
          iuranWarga: {
            createMany: jest.fn().mockRejectedValue(new Error("fail")),
          },
        });
      }),
    };

    const requestMock = {
      body: {
        blok_wilayah_id: blokWilayahId,
        nama_kk: "Keluarga A",
        tarif_iuran_bulanan: 50000,
      },
      user: {
        id: "rw-1",
        role: "RW",
      },
    };

    const responseMock = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };

    await createWargaWithClient(clientMock as never, requestMock as never, responseMock as never);

    expect(responseMock.status).toHaveBeenCalledWith(500);
  });

  it("rejects public kode lookup brute-force payload shape", async () => {
    const response = await request(app).get("/api/public/cek-kode/");

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("rejects RW role privilege escalation to ZIS endpoint", async () => {
    const token = signToken({ id: "rw-2", role: "RW" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "APPROVED" });

    const response = await request(app)
      .post("/api/zis/transaksi")
      .set("Authorization", `Bearer ${token}`)
      .send({
        masjid_id: masjidId,
        nama_kk: "Kelurarga",
        alamat_muzaqi: "Alamat",
        jumlah_jiwa: 3,
        jenis_bayar: "UANG",
        nominal_zakat: 10000,
        nominal_infaq: 0,
        total_beras_kg: 0,
      });

    expect(response.status).toBe(403);
  });

  it("rejects ZIS dashboard access from RW role", async () => {
    const token = signToken({ id: "rw-3", role: "RW" });
    mockedPrisma.user.findUnique.mockResolvedValueOnce({ status_akun: "APPROVED" });

    const response = await request(app)
      .get("/api/zis/dashboard")
      .set("Authorization", `Bearer ${token}`)
      .query({ masjid_id: masjidId });

    expect(response.status).toBe(403);
  });

  it("rejects empty kode_unik on public endpoint", async () => {
    const response = await request(app).get("/api/public/cek-kode/");

    expect([400, 404]).toContain(response.status);
  });

  it("returns 404 for non-existent kode_unik", async () => {
    mockedPrisma.iuranWarga.findUnique.mockResolvedValueOnce(null);
    mockedPrisma.kasRW.findUnique.mockResolvedValueOnce(null);
    mockedPrisma.kasRT.findUnique.mockResolvedValueOnce(null);
    mockedPrisma.transaksiZis.findUnique.mockResolvedValueOnce(null);

    const response = await request(app).get("/api/public/cek-kode/NONEXISTENT");

    expect(response.status).toBe(404);
  });

  it("returns public masjid list for register flow", async () => {
    mockedPrisma.wilayahRW.findMany.mockResolvedValueOnce([
      {
        id: rwWilayahId,
        nama_kompleks: "Kompleks Melati",
        no_rw: "05",
      },
    ]);

    mockedPrisma.masjid.findMany.mockResolvedValueOnce([
      {
        id: masjidId,
        nama_masjid: "Masjid Al-Huda",
        alamat: "Jl. Melati 1",
        blok_wilayah_id: blokWilayahId,
        blok_wilayah: {
          id: blokWilayahId,
          nama_blok: "Blok A",
          wilayah_rw: {
            id: rwWilayahId,
            nama_kompleks: "Kompleks Melati",
            no_rw: "05",
          },
        },
      },
    ]);

    const response = await request(app).get("/api/public/masjid-list");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.wilayah_rw).toHaveLength(1);
    expect(response.body.data.masjid).toHaveLength(1);
    expect(response.body.data.masjid[0].id).toBe(masjidId);
  });

  it("rejects invalid masjid-list query", async () => {
    const response = await request(app)
      .get("/api/public/masjid-list")
      .query({ search: "a".repeat(101) });

    expect(response.status).toBe(400);
  });
});
