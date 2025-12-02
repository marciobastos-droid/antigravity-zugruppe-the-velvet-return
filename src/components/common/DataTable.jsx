import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel
} from "@/components/ui/dropdown-menu";
import { ArrowUp, ArrowDown, ArrowUpDown, Settings2, Columns3, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

export default function DataTable({
  data = [],
  columns = [],
  defaultVisibleColumns = [],
  defaultSortColumn = null,
  defaultSortDirection = "desc",
  onRowClick,
  selectedRows = [],
  onToggleSelect,
  onToggleSelectAll,
  showCheckboxes = false,
  rowKey = "id",
  emptyMessage = "Nenhum resultado encontrado",
  className = "",
  pageSizeOptions = [50, 100, 250],
  defaultPageSize = 50,
  persistKey = null // Key to persist settings in localStorage
}) {
  // Load persisted settings
  const getPersistedSettings = () => {
    if (!persistKey) return null;
    try {
      const saved = localStorage.getItem(`datatable_${persistKey}`);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  };

  const persisted = getPersistedSettings();

  const [visibleColumns, setVisibleColumns] = React.useState(
    persisted?.visibleColumns || (defaultVisibleColumns.length > 0 ? defaultVisibleColumns : columns.map(c => c.key))
  );
  const [sortColumn, setSortColumn] = React.useState(persisted?.sortColumn ?? defaultSortColumn);
  const [sortDirection, setSortDirection] = React.useState(persisted?.sortDirection || defaultSortDirection);
  const [columnWidths, setColumnWidths] = React.useState(persisted?.columnWidths || {});
  const [resizing, setResizing] = React.useState(null);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(persisted?.pageSize || defaultPageSize);
  const tableRef = React.useRef(null);

  // Persist settings when they change
  React.useEffect(() => {
    if (!persistKey) return;
    const settings = { visibleColumns, sortColumn, sortDirection, columnWidths, pageSize };
    localStorage.setItem(`datatable_${persistKey}`, JSON.stringify(settings));
  }, [persistKey, visibleColumns, sortColumn, sortDirection, columnWidths, pageSize]);

  // Handle column resize
  const handleMouseDown = (e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();
    setResizing({ columnKey, startX: e.clientX });
  };

  React.useEffect(() => {
    if (!resizing) return;

    const handleMouseMove = (e) => {
      const diff = e.clientX - resizing.startX;
      const currentWidth = columnWidths[resizing.columnKey] || 120;
      const newWidth = Math.max(50, currentWidth + diff);
      setColumnWidths(prev => ({ ...prev, [resizing.columnKey]: newWidth }));
      setResizing(prev => ({ ...prev, startX: e.clientX }));
    };

    const handleMouseUp = () => {
      setResizing(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [resizing, columnWidths]);

  const handleSort = (columnKey) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(columnKey);
      setSortDirection("desc");
    }
  };

  const toggleColumnVisibility = (columnKey) => {
    setVisibleColumns(prev =>
      prev.includes(columnKey)
        ? prev.filter(k => k !== columnKey)
        : [...prev, columnKey]
    );
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;
    
    const column = columns.find(c => c.key === sortColumn);
    if (!column) return data;

    return [...data].sort((a, b) => {
      let aVal = column.sortValue ? column.sortValue(a) : a[sortColumn];
      let bVal = column.sortValue ? column.sortValue(b) : b[sortColumn];

      // Handle nulls
      if (aVal == null) aVal = "";
      if (bVal == null) bVal = "";

      // Handle numbers
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle dates
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
      }

      // Handle strings
      const comparison = String(aVal).localeCompare(String(bVal), 'pt', { sensitivity: 'base' });
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  // Pagination
  const totalPages = Math.ceil(sortedData.length / pageSize);
  const paginatedData = React.useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Reset to page 1 when data or pageSize changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [data.length, pageSize]);

  const visibleColumnObjects = columns.filter(c => visibleColumns.includes(c.key));
  const allSelected = data.length > 0 && selectedRows.length === data.length;

  const SortIcon = ({ columnKey }) => {
    if (sortColumn !== columnKey) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />;
    }
    return sortDirection === "asc" 
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  return (
    <Card className={className}>
      <CardContent className="p-0">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-3 border-b bg-slate-50">
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{sortedData.length} resultado{sortedData.length !== 1 ? 's' : ''}</span>
            {sortColumn && (
              <Badge variant="outline" className="text-xs">
                Ordenado por: {columns.find(c => c.key === sortColumn)?.label}
              </Badge>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">Por página:</span>
              <Select value={String(pageSize)} onValueChange={(v) => setPageSize(Number(v))}>
                <SelectTrigger className="h-7 w-20 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {pageSizeOptions.map(size => (
                    <SelectItem key={size} value={String(size)}>{size}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Columns3 className="w-4 h-4" />
                Colunas
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Colunas Visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.filter(c => !c.alwaysVisible).map((column) => (
                <DropdownMenuCheckboxItem
                  key={column.key}
                  checked={visibleColumns.includes(column.key)}
                  onCheckedChange={() => toggleColumnVisibility(column.key)}
                >
                  {column.label}
                </DropdownMenuCheckboxItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={visibleColumns.length === columns.length}
                onCheckedChange={() => {
                  if (visibleColumns.length === columns.length) {
                    setVisibleColumns(columns.filter(c => c.alwaysVisible).map(c => c.key));
                  } else {
                    setVisibleColumns(columns.map(c => c.key));
                  }
                }}
              >
                Mostrar Todas
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Table */}
        <div className="overflow-x-auto" style={{ cursor: resizing ? 'col-resize' : undefined }}>
          <table ref={tableRef} className="w-full" style={{ tableLayout: 'fixed' }}>
            <thead className="bg-slate-50 border-b">
              <tr>
                {showCheckboxes && (
                  <th className="w-12 px-4 py-3">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={onToggleSelectAll}
                    />
                  </th>
                )}
                {visibleColumnObjects.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider relative ${
                      column.sortable !== false ? 'cursor-pointer hover:bg-slate-100 select-none' : ''
                    } ${column.className || ''}`}
                    style={{ 
                      minWidth: columnWidths[column.key] ? undefined : column.minWidth, 
                      width: columnWidths[column.key] || column.width 
                    }}
                    onClick={() => column.sortable !== false && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="truncate">{column.label}</span>
                      {column.sortable !== false && <SortIcon columnKey={column.key} />}
                    </div>
                    {/* Resize handle */}
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 group"
                      onMouseDown={(e) => handleMouseDown(e, column.key)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-slate-300 group-hover:bg-blue-500" />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedData.length === 0 ? (
                <tr>
                  <td 
                    colSpan={visibleColumnObjects.length + (showCheckboxes ? 1 : 0)}
                    className="px-4 py-12 text-center text-slate-500"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                paginatedData.map((row) => {
                  const isSelected = selectedRows.includes(row[rowKey]);
                  return (
                    <tr
                      key={row[rowKey]}
                      className={`hover:bg-slate-50 transition-colors ${
                        onRowClick ? 'cursor-pointer' : ''
                      } ${isSelected ? 'bg-blue-50' : ''}`}
                      onClick={() => onRowClick?.(row)}
                    >
                      {showCheckboxes && (
                        <td className="w-12 px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => onToggleSelect?.(row[rowKey])}
                          />
                        </td>
                      )}
                      {visibleColumnObjects.map((column) => (
                        <td 
                          key={column.key} 
                          className={`px-3 py-2 text-sm overflow-hidden ${column.cellClassName || ''}`}
                          style={{ 
                            width: columnWidths[column.key] || column.width 
                          }}
                        >
                          <div className="truncate">
                            {column.render 
                              ? column.render(row[column.key], row) 
                              : row[column.key] ?? '-'
                            }
                          </div>
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t bg-slate-50">
            <div className="text-sm text-slate-600">
              A mostrar {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, sortedData.length)} de {sortedData.length}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
              >
                <ChevronsLeft className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="px-3 text-sm text-slate-600">
                Página {currentPage} de {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
              >
                <ChevronsRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}