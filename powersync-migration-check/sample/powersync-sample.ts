// orders.ts — offline order list, written for Atlas Device Sync in 2023
import * as Realm from 'realm-web';

const app = new Realm.App({ id: 'orders-abcde' });

export async function loadOrders(customerId: string) {
  const user = await app.logIn(Realm.Credentials.anonymous());
  const mongo = user.mongoClient('mongodb-atlas');
  const recent = await mongo.db('shop').collection('orders').find({ customerId });
  return recent;
}

const DATA_API = 'https://data.mongodb-api.com/app/orders-abcde/endpoint/data/v1';

export async function openOrders(token: string) {
  const res = await fetch(`${DATA_API}/action/find`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ dataSource: 'Cluster0', database: 'shop', collection: 'orders', filter: { status: 'open' } }),
  });
  return (await res.json()).documents;
}
