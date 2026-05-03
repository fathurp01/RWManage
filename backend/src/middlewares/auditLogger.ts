import { AksiAudit, Prisma } from "@prisma/client";
import { Request } from "express";
import { prisma } from "../lib/prisma";

type AuditPayload = {
  aksi: AksiAudit;
  entitas: string;
  entitas_id: string;
  data_lama?: unknown;
  data_baru?: unknown;
  keterangan?: string;
};

const stringifyPayload = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }

  try {
    return JSON.stringify(value, (_key, currentValue) =>
      currentValue instanceof Prisma.Decimal ? currentValue.toString() : currentValue
    );
  } catch {
    return String(value);
  }
};

export const recordAudit = async (req: Request, payload: AuditPayload): Promise<void> => {
  if (!req.user?.id) {
    return;
  }

  await prisma.auditLog.create({
    data: {
      user_id: req.user.id,
      aksi: payload.aksi,
      entitas: payload.entitas,
      entitas_id: payload.entitas_id,
      data_lama: stringifyPayload(payload.data_lama),
      data_baru: stringifyPayload(payload.data_baru),
      keterangan: payload.keterangan ?? null,
      ip_address: req.ip ?? null,
    },
  });
};
