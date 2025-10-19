# Common Frontend Issues and Anti-Patterns

This reference catalogs frequently encountered anti-patterns, code smells, and common mistakes in frontend development.

## React Anti-Patterns

### Hooks Issues

**❌ Missing Dependencies in useEffect**
```javascript
// BAD: count is used but not in deps
useEffect(() => {
  console.log(count);
}, []);
```
```javascript
// GOOD: Include all dependencies
useEffect(() => {
  console.log(count);
}, [count]);
```

**❌ Mutating State Directly**
```javascript
// BAD: Directly mutating state
const handleClick = () => {
  user.name = 'New Name';
  setUser(user);
};
```
```javascript
// GOOD: Create new object
const handleClick = () => {
  setUser({ ...user, name: 'New Name' });
};
```

**❌ Unnecessary useEffect**
```javascript
// BAD: useEffect for derived state
const [items, setItems] = useState([]);
const [count, setCount] = useState(0);
useEffect(() => {
  setCount(items.length);
}, [items]);
```
```javascript
// GOOD: Just compute it
const [items, setItems] = useState([]);
const count = items.length;
```

**❌ Creating Functions in Render Without useCallback**
```javascript
// BAD: New function on every render
function Parent() {
  const handleClick = () => console.log('clicked');
  return <MemoizedChild onClick={handleClick} />;
}
```
```javascript
// GOOD: Memoize the function
function Parent() {
  const handleClick = useCallback(() => console.log('clicked'), []);
  return <MemoizedChild onClick={handleClick} />;
}
```

### Component Design Issues

**❌ Prop Drilling**
```javascript
// BAD: Passing props through many levels
<A user={user}>
  <B user={user}>
    <C user={user}>
      <D user={user} />
```
```javascript
// GOOD: Use context or state management
const UserContext = createContext();
<UserContext.Provider value={user}>
  <A><B><C><D /></C></B></A>
</UserContext.Provider>
```

**❌ Too Many Responsibilities**
```javascript
// BAD: Component doing too much
function UserDashboard() {
  // Fetching data
  // Managing form state
  // Handling validation
  // Rendering UI
  // Analytics
  // ...500 lines of code
}
```
```javascript
// GOOD: Split into focused components
function UserDashboard() {
  return (
    <>
      <UserProfile />
      <UserSettings />
      <UserAnalytics />
    </>
  );
}
```

**❌ Index as Key in Lists**
```javascript
// BAD: Using index as key
items.map((item, index) => (
  <div key={index}>{item.name}</div>
));
```
```javascript
// GOOD: Use unique identifier
items.map((item) => (
  <div key={item.id}>{item.name}</div>
));
```

### Performance Issues

**❌ No Memoization for Expensive Renders**
```javascript
// BAD: Re-renders on every parent update
function ExpensiveComponent({ data }) {
  return <ComplexVisualization data={data} />;
}
```
```javascript
// GOOD: Memoize if parent re-renders often
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});
```

**❌ Not Cleaning Up Effects**
```javascript
// BAD: Memory leak
useEffect(() => {
  const interval = setInterval(() => {
    console.log('tick');
  }, 1000);
}, []);
```
```javascript
// GOOD: Clean up
useEffect(() => {
  const interval = setInterval(() => {
    console.log('tick');
  }, 1000);
  return () => clearInterval(interval);
}, []);
```

## Vue Anti-Patterns

**❌ Mutating Props**
```javascript
// BAD: Mutating prop directly
props: ['items'],
methods: {
  addItem() {
    this.items.push(newItem); // Don't mutate props!
  }
}
```
```javascript
// GOOD: Emit event to parent
props: ['items'],
emits: ['update:items'],
methods: {
  addItem() {
    this.$emit('update:items', [...this.items, newItem]);
  }
}
```

**❌ v-if with v-for on Same Element**
```vue
<!-- BAD: Performance issue -->
<div v-for="item in items" v-if="item.active">
```
```vue
<!-- GOOD: Computed property -->
<div v-for="item in activeItems">
computed: {
  activeItems() {
    return this.items.filter(item => item.active);
  }
}
```

**❌ Missing Keys in v-for**
```vue
<!-- BAD: No key -->
<div v-for="item in items">{{ item.name }}</div>
```
```vue
<!-- GOOD: Unique key -->
<div v-for="item in items" :key="item.id">{{ item.name }}</div>
```

## HTML/CSS Issues

### HTML Anti-Patterns

**❌ Divitis and Spanitis**
```html
<!-- BAD: Non-semantic div soup -->
<div class="header">
  <div class="navigation">
    <div class="nav-item">Home</div>
  </div>
</div>
```
```html
<!-- GOOD: Semantic HTML -->
<header>
  <nav>
    <a href="/">Home</a>
  </nav>
</header>
```

**❌ Incorrect Button Usage**
```html
<!-- BAD: Using div for clickable elements -->
<div onclick="handleClick()">Click me</div>
```
```html
<!-- GOOD: Proper button element -->
<button type="button" onClick={handleClick}>Click me</button>
```

**❌ Missing Form Labels**
```html
<!-- BAD: No label association -->
<input type="text" placeholder="Name" />
```
```html
<!-- GOOD: Proper label -->
<label htmlFor="name">Name</label>
<input type="text" id="name" />
```

### CSS Anti-Patterns

**❌ Inline Styles Everywhere**
```javascript
// BAD: Inline styles with dynamic values
<div style={{
  backgroundColor: isActive ? '#007bff' : '#ccc',
  padding: '10px',
  margin: '20px'
}}>
```
```javascript
// GOOD: Use CSS classes
<div className={isActive ? 'active' : 'inactive'}>
```

**❌ High Specificity**
```css
/* BAD: Too specific */
div.container div.header div.nav a.link { }
```
```css
/* GOOD: Lower specificity */
.nav-link { }
```

**❌ Magic Numbers**
```css
/* BAD: Unexplained values */
.element {
  margin-top: 23px;
  padding: 17px;
}
```
```css
/* GOOD: Consistent spacing scale */
.element {
  margin-top: var(--spacing-md);
  padding: var(--spacing-sm);
}
```

**❌ Fixed Pixel Widths**
```css
/* BAD: Breaks responsiveness */
.container {
  width: 1200px;
}
```
```css
/* GOOD: Flexible width */
.container {
  max-width: 1200px;
  width: 100%;
}
```

## Accessibility Issues

**❌ Missing Alt Text**
```html
<!-- BAD: No alt text -->
<img src="logo.png" />
```
```html
<!-- GOOD: Descriptive alt -->
<img src="logo.png" alt="Company logo" />
```

**❌ Poor Color Contrast**
```css
/* BAD: Insufficient contrast */
.text {
  color: #777;
  background: #fff; /* Only 2.8:1 contrast */
}
```
```css
/* GOOD: WCAG AA compliant */
.text {
  color: #595959;
  background: #fff; /* 4.6:1 contrast */
}
```

**❌ No Focus Indicators**
```css
/* BAD: Removing focus outline */
button:focus {
  outline: none;
}
```
```css
/* GOOD: Custom but visible focus */
button:focus {
  outline: 2px solid var(--primary);
  outline-offset: 2px;
}
```

**❌ Inaccessible Custom Controls**
```html
<!-- BAD: div "button" with no a11y -->
<div onclick="toggle()">☰</div>
```
```html
<!-- GOOD: Proper button with ARIA -->
<button
  type="button"
  aria-label="Toggle menu"
  aria-expanded="false"
  onClick={toggle}
>
  ☰
</button>
```

**❌ Missing Form Error Handling**
```html
<!-- BAD: Visual error only -->
<input type="email" class="error" />
<span class="error-text">Invalid email</span>
```
```html
<!-- GOOD: Accessible error -->
<input
  type="email"
  aria-invalid="true"
  aria-describedby="email-error"
/>
<span id="email-error" role="alert">Invalid email</span>
```

**❌ Empty Links and Buttons**
```html
<!-- BAD: No accessible name -->
<button><Icon /></button>
```
```html
<!-- GOOD: Accessible name -->
<button aria-label="Close dialog"><CloseIcon /></button>
```

## Performance Issues

**❌ Loading Entire Libraries**
```javascript
// BAD: Importing entire library
import _ from 'lodash';
import moment from 'moment';
```
```javascript
// GOOD: Import only what's needed
import debounce from 'lodash/debounce';
import { format } from 'date-fns';
```

**❌ No Image Optimization**
```html
<!-- BAD: Large unoptimized image -->
<img src="photo.jpg" />
```
```html
<!-- GOOD: Responsive optimized images -->
<img
  src="photo.jpg"
  srcset="photo-400.webp 400w, photo-800.webp 800w"
  sizes="(max-width: 600px) 400px, 800px"
  loading="lazy"
  width="800"
  height="600"
  alt="Description"
/>
```

**❌ Unnecessary Re-renders**
```javascript
// BAD: New object on every render
function Component() {
  const options = { foo: 'bar' };
  return <Child options={options} />;
}
```
```javascript
// GOOD: Stable reference
const options = { foo: 'bar' };
function Component() {
  return <Child options={options} />;
}
// OR use useMemo if it depends on props/state
```

**❌ Not Code Splitting Large Routes**
```javascript
// BAD: All routes loaded upfront
import Dashboard from './Dashboard';
import Settings from './Settings';
import Reports from './Reports';
```
```javascript
// GOOD: Lazy load routes
const Dashboard = lazy(() => import('./Dashboard'));
const Settings = lazy(() => import('./Settings'));
const Reports = lazy(() => import('./Reports'));
```

**❌ Blocking Main Thread**
```javascript
// BAD: Heavy computation blocking UI
const processData = (largeArray) => {
  return largeArray.map(item => {
    // Complex calculations
  });
};
```
```javascript
// GOOD: Use web worker for heavy tasks
const worker = new Worker('process-worker.js');
worker.postMessage(largeArray);
worker.onmessage = (e) => {
  const results = e.data;
};
```

## State Management Issues

**❌ Overusing Global State**
```javascript
// BAD: Everything in global store
const globalState = {
  user,
  theme,
  modalOpen,
  formData,
  tempValue,
  // ...
};
```
```javascript
// GOOD: Local state for local concerns
function Component() {
  const [modalOpen, setModalOpen] = useState(false);
  const user = useGlobalUser(); // Only global what needs to be
}
```

**❌ Storing Derived State**
```javascript
// BAD: Storing what can be calculated
const [items, setItems] = useState([]);
const [itemCount, setItemCount] = useState(0);
const [hasItems, setHasItems] = useState(false);
```
```javascript
// GOOD: Derive from source of truth
const [items, setItems] = useState([]);
const itemCount = items.length;
const hasItems = items.length > 0;
```

## Security Issues

**❌ Using dangerouslySetInnerHTML Without Sanitization**
```javascript
// BAD: XSS vulnerability
<div dangerouslySetInnerHTML={{ __html: userInput }} />
```
```javascript
// GOOD: Sanitize user input
import DOMPurify from 'dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userInput) }} />
```

**❌ Storing Secrets in Frontend Code**
```javascript
// BAD: Exposed API key
const API_KEY = 'sk_live_1234567890abcdef';
```
```javascript
// GOOD: Use environment variables and backend proxy
const API_ENDPOINT = process.env.REACT_APP_API_ENDPOINT;
// API key stays on backend
```

**❌ Client-Side Only Validation**
```javascript
// BAD: Only frontend validation
const handleSubmit = (e) => {
  if (!email.includes('@')) return;
  fetch('/api/submit', { method: 'POST', body: { email } });
};
```
```javascript
// GOOD: Validate on both client and server
const handleSubmit = (e) => {
  if (!email.includes('@')) return; // UX
  fetch('/api/submit', {
    method: 'POST',
    body: { email }
  }); // Server validates again
};
```
