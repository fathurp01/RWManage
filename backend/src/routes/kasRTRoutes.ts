import { Router } from "express";
import { verifyToken, checkRole } from "../middlewares/authMiddleware";
import { validateBody } from "../middlewares/validateRequest";
import { createKasRTSchema } from "../validation/schemas";
import { getKasRT, createKasRT, getAllKasRTSummary, updateKasRT, deleteKasRT } from "../controllers/kasRTController";

const router = Router();

router.use(verifyToken);

// RT Routes
router.post("/", checkRole(["RT"]), validateBody(createKasRTSchema), createKasRT);
router.put("/:kas_id", checkRole(["RT"]), updateKasRT);
router.delete("/:kas_id", checkRole(["RT"]), deleteKasRT);

// Both RT and RW (RW will pass query blok_wilayah_id)
router.get("/", checkRole(["RT", "RW"]), getKasRT);

// RW Specific
router.get("/summary", checkRole(["RW"]), getAllKasRTSummary);

export default router;
