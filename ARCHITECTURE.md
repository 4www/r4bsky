# Radio4000 AT Protocol Architecture

## Overview

This client is built with vanilla Web Components following the Radio4000 components pattern. It provides a minimal interface for posting music tracks to the AT Protocol.

## Core Principles

1. **Vanilla Web Components** - No frameworks, just standard web APIs
2. **Component-based architecture** - Reusable, testable components
3. **Service layer** - Separated business logic from UI
4. **100% test coverage** - All critical paths tested

## Component Hierarchy

```
index.html
├── <bsky-sign-in>
│   └── extends BskyForm
└── <bsky-track-post>
    └── extends BskyForm
```

## File Structure

```
r4atproto/
├── index.html              # Main HTML entry point
├── main.js                 # App initialization & component registration
├── package.json            # Dependencies & scripts
├── vitest.config.js        # Test configuration
├── vitest.setup.js         # Test setup (localStorage mock)
│
└── src/
    ├── style.css           # Global styles
    │
    ├── components/
    │   ├── bsky-form.js              # Base form component
    │   ├── bsky-sign-in.js           # Login component
    │   ├── bsky-sign-in.test.js      # Login tests
    │   ├── bsky-track-post.js        # Track posting component
    │   └── bsky-track-post.test.js   # Track posting tests
    │
    └── libs/
        ├── bsky.js         # AT Protocol service wrapper
        └── bsky.test.js    # Service tests
```

## Components

### BskyForm (Base Component)

**File**: `src/components/bsky-form.js`

Base class for all form components. Provides:
- State management
- Field binding and validation
- Error handling
- Loading states
- Form reset/disable functionality

**Key Methods**:
- `init()` - Initialize form and bind events
- `handleInput(event)` - Update component state
- `handleSubmit(data)` - Emit submit event with data
- `handleError(error)` - Display errors to user
- `disableForm()` / `enableForm()` - Loading states
- `resetForm()` - Clear form data

### BskySignIn Component

**File**: `src/components/bsky-sign-in.js`

Handles AT Protocol authentication.

**Fields**:
- `handle` (text) - AT Protocol handle or email
- `password` (password) - Password or app password

**Flow**:
1. User enters credentials
2. Component calls `bsky.login()`
3. On success, stores session in localStorage
4. Emits submit event with session data
5. Resets form

**Events**:
- `submit` - Fired after login attempt (detail: `{error, data}`)

### BskyTrackPost Component

**File**: `src/components/bsky-track-post.js`

Handles posting music tracks to the AT Protocol.

**Fields**:
- `url` (url) - Track URL (YouTube, SoundCloud, etc.)
- `title` (text) - Track title
- `description` (textarea) - Optional description

**Flow**:
1. User enters track details
2. Component formats post text:
   ```
   {title}

   {description}

   {url}
   ```
3. Calls `bsky.post(formattedText)`
4. On success, emits submit event
5. Resets form

**Events**:
- `submit` - Fired after post attempt (detail: `{error, data}`)

## Services

### BskyService

**File**: `src/libs/bsky.js`

Wrapper around the AT Protocol API for record integration.

**Methods**:

```javascript
// Login with credentials
async login({identifier, password})
// Returns: {session, error}

// Resume existing session
async resumeSession(session)
// Returns: {session, error}

// Post to the AT Protocol
async post(text)
// Returns: {data, error}

// Logout and clear session
logout()

// Get stored session from localStorage
getStoredSession()
// Returns: session object or null

// Check if user is authenticated
isAuthenticated()
// Returns: boolean
```

**Error Handling**:
All methods return `{data/session, error}` format for consistent error handling.

## Data Flow

### Authentication Flow

```
User Input → BskySignIn Component
             ↓
          bsky.login()
             ↓
        BskyAgent API
             ↓
     localStorage (session)
             ↓
    Emit 'submit' event
             ↓
     main.js updates UI
```

### Posting Flow

```
User Input → BskyTrackPost Component
             ↓
      Format post text
             ↓
        bsky.post()
             ↓
   Create RichText with facets
             ↓
        BskyAgent.post()
             ↓
    Emit 'submit' event
             ↓
     main.js shows status
             ↓
      Reset form
```

## Testing Strategy

### Unit Tests

All critical functionality is tested:

1. **BskyService** (`bsky.test.js`)
   - Login (success, failure, network errors)
   - Session resume (valid, expired)
   - Posting (success, failure, rate limiting)
   - Logout
   - localStorage integration

2. **BskySignIn** (`bsky-sign-in.test.js`)
   - Form rendering
   - State updates
   - Login submission
   - Error display
   - Form reset
   - Loading states

3. **BskyTrackPost** (`bsky-track-post.test.js`)
   - Form rendering
   - State updates
   - Post formatting
   - Multiple platform URLs
   - Error handling
   - Form reset

### Coverage Targets

- Lines: 90%
- Functions: 90%
- Branches: 85%
- Statements: 90%

### Running Tests

```bash
# Run all tests
npm test

# Run with UI
npm run test:ui

# Run with coverage report
npm run test:coverage
```

## State Management

### Component State

Each form component maintains its own state object:

```javascript
state = {
  field1: 'value',
  field2: 'value'
}
```

State is updated via `handleInput()` on field changes.

### Session State

Session state is managed by BskyService:

```javascript
// In-memory
service.session = {...}

// Persisted
localStorage.setItem('bsky-session', JSON.stringify(session))
```

## Event Communication

Components communicate via custom events:

```javascript
// Component emits
this.dispatchEvent(new CustomEvent('submit', {
  bubbles: true,
  detail: {error, data}
}))

// App listens
component.addEventListener('submit', (e) => {
  const {error, data} = e.detail
  // Handle response
})
```

## Error Handling

### Service Level

Services return consistent error format:

```javascript
{
  data: null,
  error: {
    code: 'error-code',
    message: 'Human readable message'
  }
}
```

### Component Level

Components handle errors via `handleError()`:
1. Clear previous errors
2. Find matching error message
3. Display in appropriate output element
4. Log to console

### User Feedback

Errors are shown in `<output>` elements within fieldsets, styled with red text.

## Security Considerations

1. **Passwords**: Never stored, only sent to the user's PDS API
2. **Sessions**: Stored in localStorage, cleared on logout
3. **App Passwords**: Recommended over main password
4. **HTTPS**: All API calls over HTTPS
5. **No third-party tracking**: Credentials only go to the user's PDS

## Future Enhancements

Potential additions:
- Track preview (fetch oEmbed data)
- Post history
- Draft saving
- Hashtag suggestions
- Media upload
- Thread support
- Profile display
