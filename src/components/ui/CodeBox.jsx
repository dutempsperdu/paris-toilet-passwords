function CodeBox({ children, className = '' }) {
  return <div className={`tp-code-box ${className}`.trim()}>{children}</div>
}

export default CodeBox
