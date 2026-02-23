// Lightweight event bus for cross-module communication.
// Modules communicate ONLY through this bus — no direct imports between modules.
// See types.ts for the full DomainEvents map.

import mitt from 'mitt';
import type { DomainEvents } from './types';

/**
 * Singleton event bus instance.
 * Import `eventBus` in any module to subscribe or emit.
 *
 * Usage:
 *   import { eventBus } from '@/events/eventBus';
 *
 *   // Subscribe
 *   eventBus.on('ENTRY_DELETED', (payload) => { ... });
 *
 *   // Emit
 *   eventBus.emit('ENTRY_DELETED', { entryId, entry });
 *
 *   // Unsubscribe (important in useEffect cleanup)
 *   eventBus.off('ENTRY_DELETED', handler);
 */
const eventBus = mitt<DomainEvents>();

export { eventBus };
