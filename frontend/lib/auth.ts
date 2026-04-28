export type AppRole = "RW" | "RT" | "PENGURUS_MASJID" | "SUPERADMIN";
export type StatusAkun = "PENDING" | "APPROVED" | "REJECTED";

export interface AuthUser {
  id: string;
  nama: string;
  email: string;
  role: AppRole;
  status_akun: StatusAkun;
  wilayah_rw_id?: string;
  blok_wilayah_id?: string;
  masjid_ids?: string[];
}

export interface AuthStoragePayload {
  token: string;
  user: AuthUser;
}

export const AUTH_STORAGE_KEY = "rwmanage_auth";
export const AUTH_TOKEN_COOKIE = "rwmanage_token";
export const AUTH_ROLE_COOKIE = "rwmanage_role";
export const AUTH_STATUS_COOKIE = "rwmanage_status";

export const isValidRole = (value: unknown): value is AppRole => {
  return value === "RW" || value === "RT" || value === "PENGURUS_MASJID" || value === "SUPERADMIN";
};

export const isValidStatusAkun = (value: unknown): value is StatusAkun => {
  return value === "PENDING" || value === "APPROVED" || value === "REJECTED";
};

export const isUuid = (value: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
};
