// Set data-theme before first paint so there's no flash of the wrong theme —
// ThemeContext.tsx's own default (light) matches this, this just runs before
// React ever mounts. A file rather than an inline <script> so the CSP can
// forbid inline scripts entirely.
document.documentElement.setAttribute("data-theme", localStorage.getItem("socialio-theme") === "dark" ? "dark" : "light");
