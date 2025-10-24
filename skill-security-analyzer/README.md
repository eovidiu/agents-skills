# Skill Security Analyzer

Comprehensive security analysis tool for Claude Code skills and plugins. Identifies vulnerabilities, malicious code patterns, supply chain risks, and best practice violations.

## Overview

This skill provides automated and manual security analysis capabilities for skills installed from marketplaces, zip files, or local directories. It helps ensure skills are safe to use before installation or deployment.

## Features

### Automated Security Scanner
- **Malicious Code Detection** - Command injection, code execution, backdoors
- **YAML Injection** - Malformed frontmatter, code execution in metadata
- **Data Exfiltration** - Unauthorized network calls, credential theft
- **Code Obfuscation** - Base64, hex encoding, compressed payloads
- **Supply Chain Analysis** - Dependency verification, typosquatting detection
- **Best Practices** - Input validation, error handling, resource management

### Manual Analysis Guidance
- Step-by-step security review workflow
- Risk rating criteria (CRITICAL/HIGH/MEDIUM/LOW)
- Context-aware risk assessment
- Detailed remediation recommendations

### Comprehensive Documentation
- Vulnerability pattern database
- Safe coding practices guide
- Attack vector examples
- Security checklist

## Installation

### From ZIP File
```bash
# Install the skill
unzip skill-security-analyzer.zip -d ~/.claude/skills/
```

### From Source
```bash
# Clone or copy the skill directory
cp -r skill-security-analyzer ~/.claude/skills/
```

## Usage

### Basic Security Scan

```bash
# Scan a skill
python3 ~/.claude/skills/skill-security-analyzer/scripts/security_scanner.py /path/to/skill

# Scan with detailed output
python3 scripts/security_scanner.py /path/to/skill --verbose

# Output to JSON file
python3 scripts/security_scanner.py /path/to/skill --output report.json

# Scan all skills in a directory
python3 scripts/security_scanner.py ~/.claude/skills/ --recursive
```

### Using the Skill in Claude Code

Simply ask Claude to analyze a skill:

```
"Analyze the security of skill-emailer"
"Check if my-custom-skill is safe to install"
"Audit all installed skills for vulnerabilities"
"Review this skill.zip file before I install it"
```

## What It Detects

### Critical Threats (Immediate Rejection)
- **Command Injection** - `os.system()`, `subprocess` with `shell=True`
- **Code Execution** - `eval()`, `exec()`, dynamic imports
- **Data Exfiltration** - Undisclosed network calls sending data externally
- **Credential Theft** - Reading SSH keys, AWS credentials, tokens
- **Backdoors** - Reverse shells, remote command execution
- **YAML Injection** - Code execution through frontmatter

### High Severity Issues
- Undocumented network access
- File operations outside skill directory
- Missing input validation
- Obfuscated code sections
- Unsafe deserialization (pickle, unsafe YAML)
- Hardcoded API keys or secrets

### Medium Severity Issues
- Overly broad permissions
- Missing error handling
- Weak input validation
- Resource limits not enforced
- Documentation gaps

### Low Severity / Best Practices
- Missing code comments
- No usage examples
- Inconsistent error messages
- Style issues

## Security Report Format

The scanner generates reports with:

1. **Executive Summary**
   - Overall risk rating
   - Finding counts by severity
   - Installation recommendation (APPROVE/REVIEW/REJECT)

2. **Detailed Findings**
   - Specific code locations (file:line)
   - Evidence (code snippets)
   - Impact assessment
   - Remediation guidance

3. **Analysis Sections**
   - Network activity analysis
   - File system activity
   - Dependency analysis
   - Code obfuscation check
   - Compliance checklist

## Example Output

```json
{
  "skill": "example-skill",
  "location": "/path/to/example-skill",
  "timestamp": "2025-10-24T14:21:00Z",
  "summary": {
    "overall_risk": "HIGH",
    "total_findings": 5,
    "critical": 1,
    "high": 2,
    "medium": 2,
    "low": 0,
    "recommendation": "REVIEW"
  },
  "findings": [
    {
      "severity": "CRITICAL",
      "category": "Command Injection",
      "title": "subprocess with shell=True (command injection risk)",
      "location": "scripts/process.py:47",
      "evidence": "subprocess.run(f\"convert {user_file}\", shell=True)",
      "impact": "Attacker could execute arbitrary commands"
    }
  ]
}
```

## Skill Structure

```
skill-security-analyzer/
├── SKILL.md                           # Main skill instructions
├── scripts/
│   └── security_scanner.py            # Automated scanner
├── references/
│   ├── vulnerability_patterns.md      # Malicious pattern database
│   └── safe_coding_practices.md       # Security best practices
└── README.md                          # This file
```

## Security Scanner Features

The automated scanner checks for:

- ✅ Command injection patterns
- ✅ Code execution vulnerabilities
- ✅ YAML injection in frontmatter
- ✅ Data exfiltration attempts
- ✅ Credential theft patterns
- ✅ Code obfuscation (base64, hex, compression)
- ✅ Hardcoded secrets
- ✅ Path traversal vulnerabilities
- ✅ Unsafe dependencies (typosquatting)
- ✅ Undocumented network access
- ✅ Suspicious file operations
- ✅ Executable files disguised as documents

## Risk Rating Criteria

### CRITICAL - Do Not Install
- Command injection vulnerabilities
- Credential theft attempts
- Data exfiltration to external servers
- Reverse shells or backdoors
- YAML injection exploits

**Action:** REJECT installation, report to marketplace

### HIGH - Review Required
- Undocumented network calls
- File access outside skill directory
- Use of eval/exec without justification
- Obfuscated code sections
- Missing input validation

**Action:** Request clarification, conduct thorough review

### MEDIUM - Acceptable with Caution
- Documented network calls for legitimate purposes
- File operations within skill directory
- Subprocess with static commands
- Well-known dependencies
- Minor best practice violations

**Action:** Understand risks, monitor after installation

### LOW - Safe to Install
- Well-structured code
- All functionality documented
- Proper input validation
- File operations scoped correctly
- No dangerous functions

**Action:** Install with confidence

## Development

### Running Tests

```bash
# Test on a known-safe skill
python3 scripts/security_scanner.py /path/to/safe-skill

# Test on a skill with issues (for testing detection)
python3 scripts/security_scanner.py /path/to/test-skill --verbose
```

### Adding New Patterns

To add new vulnerability patterns, update:
- `scripts/security_scanner.py` - Add detection logic
- `references/vulnerability_patterns.md` - Document the pattern

### Contributing

If you discover new attack vectors or vulnerability patterns:
1. Document the pattern in `vulnerability_patterns.md`
2. Add detection logic to `security_scanner.py`
3. Test on sample skills
4. Submit updates

## Limitations

This skill provides thorough automated and manual analysis, but:

- **Cannot guarantee 100% detection** - New attack vectors emerge constantly
- **Context matters** - Some patterns are safe in specific contexts
- **Requires manual review** - Automated tools catch ~60-70% of issues
- **False positives possible** - Always verify findings manually

**Recommendation:** Use this as a first-pass filter, then conduct manual code review for critical skills.

## Best Practices for Users

1. **Always scan before installation** - Especially for skills from unknown sources
2. **Read the full report** - Don't just look at the risk rating
3. **Understand the findings** - Context matters for some detections
4. **When in doubt, reject** - Better safe than compromised
5. **Report malicious skills** - Help protect the community
6. **Periodic re-scans** - Scan skills again after updates

## License

This skill is provided as-is for security analysis purposes. Use responsibly.

## Support

For issues or questions about this skill:
- Check `references/vulnerability_patterns.md` for pattern details
- Review `references/safe_coding_practices.md` for remediation guidance
- Report bugs or feature requests through your marketplace

## Version

**Version:** 1.0
**Created:** October 2025
**Scanner Version:** 1.0
**WCAG Compliance:** Based on WCAG 2.2 security principles

---

**Important:** This skill analyzes code for security issues but does not modify or fix code. It provides detection and guidance only. Always conduct manual review of security-critical skills.
