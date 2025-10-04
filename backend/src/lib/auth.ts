import { NextRequest } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { PrismaClient, User, Role } from "@prisma/client";

const prisma = new PrismaClient();

export type SessionData = {
  userId: string;
  email: string;
  role: Role;
  isLoggedIn: boolean;
};

const sessionOptions = {
  password: process.env.AUTH_SECRET!,
  cookieName: process.env.SESSION_COOKIE_NAME || "zenconnect_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  const session = await getIronSession<SessionData>(cookies(), sessionOptions);
  return session;
}

export async function getSessionUser(req?: NextRequest): Promise<User | null> {
  try {
    const session = await getSession();
    if (!session.isLoggedIn || !session.userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
    });

    return user;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return null;
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return null;
    }

    const session = await getSession();
    session.userId = user.id;
    session.email = user.email;
    session.role = user.role;
    session.isLoggedIn = true;
    await session.save();

    return user;
  } catch (error) {
    console.error("Login error:", error);
    return null;
  }
}

export async function logout() {
  const session = await getSession();
  session.destroy();
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export function requireAuth(role?: Role) {
  return async (req: NextRequest) => {
    const user = await getSessionUser(req);
    
    if (!user) {
      return { ok: false, error: { code: "UNAUTH", message: "Authentication required" } };
    }

    if (role && user.role !== role && user.role !== "ADMIN") {
      return { ok: false, error: { code: "FORBIDDEN", message: "Insufficient permissions" } };
    }

    return { ok: true, user };
  };
}

export function canClassify(role: Role) { 
  return role === "ADMIN"; 
}

export function canUpload(role: Role) { 
  return role === "ADMIN" || role === "STAFF"; 
}

export function canViewAudit(role: Role) { 
  return role === "ADMIN"; 
}

