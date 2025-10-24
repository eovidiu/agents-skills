# Safe Coding Practices for Claude Skills

Best practices for developing secure, trustworthy Claude Code skills.

## Core Security Principles

### 1. Least Privilege
Only request permissions and access absolutely necessary for the skill's purpose.

**Example - File Access:**
```python
# BAD - Overly broad
def process_files(directory):
    for file in os.listdir(directory):  # Any directory
        process(file)

# GOOD - Scoped to skill directory
SKILL_DIR = Path(__file__).parent
DATA_DIR = SKILL_DIR / "data"

def process_files():
    for file in DATA_DIR.glob("*.txt"):  # Only skill's data
        process(file)
```

### 2. Defense in Depth
Layer multiple security controls.

```python
# Multiple validation layers
def process_user_input(data):
    # Layer 1: Type check
    if not isinstance(data, str):
        raise TypeError("String required")

    # Layer 2: Format validation
    if not re.match(r'^[a-zA-Z0-9\s]+$', data):
        raise ValueError("Invalid characters")

    # Layer 3: Length limit
    if len(data) > 1000:
        raise ValueError("Input too long")

    # Layer 4: Content validation
    if any(keyword in data.lower() for keyword in BANNED_KEYWORDS):
        raise ValueError("Prohibited content")

    return process(data)
```

### 3. Fail Secure
When errors occur, default to safe state.

```python
# BAD - Fails open
try:
    validate_permission(user)
except:
    pass  # Allows access on error!
allow_access(user)

# GOOD - Fails closed
def check_permission(user):
    try:
        return validate_permission(user)
    except Exception as e:
        logger.error(f"Permission check failed: {e}")
        return False  # Deny on error

if check_permission(user):
    allow_access(user)
```

### 4. Explicit Over Implicit
Make security decisions visible and intentional.

```python
# BAD - Implicit trust
def load_config(path):
    return yaml.load(open(path))  # Unsafe by default

# GOOD - Explicit safety
def load_config(path):
    with open(path, 'r') as f:
        # Explicitly using safe_load
        return yaml.safe_load(f)
```

---

## Input Validation

### Always Validate External Input

**Sources of untrusted input:**
- User messages
- File contents
- API responses
- Environment variables
- Command-line arguments

**Validation strategies:**
```python
# Whitelist validation (preferred)
ALLOWED_FORMATS = {'.pdf', '.txt', '.md'}
def process_file(filename):
    if Path(filename).suffix not in ALLOWED_FORMATS:
        raise ValueError(f"File type not allowed. Allowed: {ALLOWED_FORMATS}")

# Type validation
def calculate(a: float, b: float) -> float:
    if not isinstance(a, (int, float)) or not isinstance(b, (int, float)):
        raise TypeError("Numeric arguments required")
    return a + b

# Range validation
def set_timeout(seconds):
    if not 1 <= seconds <= 300:
        raise ValueError("Timeout must be 1-300 seconds")
    return seconds

# Format validation with regex
import re
EMAIL_PATTERN = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
def validate_email(email):
    if not re.match(EMAIL_PATTERN, email):
        raise ValueError("Invalid email format")
    return email.lower()

# Size validation
MAX_SIZE = 10 * 1024 * 1024  # 10MB
def process_upload(file_data):
    if len(file_data) > MAX_SIZE:
        raise ValueError(f"File too large (max {MAX_SIZE} bytes)")
    return process(file_data)
```

### Sanitize Before Use

```python
# Path sanitization
from pathlib import Path

def safe_path_join(base_dir, user_path):
    base = Path(base_dir).resolve()
    full_path = (base / user_path).resolve()

    # Ensure path stays within base_dir
    if not full_path.is_relative_to(base):
        raise ValueError("Path traversal detected")

    return full_path

# HTML/XML escaping
import html
def render_user_content(text):
    return html.escape(text)

# SQL parameterization (if using SQL)
# NEVER: f"SELECT * FROM users WHERE name = '{user_input}'"
# ALWAYS:
cursor.execute("SELECT * FROM users WHERE name = ?", (user_input,))

# Shell argument validation
def run_command(user_filename):
    # Validate filename has no special chars
    if not re.match(r'^[a-zA-Z0-9_.-]+$', user_filename):
        raise ValueError("Invalid filename characters")

    subprocess.run(['ls', user_filename], check=True)
```

---

## Safe Command Execution

### Never Use shell=True

```python
# CRITICAL VULNERABILITY
subprocess.run(f"convert {input_file} output.png", shell=True)
# User input: "file.jpg; rm -rf /" → DISASTER

# SAFE - Argument list
subprocess.run(['convert', input_file, 'output.png'], shell=False)
```

### Validate Commands

```python
# Whitelist allowed commands
ALLOWED_TOOLS = {'convert', 'identify', 'mogrify'}

def run_imagemagick(command, args):
    if command not in ALLOWED_TOOLS:
        raise ValueError(f"Command not allowed: {command}")

    subprocess.run(
        [command] + args,
        timeout=30,
        check=True,
        capture_output=True
    )
```

### Set Timeouts

```python
# Prevent hanging
try:
    result = subprocess.run(
        ['long-running-tool', input_file],
        timeout=60,  # Kill after 60 seconds
        check=True
    )
except subprocess.TimeoutExpired:
    raise RuntimeError("Command timed out")
```

---

## Secure File Operations

### Path Traversal Prevention

```python
class SecureFileHandler:
    def __init__(self, base_directory):
        self.base_dir = Path(base_directory).resolve()

    def read_file(self, relative_path):
        # Resolve path and validate
        full_path = (self.base_dir / relative_path).resolve()

        if not full_path.is_relative_to(self.base_dir):
            raise ValueError(f"Access denied: {relative_path}")

        if not full_path.exists():
            raise FileNotFoundError(f"File not found: {relative_path}")

        return full_path.read_text()

    def write_file(self, relative_path, content):
        full_path = (self.base_dir / relative_path).resolve()

        if not full_path.is_relative_to(self.base_dir):
            raise ValueError(f"Access denied: {relative_path}")

        # Create parent directories if needed
        full_path.parent.mkdir(parents=True, exist_ok=True)
        full_path.write_text(content)
```

### Temporary File Safety

```python
import tempfile
import atexit

# SAFE - Secure temp files
def process_with_temp():
    # Create secure temp file
    temp_fd, temp_path = tempfile.mkstemp(suffix='.txt')

    # Register cleanup
    atexit.register(lambda: os.unlink(temp_path))

    try:
        with os.fdopen(temp_fd, 'w') as f:
            f.write(sensitive_data)

        # Process temp file
        process_file(temp_path)
    finally:
        # Ensure cleanup even on error
        if os.path.exists(temp_path):
            os.unlink(temp_path)
```

### File Permission Safety

```python
# Set restrictive permissions
import stat

def write_config(path, data):
    # Write file
    with open(path, 'w') as f:
        f.write(data)

    # Set permissions: owner read/write only
    os.chmod(path, stat.S_IRUSR | stat.S_IWUSR)  # 0o600
```

---

## Network Security

### HTTPS Only

```python
from urllib.parse import urlparse

def fetch_data(url):
    parsed = urlparse(url)

    # Enforce HTTPS
    if parsed.scheme != 'https':
        raise ValueError("Only HTTPS URLs allowed")

    # Certificate validation enabled by default
    response = requests.get(url, timeout=10)
    response.raise_for_status()
    return response.json()
```

### URL Validation

```python
ALLOWED_DOMAINS = {
    'api.github.com',
    'api.openai.com',
    'registry.npmjs.org'
}

def validate_url(url):
    parsed = urlparse(url)

    # Check scheme
    if parsed.scheme not in ['https']:
        raise ValueError("Invalid URL scheme")

    # Check domain whitelist
    if parsed.netloc not in ALLOWED_DOMAINS:
        raise ValueError(f"Domain not allowed: {parsed.netloc}")

    # No credentials in URL
    if parsed.username or parsed.password:
        raise ValueError("Credentials in URL not allowed")

    return url
```

### Rate Limiting

```python
from functools import wraps
import time

class RateLimiter:
    def __init__(self, calls, period):
        self.calls = calls
        self.period = period
        self.timestamps = []

    def __call__(self, func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            now = time.time()

            # Remove old timestamps
            self.timestamps = [t for t in self.timestamps
                             if now - t < self.period]

            # Check limit
            if len(self.timestamps) >= self.calls:
                raise RuntimeError(
                    f"Rate limit exceeded: {self.calls} calls per {self.period}s"
                )

            self.timestamps.append(now)
            return func(*args, **kwargs)

        return wrapper

# Usage
@RateLimiter(calls=10, period=60)
def api_call(endpoint):
    return requests.get(endpoint, timeout=10)
```

---

## Credential Management

### Never Hardcode Secrets

```python
# BAD
API_KEY = "sk-1234567890abcdef"
PASSWORD = "MySecretPassword"

# GOOD - Environment variables
import os
API_KEY = os.environ.get('API_KEY')
if not API_KEY:
    raise ValueError("API_KEY environment variable required")

# GOOD - User input
API_KEY = input("Enter API key: ")

# GOOD - Keyring (persistent storage)
import keyring
API_KEY = keyring.get_password('myskill', 'api_key')
if not API_KEY:
    API_KEY = input("Enter API key: ")
    keyring.set_password('myskill', 'api_key', API_KEY)
```

### Protect Secrets in Memory

```python
# Clear sensitive data after use
password = get_password()
try:
    authenticate(password)
finally:
    # Overwrite in memory
    password = None
    del password
```

### Never Log Secrets

```python
# BAD
logger.info(f"Using API key: {api_key}")

# GOOD
logger.info(f"Using API key: {api_key[:4]}****")

# GOOD - Redaction function
def redact(text, secret):
    return text.replace(secret, '***REDACTED***')

logger.info(redact(f"Calling API with {api_key}", api_key))
```

---

## Data Serialization

### Use JSON, Not Pickle

```python
# VULNERABLE - Pickle allows code execution
import pickle
data = pickle.loads(user_data)  # RCE!

# SAFE - JSON only allows data
import json
data = json.loads(user_data)
```

### Safe YAML Parsing

```python
import yaml

# VULNERABLE
config = yaml.load(file)  # Can execute code!

# SAFE
config = yaml.safe_load(file)  # Data only
```

### Validate Deserialized Data

```python
import jsonschema

# Define schema
schema = {
    "type": "object",
    "properties": {
        "name": {"type": "string", "maxLength": 100},
        "age": {"type": "integer", "minimum": 0, "maximum": 150}
    },
    "required": ["name", "age"]
}

# Validate
data = json.loads(user_input)
jsonschema.validate(data, schema)
```

---

## Error Handling

### Don't Leak Information

```python
# BAD - Leaks internal paths
try:
    with open('/var/secrets/api_keys.json') as f:
        data = f.read()
except Exception as e:
    return str(e)  # "FileNotFoundError: /var/secrets/api_keys.json"

# GOOD - Generic error
try:
    data = load_config()
except FileNotFoundError:
    raise ValueError("Configuration file not found")
except PermissionError:
    raise ValueError("Cannot access configuration")
```

### Fail Safely

```python
def process_payment(amount, user):
    try:
        # Process payment
        charge_card(user, amount)
        return True
    except Exception as e:
        # Log error but don't charge
        logger.error(f"Payment failed: {e}")
        return False  # Safe failure
```

---

## Resource Management

### Set Limits

```python
# Memory limit
MAX_DATA_SIZE = 100 * 1024 * 1024  # 100MB
if len(data) > MAX_DATA_SIZE:
    raise ValueError("Data exceeds size limit")

# Time limit
import signal

def timeout_handler(signum, frame):
    raise TimeoutError("Operation timed out")

signal.signal(signal.SIGALRM, timeout_handler)
signal.alarm(30)  # 30 second timeout
try:
    result = expensive_operation()
finally:
    signal.alarm(0)  # Cancel alarm

# Iteration limit
MAX_ITERATIONS = 1000
for i, item in enumerate(user_data):
    if i >= MAX_ITERATIONS:
        raise ValueError(f"Too many items (max {MAX_ITERATIONS})")
    process(item)
```

### Clean Up Resources

```python
# Use context managers
with open('file.txt') as f:
    data = f.read()
# File automatically closed

# Custom context manager
from contextlib import contextmanager

@contextmanager
def secure_temp_file():
    temp_path = create_temp_file()
    try:
        yield temp_path
    finally:
        securely_delete(temp_path)

# Usage
with secure_temp_file() as temp:
    process(temp)
# Cleanup guaranteed
```

---

## Documentation

### Disclose All Capabilities

```markdown
# In SKILL.md

## Capabilities

This skill can:
- Read files from the `./data` directory only
- Make HTTPS requests to api.example.com
- Write output files to `./output` directory
- Execute ImageMagick tools (convert, identify) with 30s timeout

## Data Handling

- Input files are validated for type (.pdf, .png, .jpg only)
- No data is retained after processing
- No data is sent to external services except as documented
- Temporary files are securely deleted after use

## Network Activity

This skill makes external requests to:
- **api.example.com** (HTTPS only)
  - Purpose: Fetch image metadata
  - Data sent: Image hash only (no content)
  - Rate limit: 10 requests/minute
```

### Provide Examples

```markdown
## Security Examples

### Safe Usage
```bash
# Process local file
python scripts/process.py ./data/image.png

# With validation
python scripts/process.py --validate ./data/document.pdf
```

### Unsafe Usage (Don't Do This)
```bash
# DON'T pass untrusted files
python scripts/process.py /tmp/unknown_file

# DON'T disable validation
python scripts/process.py --no-verify file.pdf
```
```

---

## Testing Security

### Unit Tests for Security

```python
import pytest

def test_path_traversal_prevention():
    handler = SecureFileHandler('/safe/base')

    # Should reject path traversal
    with pytest.raises(ValueError):
        handler.read_file('../../etc/passwd')

def test_command_injection_prevention():
    # Should reject invalid filename
    with pytest.raises(ValueError):
        run_imagemagick('convert', ['file.jpg; rm -rf /', 'out.png'])

def test_input_validation():
    # Should reject oversized input
    with pytest.raises(ValueError):
        process_input('x' * 1000000)

def test_rate_limiting():
    @RateLimiter(calls=5, period=1)
    def limited_func():
        pass

    # Should allow first 5 calls
    for _ in range(5):
        limited_func()

    # Should reject 6th call
    with pytest.raises(RuntimeError):
        limited_func()
```

---

## Code Review Checklist

Before submitting a skill, verify:

**Input Handling:**
- [ ] All external input is validated
- [ ] Type checking on all inputs
- [ ] Size limits on all inputs
- [ ] Format validation with whitelist
- [ ] Path traversal prevention on file paths

**Command Execution:**
- [ ] No use of `shell=True`
- [ ] All commands use argument lists
- [ ] Timeouts on all subprocess calls
- [ ] Commands validated against whitelist

**Network Operations:**
- [ ] All network calls documented in SKILL.md
- [ ] HTTPS enforced
- [ ] URL validation
- [ ] Timeouts configured
- [ ] Rate limiting implemented
- [ ] Certificate validation enabled

**Credential Management:**
- [ ] No hardcoded secrets
- [ ] Secrets from environment or keyring
- [ ] Secrets not logged
- [ ] Secrets cleared after use

**File Operations:**
- [ ] File access limited to skill directory
- [ ] Path resolution and validation
- [ ] Temp files securely deleted
- [ ] File permissions set appropriately

**Data Handling:**
- [ ] JSON for serialization (not pickle)
- [ ] YAML with safe_load only
- [ ] Data validated after deserialization
- [ ] Sensitive data not in logs

**Error Handling:**
- [ ] Errors don't leak sensitive info
- [ ] Fail securely (deny on error)
- [ ] Stack traces sanitized

**Resource Management:**
- [ ] Timeouts on operations
- [ ] Size limits enforced
- [ ] Resources properly closed
- [ ] Iteration limits set

**Documentation:**
- [ ] All capabilities disclosed
- [ ] Data handling explained
- [ ] Network activity documented
- [ ] Security considerations noted
- [ ] Safe usage examples provided

---

## Additional Resources

- OWASP Top 10: https://owasp.org/www-project-top-ten/
- CWE Top 25: https://cwe.mitre.org/top25/
- Python Security Best Practices: https://python.readthedocs.io/en/stable/library/security_warnings.html
- NIST Secure Software Development: https://csrc.nist.gov/Projects/ssdf

