const { NotFoundError, ConflictError } = require('../../lib/errors')
const crypto = require('crypto')
const { promisify } = require('util')

const scrypt = promisify(crypto.scrypt)

module.exports = (fastify) => {
  const repository = require('./repository')(fastify)

  async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex')
    const derivedKey = await scrypt(password, salt, 64)
    return `${salt}:${derivedKey.toString('hex')}`
  }

  async function verifyPassword(password, hash) {
    const [salt, key] = hash.split(':')
    const derivedKey = await scrypt(password, salt, 64)
    return key === derivedKey.toString('hex')
  }

  return {
    async findAll(query) {
      return repository.findAll(query)
    },

    async findById(id) {
      const user = await repository.findById(id)
      if (!user) {
        throw new NotFoundError('User')
      }
      return user
    },

    async create(data) {
      // Check if email already exists
      const existingUser = await repository.findByEmail(data.email)
      if (existingUser) {
        throw new ConflictError('Email already exists')
      }

      // Hash password
      const passwordHash = await hashPassword(data.password)

      return repository.create({
        email: data.email,
        name: data.name,
        passwordHash
      })
    },

    async update(id, data) {
      // Check if user exists
      const existingUser = await repository.findById(id)
      if (!existingUser) {
        throw new NotFoundError('User')
      }

      // Check if email is being changed and already exists
      if (data.email && data.email !== existingUser.email) {
        const emailExists = await repository.findByEmail(data.email)
        if (emailExists) {
          throw new ConflictError('Email already exists')
        }
      }

      return repository.update(id, data)
    },

    async delete(id) {
      const deleted = await repository.delete(id)
      if (!deleted) {
        throw new NotFoundError('User')
      }
    },

    async authenticate(email, password) {
      const user = await repository.findByEmail(email)
      if (!user) {
        throw new NotFoundError('User')
      }

      const isValid = await verifyPassword(password, user.password_hash)
      if (!isValid) {
        throw new Error('Invalid password')
      }

      // Don't return password hash
      delete user.password_hash

      return user
    }
  }
}
