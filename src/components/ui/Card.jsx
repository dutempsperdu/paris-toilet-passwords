function Card({ className = '', children }) {
  return <article className={`tp-card ${className}`.trim()}>{children}</article>
}

export default Card
