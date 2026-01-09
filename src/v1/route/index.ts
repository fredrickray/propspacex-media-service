import { Router } from "express";
import mediaRoutes from "@media/media.route";

const router = Router();

router.use("/", mediaRoutes);

export default router;
