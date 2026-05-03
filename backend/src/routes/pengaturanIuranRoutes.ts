import { Router } from "express";
import { verifyToken } from "../middlewares/authMiddleware";
import { checkRole } from "../middlewares/authMiddleware";
import { validateBody } from "../middlewares/validateRequest";
import { pengaturanIuranRWSchema } from "../validation/schemas";
import { getPengaturanIuranRW, upsertPengaturanIuranRW } from "../controllers/pengaturanIuranController";

const router = Router();

router.use(verifyToken);
router.use(checkRole(["RW"]));

router.get("/", getPengaturanIuranRW);
router.post("/", validateBody(pengaturanIuranRWSchema), upsertPengaturanIuranRW);

export default router;
