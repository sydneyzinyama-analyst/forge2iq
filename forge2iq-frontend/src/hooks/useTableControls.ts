import { useState, useMemo } from 'react'

type SortDir = 'asc' | 'desc'

interface Options<T> {
  defaultSortKey?: keyof T
  defaultSortDir?: SortDir
  defaultPerPage?: number
}

export function useTableControls<T extends object>(
  data: T[],
  searchableFields: (keyof T)[],
  options: Options<T> = {},
) {
  const { defaultSortKey, defaultSortDir = 'desc', defaultPerPage = 25 } = options

  const [search, setSearchRaw] = useState('')
  const [sortKey, setSortKey] = useState<keyof T | null>(defaultSortKey ?? null)
  const [sortDir, setSortDir] = useState<SortDir>(defaultSortDir)
  const [page, setPageRaw] = useState(0)
  const [perPage, setPerPageRaw] = useState(defaultPerPage)

  const setSearch = (v: string) => { setSearchRaw(v); setPageRaw(0) }
  const setPage = (p: number) => setPageRaw(p)
  const setPerPage = (n: number) => { setPerPageRaw(n); setPageRaw(0) }

  const toggleSort = (key: keyof T) => {
    if (key === sortKey) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
    setPageRaw(0)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return data
    return data.filter(row =>
      searchableFields.some(f => String((row as Record<keyof T, unknown>)[f] ?? '').toLowerCase().includes(q))
    )
  }, [data, search, searchableFields])

  const sorted = useMemo(() => {
    if (!sortKey) return filtered
    return [...filtered].sort((a, b) => {
      const av = (a as Record<keyof T, unknown>)[sortKey]
      const bv = (b as Record<keyof T, unknown>)[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      let cmp = 0
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv)
      } else {
        cmp = (av as number) < (bv as number) ? -1 : (av as number) > (bv as number) ? 1 : 0
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortKey, sortDir])

  const paginated = sorted.slice(page * perPage, (page + 1) * perPage)

  return {
    search, setSearch,
    sortKey, sortDir, toggleSort,
    page, setPage,
    perPage, setPerPage,
    paginated,
    total: filtered.length,
    totalUnfiltered: data.length,
  }
}
