import axios, { AxiosError } from "axios";

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

const redirectToLogin = (): void => {
  if (typeof window === "undefined") {
    return;
  }
  // Only redirect if the user is currently visiting a protected dashboard route
  if (!window.location.pathname.startsWith("/dashboard")) {
    return;
  }
  // Use window.location for reliable redirect that works across all contexts
  window.location.href = "/auth/login?session-expired=true";
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
  baseURL: process.env.NEXT_PUBLIC_API_URL || "/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const normalizedError = normalizeApiError(error);

    // Handle 401 Unauthorized - token expired or invalid
    // Do NOT redirect if the request was specifically for login
    const isLoginRequest = axios.isAxiosError(error) && error.config?.url?.includes("/auth/login");
    
    if (normalizedError.status === 401 && !isLoginRequest) {
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
  const response = await api.get<Blob>(path, {
    params,
    responseType: "blob",
  });

  const blob = response.data;
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(objectUrl);
};
