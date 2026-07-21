---
name: api-architect
description: Diseño e implementación de APIs REST y GraphQL. Usa esta skill cuando el usuario quiera diseñar, construir, o documentar una API. Cubre REST, GraphQL, autenticación, versionado, y mejores prácticas.
---

# API Architect

Guía para diseñar APIs robustas y escalables.

## Diseño REST

### Convenciones de URL
```
GET    /api/v1/users          # Listar
POST   /api/v1/users          # Crear
GET    /api/v1/users/:id      # Obtener uno
PUT    /api/v1/users/:id      # Actualizar
DELETE /api/v1/users/:id      # Eliminar
GET    /api/v1/users/:id/posts # Recursos anidados
```

### Códigos de estado
| Código | Uso |
|---|---|
| 200 | OK |
| 201 | Creado |
| 204 | Sin contenido |
| 400 | Bad request |
| 401 | No autenticado |
| 403 | Prohibido |
| 404 | No encontrado |
| 422 | Validación fallida |
| 429 | Rate limit |
| 500 | Error servidor |

### Autenticación
```javascript
// JWT Bearer
headers: { Authorization: `Bearer ${token}` }

// API Key
headers: { 'X-API-Key': key }
```

## GraphQL

```graphql
type Query {
  user(id: ID!): User
  users(limit: Int, offset: Int): [User!]!
}

type Mutation {
  createUser(input: CreateUserInput!): User!
  updateUser(id: ID!, input: UpdateUserInput!): User!
}

type User {
  id: ID!
  name: String!
  email: String!
  posts: [Post!]!
}
```

## Mejores prácticas

- **Versionado**: `/api/v1/` desde el inicio
- **Paginación**: cursor-based o offset+limit
- **Rate limiting**: por IP y por token
- **Errores consistentes**:
  ```json
  {
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Email is required",
      "field": "email"
    }
  }
  ```
- **CORS**: configurar origins específicos
- **Documentación**: OpenAPI/Swagger automático
- **Idempotencia**: para POST/PUT usar idempotency keys
