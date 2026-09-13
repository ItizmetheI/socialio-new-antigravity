# Strict React Architecture & Anti-AI Patterns

When writing React and Tailwind code, avoid common AI-generated anti-patterns. Adhere to senior developer standards:

1. **No Nested Components**: NEVER define a functional component inside the render cycle of another component. This causes severe re-render performance issues. Always extract sub-components to the module level or a separate file.
2. **Real UI, No CSS Wireframes**: When mocking components (like "blog cards" or "websites"), build actual UI layouts using real typography, semantic HTML, and proper structure. Do not hallucinate "CSS wireframes" (e.g., `w-3/4 h-2 bg-gray-300 rounded`) to represent text.
3. **Data Abstraction**: Do NOT define large static data arrays (e.g., FAQs, feature lists, pricing tiers) inside the render cycle of a functional component. Define them outside the component at the module level, or extract them into dedicated `src/data/` files to prevent memory reallocation on every render.
4. **Performant Animations**: Avoid using native `setInterval` bound to React state for UI animations (e.g., number counters). Instead, use `requestAnimationFrame` hooks or robust libraries like Framer Motion for GPU-accelerated 60fps animations.
5. **No Div Soup**: Avoid wrapping elements in generic `<div>` tags solely for positioning overlapping blurs. Use semantic HTML (`<section>`, `<article>`, `<main>`).
6. **Tailwind Hygiene**: Do not mix inline `style={{}}` attributes with Tailwind classes. Convert all styles (e.g., fluid typography `clamp`) into Tailwind arbitrary values (e.g., `text-[clamp(...)]`).
