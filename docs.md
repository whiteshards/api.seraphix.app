
# Seraphix SDK API Documentation

Base URL: `https://your-deployment-url.com`

## Authentication

All protected endpoints require a Bearer token in the Authorization header:
```
Authorization: Bearer your_api_token_here
```

## Endpoints

### GET /v1/status
Check API status and health.

**Response:**
```json
{
  "message": "API is Running",
  "version": "1",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "uptime": 3600.5,
  "environment": "production",
  "executionTime": "1.25ms"
}
```

### GET /v1/me
Get authenticated user profile information.

**Headers:** `Authorization: Bearer {token}`

**Response:**
```json
{
  "message": "User profile retrieved successfully",
  "data": {
    "username": "john_doe",
    "discord_id": "123456789012345678",
    "created_at": "2024-01-01T00:00:00.000Z",
    "api_key_created_at": "2024-01-15T10:00:00.000Z"
  },
  "executionTime": "2.15ms"
}
```

### GET /v1/keysystems?id={keysystem_id}
Retrieve specific keysystem information.

**Headers:** `Authorization: Bearer {token}`
**Query Parameters:** `id` - Keysystem ID (required)

**Response:**
```json
{
  "message": "Keysystem retrieved successfully",
  "data": {
    "keysystem": {
      "id": "ks_abc123",
      "name": "My Keysystem",
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "settings": {
        "maxKeyPerson": 5,
        "keyCooldown": 300,
        "webhookUrl": "https://discord.com/api/webhooks/...",
        "checkpoints": 3
      }
    }
  },
  "executionTime": "5.42ms"
}
```

### POST /v1/keysystems/keys?id={keysystem_id}
Verify a key and bind HWID if not already bound.

**Query Parameters:** `id` - Keysystem ID (required)
**Body:**
```json
{
  "key": "your_key_here",
  "hwid": "unique_hardware_id"
}
```

**Success Response:**
```json
{
  "message": "KEY_VALID",
  "executionTime": "8.33ms"
}
```

**Error Responses:**
```json
{
  "message": "KEY_INVALID",
  "executionTime": "3.21ms"
}
```

```json
{
  "message": "KEY_EXPIRED",
  "executionTime": "4.56ms"
}
```

```json
{
  "message": "KEY_HWID_LOCKED",
  "executionTime": "7.89ms"
}
```

### PATCH /v1/keysystems/keys/reset?id={keysystem_id}
Reset a key's HWID binding (owner authentication required).

**Headers:** `Authorization: Bearer {token}`
**Query Parameters:** `id` - Keysystem ID (required)
**Body:**
```json
{
  "key": "your_key_here"
}
```

**Success Response:**
```json
{
  "message": "HWID reset successfully",
  "executionTime": "12.45ms"
}
```

**Error Responses:**
```json
{
  "error": "not_found",
  "message": "Key not found",
  "executionTime": "3.21ms"
}
```

```json
{
  "error": "not_found",
  "message": "Keysystem not found or access denied",
  "executionTime": "5.67ms"
}
```

## Rate Limits

- **POST /v1/keysystems/keys**: 100 requests per second
- **PATCH /v1/keysystems/keys/reset**: 5 requests per second
- **Other endpoints**: No rate limit

## Error Codes

- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing token)
- `404` - Not Found (resource doesn't exist)
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error
- `503` - Service Unavailable (database connection issues)

## Response Format

All responses include:
- `message` - Human readable message
- `executionTime` - Request processing time in milliseconds
- `data` - Response payload (when applicable)
- `error` - Error type (for error responses)
