import { Router } from "express";
import * as generateController from "../controllers/generate.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.post("/:id/generate", generateController.create);

export default router;
