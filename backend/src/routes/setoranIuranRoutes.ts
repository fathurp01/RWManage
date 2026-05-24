import { Router } from "express";
import { verifyToken, checkRole } from "../middlewares/authMiddleware";
import { getSetoranRT, submitSetoran, getSetoranForRW, approveSetoran } from "../controllers/setoranIuranController";
import { validateBody, validateParams } from "../middlewares/validateRequest";
import { approveSetoranSchema, submitSetoranSchema, setoranParamsSchema } from "../validation/schemas";

const router = Router();

router.use(verifyToken);

// RT Routes
router.get("/rt", checkRole(["RT"]), getSetoranRT);
router.post("/rt/submit", checkRole(["RT"]), validateBody(submitSetoranSchema), submitSetoran);

// RW Routes
router.get("/rw", checkRole(["RW"]), getSetoranForRW);
router.post("/rw/:setoran_id/approve", checkRole(["RW"]), validateParams(setoranParamsSchema), validateBody(approveSetoranSchema), approveSetoran);

export default router;
