// Barrel router — all shopping logic lives in ./shopping/
import express from 'express';
import searchRouter from './shopping/search';
import listsRouter from './shopping/lists';

const router = express.Router();

// Search & Kroger routes (set-kroger-location, parse-items, smart-search, search-products)
router.use('/', searchRouter);

// List CRUD routes (GET /, POST /, DELETE, items, purchase, bulk)
router.use('/', listsRouter);

export default router;
