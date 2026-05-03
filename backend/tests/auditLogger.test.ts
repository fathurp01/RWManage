import { recordAudit } from "../src/middlewares/auditLogger";

jest.mock("../src/lib/prisma", () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
    },
  },
}));

import { prisma } from "../src/lib/prisma";

describe("recordAudit", () => {
  it("stores serialized payload and ip address", async () => {
    const createMock = prisma.auditLog.create as jest.Mock;
    createMock.mockResolvedValueOnce({});

    await recordAudit(
      {
        ip: "127.0.0.1",
        user: { id: "user-1" },
      } as any,
      {
        aksi: "CREATE",
        entitas: "Warga",
        entitas_id: "entity-1",
        data_baru: { total: 12.5 },
      }
    );

    expect(createMock).toHaveBeenCalledTimes(1);
    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          user_id: "user-1",
          aksi: "CREATE",
          entitas: "Warga",
          entitas_id: "entity-1",
          ip_address: "127.0.0.1",
          data_baru: JSON.stringify({ total: 12.5 }),
        }),
      })
    );
  });
});
