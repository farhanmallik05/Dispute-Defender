import { db } from '../../../dispute-defender/src/lib/db';

console.log('db keys:', Object.keys(db));
console.log('db.$client:', (db as any).$client);
console.log('db.session:', (db as any).session);
if ((db as any).$client) {
  console.log('$client keys:', Object.keys((db as any).$client));
}
if ((db as any).session?.client) {
  console.log('session.client:', (db as any).session.client);
}
