import { Pool } from 'pg';

export interface PostRecord {
  id: number;
  userId: number;
  content: string;
  createdAt: string | null;
}

class PostsDatabase {
  private readonly pool = process.env.POSTS_DATABASE_URL
    ? new Pool({ connectionString: process.env.POSTS_DATABASE_URL, connectionTimeoutMillis: 5000, max: 5 })
    : null;
  private connected = false;

  async connect() {
    if (!this.pool) return;

    await this.pool.query('SELECT 1');
    const result = await this.pool.query("SELECT to_regclass('public.posts') AS table_name");
    if (!result.rows[0]?.table_name) {
      throw new Error('The configured posts database does not contain public.posts');
    }
    this.connected = true;
  }

  getStatus() {
    return {
      type: 'PostgreSQL posts',
      configured: Boolean(this.pool),
      connected: this.connected,
    };
  }

  async getPosts(limit = 100): Promise<{ posts: PostRecord[]; total: number }> {
    if (!this.pool) throw new Error('Posts database is not configured');

    const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 100);
    const [postsResult, countResult] = await Promise.all([
      this.pool.query(
        `SELECT id, user_id AS "userId", content, created_at AS "createdAt"
         FROM public.posts
         ORDER BY created_at DESC NULLS LAST, id DESC
         LIMIT $1`,
        [safeLimit],
      ),
      this.pool.query('SELECT COUNT(*)::int AS total FROM public.posts'),
    ]);

    return {
      posts: postsResult.rows.map((post) => ({
        id: Number(post.id),
        userId: Number(post.userId),
        content: String(post.content ?? ''),
        createdAt: post.createdAt ? new Date(post.createdAt).toISOString() : null,
      })),
      total: Number(countResult.rows[0]?.total ?? 0),
    };
  }
}

export const postsDatabase = new PostsDatabase();
