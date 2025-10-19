module.exports = (fastify) => {
  return {
    async findAll({ limit = 10, offset = 0 } = {}) {
      const countResult = await fastify.db.query('SELECT COUNT(*) FROM users')
      const total = parseInt(countResult.rows[0].count, 10)

      const result = await fastify.db.query(
        'SELECT id, email, name, created_at as "createdAt", updated_at as "updatedAt" FROM users ORDER BY created_at DESC LIMIT $1 OFFSET $2',
        [limit, offset]
      )

      return {
        users: result.rows,
        total,
        limit,
        offset
      }
    },

    async findById(id) {
      const result = await fastify.db.query(
        'SELECT id, email, name, created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE id = $1',
        [id]
      )
      return result.rows[0]
    },

    async findByEmail(email) {
      const result = await fastify.db.query(
        'SELECT id, email, name, password_hash, created_at as "createdAt", updated_at as "updatedAt" FROM users WHERE email = $1',
        [email]
      )
      return result.rows[0]
    },

    async create(data) {
      const result = await fastify.db.query(
        `INSERT INTO users (email, name, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, email, name, created_at as "createdAt", updated_at as "updatedAt"`,
        [data.email, data.name, data.passwordHash]
      )
      return result.rows[0]
    },

    async update(id, data) {
      const fields = []
      const values = []
      let paramIndex = 1

      if (data.email) {
        fields.push(`email = $${paramIndex++}`)
        values.push(data.email)
      }

      if (data.name) {
        fields.push(`name = $${paramIndex++}`)
        values.push(data.name)
      }

      if (fields.length === 0) {
        return this.findById(id)
      }

      fields.push(`updated_at = NOW()`)
      values.push(id)

      const result = await fastify.db.query(
        `UPDATE users SET ${fields.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING id, email, name, created_at as "createdAt", updated_at as "updatedAt"`,
        values
      )

      return result.rows[0]
    },

    async delete(id) {
      const result = await fastify.db.query(
        'DELETE FROM users WHERE id = $1 RETURNING id',
        [id]
      )
      return result.rowCount > 0
    }
  }
}
