import axios, { AxiosError } from "axios";
import { AUTH_STORAGE_KEY } from "@/lib/auth";

export type FieldErrors = Record<string, string>;

export interface ApiClientError {
  message: string;
  status?: number;
  fieldErrors: FieldErrors;
  raw: unknown;
}

interface ValidationIssue {
  field?: string;
  message?: string;
}

interface ErrorEnvelope {
  message?: string;
  errors?: ValidationIssue[];
}

const readTokenFromStorage = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as { token?: string };
    return typeof parsed.token === "string" ? parsed.token : null;
  } catch {
    return null;
  }
};

const clearAuthToken = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(AUTH_STORAGE_KEY);
};

const redirectToLogin = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  // Use window.location for reliable redirect that works across all contexts
  window.location.href = "/auth/login?session-expired=true";
};

const buildAuthHeaders = (): Record<string, string> => {
  const headers: Record<string, string> = {};
  const token = readTokenFromStorage();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
};

const mapValidationErrors = (issues: ValidationIssue[] | undefined): FieldErrors => {
  if (!issues || !Array.isArray(issues)) {
    return {};
  }

  return issues.reduce<FieldErrors>((accumulator, issue) => {
    if (!issue || typeof issue.field !== "string" || typeof issue.message !== "string") {
      return accumulator;
    }

    if (!(issue.field in accumulator)) {
      accumulator[issue.field] = issue.message;
    }

    return accumulator;
  }, {});
};

const normalizeApiError = (error: unknown): ApiClientError => {
  if (!axios.isAxiosError(error)) {
    return {
      message: "Terjadi kesalahan tidak terduga.",
      fieldErrors: {},
      raw: error,
    };
  }

  const axiosError = error as AxiosError<ErrorEnvelope>;
  const status = axiosError.response?.status;
  const payload = axiosError.response?.data;

  const fieldErrors = status === 400 ? mapValidationErrors(payload?.errors) : {};

  return {
    message: payload?.message || axiosError.message || "Terjadi kesalahan saat menghubungi server.",
    status,
    fieldErrors,
    raw: error,
  };
};

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = readTokenFromStorage();

  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalizedError = normalizeApiError(error);

    // Handle 401 Unauthorized - token expired or invalid
    if (normalizedError.status === 401) {
      clearAuthToken();
      redirectToLogin();
    }

    return Promise.reject(normalizedError);
  }
);

export const getApiError = (error: unknown): ApiClientError => {
  if (
    error !== null &&
    typeof error === "object" &&
    "message" in error &&
    "fieldErrors" in error &&
    "raw" in error
  ) {
    return error as ApiClientError;
  }

  return normalizeApiError(error);
};

export const downloadApiFile = async (
  path: string,
  filename: string,
  params?: Record<string, string | number | undefined>
): Promise<void> => {
  const baseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000/api").replace(/\/$/, "");
  const url = new URL(`${baseUrl}${path.startsWith("/") ? path : `/${path}`}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    });
  }

  const response = await fetch(url.toString(), {
    method: "GET",
    headers: {
      ...buildAuthHeaders(),
    },
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";

    if (contentType.includes("application/json")) {
      const payload = (await response.json()) as ErrorEnvelope;
      throw new Error(payload.message || "Gagal mengunduh file.");
    }

    const errorText = await response.text();
    throw new Error(errorText || "Gagal mengunduh file.");
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
