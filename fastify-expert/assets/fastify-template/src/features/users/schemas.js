const { Type } = require('@sinclair/typebox')
const { Id, Email, Timestamp, PaginationQuery, NotFoundResponse, ValidationErrorResponse } = require('../../schemas/common')

// User entity
const User = Type.Object({
  id: Id,
  email: Email,
  name: Type.String({ minLength: 1, maxLength: 100 }),
  createdAt: Timestamp,
  updatedAt: Timestamp
})

// Request schemas
const CreateUserBody = Type.Object({
  email: Email,
  name: Type.String({ minLength: 1, maxLength: 100 }),
  password: Type.String({ minLength: 8, maxLength: 72 })
})

const UpdateUserBody = Type.Partial(
  Type.Object({
    name: Type.String({ minLength: 1, maxLength: 100 }),
    email: Email
  })
)

const UserIdParam = Type.Object({
  id: Id
})

// Response schemas
const UserResponse = User

const UserListResponse = Type.Object({
  users: Type.Array(User),
  total: Type.Integer(),
  limit: Type.Integer(),
  offset: Type.Integer()
})

// Route schemas
const listUsersSchema = {
  description: 'List all users',
  tags: ['users'],
  querystring: PaginationQuery,
  response: {
    200: UserListResponse
  }
}

const getUserSchema = {
  description: 'Get user by ID',
  tags: ['users'],
  params: UserIdParam,
  response: {
    200: UserResponse,
    404: NotFoundResponse
  }
}

const createUserSchema = {
  description: 'Create a new user',
  tags: ['users'],
  body: CreateUserBody,
  response: {
    201: UserResponse,
    400: ValidationErrorResponse
  }
}

const updateUserSchema = {
  description: 'Update user by ID',
  tags: ['users'],
  params: UserIdParam,
  body: UpdateUserBody,
  response: {
    200: UserResponse,
    404: NotFoundResponse,
    400: ValidationErrorResponse
  }
}

const deleteUserSchema = {
  description: 'Delete user by ID',
  tags: ['users'],
  params: UserIdParam,
  response: {
    204: Type.Null(),
    404: NotFoundResponse
  }
}

module.exports = {
  User,
  CreateUserBody,
  UpdateUserBody,
  listUsersSchema,
  getUserSchema,
  createUserSchema,
  updateUserSchema,
  deleteUserSchema
}
