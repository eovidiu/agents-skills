# Claude Code Skills Marketplace

A collection of custom skills for Claude Code that enhance your development workflow with specialized expertise and domain knowledge.

## What are Claude Skills?

Claude Skills are specialized prompt extensions that give Claude Code domain-specific expertise. Learn more in the [official Claude Skills documentation](https://docs.claude.com/en/docs/claude-code/skills).

Each skill provides:

- **Focused Knowledge**: Deep understanding of specific frameworks, tools, or workflows
- **Best Practices**: Senior-level guidance and production-ready patterns
- **Reference Materials**: Comprehensive documentation and examples
- **Reusable Templates**: Starter projects and boilerplates
- **Scripts & Tools**: Executable utilities for common tasks

## Skills Overview

### Frontend Reviewer
Systematic code review for React, Vue, and Angular applications. Analyzes component architecture, HTML/CSS, accessibility (WCAG 2.1), and performance. Produces categorized checklists with severity ratings and actionable recommendations. Covers React 19 patterns, hooks, TypeScript, Tailwind CSS, state management, and build optimization. Identifies anti-patterns with specific file/line references and concrete fixes.

### Fastify Expert
Senior-level expertise for high-performance Node.js applications with Fastify. Covers plugin architecture, schema-first development with JSON Schema/TypeBox, and performance engineering using autocannon and clinic.js. Includes production-ready boilerplate with database integration, authentication, Docker setup, and comprehensive testing. Provides detailed references for architecture, optimization, security, and deployment patterns.

### TDD UI Expert
Pragmatic Test-Driven Development for React applications using React Testing Library and MSW for API mocking. Emphasizes integration-first testing strategy and Red-Green-Refactor cycle. Covers testing components, forms, hooks, and authentication flows. Focuses on behavior-driven testing—test what matters (business logic, workflows) while skipping what doesn't (CSS, styling). Includes templates and setup scripts.

### Web Accessibility Checker
Comprehensive accessibility compliance checker for WCAG 2.2 Level AA and European Accessibility Act (EAA) requirements. Provides automated testing with axe-core, manual testing procedures, and structured compliance reports. Covers keyboard navigation, screen reader testing, color contrast, and form accessibility. Includes detailed WCAG 2.2 success criteria reference, manual testing checklist, and EAA compliance guidance. Generates prioritized remediation reports with specific code examples.

## Available Skills

| Skill | Location | Category |
|-------|----------|----------|
| Frontend Reviewer | `frontend-reviewer-skill/` | Frontend |
| Fastify Expert | `fastify-expert/` | Backend |
| TDD UI Expert | `tdd-ui-expert/` | Testing |
| Web Accessibility Checker | `web-accessibility-checker/` | Accessibility |

## Using This Marketplace in Your Project

### Option 1: Use Via GitHub (Recommended)

1. **Install the marketplace** in your Claude Code configuration:

```bash
# Add to your .claude/plugins.json
{
  "mcpServers": {},
  "agentPlugins": [
    {
      "name": "eovidiu-agent-skills",
      "source": "github",
      "repository": "eovidiu/agents-skills",
      "branch": "main",
      "path": ".claude-plugin/marketplace.json"
    }
  ]
}
```

2. **Reload Claude Code** to load the skills

3. **Use skills in your conversations**:
```
Use the frontend-reviewer skill to review my React component
```

or

```
Use the fastify-expert skill to help me build a REST API
```

### Option 2: Use Locally

1. **Clone this repository**:
```bash
git clone https://github.com/eovidiu/agents-skills.git
cd agents-skills
```

2. **Link to your project**:
```bash
# In your project directory
mkdir -p .claude/skills
ln -s /path/to/agents-skills/frontend-reviewer-skill .claude/skills/
ln -s /path/to/agents-skills/fastify-expert .claude/skills/
```

3. **Configure in your project's `.claude/plugins.json`**:
```json
{
  "agentPlugins": [
    {
      "name": "local-skills",
      "source": "local",
      "path": ".claude/skills"
    }
  ]
}
```

4. **Use the skills** by mentioning them in your conversation with Claude

## Skill Structure

Each skill follows a standard structure:

```
skill-name/
├── SKILL.md           # Main skill definition with frontmatter
├── references/        # Detailed documentation loaded on-demand
│   └── *.md
├── scripts/           # Executable utilities
│   └── *.sh
└── assets/            # Templates, boilerplates, examples
    └── */
```

### SKILL.md Format

The main skill file uses YAML frontmatter:

```markdown
---
name: skill-name
description: Brief description used in skill listing
---

# Skill Title

## Overview
Comprehensive explanation of what this skill provides...

## Core Capabilities
Detailed sections on what the skill can do...

## Quick Start
Step-by-step guide to getting started...

## Resources
Links to reference docs, scripts, and assets...
```

## Creating Your Own Skills

### 1. Create the Skill Structure

```bash
mkdir my-skill
cd my-skill
```

### 2. Create SKILL.md

```markdown
---
name: my-skill
description: What your skill does in one sentence
---

# My Skill

## Overview
Explain what problem this skill solves and when to use it.

## Core Capabilities
List the main things this skill can help with.

## Quick Start
Provide a simple getting-started guide.

## Resources
Link to any references, scripts, or assets.
```

### 3. Add References (Optional)

```bash
mkdir references
# Add detailed documentation files
echo "# Advanced Topic" > references/advanced.md
```

### 4. Add Scripts (Optional)

```bash
mkdir scripts
# Add executable utilities
cat > scripts/helper.sh << 'EOF'
#!/bin/bash
# Your script here
EOF
chmod +x scripts/helper.sh
```

### 5. Add Assets (Optional)

```bash
mkdir -p assets/my-template
# Add boilerplate code, templates, etc.
```

### 6. Test Your Skill

Use it locally first:
```bash
ln -s /path/to/my-skill ~/.claude/skills/
```

Then ask Claude to use it:
```
Use the my-skill to help me with...
```

## Contributing New Skills

We welcome contributions! To add a skill to this marketplace:

1. **Fork this repository**

2. **Create your skill** following the structure above

3. **Update marketplace.json**:

```json
{
  "plugins": [
    {
      "name": "your-skills-plugin",
      "description": "Your plugin description",
      "source": "./",
      "strict": false,
      "skills": [
        "./your-skill-name"
      ]
    }
  ]
}
```

4. **Submit a Pull Request** with:
   - Your skill directory
   - Updated marketplace.json
   - Brief description of the skill's value

### Contribution Guidelines

- **Quality Over Quantity**: Focus on depth and production-readiness
- **Clear Documentation**: Provide comprehensive examples
- **Tested Patterns**: Include only battle-tested approaches
- **Senior-Level Thinking**: Emphasize architectural judgment and trade-offs
- **Avoid Duplication**: Check existing skills first
- **Reference Materials**: Link to authoritative sources
- **Working Examples**: Include runnable code when possible

## Marketplace Configuration

The `.claude-plugin/marketplace.json` file defines how skills are packaged:

```json
{
  "name": "marketplace-name",
  "owner": {
    "name": "Your Name",
    "email": "your-email@example.com"
  },
  "metadata": {
    "description": "What your skill collection provides",
    "version": "1.0.0"
  },
  "plugins": [
    {
      "name": "plugin-name",
      "description": "Plugin description",
      "source": "./",
      "strict": false,
      "skills": [
        "./skill-1",
        "./skill-2"
      ]
    }
  ]
}
```

## Best Practices

### For Skill Creators

1. **Be Opinionated**: Provide clear guidance, not just options
2. **Production Focus**: Emphasize reliability over experimentation
3. **Complete Examples**: Include full, working code samples
4. **Performance Matters**: Include benchmarking and profiling guidance
5. **Security First**: Always include security best practices
6. **Test Everything**: Provide testing strategies and examples
7. **Document Trade-offs**: Explain when NOT to use a pattern
8. **Keep It Fresh**: Update skills as frameworks evolve

### For Skill Users

1. **Read the Full Skill**: Don't just skim the overview
2. **Use References**: Dive into the detailed documentation
3. **Try the Templates**: Start with provided boilerplates
4. **Run the Scripts**: Use included benchmarking and profiling tools
5. **Provide Feedback**: Report issues and suggest improvements
6. **Contribute Back**: Share your learnings with the community

## Troubleshooting

### Skills Not Loading

1. Check your `.claude/plugins.json` configuration
2. Verify the repository/path is correct
3. Reload Claude Code
4. Check Claude Code logs for errors

### Skill Not Activating

1. Explicitly mention the skill name in your request
2. Ensure your request matches the skill's domain
3. Check the skill's description for trigger phrases

### Finding Skill Documentation

Each skill's `SKILL.md` provides:
- Overview and capabilities
- Quick start guide
- Links to detailed references
- Usage examples

## License

MIT - See LICENSE file for details

## Support

- **Issues**: Report bugs or request features via GitHub Issues
- **Discussions**: Share ideas and get help in GitHub Discussions
- **Pull Requests**: Contribute improvements and new skills

## Acknowledgments

Built for the Claude Code community. Contributions from developers building production-grade applications with AI-assisted development.

---

**Happy Coding with Claude!** 🚀
