import { Pool } from 'pg';
import { Role, UserEntity } from './types';

type AuthUserUpdate = Pick<UserEntity, 'name' | 'email'>;

class AuthUsersDatabase {
  private readonly pool = process.env.AUTH_DATABASE_URL
    ? new Pool({ connectionString: process.env.AUTH_DATABASE_URL, connectionTimeoutMillis: 5000, max: 5 })
    : null;
  private connected = false;

  get isConfigured() {
    return Boolean(this.pool);
  }

  async connect() {
    if (!this.pool) return;

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS waffle_auth_users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        phone VARCHAR(15) NOT NULL UNIQUE,
        email TEXT,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER', 'ADMIN', 'OPERATOR')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await this.pool.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS waffle_auth_users_email_unique
      ON waffle_auth_users (LOWER(email))
      WHERE email IS NOT NULL AND email <> ''
    `);
    await this.pool.query('SELECT 1');
    this.connected = true;
  }

  getStatus() {
    return {
      type: 'PostgreSQL (waffle_auth_users)',
      configured: this.isConfigured,
      connected: this.connected,
    };
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    if (!this.pool) return null;
    const result = await this.pool.query(
      `SELECT id, name, phone, email, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM waffle_auth_users WHERE phone = $1 LIMIT 1`,
      [phone],
    );
    return result.rows[0] ? this.toUser(result.rows[0]) : null;
  }

  async findById(id: string): Promise<UserEntity | null> {
    if (!this.pool) return null;
    const result = await this.pool.query(
      `SELECT id, name, phone, email, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM waffle_auth_users WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ? this.toUser(result.rows[0]) : null;
  }

  async create(user: UserEntity): Promise<UserEntity> {
    if (!this.pool) throw new Error('PostgreSQL account storage is not configured');
    try {
      const result = await this.pool.query(
        `INSERT INTO waffle_auth_users (id, name, phone, email, password_hash, role, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, name, phone, email, password_hash AS "passwordHash", role,
                   created_at AS "createdAt", updated_at AS "updatedAt"`,
        [user.id, user.name, user.phone, user.email || null, user.passwordHash, user.role, user.createdAt, user.updatedAt],
      );
      return this.toUser(result.rows[0]);
    } catch (error: any) {
      if (error?.code === '23505') {
        if (String(error.constraint || '').includes('email')) throw new Error('An account with this email address already exists.');
        throw new Error('An account with this mobile number already exists.');
      }
      throw error;
    }
  }

  async update(id: string, updates: Partial<AuthUserUpdate>): Promise<UserEntity | null> {
    if (!this.pool) return null;
    const result = await this.pool.query(
      `UPDATE waffle_auth_users
       SET name = CASE WHEN $2::boolean THEN $3 ELSE name END,
           email = CASE WHEN $4::boolean THEN $5 ELSE email END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, name, phone, email, password_hash AS "passwordHash", role,
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [id, updates.name !== undefined, updates.name ?? null, updates.email !== undefined, updates.email || null],
    );
    return result.rows[0] ? this.toUser(result.rows[0]) : null;
  }

  async list(): Promise<UserEntity[]> {
    if (!this.pool) return [];
    const result = await this.pool.query(
      `SELECT id, name, phone, email, password_hash AS "passwordHash", role,
              created_at AS "createdAt", updated_at AS "updatedAt"
       FROM waffle_auth_users ORDER BY created_at DESC`,
    );
    return result.rows.map((row) => this.toUser(row));
  }

  private toUser(row: any): UserEntity {
    return {
      id: String(row.id),
      name: String(row.name),
      phone: String(row.phone),
      email: row.email ? String(row.email) : undefined,
      passwordHash: String(row.passwordHash),
      role: String(row.role) as Role,
      createdAt: new Date(row.createdAt).toISOString(),
      updatedAt: new Date(row.updatedAt).toISOString(),
    };
  }
}

export const authUsersDatabase = new AuthUsersDatabase();
