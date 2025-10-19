# Frontend Best Practices Reference

This reference provides comprehensive guidelines for reviewing frontend code across React/Vue/Angular, HTML/CSS, accessibility, and performance.

## React/Vue/Angular Best Practices

### Component Architecture

**Single Responsibility Principle**
- Each component should have one clear purpose
- Split large components into smaller, focused units
- Extract reusable logic into custom hooks or composables

**Props and State Management**
- Use TypeScript interfaces for props validation
- Avoid prop drilling beyond 2-3 levels (use context/store instead)
- Keep component state local when possible
- Lift state only when shared across siblings
- Use controlled components for form inputs

**Hooks and Lifecycle (React)**
- Use `useCallback` for functions passed as props to prevent re-renders
- Use `useMemo` for expensive computations only
- Keep effects focused and minimal
- Always clean up effects (return cleanup functions)
- List all dependencies in dependency arrays
- Prefer custom hooks for reusable stateful logic

**Composables (Vue)**
- Extract reusable reactive logic into composables
- Use proper ref/reactive patterns
- Return only what consumers need
- Name composables with `use` prefix

**Performance Patterns**
- Use React.memo/Vue computed for expensive renders
- Implement virtualization for long lists (react-window, vue-virtual-scroller)
- Lazy load routes and heavy components
- Identify unnecessary re-renders (missing React.memo, useMemo, useCallback)
- Detect expensive computations in render
- Bundle size impact of new dependencies
- Code splitting by route or feature
- Lazy loading opportunities
- Virtualization for large lists (1000+ items)

**Type Safety**
- Strict TypeScript usage, no `any` types without justification
- Proper generic usage in components and hooks
- Type inference and discriminated unions
- Interface vs Type usage patterns
- Consistent type naming conventions




### Framework-Specific Patterns

**React**
- Use functional components over class components
- Prefer composition over inheritance
- Use fragments to avoid unnecessary DOM nodes
- Implement error boundaries for error handling

**Vue**
- Use Composition API for complex logic
- Keep template logic minimal (move to computed/methods)
- Use proper v-key on v-for loops
- Avoid using v-if with v-for on the same element

**Angular**
- Use OnPush change detection when possible
- Implement trackBy for ngFor loops
- Unsubscribe from observables in ngOnDestroy
- Use async pipe over manual subscriptions

## HTML/CSS Best Practices

### Semantic HTML

**Structure**
- Use semantic elements: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<aside>`, `<footer>`
- Use `<button>` for clickable actions, `<a>` for navigation
- Use proper heading hierarchy (h1-h6)
- Wrap form inputs in `<label>` or use for/id association

**Forms**
- Use appropriate input types (email, tel, number, date, etc.)
- Include autocomplete attributes for better UX
- Use fieldset/legend for grouped inputs
- Provide clear error messages

### CSS Organization

**Architecture**
- Follow a methodology (BEM, SMACSS, or utility-first)
- Keep specificity low and flat
- Avoid !important unless absolutely necessary
- Use CSS custom properties for theming

**Responsive Design**
- Mobile-first approach
- Use relative units (rem, em, %, vh/vw) over px
- Test across breakpoints
- Use container queries where appropriate

**Modern CSS**
- Use Flexbox/Grid over floats
- Leverage CSS custom properties for dynamic values
- Use CSS logical properties for i18n (margin-inline, padding-block)
- Implement dark mode with prefers-color-scheme

**Performance**
- Avoid expensive properties (box-shadow, transform, filter in transitions)
- Use contain property for isolated components
- Minimize reflows and repaints
- Use will-change sparingly

## Accessibility (a11y) Guidelines

### ARIA and Semantics

**ARIA Basics**
- Use semantic HTML first, ARIA second
- Don't override native semantics (e.g., `<button role="link">`)
- All interactive elements need accessible names
- Use aria-label/aria-labelledby when text alone is insufficient

**Common ARIA Patterns**
- Modal: `role="dialog"`, `aria-modal="true"`, focus trap
- Tabs: `role="tablist/tab/tabpanel"`, proper aria-selected
- Accordion: `aria-expanded`, `aria-controls`
- Dropdown: `aria-haspopup`, `aria-expanded`

### Keyboard Navigation

**Focus Management**
- All interactive elements must be keyboard accessible
- Logical tab order (use tabindex="0" or rely on DOM order)
- Visible focus indicators (outline, ring)
- Skip links for main content
- Trap focus in modals
- Return focus after modal close

**Custom Controls**
- Implement proper keyboard interactions (Arrow keys, Enter, Space, Esc)
- Follow WAI-ARIA authoring practices patterns

### Screen Reader Support

**Text Alternatives**
- All images need alt text (or alt="" if decorative)
- Icons need aria-label or sr-only text
- Complex images need longer descriptions

**Live Regions**
- Use aria-live for dynamic content updates
- Choose appropriate politeness level (polite/assertive)
- Provide status messages for async operations

**Form Accessibility**
- Associate labels with inputs
- Provide clear error messages with aria-describedby
- Use aria-invalid for validation state
- Group related inputs with fieldset/legend

### Color and Contrast

**WCAG Standards**
- Minimum 4.5:1 contrast for normal text (AA)
- Minimum 3:1 for large text (AA)
- Minimum 7:1 for normal text (AAA)
- Don't rely on color alone to convey information

## Performance Optimization

### Bundle Size

**Code Splitting**
- Split by route (lazy load pages)
- Split by feature or component
- Use dynamic imports for heavy libraries
- Implement lazy loading for below-fold content

**Tree Shaking**
- Use ES6 imports (not CommonJS require)
- Import only what's needed (e.g., `import { specific } from 'lib'`)
- Check for side-effect-free modules

**Dependencies**
- Audit bundle with webpack-bundle-analyzer or similar
- Replace heavy libraries with lighter alternatives
- Use lodash-es and import specific functions
- Avoid including entire icon libraries

### Runtime Performance

**Rendering**
- Minimize re-renders (React.memo, useMemo, useCallback)
- Virtualize long lists
- Debounce/throttle expensive operations
- Use web workers for heavy computations

**Images and Media**
- Use modern formats (WebP, AVIF)
- Implement responsive images (srcset, sizes)
- Lazy load images below fold
- Provide proper width/height to avoid CLS

**Network**
- Minimize HTTP requests
- Use HTTP/2 or HTTP/3
- Implement proper caching strategies
- Prefetch/preload critical resources

### Metrics and Monitoring

**Core Web Vitals**
- LCP (Largest Contentful Paint) < 2.5s
- FID (First Input Delay) < 100ms
- CLS (Cumulative Layout Shift) < 0.1

**Other Metrics**
- Time to Interactive (TTI)
- Total Blocking Time (TBT)
- First Contentful Paint (FCP)

## Security Best Practices

**XSS Prevention**
- Sanitize user input
- Use framework's built-in escaping
- Avoid dangerouslySetInnerHTML / v-html unless sanitized

**Dependencies**
- Keep dependencies updated
- Run security audits regularly (npm audit, yarn audit)
- Use dependabot or similar

**Secrets and Tokens**
- Never commit secrets/tokens in frontend code
- Use environment variables for configuration
- Validate on backend, not just frontend
