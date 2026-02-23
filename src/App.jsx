import { useEffect, useMemo, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import './App.css'

const INFO_OPTIONS = [
  { key: 'Cota_CVM', label: 'Classe de Cotas' },
  { key: 'Inicio do Fundo', label: 'Inicio do Fundo' },
  { key: 'Gestão', label: 'Gestor' },
  { key: 'Administrador', label: 'Administrador' },
  { key: 'PL', label: 'Patrimonio Liquido' },
  { key: 'Volume de Emissão do FIDC', label: 'Volume de Emissao' }
]

const SITUATION_OPTIONS = [
  { key: 'funcionamento', label: 'Fundo em funcionamento' },
  { key: 'pre_operacional', label: 'Pre operacional' },
  { key: 'desativado', label: 'Desativado' }
]

const DEFAULT_COLUMN_WIDTHS = {
  Nome: 280,
  CNPJ: 170,
  Cota_CVM: 190,
  'Inicio do Fundo': 150,
  'Gestão': 180,
  Administrador: 190,
  PL: 180,
  'Volume de Emissão do FIDC': 190,
  Situacao: 180
}

const formatCurrency = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return '-'
  return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const formatDate = (value) => {
  if (!value) return '-'
  const raw = String(value).trim()

  const brPattern = /^(\d{2})\/(\d{2})\/(\d{4})$/
  if (brPattern.test(raw)) return raw

  const isoPattern = /^(\d{4})-(\d{2})-(\d{2})/
  const isoMatch = raw.match(isoPattern)
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`

  const parsed = new Date(raw)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toLocaleDateString('pt-BR')
  }

  return raw
}

const getTodayFileDate = () => {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${day}-${month}-${year}`
}

const normalizeText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

const getSituationRaw = (item) =>
  item?.Situação ||
  item?.Situacao ||
  item?.['Situação do Fundo'] ||
  item?.['Situacao do Fundo'] ||
  item?.Status ||
  item?.['Status do Fundo'] ||
  ''

const matchesSituation = (item, selectedSituations) => {
  if (selectedSituations.length === 0) return true

  const normalized = normalizeText(getSituationRaw(item))

  return selectedSituations.some((selection) => {
    if (selection === 'funcionamento') {
      return (
        normalized.includes('operacao normal') ||
        normalized.includes('funcionamento') ||
        normalized.includes('em operacao') ||
        normalized.includes('ativo')
      )
    }

    if (selection === 'pre_operacional') {
      return normalized.includes('pre operacional') || normalized.includes('pre-operacional')
    }

    if (selection === 'desativado') {
      return (
        normalized.includes('desativado') ||
        normalized.includes('encerrado') ||
        normalized.includes('inativo')
      )
    }

    return false
  })
}

function App() {
  const [term, setTerm] = useState('')
  const [keywords, setKeywords] = useState([])
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [selectedInfo, setSelectedInfo] = useState(INFO_OPTIONS.map((item) => item.key))
  const [selectedSituations, setSelectedSituations] = useState([])
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [sortConfig, setSortConfig] = useState({ key: 'Nome', direction: 'asc' })
  const [columnWidths, setColumnWidths] = useState(DEFAULT_COLUMN_WIDTHS)
  const [resizing, setResizing] = useState(null)

  const selectAllRef = useRef(null)

  const filteredResults = useMemo(
    () => results.filter((item) => matchesSituation(item, selectedSituations)),
    [results, selectedSituations]
  )

  const getSortValue = (item, key) => {
    if (key === 'Situacao') return getSituationRaw(item)
    return item?.[key] ?? ''
  }

  const compareValues = (a, b, direction) => {
    const order = direction === 'asc' ? 1 : -1
    const numA = Number(a)
    const numB = Number(b)
    const isNumA = !Number.isNaN(numA) && a !== ''
    const isNumB = !Number.isNaN(numB) && b !== ''

    if (isNumA && isNumB) {
      return (numA - numB) * order
    }

    return String(a).localeCompare(String(b), 'pt-BR', { sensitivity: 'base' }) * order
  }

  const groupedAndSortedResults = useMemo(() => {
    const groupMap = new Map()

    filteredResults.forEach((item, index) => {
      const groupKey = item?.CNPJ || `sem-cnpj-${index}`
      if (!groupMap.has(groupKey)) groupMap.set(groupKey, [])
      groupMap.get(groupKey).push(item)
    })

    const groups = Array.from(groupMap.values())

    groups.sort((groupA, groupB) => {
      const repA = groupA[0]
      const repB = groupB[0]
      const valueA = getSortValue(repA, sortConfig.key)
      const valueB = getSortValue(repB, sortConfig.key)
      return compareValues(valueA, valueB, sortConfig.direction)
    })

    return groups.flat()
  }, [filteredResults, sortConfig])

  const visibleRowIds = useMemo(
    () => groupedAndSortedResults.map((item) => item.__rowId),
    [groupedAndSortedResults]
  )

  const selectedVisibleCount = useMemo(() => {
    let count = 0
    visibleRowIds.forEach((id) => {
      if (selectedRows.has(id)) count += 1
    })
    return count
  }, [visibleRowIds, selectedRows])

  const allVisibleSelected = visibleRowIds.length > 0 && selectedVisibleCount === visibleRowIds.length
  const someVisibleSelected = selectedVisibleCount > 0 && !allVisibleSelected

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someVisibleSelected
    }
  }, [someVisibleSelected])

  useEffect(() => {
    if (!resizing) return undefined

    const onMouseMove = (event) => {
      const diff = event.clientX - resizing.startX
      const nextWidth = Math.max(90, resizing.startWidth + diff)
      setColumnWidths((prev) => ({ ...prev, [resizing.key]: nextWidth }))
    }

    const onMouseUp = () => setResizing(null)

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)

    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [resizing])

  const displayedColumns = useMemo(() => {
    const columns = [
      {
        key: 'Nome',
        label: 'Denominacao Social',
        render: (item) => item.Nome || '-'
      },
      {
        key: 'CNPJ',
        label: 'CNPJ',
        render: (item) => item.CNPJ || '-'
      }
    ]

    if (selectedInfo.includes('Cota_CVM')) {
      columns.push({
        key: 'Cota_CVM',
        label: 'Classe de Cotas',
        render: (item) => item.Cota_CVM || '-'
      })
    }

    if (selectedInfo.includes('Inicio do Fundo')) {
      columns.push({
        key: 'Inicio do Fundo',
        label: 'Inicio do Fundo',
        render: (item) => formatDate(item['Inicio do Fundo'])
      })
    }

    if (selectedInfo.includes('Gestão')) {
      columns.push({
        key: 'Gestão',
        label: 'Gestor',
        render: (item) => item['Gestão'] || '-'
      })
    }

    if (selectedInfo.includes('Administrador')) {
      columns.push({
        key: 'Administrador',
        label: 'Administrador',
        render: (item) => item.Administrador || '-'
      })
    }

    if (selectedInfo.includes('PL')) {
      columns.push({
        key: 'PL',
        label: 'Patrimonio Liquido',
        render: (item) => formatCurrency(item.PL)
      })
    }

    if (selectedInfo.includes('Volume de Emissão do FIDC')) {
      columns.push({
        key: 'Volume de Emissão do FIDC',
        label: 'Volume de Emissao',
        render: (item) => formatCurrency(item['Volume de Emissão do FIDC'])
      })
    }

    if (selectedSituations.length > 0) {
      columns.push({
        key: 'Situacao',
        label: 'Situacao',
        render: (item) => getSituationRaw(item) || '-'
      })
    }

    return columns
  }, [selectedInfo, selectedSituations.length])

  const selectedVisibleRows = useMemo(
    () => groupedAndSortedResults.filter((item) => selectedRows.has(item.__rowId)),
    [groupedAndSortedResults, selectedRows]
  )

  const handleAdd = () => {
    const clean = term.trim()
    if (!clean || keywords.includes(clean)) return
    setKeywords((prev) => [...prev, clean])
    setTerm('')
  }

  const handleRemoveKeyword = (wordToRemove) => {
    setKeywords((prev) => prev.filter((word) => word !== wordToRemove))
  }

  const handleSearch = async () => {
    if (keywords.length === 0) {
      window.alert('Adicione pelo menos um termo antes de pesquisar.')
      return
    }

    setLoading(true)
    setSearched(true)
    setSelectedRows(new Set())

    try {
      const termoBusca = keywords.join(' OR ')
      const response = await fetch(
        `http://localhost:8000/pesquisar?termo=${encodeURIComponent(termoBusca)}`
      )

      if (!response.ok) {
        throw new Error('Erro na resposta do servidor.')
      }

      const data = await response.json()
      const prepared = Array.isArray(data)
        ? data.map((item, index) => ({ ...item, __rowId: `${item?.CNPJ || 'sem-cnpj'}-${index}` }))
        : []
      setResults(prepared)
    } catch (error) {
      console.error(error)
      window.alert('Erro ao conectar com o servidor.')
      setResults([])
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setTerm('')
    setKeywords([])
    setResults([])
    setSearched(false)
    setSelectedInfo(INFO_OPTIONS.map((item) => item.key))
    setSelectedSituations([])
    setSelectedRows(new Set())
  }

  const toggleInfo = (key) => {
    setSelectedInfo((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  const toggleSituation = (key) => {
    setSelectedSituations((prev) =>
      prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]
    )
  }

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' }
      }
      return { key, direction: 'asc' }
    })
  }

  const sortIndicator = (key) => {
    if (sortConfig.key !== key) return ''
    return sortConfig.direction === 'asc' ? ' ▲' : ' ▼'
  }

  const toggleRowSelection = (rowId) => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (next.has(rowId)) {
        next.delete(rowId)
      } else {
        next.add(rowId)
      }
      return next
    })
  }

  const toggleSelectAllVisible = () => {
    setSelectedRows((prev) => {
      const next = new Set(prev)
      if (allVisibleSelected) {
        visibleRowIds.forEach((id) => next.delete(id))
      } else {
        visibleRowIds.forEach((id) => next.add(id))
      }
      return next
    })
  }

  const startResize = (event, key) => {
    event.preventDefault()
    event.stopPropagation()
    setResizing({ key, startX: event.clientX, startWidth: columnWidths[key] || 150 })
  }

  const exportRowsToXlsx = (rows, filename) => {
    if (rows.length === 0) {
      window.alert('Nao ha resultados para exportar.')
      return
    }

    const selectedColumns = displayedColumns

    const exportData = rows.map((item) => {
      const row = {}
      selectedColumns.forEach((column) => {
        row[column.label] = column.render(item)
      })
      return row
    })

    const ws = XLSX.utils.json_to_sheet(exportData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resultados FIDC')
    XLSX.writeFile(wb, filename)
  }

  const exportToXlsx = () => {
    exportRowsToXlsx(groupedAndSortedResults, `FIDC_Resultados_${getTodayFileDate()}.xlsx`)
  }

  const exportSelectedToXlsx = () => {
    exportRowsToXlsx(
      selectedVisibleRows,
      `FIDC_Selecionados_${getTodayFileDate()}.xlsx`
    )
  }

  return (
    <main className="app-shell">
      <section className="search-card">
        <h1>Pesquisar FIDC</h1>
        <p>Adicione palavras-chave para filtrar a base de dados</p>

        <input
          type="text"
          placeholder="Digite o termo (ex: Consignado, CLT, Agro)..."
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />

        <div className="actions">
          <button type="button" onClick={handleAdd}>
            Adicionar
          </button>
          <button type="button" onClick={handleSearch} disabled={loading}>
            {loading ? 'Pesquisando...' : 'Pesquisar'}
          </button>
          <button type="button" onClick={handleClear}>
            Limpar
          </button>
        </div>

        {keywords.length > 0 && (
          <div className="chips" aria-label="Palavras-chave adicionadas">
            {keywords.map((word) => (
              <span className="chip" key={word}>
                <span>{word}</span>
                <button
                  type="button"
                  className="chip-remove"
                  aria-label={`Remover ${word}`}
                  onClick={() => handleRemoveKeyword(word)}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}

        <div className="filters-block">
          <h2>Informacoes exibidas na tabela</h2>
          <div className="options-grid">
            {INFO_OPTIONS.map((option) => {
              const checked = selectedInfo.includes(option.key)
              return (
                <label className="option-item" key={option.key}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleInfo(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              )
            })}
          </div>

          <h2>Situacao do fundo</h2>
          <div className="options-grid situation-grid">
            {SITUATION_OPTIONS.map((option) => {
              const checked = selectedSituations.includes(option.key)
              return (
                <label className="option-item" key={option.key}>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleSituation(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              )
            })}
          </div>
        </div>

        {searched && (
          <section className="results-block">
            <div className="results-head">
              <h2>Resultados</h2>
              <div className="results-actions">
                <span>{groupedAndSortedResults.length} encontrados</span>
                <span>{selectedVisibleCount} selecionados</span>
                <button type="button" onClick={exportToXlsx}>
                  Exportar todos
                </button>
                {selectedVisibleCount > 0 && (
                  <button type="button" onClick={exportSelectedToXlsx}>
                    Exportar selecionados
                  </button>
                )}
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th className="select-col">
                      <input
                        ref={selectAllRef}
                        type="checkbox"
                        className="row-selector"
                        checked={allVisibleSelected}
                        onChange={toggleSelectAllVisible}
                        aria-label="Selecionar todas as linhas visiveis"
                      />
                    </th>
                    {displayedColumns.map((column) => (
                      <th key={column.key} style={{ width: `${columnWidths[column.key] || 160}px` }}>
                        <div
                          className="sortable-th"
                          role="button"
                          tabIndex={0}
                          onClick={() => handleSort(column.key)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault()
                              handleSort(column.key)
                            }
                          }}
                        >
                          {column.label}
                          {sortIndicator(column.key)}
                        </div>
                        <div
                          className="col-resizer"
                          onMouseDown={(event) => startResize(event, column.key)}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {groupedAndSortedResults.map((item) => (
                    <tr key={item.__rowId}>
                      <td className="select-col">
                        <input
                          type="checkbox"
                          className="row-selector"
                          checked={selectedRows.has(item.__rowId)}
                          onChange={() => toggleRowSelection(item.__rowId)}
                          aria-label="Selecionar linha"
                        />
                      </td>
                      {displayedColumns.map((column) => (
                        <td key={`${item.__rowId}-${column.key}`}>{column.render(item)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {!loading && groupedAndSortedResults.length === 0 && (
                <div className="empty-state">Nenhum resultado encontrado.</div>
              )}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
