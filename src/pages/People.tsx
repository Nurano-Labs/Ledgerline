import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnFiltersState,
  type Row,
  type RowSelectionState,
  type SortingState,
} from '@tanstack/react-table'
import type { Department, Employee } from '../types'
import { DEPARTMENTS } from '../types'
import { useStore } from '../store'
import { centsToDecimal, downloadFile, fmtDate, fmtUSD, toCsv } from '../data/format'
import { Avatar, StatusBadge, TypeBadge } from '../components/badges'
import { TypedConfirmDialog } from '../components/dialogs'
import { Icon } from '../components/Icon'
import { btnDanger, btnPrimary, btnSecondary, cardCls, selectCompactCls, tdCls, thCls } from '../components/ui'

const columnHelper = createColumnHelper<Employee>()

function compLabel(e: Employee): string {
  return e.comp.mode === 'salary' ? `${fmtUSD(e.comp.amount * 100)}/yr` : `${fmtUSD(e.comp.amount * 100)}/hr`
}

const columns = [
  columnHelper.display({
    id: 'select',
    header: ({ table }) => (
      <input
        type="checkbox"
        aria-label="Select all employees on this page"
        data-testid="select-all-checkbox"
        className="h-4 w-4 accent-indigo-600"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected()
        }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        aria-label={`Select ${row.original.name}`}
        data-testid={`select-row-${row.original.id}`}
        className="h-4 w-4 accent-indigo-600"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        onClick={(e) => e.stopPropagation()}
      />
    ),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: ({ row }) => (
      <span className="flex items-center gap-3">
        <Avatar name={row.original.name} size="sm" />
        <span>
          <span className="block font-medium text-slate-800">{row.original.name}</span>
          <span className="block text-xs text-slate-500">{row.original.email}</span>
        </span>
      </span>
    ),
  }),
  columnHelper.accessor('department', { header: 'Department', filterFn: 'equals' }),
  columnHelper.accessor('type', {
    header: 'Type',
    filterFn: 'equals',
    cell: (info) => <TypeBadge type={info.getValue()} />,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    filterFn: 'equals',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor((e) => (e.comp.mode === 'salary' ? e.comp.amount : e.comp.amount * 2080), {
    id: 'comp',
    header: 'Compensation',
    cell: ({ row }) => <span className="tabular-nums">{compLabel(row.original)}</span>,
  }),
  columnHelper.accessor('hireDate', {
    header: 'Start date',
    cell: (info) => fmtDate(info.getValue()),
  }),
]

export function People() {
  const employees = useStore((s) => s.employees)
  const changeDepartment = useStore((s) => s.changeDepartment)
  const terminateEmployees = useStore((s) => s.terminateEmployees)
  const toast = useStore((s) => s.toast)
  const navigate = useNavigate()

  const [sorting, setSorting] = useState<SortingState>([{ id: 'name', desc: false }])
  const [globalFilter, setGlobalFilter] = useState('')
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
  const [bulkDept, setBulkDept] = useState<Department | ''>('')
  const [terminateOpen, setTerminateOpen] = useState(false)

  const table = useReactTable({
    data: employees,
    columns,
    state: { sorting, globalFilter, columnFilters, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onColumnFiltersChange: setColumnFilters,
    onRowSelectionChange: setRowSelection,
    getRowId: (row) => row.id,
    globalFilterFn: (row, _columnId, value: string) => {
      const q = value.toLowerCase()
      return row.original.name.toLowerCase().includes(q) || row.original.email.toLowerCase().includes(q)
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 20 } },
  })

  const selectedIds = Object.keys(rowSelection)
  const selected = useMemo(() => employees.filter((e) => selectedIds.includes(e.id)), [employees, selectedIds])

  function setFacet(columnId: 'department' | 'type' | 'status', value: string) {
    table.getColumn(columnId)?.setFilterValue(value || undefined)
  }
  const facetValue = (columnId: string) => (table.getColumn(columnId)?.getFilterValue() as string) ?? ''

  function exportSelected() {
    const csv = toCsv(
      ['Name', 'Email', 'Department', 'Type', 'Status', 'Compensation', 'Start date'],
      selected.map((e) => [
        e.name,
        e.email,
        e.department,
        e.type === 'w2' ? 'W-2 employee' : '1099 contractor',
        e.status,
        e.comp.mode === 'salary' ? `${centsToDecimal(e.comp.amount * 100)}/yr` : `${centsToDecimal(e.comp.amount * 100)}/hr`,
        e.hireDate,
      ]),
    )
    downloadFile('employees-selected.csv', csv)
    toast(`Exported ${selected.length} employee${selected.length === 1 ? '' : 's'} to CSV.`)
  }

  const terminateRequiredText = selected.length === 1 ? selected[0].name : `TERMINATE ${selected.length} EMPLOYEES`

  function onRowClick(row: Row<Employee>) {
    navigate(`/people/${row.original.id}`)
  }

  const pageRows = table.getRowModel().rows
  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div className="mx-auto max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">People</h1>
          <p className="mt-1 text-sm text-slate-500">{employees.length} people · employee directory</p>
        </div>
        <Link to="/people/new" className={btnPrimary} data-testid="add-employee-button">
          <Icon name="plus" className="h-4 w-4" />
          Add employee
        </Link>
      </div>

      {/* Search + faceted filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative">
          <div className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Icon name="search" className="h-4 w-4" />
          </div>
          <input
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder="Search name or email…"
            aria-label="Search employees by name or email"
            data-testid="people-search"
            className="w-64 rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm shadow-xs outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          />
        </div>
        <select
          value={facetValue('department')}
          onChange={(e) => setFacet('department', e.target.value)}
          aria-label="Filter by department"
          data-testid="filter-department"
          className={`${selectCompactCls} w-44`}
        >
          <option value="">All departments</option>
          {DEPARTMENTS.map((d) => (
            <option key={d}>{d}</option>
          ))}
        </select>
        <select
          value={facetValue('type')}
          onChange={(e) => setFacet('type', e.target.value)}
          aria-label="Filter by employment type"
          data-testid="filter-type"
          className={`${selectCompactCls} w-44`}
        >
          <option value="">All types</option>
          <option value="w2">W-2 employee</option>
          <option value="contractor">1099 contractor</option>
        </select>
        <select
          value={facetValue('status')}
          onChange={(e) => setFacet('status', e.target.value)}
          aria-label="Filter by status"
          data-testid="filter-status"
          className={`${selectCompactCls} w-40`}
        >
          <option value="">All statuses</option>
          <option>Active</option>
          <option>Onboarding</option>
          <option>Terminated</option>
        </select>
        <span className="text-sm text-slate-500" data-testid="people-count">
          {filteredCount} match{filteredCount === 1 ? '' : 'es'}
        </span>
      </div>

      {/* Bulk-action bar */}
      {selected.length > 0 && (
        <div
          data-testid="bulk-action-bar"
          className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5"
        >
          <span className="text-sm font-semibold text-indigo-900">{selected.length} selected</span>
          <span className="h-5 w-px bg-indigo-200" />
          <label className="flex items-center gap-2 text-sm text-indigo-900">
            Change department:
            <select
              value={bulkDept}
              onChange={(e) => setBulkDept(e.target.value as Department | '')}
              aria-label="New department for selected employees"
              data-testid="bulk-department-select"
              className={`${selectCompactCls} w-40 py-1.5`}
            >
              <option value="">Choose…</option>
              {DEPARTMENTS.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <button
            className={`${btnSecondary} py-1.5`}
            disabled={!bulkDept}
            data-testid="bulk-department-apply"
            onClick={() => {
              changeDepartment(selectedIds, bulkDept as Department)
              toast(`Moved ${selected.length} employee${selected.length === 1 ? '' : 's'} to ${bulkDept}.`)
              setBulkDept('')
              setRowSelection({})
            }}
          >
            Apply
          </button>
          <span className="h-5 w-px bg-indigo-200" />
          <button className={`${btnSecondary} py-1.5`} onClick={exportSelected} data-testid="bulk-export">
            <Icon name="download" className="h-4 w-4" />
            Export selected
          </button>
          <button className={`${btnDanger} py-1.5`} onClick={() => setTerminateOpen(true)} data-testid="bulk-terminate">
            Terminate
          </button>
        </div>
      )}

      {/* Table */}
      <div className={`${cardCls} mt-4 overflow-x-auto`}>
        <table className="w-full min-w-[860px]" data-testid="people-table">
          <thead className="border-b border-slate-200 bg-slate-50">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => (
                  <th key={header.id} className={thCls}>
                    {header.isPlaceholder ? null : header.column.getCanSort() ? (
                      <button
                        type="button"
                        className="flex items-center gap-1 uppercase tracking-wide hover:text-slate-800"
                        onClick={header.column.getToggleSortingHandler()}
                        data-testid={`sort-${header.column.id}`}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        <span className="text-indigo-600">
                          {{ asc: '▲', desc: '▼' }[header.column.getIsSorted() as string] ?? ''}
                        </span>
                      </button>
                    ) : (
                      flexRender(header.column.columnDef.header, header.getContext())
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-slate-500">
                  No employees match the current filters.
                </td>
              </tr>
            )}
            {pageRows.map((row) => (
              <tr
                key={row.id}
                data-employee-id={row.original.id}
                data-testid={`employee-row-${row.original.id}`}
                className={`cursor-pointer hover:bg-slate-50 ${row.getIsSelected() ? 'bg-indigo-50/60' : ''}`}
                onClick={() => onRowClick(row)}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className={tdCls}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {/* Pagination */}
        <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
          <p className="text-sm text-slate-500" data-testid="pagination-info">
            Page {table.getState().pagination.pageIndex + 1} of {Math.max(1, table.getPageCount())}
          </p>
          <div className="flex gap-2">
            <button
              className={btnSecondary}
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              data-testid="pagination-prev"
            >
              Previous
            </button>
            <button
              className={btnSecondary}
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              data-testid="pagination-next"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      <TypedConfirmDialog
        open={terminateOpen}
        title={selected.length === 1 ? `Terminate ${selected[0].name}?` : `Terminate ${selected.length} employees?`}
        body={
          <>
            <p>
              This marks {selected.length === 1 ? 'this employee' : 'these employees'} as Terminated and removes them from
              future pay runs:
            </p>
            <ul className="mt-2 list-inside list-disc">
              {selected.map((e) => (
                <li key={e.id}>
                  {e.name} — {e.department}
                </li>
              ))}
            </ul>
          </>
        }
        requiredText={terminateRequiredText}
        confirmLabel="Terminate"
        danger
        onCancel={() => setTerminateOpen(false)}
        onConfirm={() => {
          terminateEmployees(selectedIds)
          setTerminateOpen(false)
          setRowSelection({})
          toast(`Terminated ${selected.length} employee${selected.length === 1 ? '' : 's'}.`)
        }}
      />
    </div>
  )
}
