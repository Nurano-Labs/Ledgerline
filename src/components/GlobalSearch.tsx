import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../store'
import { Avatar, StatusBadge } from './badges'
import { Icon } from './Icon'

/** Topbar typeahead over the employee directory. */
export function GlobalSearch() {
  const employees = useStore((s) => s.employees)
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return employees
      .filter((e) => e.name.toLowerCase().includes(q) || e.email.toLowerCase().includes(q) || e.department.toLowerCase().includes(q))
      .slice(0, 8)
  }, [query, employees])

  function choose(id: string) {
    setQuery('')
    setOpen(false)
    navigate(`/people/${id}`)
    inputRef.current?.blur()
  }

  return (
    <div className="relative w-full max-w-md">
      <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
        <Icon name="search" className="h-4 w-4" />
      </div>
      <input
        ref={inputRef}
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls="global-search-listbox"
        aria-label="Search employees"
        placeholder="Search employees…"
        data-testid="global-search"
        className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
          setHighlight(0)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setHighlight((h) => Math.min(h + 1, results.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setHighlight((h) => Math.max(h - 1, 0))
          } else if (e.key === 'Enter' && results[highlight]) {
            choose(results[highlight].id)
          } else if (e.key === 'Escape') {
            setOpen(false)
          }
        }}
      />
      {open && query.trim() && (
        <ul
          id="global-search-listbox"
          role="listbox"
          data-testid="global-search-results"
          className="absolute left-0 right-0 top-full z-40 mt-1 max-h-96 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
        >
          {results.length === 0 && <li className="px-3 py-2 text-sm text-slate-500">No employees match “{query}”.</li>}
          {results.map((e, i) => (
            <li key={e.id} role="option" aria-selected={i === highlight}>
              <button
                type="button"
                data-testid={`search-result-${e.id}`}
                data-employee-id={e.id}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${i === highlight ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => choose(e.id)}
                onMouseEnter={() => setHighlight(i)}
              >
                <Avatar name={e.name} size="sm" />
                <span className="flex-1">
                  <span className="font-medium text-slate-800">{e.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{e.department}</span>
                </span>
                <StatusBadge status={e.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
