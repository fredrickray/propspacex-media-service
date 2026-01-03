import { Router } from "express";
import mediaRoutes from "@media/media.route";

const router = Router();

router.use("/media", mediaRoutes);

export default router;
