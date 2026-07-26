"use client";
// beui.dev/components/motion/table

import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Checkbox } from "@/components/motion/checkbox";
import { cn } from "@/lib/utils";
import { EditableCell } from "./editable-cell";
import { RowHandle } from "./row-handle";
import { SkeletonRows } from "./skeleton-rows";
import { TableHeader } from "./table-header";
import type { HeaderCellRefs, TableProps } from "./types";
import { useColumnReorder } from "./use-column-reorder";
import { useColumnResize } from "./use-column-resize";
import { useColumnSort } from "./use-column-sort";
import { useRowSelection } from "./use-row-selection";
import { CHECKBOX_WIDTH, alignText, readCell } from "./utils";

export type {
  SortDirection,
  SortState,
  TableColumn,
  TableProps,
} from "./types";

export function Table<T>({
  data,
  columns,
  getRowId,
  selectable = false,
  selectedRowIds,
  defaultSelectedRowIds,
  onSelectionChange,
  sort: sortProp,
  defaultSort = null,
  onSortChange,
  resizable = false,
  minColumnWidth = 64,
  onColumnResize,
  reorderable = false,
  onColumnOrderChange,
  onCellEdit,
  onColumnRename,
  onInsertRow,
  onDeleteRow,
  onInsertColumn,
  onDeleteColumn,
  rowHeight = 48,
  height = 440,
  minHeight = 300,
  onEndReached,
  loading = false,
  skeletonRows = 3,
  emptyState = "No data",
  className,
}: TableProps<T>) {
  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const thRefs: HeaderCellRefs = useRef<
    Record<string, HTMLTableCellElement | null>
  >({});

  const rows = useMemo(
    () =>
      data.map((row, index) => ({
        row,
        id: getRowId ? getRowId(row, index) : String(index),
      })),
    [data, getRowId],
  );

  const {
    orderedColumns,
    dragKey,
    dropIndex,
    startReorder,
    moveReorder,
    endReorder,
  } = useColumnReorder({ columns, thRefs, onColumnOrderChange });

  const { sort, sortedRows, toggleSort } = useColumnSort({
    rows,
    columns,
    sort: sortProp,
    defaultSort,
    onSortChange,
  });

  const { widths, startResize, moveResize, endResize } = useColumnResize({
    orderedColumns,
    thRefs,
    minColumnWidth,
    onColumnResize,
  });

  const { selected, allSelected, someSelected, toggleAll, toggleRow } =
    useRowSelection({
      sortedRows,
      selectedRowIds,
      defaultSelectedRowIds,
      onSelectionChange,
    });

  const hasRowMenu = !!(onInsertRow || onDeleteRow);
  const hasColumnMenu = !!(onInsertColumn || onDeleteColumn);
  const hasTrailingMenuSpace = hasRowMenu || hasColumnMenu;
  const viewportHeight = Math.max(height, minHeight);
  // Only shrink-wrap (w-max) once every column has an explicit resized width;
  // otherwise stay fill-width so a flexible column can't size to cell content.
  const sized =
    orderedColumns.length > 0 &&
    orderedColumns.every((c) => widths[c.key] != null);

  // Infinite scroll: fire onEndReached once per near-bottom dwell, paused while
  // loading; the guard resets when the load completes.
  const endReachedRef = useRef(false);
  useEffect(() => {
    if (!loading) endReachedRef.current = false;
  }, [loading]);
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || !onEndReached || loading || endReachedRef.current) return;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < rowHeight * 4) {
      endReachedRef.current = true;
      onEndReached();
    }
  }, [onEndReached, loading, rowHeight]);
  const [activeColumn, setActiveColumn] = useState<string | null>(null);
  // Small delay on leave so the pointer can cross the gap from the header cell
  // to the portal handle without the column deactivating.
  const deactivateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activateColumn = useCallback((key: string) => {
    if (deactivateTimer.current) clearTimeout(deactivateTimer.current);
    deactivateTimer.current = null;
    setActiveColumn(key);
  }, []);
  const deactivateColumn = useCallback(() => {
    if (deactivateTimer.current) clearTimeout(deactivateTimer.current);
    deactivateTimer.current = setTimeout(() => setActiveColumn(null), 100);
  }, []);

  const [activeRow, setActiveRow] = useState<{
    id: string;
    index: number;
    element: HTMLTableRowElement;
  } | null>(null);
  const rowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activateRow = useCallback((
    id: string,
    index: number,
    element: HTMLTableRowElement,
  ) => {
    if (rowTimer.current) clearTimeout(rowTimer.current);
    rowTimer.current = null;
    setActiveRow({ id, index, element });
  }, []);
  const deactivateRow = useCallback(() => {
    if (rowTimer.current) clearTimeout(rowTimer.current);
    rowTimer.current = setTimeout(() => setActiveRow(null), 100);
  }, []);
  // Real columns + checkbox; menu-enabled tables add a trailing interaction area.
  const leadColumns = columns.length + (selectable ? 1 : 0);
  const columnSpan = leadColumns + (hasTrailingMenuSpace ? 1 : 0);

  return (
    <div
      className={cn(
        "w-full overflow-hidden border border-border bg-background text-sm",
        className,
      )}
    >
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="overflow-auto"
        style={{ height: viewportHeight }}
      >
        <table
          className={cn(
            "border-collapse",
            sized ? "w-max min-w-full" : "min-w-full",
          )}
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {selectable ? <col style={{ width: CHECKBOX_WIDTH }} /> : null}
            {orderedColumns.map((column) => {
              const override = widths[column.key];
              const width = override ? `${override}px` : column.width;
              return (
                <col key={column.key} style={width ? { width } : undefined} />
              );
            })}
            {hasTrailingMenuSpace ? <col /> : null}
          </colgroup>

          <TableHeader
            columns={orderedColumns}
            rowHeight={rowHeight}
            reduce={!!reduce}
            thRefs={thRefs}
            selectable={selectable}
            allSelected={allSelected}
            someSelected={someSelected}
            onToggleAll={toggleAll}
            sort={sort}
            onToggleSort={toggleSort}
            resizable={resizable}
            onResizeStart={startResize}
            onResizeMove={moveResize}
            onResizeEnd={endResize}
            reorderable={reorderable}
            dragKey={dragKey}
            dropIndex={dropIndex}
            onReorderStart={startReorder}
            onReorderMove={moveReorder}
            onReorderEnd={endReorder}
            onInsertColumn={onInsertColumn}
            onDeleteColumn={onDeleteColumn}
            onColumnRename={onColumnRename}
            hasTrailingMenuSpace={hasTrailingMenuSpace}
            activeColumn={hasColumnMenu ? activeColumn : null}
            onColumnActivate={hasColumnMenu ? activateColumn : undefined}
            onColumnDeactivate={hasColumnMenu ? deactivateColumn : undefined}
          />

          <tbody>
            {sortedRows.length === 0 ? (
              loading ? (
                <SkeletonRows
                  count={Math.max(1, Math.ceil(viewportHeight / rowHeight))}
                  columns={orderedColumns}
                  selectable={selectable}
                  rowHeight={rowHeight}
                />
              ) : (
                <tr>
                  <td
                    colSpan={columnSpan}
                    className="p-10 text-center text-muted-foreground"
                    style={{ height: Math.max(0, viewportHeight - rowHeight) }}
                  >
                    {emptyState}
                  </td>
                </tr>
              )
            ) : (
              <>
                {sortedRows.map((entry, rowIndex) => {
                  const isSelected = selected.has(entry.id);
                  return (
                    <tr
                      key={entry.id}
                      data-selected={isSelected}
                      style={{ height: rowHeight }}
                      onPointerEnter={
                        hasRowMenu
                          ? (event) =>
                              activateRow(
                                entry.id,
                                rowIndex,
                                event.currentTarget,
                              )
                          : undefined
                      }
                      onPointerLeave={hasRowMenu ? deactivateRow : undefined}
                      className={cn(
                        "border-border/60 border-b transition-colors",
                        "data-[selected=true]:bg-primary/5",
                        "hover:bg-muted/50",
                      )}
                    >
                      {selectable ? (
                        <td className="text-center">
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => toggleRow(entry.id)}
                              aria-label={`Select row ${rowIndex + 1}`}
                            />
                          </div>
                        </td>
                      ) : null}
                      {orderedColumns.map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            "truncate px-4 text-foreground",
                            alignText(column.align),
                          )}
                        >
                          {!column.cell && column.editable ? (
                            <EditableCell
                              value={String(readCell(entry.row, column) ?? "")}
                              label={`${column.key} for row ${rowIndex + 1}`}
                              onChange={(next) =>
                                onCellEdit?.(entry.id, column.key, next)
                              }
                            />
                          ) : (
                            readCell(entry.row, column)
                          )}
                        </td>
                      ))}
                      {hasTrailingMenuSpace ? <td aria-hidden /> : null}
                    </tr>
                  );
                })}
                {loading ? (
                  <SkeletonRows
                    count={skeletonRows}
                    columns={orderedColumns}
                    selectable={selectable}
                    rowHeight={rowHeight}
                  />
                ) : null}
              </>
            )}
          </tbody>
        </table>
      </div>
      {hasRowMenu && activeRow ? (
        <RowHandle
          rowEl={activeRow.element}
          id={activeRow.id}
          index={activeRow.index}
          onInsertRow={onInsertRow}
          onDeleteRow={onDeleteRow}
          onEnter={() =>
            activateRow(activeRow.id, activeRow.index, activeRow.element)
          }
          onLeave={deactivateRow}
        />
      ) : null}
    </div>
  );
}
