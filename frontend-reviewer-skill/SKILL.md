---
name: frontend-reviewer-skill
description: Comprehensive frontend code review skill for React/Vue/Angular applications, focusing on component architecture, HTML/CSS structure, accessibility compliance, and performance optimization. Use this skill when reviewing pull requests, commits, or codebases for frontend best practices. Trigger phrases include "review this frontend PR", "run frontend code review", "check frontend best practices", or similar requests for frontend code quality assessment.
---

# Frontend Reviewer Skill

## Overview

This skill provides systematic frontend code review capabilities across React, Vue, Angular, HTML/CSS, accessibility (a11y), and performance optimization. Reviews produce categorized checklists with specific findings, severity ratings, and actionable recommendations.

## Expertise
- React 19 patterns, hooks, and component composition
- TypeScript type safety, generics, and strict mode
- Tailwind CSS and shadcn/ui component architecture (🎨 Blue - UI/Design focus)
- State management: TanStack Query, React Hook Form
- Performance: useMemo, useCallback, React.memo, bundle optimization
- Accessibility: ARIA, Radix UI, keyboard navigation
- Data visualization: Recharts, Plotly, D3, ECharts, Highcharts
- Form validation: Zod, Yup, React Hook Form
- Build optimization: Vite configuration and chunking

## Review Workflow

Follow this workflow when conducting frontend code reviews:

### Step 1: Understand the Scope

Identify what needs to be reviewed:
- **PR/Commit Review**: Use git diff to see changed files
- **File Review**: Read specific files provided
- **Codebase Audit**: Scan relevant directories

Determine the primary framework (React/Vue/Angular) and note any special contexts (e.g., TypeScript, testing files, build configuration).

### Step 2: Load Relevant References

Based on the code being reviewed, load appropriate reference materials:

**For all reviews:**
- Read `references/common-issues.md` to identify known anti-patterns

**For deep reviews or when unfamiliar with specific patterns:**
- Read `references/best-practices.md` for comprehensive guidelines
- Focus on relevant sections (React/Vue/Angular, HTML/CSS, a11y, Performance)

### Step 3: Conduct the Review

Systematically examine the code across these categories:

#### Component Architecture (React/Vue/Angular)
- Single responsibility principle adherence
- Proper state management (local vs. global)
- Props/state handling patterns
- Hooks/composables usage (dependency arrays, cleanup, custom hooks)
- Component composition and reusability
- Lifecycle management
- Error boundaries (React) or error handling

#### HTML/CSS Structure
- Semantic HTML usage
- Form accessibility and validation
- CSS organization and methodology
- Responsive design implementation
- Modern CSS features (Grid, Flexbox, custom properties)
- Performance considerations (expensive properties, reflows)

#### Accessibility (a11y)
- **ARIA**: Proper usage, semantic HTML first, accessible names
- **Keyboard navigation**: Tab order, focus management, focus indicators, custom control interactions
- **Screen readers**: Alt text, aria-live regions, form labels, error messages
- **Color and contrast**: WCAG compliance (4.5:1 minimum for normal text)
- **Focus management**: Modal focus traps, return focus patterns

#### Performance
- **Bundle size**: Code splitting, tree shaking, dependency optimization
- **Runtime performance**: Re-render optimization, virtualization, debouncing
- **Images and media**: Modern formats, responsive images, lazy loading, dimensions
- **Network**: HTTP requests, caching, prefetching
- **Metrics**: Core Web Vitals awareness (LCP, FID, CLS)

#### Security
- XSS prevention (input sanitization, avoiding dangerouslySetInnerHTML)
- Dependency security (audit status)
- No exposed secrets or tokens

### Step 4: Generate Categorized Review Report

Structure findings in this format:

```markdown
# Frontend Code Review

## Summary
[Brief overview: X files reviewed, Y issues found across Z categories]

## 🏗️ Component Architecture
- ✅ **PASS**: [What's working well]
- ⚠️ **WARNING**: [Non-critical issues with recommendations]
- ❌ **ISSUE**: [Critical problems requiring fixes]
  - Location: `file.tsx:42`
  - Problem: [Specific issue]
  - Fix: [Recommended solution]

## 🎨 HTML/CSS Structure
[Same format as above]

## ♿ Accessibility
[Same format as above]

## ⚡ Performance
[Same format as above]

## 🔒 Security
[Same format as above]

## 📊 Overall Assessment
[High-level summary and priority recommendations]
```

### Step 5: Prioritize Findings

Classify issues by severity:

**❌ CRITICAL** - Must fix before merge
- Accessibility blockers (no keyboard access, missing alt text on critical images)
- Security vulnerabilities (XSS, exposed secrets)
- Broken functionality (missing dependencies, state mutation bugs)
- Severe performance issues (no code splitting for large routes)

**⚠️ WARNING** - Should fix soon
- Non-critical accessibility issues (low contrast on secondary text)
- Performance improvements (missing memoization, could use lazy loading)
- Code organization issues (prop drilling, large components)
- Minor anti-patterns (index as key in stable lists)

**✅ PASS / 💡 SUGGESTION** - Nice to have
- Style guide preferences
- Additional optimizations
- Refactoring opportunities

## Common Review Patterns

### React Component Review Checklist
- [ ] All hooks have correct dependency arrays
- [ ] Effects have cleanup functions where needed
- [ ] No direct state mutation
- [ ] Props properly validated (TypeScript interfaces)
- [ ] Memoization used appropriately (React.memo, useMemo, useCallback)
- [ ] Keys on list items are unique and stable
- [ ] No index as key (unless list is truly static)
- [ ] Error boundaries for error handling

### Accessibility Review Checklist
- [ ] All images have alt text (or alt="" if decorative)
- [ ] All interactive elements keyboard accessible
- [ ] Focus indicators visible
- [ ] ARIA used correctly (semantic HTML first)
- [ ] Form inputs have associated labels
- [ ] Color contrast meets WCAG AA (4.5:1 for normal text)
- [ ] No reliance on color alone for information
- [ ] Custom controls implement proper keyboard patterns

### Performance Review Checklist
- [ ] Routes are code-split/lazy-loaded
- [ ] Heavy libraries are tree-shaken or replaced
- [ ] Images are optimized (WebP/AVIF, srcset, lazy loading)
- [ ] Long lists use virtualization
- [ ] No unnecessary re-renders
- [ ] Expensive computations memoized
- [ ] Bundle size is reasonable

## Tips for Effective Reviews

**Be Specific**
- Always include file path and line number (e.g., `components/Header.tsx:23`)
- Provide concrete code examples for fixes
- Reference specific guidelines from the references

**Be Constructive**
- Acknowledge what's done well
- Explain *why* something is an issue, not just *what*
- Offer alternatives and trade-offs

**Be Practical**
- Consider the context (MVP vs. production app)
- Prioritize critical issues over style preferences
- Balance perfectionism with shipping

**Be Educational**
- Link to relevant documentation
- Explain best practices being applied
- Help developers learn, not just fix

## Resources

### references/best-practices.md
Comprehensive frontend guidelines organized by category:
- React/Vue/Angular best practices (hooks, components, state management)
- HTML/CSS guidelines (semantic HTML, responsive design, modern CSS)
- Accessibility standards (ARIA, keyboard navigation, screen readers, WCAG)
- Performance optimization (bundle size, runtime performance, metrics)
- Security practices

Load this reference for in-depth guidelines on specific topics or for comprehensive reviews.

### references/common-issues.md
Catalog of frequent anti-patterns and code smells with examples:
- React anti-patterns (hooks issues, component design, performance)
- Vue anti-patterns (prop mutation, v-if/v-for, reactivity)
- HTML/CSS issues (divitis, specificity, accessibility)
- Performance issues (bundle size, re-renders, optimization)
- Security vulnerabilities (XSS, secrets, validation)

Load this reference to quickly identify known problems and their solutions.
