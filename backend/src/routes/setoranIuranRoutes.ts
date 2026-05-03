import { Router } from "express";
import { verifyToken, checkRole } from "../middlewares/authMiddleware";
import { getSetoranRT, submitSetoran, getSetoranForRW, approveSetoran } from "../controllers/setoranIuranController";
import { validateBody } from "../middlewares/validateRequest";
import { approveSetoranSchema } from "../validation/schemas";

const router = Router();

router.use(verifyToken);

// RT Routes
router.get("/rt", checkRole(["RT"]), getSetoranRT);
router.post("/rt/submit", checkRole(["RT"]), submitSetoran);

// RW Routes
router.get("/rw", checkRole(["RW"]), getSetoranForRW);
router.post("/rw/:setoran_id/approve", checkRole(["RW"]), validateBody(approveSetoranSchema), approveSetoran);

export default router;
