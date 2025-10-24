#!/usr/bin/env python3
"""
Automated Security Scanner for Claude Code Skills
Detects malicious code patterns, YAML injection, supply chain risks, and best practice violations
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple
from datetime import datetime

class SecurityScanner:
    """Automated security scanner for Claude skills"""

    # Severity levels
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"

    def __init__(self, skill_path: str, verbose: bool = False):
        self.skill_path = Path(skill_path)
        self.verbose = verbose
        self.findings = []

    def scan(self) -> Dict:
        """Run comprehensive security scan"""
        print(f"Scanning skill at: {self.skill_path}", file=sys.stderr)

        if not self.skill_path.exists():
            raise ValueError(f"Skill path does not exist: {self.skill_path}")

        # Run all security checks
        self._check_skill_structure()
        self._scan_yaml_frontmatter()
        self._scan_scripts()
        self._scan_references()
        self._scan_assets()
        self._check_dependencies()
        self._check_network_operations()
        self._check_file_operations()

        # Generate report
        report = self._generate_report()
        return report

    def _check_skill_structure(self):
        """Verify skill has expected structure"""
        skill_md = self.skill_path / "SKILL.md"

        if not skill_md.exists():
            self.findings.append({
                "severity": self.CRITICAL,
                "category": "Structure",
                "title": "Missing SKILL.md",
                "description": "Required SKILL.md file not found",
                "location": str(self.skill_path),
                "impact": "Skill cannot function without SKILL.md"
            })

    def _scan_yaml_frontmatter(self):
        """Check YAML frontmatter for injection attacks"""
        skill_md = self.skill_path / "SKILL.md"

        if not skill_md.exists():
            return

        content = skill_md.read_text(encoding='utf-8')

        # Extract frontmatter
        frontmatter_match = re.match(r'^---\n(.*?)\n---', content, re.DOTALL)

        if not frontmatter_match:
            self.findings.append({
                "severity": self.HIGH,
                "category": "YAML",
                "title": "Missing YAML frontmatter",
                "description": "SKILL.md missing required YAML frontmatter",
                "location": "SKILL.md:1",
                "impact": "Skill metadata cannot be parsed"
            })
            return

        frontmatter = frontmatter_match.group(1)

        # Check for YAML injection patterns
        dangerous_patterns = [
            (r'!\s*<', "YAML tag directive (potential code execution)"),
            (r'__proto__', "Prototype pollution attempt"),
            (r'!!python', "Python object deserialization"),
            (r'eval\(', "Eval function call in YAML"),
            (r'exec\(', "Exec function call in YAML"),
        ]

        for pattern, desc in dangerous_patterns:
            if re.search(pattern, frontmatter, re.IGNORECASE):
                self.findings.append({
                    "severity": self.CRITICAL,
                    "category": "YAML Injection",
                    "title": f"Dangerous YAML pattern: {desc}",
                    "description": f"YAML frontmatter contains '{pattern}' which could execute code",
                    "location": "SKILL.md frontmatter",
                    "impact": "Arbitrary code execution during skill parsing"
                })

    def _scan_scripts(self):
        """Scan all scripts for security issues"""
        scripts_dir = self.skill_path / "scripts"

        if not scripts_dir.exists():
            return

        for script_file in scripts_dir.rglob("*"):
            if script_file.is_file() and script_file.suffix in ['.py', '.sh', '.bash', '.js']:
                self._analyze_script(script_file)

    def _analyze_script(self, script_path: Path):
        """Analyze individual script for vulnerabilities"""
        try:
            content = script_path.read_text(encoding='utf-8')
        except Exception as e:
            self.findings.append({
                "severity": self.MEDIUM,
                "category": "File Access",
                "title": f"Cannot read script: {script_path.name}",
                "description": f"Error reading file: {e}",
                "location": str(script_path),
                "impact": "Unable to analyze script for security issues"
            })
            return

        relative_path = script_path.relative_to(self.skill_path)

        # Check for command injection
        self._check_command_injection(content, relative_path)

        # Check for data exfiltration
        self._check_data_exfiltration(content, relative_path)

        # Check for credential theft
        self._check_credential_theft(content, relative_path)

        # Check for code obfuscation
        self._check_obfuscation(content, relative_path)

        # Check for hardcoded secrets
        self._check_hardcoded_secrets(content, relative_path)

    def _check_command_injection(self, content: str, file_path: Path):
        """Check for command injection vulnerabilities"""
        dangerous_patterns = [
            (r'os\.system\s*\(', "os.system() call (unsafe command execution)"),
            (r'subprocess\.[^(]*\([^)]*shell\s*=\s*True', "subprocess with shell=True (command injection risk)"),
            (r'eval\s*\(', "eval() call (code execution)"),
            (r'exec\s*\(', "exec() call (code execution)"),
            (r'__import__\s*\(', "Dynamic import (code loading)"),
            (r'compile\s*\(', "compile() call (dynamic code compilation)"),
        ]

        for pattern, desc in dangerous_patterns:
            for match in re.finditer(pattern, content):
                line_num = content[:match.start()].count('\n') + 1
                self.findings.append({
                    "severity": self.CRITICAL,
                    "category": "Command Injection",
                    "title": desc,
                    "description": f"Found {pattern} which allows arbitrary code execution",
                    "location": f"{file_path}:{line_num}",
                    "evidence": self._get_code_context(content, match.start()),
                    "impact": "Attacker could execute arbitrary commands"
                })

    def _check_data_exfiltration(self, content: str, file_path: Path):
        """Check for data exfiltration patterns"""
        network_patterns = [
            (r'requests\.(get|post|put|delete|patch)', "HTTP request (potential data exfiltration)"),
            (r'urllib\.request\.urlopen', "URL open (potential data exfiltration)"),
            (r'socket\.connect', "Socket connection (network access)"),
            (r'http\.client', "HTTP client (network access)"),
            (r'aiohttp\.|httpx\.', "Async HTTP library (network access)"),
        ]

        for pattern, desc in network_patterns:
            for match in re.finditer(pattern, content):
                line_num = content[:match.start()].count('\n') + 1

                # Extract URL/domain if visible
                line_start = content.rfind('\n', 0, match.start()) + 1
                line_end = content.find('\n', match.end())
                if line_end == -1:
                    line_end = len(content)
                line_content = content[line_start:line_end]

                self.findings.append({
                    "severity": self.HIGH,
                    "category": "Data Exfiltration",
                    "title": desc,
                    "description": f"Network request found - verify it's documented and necessary",
                    "location": f"{file_path}:{line_num}",
                    "evidence": line_content.strip(),
                    "impact": "Could send data to external servers"
                })

    def _check_credential_theft(self, content: str, file_path: Path):
        """Check for credential theft patterns"""
        credential_patterns = [
            (r'open\s*\(\s*["\']~/\.ssh/', "Reading SSH keys"),
            (r'open\s*\(\s*["\']~/\.aws/', "Reading AWS credentials"),
            (r'open\s*\(\s*["\']~/\.netrc', "Reading .netrc credentials"),
            (r'open\s*\(\s*["\']~/\.docker/config\.json', "Reading Docker credentials"),
            (r'os\.environ\[(["\']).*(?:KEY|SECRET|TOKEN|PASSWORD)', "Accessing credential environment variables"),
        ]

        for pattern, desc in credential_patterns:
            for match in re.finditer(pattern, content, re.IGNORECASE):
                line_num = content[:match.start()].count('\n') + 1
                self.findings.append({
                    "severity": self.CRITICAL,
                    "category": "Credential Theft",
                    "title": desc,
                    "description": f"Attempting to read sensitive credentials",
                    "location": f"{file_path}:{line_num}",
                    "evidence": self._get_code_context(content, match.start()),
                    "impact": "Could steal user credentials"
                })

    def _check_obfuscation(self, content: str, file_path: Path):
        """Check for code obfuscation"""
        obfuscation_patterns = [
            (r'base64\.b64decode\s*\([^)]*\)\s*\.decode\(\)', "Base64 decode (potential obfuscation)"),
            (r'bytes\.fromhex\s*\(', "Hex string decode (potential obfuscation)"),
            (r'codecs\.decode\s*\([^)]*,\s*["\']rot', "ROT encoding (obfuscation)"),
            (r'zlib\.decompress|gzip\.decompress', "Compressed data (potential payload)"),
            (r'marshal\.loads', "Marshal deserialization (code loading)"),
        ]

        for pattern, desc in obfuscation_patterns:
            for match in re.finditer(pattern, content):
                line_num = content[:match.start()].count('\n') + 1

                # Check if followed by exec/eval
                context = content[match.end():match.end()+100]
                if re.search(r'(exec|eval)\s*\(', context):
                    severity = self.CRITICAL
                    impact = "Executing obfuscated code - likely malicious"
                else:
                    severity = self.MEDIUM
                    impact = "Code obfuscation detected - manual review required"

                self.findings.append({
                    "severity": severity,
                    "category": "Obfuscation",
                    "title": desc,
                    "description": "Code using encoding/compression - may hide malicious intent",
                    "location": f"{file_path}:{line_num}",
                    "evidence": self._get_code_context(content, match.start()),
                    "impact": impact
                })

    def _check_hardcoded_secrets(self, content: str, file_path: Path):
        """Check for hardcoded credentials"""
        secret_patterns = [
            (r'(?:API_KEY|APIKEY|API-KEY)\s*=\s*["\'][^"\']{10,}', "Hardcoded API key"),
            (r'(?:SECRET|PASSWORD|PASSWD|PWD)\s*=\s*["\'][^"\']{6,}', "Hardcoded password/secret"),
            (r'(?:TOKEN|AUTH_TOKEN|ACCESS_TOKEN)\s*=\s*["\'][^"\']{10,}', "Hardcoded token"),
            (r'sk-[a-zA-Z0-9]{32,}', "Stripe/OpenAI API key pattern"),
            (r'ghp_[a-zA-Z0-9]{36,}', "GitHub Personal Access Token"),
        ]

        for pattern, desc in secret_patterns:
            for match in re.finditer(pattern, content, re.IGNORECASE):
                line_num = content[:match.start()].count('\n') + 1

                # Skip if it's clearly a placeholder
                matched_text = match.group(0)
                if any(placeholder in matched_text.lower() for placeholder in ['example', 'placeholder', 'your_', 'xxx', 'test']):
                    continue

                self.findings.append({
                    "severity": self.HIGH,
                    "category": "Hardcoded Secrets",
                    "title": desc,
                    "description": "Hardcoded credential found in source code",
                    "location": f"{file_path}:{line_num}",
                    "evidence": "*** (redacted for security)",
                    "impact": "Credentials could be exposed to anyone with access to skill files"
                })

    def _check_dependencies(self):
        """Check for suspicious dependencies"""
        scripts_dir = self.skill_path / "scripts"

        if not scripts_dir.exists():
            return

        all_imports = set()

        for script_file in scripts_dir.rglob("*.py"):
            content = script_file.read_text(encoding='utf-8', errors='ignore')

            # Extract imports
            imports = re.findall(r'^\s*(?:import|from)\s+([a-zA-Z0-9_]+)', content, re.MULTILINE)
            all_imports.update(imports)

        # Check for suspicious packages (typosquatting, etc.)
        suspicious_packages = {
            'reqeusts': 'requests',  # typo
            'urlib': 'urllib',
            'subproces': 'subprocess',
        }

        for pkg in all_imports:
            if pkg in suspicious_packages:
                self.findings.append({
                    "severity": self.CRITICAL,
                    "category": "Supply Chain",
                    "title": f"Typosquatting attempt: {pkg}",
                    "description": f"Package '{pkg}' looks like typo of '{suspicious_packages[pkg]}'",
                    "location": "scripts/",
                    "impact": "Could be malicious package masquerading as legitimate library"
                })

    def _check_network_operations(self):
        """Check for network operations across all files"""
        network_count = 0

        for script_file in self.skill_path.rglob("*.py"):
            content = script_file.read_text(encoding='utf-8', errors='ignore')

            if re.search(r'(requests|urllib|socket|http)\s*\.\s*(get|post|connect|urlopen)', content):
                network_count += 1

        if network_count > 0:
            # Check if network usage is documented in SKILL.md
            skill_md = self.skill_path / "SKILL.md"

            if skill_md.exists():
                skill_content = skill_md.read_text(encoding='utf-8')

                if not re.search(r'(network|http|api|request)', skill_content, re.IGNORECASE):
                    self.findings.append({
                        "severity": self.HIGH,
                        "category": "Documentation",
                        "title": "Undocumented network access",
                        "description": f"Found {network_count} files with network operations but no mention in SKILL.md",
                        "location": "SKILL.md",
                        "impact": "Users unaware skill makes external requests"
                    })

    def _check_file_operations(self):
        """Check for risky file operations"""
        for script_file in self.skill_path.rglob("*.py"):
            content = script_file.read_text(encoding='utf-8', errors='ignore')
            relative_path = script_file.relative_to(self.skill_path)

            # Check for path traversal
            if re.search(r'open\s*\([^)]*\.\./|/tmp/|/etc/|/var/', content):
                line_num = content.find('../') or content.find('/tmp/') or content.find('/etc/')
                line_num = content[:line_num].count('\n') + 1 if line_num else 0

                self.findings.append({
                    "severity": self.HIGH,
                    "category": "File Operations",
                    "title": "Suspicious file path access",
                    "description": "File access to paths outside skill directory",
                    "location": f"{relative_path}:{line_num}",
                    "impact": "Could access/modify files outside skill scope"
                })

    def _scan_references(self):
        """Scan reference files for issues"""
        refs_dir = self.skill_path / "references"

        if not refs_dir.exists():
            return

        # Check for executable content disguised as docs
        for ref_file in refs_dir.rglob("*"):
            if ref_file.is_file():
                try:
                    content = ref_file.read_text(encoding='utf-8', errors='ignore')

                    # Check for code patterns in markdown
                    if ref_file.suffix == '.md' and re.search(r'```.*(?:eval|exec|os\.system)', content):
                        self.findings.append({
                            "severity": self.MEDIUM,
                            "category": "References",
                            "title": f"Executable code in reference: {ref_file.name}",
                            "description": "Reference documentation contains executable code patterns",
                            "location": str(ref_file.relative_to(self.skill_path)),
                            "impact": "Verify code examples are safe and intended"
                        })
                except:
                    pass

    def _scan_assets(self):
        """Scan asset files for issues"""
        assets_dir = self.skill_path / "assets"

        if not assets_dir.exists():
            return

        for asset_file in assets_dir.rglob("*"):
            if asset_file.is_file():
                # Check if file extension matches actual content
                import mimetypes
                guessed_type = mimetypes.guess_type(asset_file)[0]

                # Check for executables with misleading extensions
                if asset_file.suffix in ['.txt', '.md', '.pdf', '.png', '.jpg']:
                    with open(asset_file, 'rb') as f:
                        header = f.read(4)

                        # Check for executable headers
                        if header in [b'\x7fELF', b'MZ\x90\x00', b'\xca\xfe\xba\xbe']:
                            self.findings.append({
                                "severity": self.CRITICAL,
                                "category": "Assets",
                                "title": f"Executable disguised as {asset_file.suffix}",
                                "description": f"File {asset_file.name} appears to be executable",
                                "location": str(asset_file.relative_to(self.skill_path)),
                                "impact": "Malicious executable hiding as innocent file type"
                            })

    def _get_code_context(self, content: str, position: int, lines_before=1, lines_after=1) -> str:
        """Get code context around a position"""
        line_start = position
        for _ in range(lines_before):
            prev_newline = content.rfind('\n', 0, line_start)
            if prev_newline != -1:
                line_start = prev_newline

        line_end = position
        for _ in range(lines_after):
            next_newline = content.find('\n', line_end + 1)
            if next_newline != -1:
                line_end = next_newline
            else:
                break

        context = content[line_start:line_end].strip()
        return context[:200] + '...' if len(context) > 200 else context

    def _generate_report(self) -> Dict:
        """Generate security report"""
        # Count findings by severity
        severity_counts = {
            self.CRITICAL: 0,
            self.HIGH: 0,
            self.MEDIUM: 0,
            self.LOW: 0
        }

        for finding in self.findings:
            severity_counts[finding['severity']] += 1

        # Determine overall risk
        if severity_counts[self.CRITICAL] > 0:
            overall_risk = self.CRITICAL
            recommendation = "REJECT"
        elif severity_counts[self.HIGH] > 3:
            overall_risk = self.HIGH
            recommendation = "REVIEW"
        elif severity_counts[self.HIGH] > 0:
            overall_risk = "MEDIUM-HIGH"
            recommendation = "REVIEW"
        elif severity_counts[self.MEDIUM] > 5:
            overall_risk = self.MEDIUM
            recommendation = "REVIEW"
        else:
            overall_risk = "LOW"
            recommendation = "APPROVE"

        report = {
            "skill": self.skill_path.name,
            "location": str(self.skill_path),
            "timestamp": datetime.utcnow().isoformat() + 'Z',
            "scanner_version": "1.0",
            "summary": {
                "overall_risk": overall_risk,
                "total_findings": len(self.findings),
                "critical": severity_counts[self.CRITICAL],
                "high": severity_counts[self.HIGH],
                "medium": severity_counts[self.MEDIUM],
                "low": severity_counts[self.LOW],
                "recommendation": recommendation
            },
            "findings": self.findings
        }

        return report


def main():
    parser = argparse.ArgumentParser(
        description='Automated security scanner for Claude Code skills'
    )
    parser.add_argument('skill_path', help='Path to skill directory')
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--output', '-o', help='Output JSON file (default: stdout)')
    parser.add_argument('--recursive', '-r', action='store_true', help='Scan all skills in directory')

    args = parser.parse_args()

    if args.recursive:
        # Scan all subdirectories as skills
        skill_paths = [d for d in Path(args.skill_path).iterdir() if d.is_dir()]
    else:
        skill_paths = [Path(args.skill_path)]

    all_reports = []

    for skill_path in skill_paths:
        try:
            scanner = SecurityScanner(skill_path, verbose=args.verbose)
            report = scanner.scan()
            all_reports.append(report)

            # Print summary
            print(f"\n{'='*60}", file=sys.stderr)
            print(f"Skill: {report['skill']}", file=sys.stderr)
            print(f"Overall Risk: {report['summary']['overall_risk']}", file=sys.stderr)
            print(f"Recommendation: {report['summary']['recommendation']}", file=sys.stderr)
            print(f"Findings: {report['summary']['total_findings']} " +
                  f"(CRITICAL: {report['summary']['critical']}, " +
                  f"HIGH: {report['summary']['high']}, " +
                  f"MEDIUM: {report['summary']['medium']}, " +
                  f"LOW: {report['summary']['low']})", file=sys.stderr)
            print(f"{'='*60}", file=sys.stderr)

        except Exception as e:
            print(f"Error scanning {skill_path}: {e}", file=sys.stderr)
            continue

    # Output results
    if args.recursive:
        output_data = {"scans": all_reports}
    else:
        output_data = all_reports[0] if all_reports else {}

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(output_data, f, indent=2)
        print(f"\nReport written to: {args.output}", file=sys.stderr)
    else:
        print(json.dumps(output_data, indent=2))


if __name__ == '__main__':
    main()
