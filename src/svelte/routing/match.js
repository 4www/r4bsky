// Tiny pattern matcher for hash-based routing
// Supports static, ":param" and "@handle" style "/@:handle" patterns

export function compile(pattern) {
  const parts = pattern.split('/').filter(Boolean)
  return (path) => {
    const segs = path.split('/').filter(Boolean)
    if (segs.length !== parts.length) return null
    const params = {}
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i]
      const s = segs[i]
      if (p.startsWith(':')) {
        params[p.slice(1)] = decodeURIComponent(s)
      } else if (p === '@:handle') {
        if (!s.startsWith('@')) return null
        params.handle = decodeURIComponent(s.slice(1))
      } else if (p !== s) {
        return null
      }
    }
    return params
  }
}

export function resolve(routes, path) {
  for (const r of routes) {
    const params = r.match(path)
    if (params) return { component: r.component, params, props: r.props || {} }
  }
  return null
}
