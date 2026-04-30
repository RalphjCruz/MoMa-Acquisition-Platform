process.env.NODE_ENV = "test";
process.env.USE_IN_MEMORY_DB = "true";
process.env.AUTO_SEED_ON_START = "false";
process.env.AUTH_JWT_SECRET = "test-secret";
process.env.MONGODB_DB_NAME = "moma_assignment_test";

const test = require("node:test");
const assert = require("node:assert/strict");

const app = require("../src/app");
const { connectDatabase, disconnectDatabase } = require("../src/config/database");

let server = null;
let baseUrl = "";
let managerToken = "";
let buyerToken = "";
const testObjectId = 990001;

const jsonHeaders = { "Content-Type": "application/json" };

const request = async (path, options = {}) =>
  fetch(`${baseUrl}${path}`, options);

test.before(async () => {
  await connectDatabase();
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

test.after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await disconnectDatabase();
});

test("rejects unauthenticated artwork creation", async () => {
  const response = await request("/api/artworks", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({ objectId: 123123, title: "No Auth Artwork" })
  });

  assert.equal(response.status, 401);
});

test("registers manager and buyer accounts", async () => {
  const managerResponse = await request("/api/auth/register", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      username: "manager_test",
      email: "manager@test.local",
      password: "Password@123",
      role: "manager"
    })
  });
  assert.equal(managerResponse.status, 201);
  const managerPayload = await managerResponse.json();
  managerToken = managerPayload?.data?.token ?? "";
  assert.ok(managerToken);

  const buyerResponse = await request("/api/auth/register", {
    method: "POST",
    headers: jsonHeaders,
    body: JSON.stringify({
      username: "buyer_test",
      email: "buyer@test.local",
      password: "Password@123",
      role: "buyer"
    })
  });
  assert.equal(buyerResponse.status, 201);
  const buyerPayload = await buyerResponse.json();
  buyerToken = buyerPayload?.data?.token ?? "";
  assert.ok(buyerToken);
});

test("manager creates artwork and buyer submits pending request", async () => {
  const createArtworkResponse = await request("/api/artworks", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({
      objectId: testObjectId,
      title: "Test Artwork",
      artistDisplayName: "Test Artist",
      department: "Painting",
      classification: "Oil"
    })
  });
  assert.equal(createArtworkResponse.status, 201);

  const purchaseResponse = await request("/api/acquisitions/purchase-requests", {
    method: "POST",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${buyerToken}`
    },
    body: JSON.stringify({
      items: [{ artworkId: testObjectId, quantity: 1 }]
    })
  });
  assert.equal(purchaseResponse.status, 201);
  const purchasePayload = await purchaseResponse.json();
  assert.equal(purchasePayload?.data?.created, 1);
});

test("manager approves and acquires buyer request", async () => {
  const listResponse = await request("/api/acquisitions?limit=20", {
    headers: { Authorization: `Bearer ${managerToken}` }
  });
  assert.equal(listResponse.status, 200);
  const listPayload = await listResponse.json();
  const acquisition = (listPayload.data ?? []).find(
    (item) => item?.artworkId?.objectId === testObjectId
  );
  assert.ok(acquisition);

  const approveResponse = await request(`/api/acquisitions/${acquisition._id}`, {
    method: "PATCH",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({ status: "approved" })
  });
  assert.equal(approveResponse.status, 200);

  const acquireResponse = await request(`/api/acquisitions/${acquisition._id}`, {
    method: "PATCH",
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${managerToken}`
    },
    body: JSON.stringify({ status: "acquired" })
  });
  assert.equal(acquireResponse.status, 200);
});

test("buyer sees acquired request in my acquisitions", async () => {
  const response = await request("/api/acquisitions/my?limit=20", {
    headers: { Authorization: `Bearer ${buyerToken}` }
  });
  assert.equal(response.status, 200);
  const payload = await response.json();
  const item = (payload.data ?? []).find(
    (entry) => entry?.artworkId?.objectId === testObjectId
  );

  assert.ok(item);
  assert.equal(item.status, "acquired");
});
