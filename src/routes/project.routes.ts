import { Router } from "express";
import * as projectController from "../controllers/project.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.use(authenticate);

router.post("/", projectController.create);
router.get("/", projectController.list);
router.get("/:id", projectController.getById);
router.put("/:id", projectController.update);
router.delete("/:id", projectController.remove);


export default router;
