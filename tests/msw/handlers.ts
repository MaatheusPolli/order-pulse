import { createDb } from '../../mock-server/src/data/db';
import { createHandlers } from '../../src/mocks/handlers';

/** Mesmo "banco" e mesmos handlers do mock server — testes batem no contrato real. */
export const db = createDb();
export const handlers = createHandlers(db);
