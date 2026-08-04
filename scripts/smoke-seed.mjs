// Smoke-test helper: create two test users and print their session cookies.
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";

const prisma = new PrismaClient();
const secret = new TextEncoder().encode("smoke-test-secret-0123456789abcdef");

async function mkUser(name) {
  const u = await prisma.user.upsert({
    where: { email: `smoke+${name}@example.com` },
    create: { email: `smoke+${name}@example.com`, name },
    update: {},
  });
  const jwt = await new SignJWT({ uid: u.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secret);
  console.log(`${name} ${u.id} ${jwt}`);
}

await mkUser("alice");
await mkUser("bob");
await prisma.$disconnect();
