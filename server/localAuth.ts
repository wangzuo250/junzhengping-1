import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { users } from '../drizzle/schema';
import { getDb } from './db';
import { eq, or } from 'drizzle-orm';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-secret-key-change-in-production');
const JWT_EXPIRATION = '7d'; // Token 有效期7天

/**
 * 密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * 验证密码
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * 生成 JWT Token
 */
export async function generateToken(userId: number, username: string): Promise<string> {
  return new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION)
    .sign(JWT_SECRET);
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<{ userId: number; username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      userId: payload.userId as number,
      username: payload.username as string,
    };
  } catch (error) {
    return null;
  }
}

/**
 * 用户注册
 */
export async function registerUser(data: {
  username: string;
  email?: string;
  password: string;
  name: string;
}) {
  const db = await getDb();
  if (!db) {
    throw new Error('数据库连接失败');
  }

  // 检查用户名是否已存在
  const existingUser = await db
    .select()
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1);

  if (existingUser.length > 0) {
    throw new Error('用户名已被使用');
  }

  // 如果提供了邮箱，检查邮箱是否已被使用
  if (data.email) {
    const existingEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, data.email))
      .limit(1);

    if (existingEmail.length > 0) {
      throw new Error('邮箱已被使用');
    }
  }

  // 哈希密码
  const hashedPassword = await hashPassword(data.password);

  // 插入新用户
  await db.insert(users).values({
    username: data.username,
    email: data.email || null,
    password: hashedPassword,
    name: data.name,
    role: 'user',
    lastSignedIn: new Date(),
  });

  // 查询刚创建的用户
  const newUser = await db
    .select()
    .from(users)
    .where(eq(users.username, data.username))
    .limit(1);

  return {
    success: true,
    userId: newUser[0]!.id,
  };
}

/**
 * 用户登录
 */
export async function loginUser(usernameOrEmail: string, password: string) {
  const db = await getDb();
  if (!db) {
    throw new Error('数据库连接失败');
  }

  // 查找用户（支持用户名或邮箱登录）
  const result = await db
    .select()
    .from(users)
    .where(
      or(
        eq(users.username, usernameOrEmail),
        eq(users.email, usernameOrEmail)
      )
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error('用户不存在');
  }

  const user = result[0];

  // 验证密码
  if (!user.password) {
    throw new Error('该账号未设置密码');
  }

  const isValid = await verifyPassword(password, user.password);
  if (!isValid) {
    throw new Error('密码错误');
  }

  // 更新最后登录时间
  await db
    .update(users)
    .set({ lastSignedIn: new Date() })
    .where(eq(users.id, user.id));

  // 生成 Token
  const token = await generateToken(user.id, user.username!);

  return {
    success: true,
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * 根据 Token 获取用户信息
 */
export async function getUserByToken(token: string) {
  const payload = await verifyToken(token);
  if (!payload) {
    return null;
  }

  const db = await getDb();
  if (!db) {
    return null;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.id, payload.userId))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0];
}
