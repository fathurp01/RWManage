import { Router } from "express";
import { verifyToken, checkRole } from "../middlewares/authMiddleware";
import { validateBody, validateParams } from "../middlewares/validateRequest";
import { createKasRTSchema, updateKasRTSchema, kasRTParamsSchema } from "../validation/schemas";
import { getKasRT, createKasRT, getAllKasRTSummary, updateKasRT, deleteKasRT } from "../controllers/kasRTController";

const router = Router();

router.use(verifyToken);

// RT Routes
router.post("/", checkRole(["RT"]), validateBody(createKasRTSchema), createKasRT);
router.put("/:kas_id", checkRole(["RT"]), validateParams(kasRTParamsSchema), validateBody(updateKasRTSchema), updateKasRT);
router.delete("/:kas_id", checkRole(["RT"]), validateParams(kasRTParamsSchema), deleteKasRT);

// Both RT and RW (RW will pass query blok_wilayah_id)
router.get("/", checkRole(["RT", "RW"]), getKasRT);

// RW Specific
router.get("/summary", checkRole(["RW"]), getAllKasRTSummary);

export default router;
