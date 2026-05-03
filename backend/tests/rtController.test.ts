import { getIuranForRt } from "../src/controllers/rtController";

jest.mock("../src/lib/prisma", () => ({
  prisma: {
    warga: {
      findMany: jest.fn(),
    },
  },
}));

import { prisma } from "../src/lib/prisma";

describe("rtController getIuranForRt", () => {
  it("returns RT iuran summary for the logged in block", async () => {
    const findManyMock = prisma.warga.findMany as jest.Mock;
    findManyMock.mockResolvedValueOnce([
      {
        id: "w1",
        nama_kk: "Keluarga RT",
        tarif_iuran_bulanan: 50000,
        iuran_warga: [],
      },
    ]);

    const req = {
      user: {
        id: "rt-1",
        blok_wilayah_id: "blok-1",
      },
      query: {},
    } as any;

    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const res = { status, json } as any;

    await getIuranForRt(req, res);

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          blok_wilayah_id: "blok-1",
          warga: expect.arrayContaining([
            expect.objectContaining({ nama_kk: "Keluarga RT" }),
          ]),
        }),
      })
    );
  });
});
