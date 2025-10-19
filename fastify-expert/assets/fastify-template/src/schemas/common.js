const { Type } = require('@sinclair/typebox')

// Common field types
const Id = Type.String({ format: 'uuid' })
const Email = Type.String({ format: 'email', maxLength: 255 })
const Timestamp = Type.String({ format: 'date-time' })

// Pagination
const PaginationQuery = Type.Object({
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100, default: 10 })),
  offset: Type.Optional(Type.Integer({ minimum: 0, default: 0 }))
})

// Common error responses
const ErrorResponse = Type.Object({
  statusCode: Type.Integer(),
  error: Type.String(),
  message: Type.String(),
  correlationId: Type.Optional(Type.String())
})

const ValidationErrorResponse = Type.Object({
  statusCode: Type.Literal(400),
  error: Type.Literal('Bad Request'),
  message: Type.String(),
  details: Type.Array(Type.Any()),
  correlationId: Type.Optional(Type.String())
})

// Standard responses
const NotFoundResponse = Type.Object({
  statusCode: Type.Literal(404),
  error: Type.Literal('Not Found'),
  message: Type.String(),
  correlationId: Type.Optional(Type.String())
})

const UnauthorizedResponse = Type.Object({
  statusCode: Type.Literal(401),
  error: Type.Literal('Unauthorized'),
  message: Type.String()
})

module.exports = {
  Id,
  Email,
  Timestamp,
  PaginationQuery,
  ErrorResponse,
  ValidationErrorResponse,
  NotFoundResponse,
  UnauthorizedResponse
}
