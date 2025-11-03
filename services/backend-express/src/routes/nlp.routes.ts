import { Router } from 'express';
import { processCommand } from '../controllers/nlp.controller';

export const nlpRouter = Router();

nlpRouter.post('/command', processCommand);
