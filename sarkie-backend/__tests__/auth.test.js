/**
 * Unit Tests: User Registration & Email Verification
 *
 * Tests cover the full new-user signup flow:
 *   POST /auth/register
 *   POST /auth/send-verification-code
 *   POST /auth/verify-code
 *   POST /auth/login  (pre- and post-verification)
 *
 * The database pool is mocked so no real DB connection is required.
 * Nodemailer's sendMail is also mocked to avoid sending real emails.
 */

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcrypt");

// ---------------------------------------------------------------------------
// Mock the database pool (db.js) before requiring the router
// ---------------------------------------------------------------------------
jest.mock("../db", () => ({
  query: jest.fn(),
}));

// Mock nodemailer so no real emails are sent
jest.mock("nodemailer", () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: "test-id" }),
  })),
}));

const pool = require("../db");
const authRouter = require("../routes/auth");

// Build a minimal Express app that mounts the auth router
const app = express();
app.use(express.json());
app.use("/auth", authRouter);

// ---------------------------------------------------------------------------
// Helper: suppress console output during tests for cleaner results
// ---------------------------------------------------------------------------
beforeAll(() => {
  jest.spyOn(console, "log").mockImplementation(() => {});
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterAll(() => {
  console.log.mockRestore();
  console.error.mockRestore();
});

afterEach(() => {
  jest.clearAllMocks();
});

// ===========================================================================
// POST /auth/register
// ===========================================================================
describe("POST /auth/register", () => {
  test("successfully registers a new user", async () => {
    // No existing user found
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // SELECT check
      .mockResolvedValueOnce({                           // INSERT new user
        rows: [{ id: 1, name: "Grant", email: "grant@test.com", verified: false }],
      });

    const res = await request(app).post("/auth/register").send({
      name: "Grant",
      email: "grant@test.com",
      password: "securePass1",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/registered successfully/i);
    expect(res.body.user.email).toBe("grant@test.com");
  });

  test("rejects registration when required fields are missing", async () => {
    const res = await request(app).post("/auth/register").send({
      email: "grant@test.com",
      // name and password missing
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/fields are required/i);
  });

  test("rejects registration when password is shorter than 8 characters", async () => {
    const res = await request(app).post("/auth/register").send({
      name: "Grant",
      email: "grant@test.com",
      password: "short",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/at least 8 characters/i);
  });

  test("rejects registration when a verified account already exists", async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ verified: true }],
    });

    const res = await request(app).post("/auth/register").send({
      name: "Grant",
      email: "grant@test.com",
      password: "securePass1",
    });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test("allows re-registration when existing account is unverified", async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 1, rows: [{ verified: false }] }) // SELECT
      .mockResolvedValueOnce({ rowCount: 1 })                               // DELETE users
      .mockResolvedValueOnce({ rowCount: 1 })                               // DELETE verification_codes
      .mockResolvedValueOnce({                                               // INSERT new user
        rows: [{ id: 2, name: "Grant", email: "grant@test.com", verified: false }],
      });

    const res = await request(app).post("/auth/register").send({
      name: "Grant",
      email: "grant@test.com",
      password: "securePass1",
    });

    expect(res.statusCode).toBe(201);
    expect(res.body.message).toMatch(/registered successfully/i);
  });
});

// ===========================================================================
// POST /auth/send-verification-code
// ===========================================================================
describe("POST /auth/send-verification-code", () => {
  test("sends a verification code to an unverified user", async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ verified: false }] }) // SELECT user
      .mockResolvedValueOnce({ rows: [] });                   // INSERT verification code

    const res = await request(app)
      .post("/auth/send-verification-code")
      .send({ email: "grant@test.com" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/sent successfully/i);
  });

  test("rejects when no email is provided", async () => {
    const res = await request(app)
      .post("/auth/send-verification-code")
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/email is required/i);
  });

  test("returns 404 when the email is not registered", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // No user found

    const res = await request(app)
      .post("/auth/send-verification-code")
      .send({ email: "nobody@test.com" });

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/user not found/i);
  });

  test("rejects when the user is already verified", async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ verified: true }] });

    const res = await request(app)
      .post("/auth/send-verification-code")
      .send({ email: "grant@test.com" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already verified/i);
  });
});

// ===========================================================================
// POST /auth/verify-code
// ===========================================================================
describe("POST /auth/verify-code", () => {
  test("verifies a user with a valid, unexpired code", async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000); // 5 min from now

    pool.query
      .mockResolvedValueOnce({                                      // SELECT code
        rowCount: 1,
        rows: [{ code: "123456", expires_at: futureDate }],
      })
      .mockResolvedValueOnce({ rowCount: 1 })                       // DELETE code
      .mockResolvedValueOnce({                                       // UPDATE verified
        rowCount: 1,
        rows: [{ id: 1, email: "grant@test.com", verified: true }],
      });

    const res = await request(app)
      .post("/auth/verify-code")
      .send({ email: "grant@test.com", code: "123456" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/verification successful/i);
  });

  test("rejects when email or code is missing", async () => {
    const res = await request(app)
      .post("/auth/verify-code")
      .send({ email: "grant@test.com" }); // no code

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/required/i);
  });

  test("rejects when no verification code exists for the email", async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });

    const res = await request(app)
      .post("/auth/verify-code")
      .send({ email: "grant@test.com", code: "123456" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/no code found/i);
  });

  test("rejects an expired verification code", async () => {
    const pastDate = new Date(Date.now() - 1000); // 1 second ago

    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ code: "123456", expires_at: pastDate }],
    });

    const res = await request(app)
      .post("/auth/verify-code")
      .send({ email: "grant@test.com", code: "123456" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/expired/i);
  });

  test("rejects an incorrect verification code", async () => {
    const futureDate = new Date(Date.now() + 5 * 60 * 1000);

    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ code: "999999", expires_at: futureDate }],
    });

    const res = await request(app)
      .post("/auth/verify-code")
      .send({ email: "grant@test.com", code: "123456" }); // wrong code

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid verification code/i);
  });
});

// ===========================================================================
// POST /auth/login  (verification-aware)
// ===========================================================================
describe("POST /auth/login", () => {
  test("rejects login for an unverified user", async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: "grant@test.com", verified: false, password_hash: "hash" }],
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "grant@test.com", password: "securePass1" });

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/verify your email/i);
  });

  test("successfully logs in a verified user with correct password", async () => {
    const hashedPassword = await bcrypt.hash("securePass1", 10);

    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        name: "Grant",
        email: "grant@test.com",
        verified: true,
        password_hash: hashedPassword,
      }],
    });

    process.env.JWT_SECRET = "test-secret";

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "grant@test.com", password: "securePass1" });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/login successful/i);
    expect(res.body.token).toBeDefined();
  });

  test("rejects login with incorrect password", async () => {
    const hashedPassword = await bcrypt.hash("securePass1", 10);

    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        email: "grant@test.com",
        verified: true,
        password_hash: hashedPassword,
      }],
    });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "grant@test.com", password: "wrongPassword" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/invalid credentials/i);
  });

  test("rejects login when user does not exist", async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post("/auth/login")
      .send({ email: "nobody@test.com", password: "securePass1" });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/user not found/i);
  });
});
