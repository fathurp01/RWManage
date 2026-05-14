import { NextFunction, Request, Response } from "express";
import { ZodTypeAny } from "zod";

const formatIssues = (
  issues: ReadonlyArray<{ path: ReadonlyArray<string | number | symbol>; message: string }>
) => {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join(".") : "_root",
    message: issue.message,
  }));
};

const replaceObjectValues = (
  target: Record<string, unknown>,
  source: Record<string, unknown>
) => {
  Object.keys(target).forEach((key) => {
    delete target[key];
  });

  Object.entries(source).forEach(([key, value]) => {
    target[key] = value;
  });
};

export const validateBody = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validasi body gagal.",
        errors: formatIssues(parsed.error.issues),
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validasi query gagal.",
        errors: formatIssues(parsed.error.issues),
      });
      return;
    }

    replaceObjectValues(
      req.query as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>
    );
    next();
  };
};

export const validateParams = (schema: ZodTypeAny) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({
        success: false,
        message: "Validasi parameter gagal.",
        errors: formatIssues(parsed.error.issues),
      });
      return;
    }

    replaceObjectValues(
      req.params as unknown as Record<string, unknown>,
      parsed.data as Record<string, unknown>
    );
    next();
  };
};

export const validateNominalPositive = () => {
  return (req: any, res: any, next: any) => {
    const contentType = (req.headers && req.headers['content-type']) || '';
    // If the request is multipart (file upload), skip here and let multer parse body first.
    if (typeof contentType === 'string' && contentType.startsWith('multipart/form-data')) {
      next();
      return;
    }

    const nominal = req.body?.nominal;
    const parsed = Number(nominal);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      res.status(400).json({ success: false, message: 'nominal harus berupa angka > 0.' });
      return;
    }

    next();
  };
};

export const validateNumericFields = (fields: string[]) => {
  return (req: any, res: any, next: any) => {
    const contentType = (req.headers && req.headers['content-type']) || '';
    if (typeof contentType === 'string' && contentType.startsWith('multipart/form-data')) {
      next();
      return;
    }

    for (const field of fields) {
      if (req.body?.[field] !== undefined) {
        const parsed = Number(req.body[field]);
        if (!Number.isFinite(parsed)) {
          res.status(400).json({ success: false, message: `Field ${field} harus berupa angka.` });
          return;
        }
      }
    }

    next();
  };
};
