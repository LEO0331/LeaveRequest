import { Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow } from '@mui/material';
import { statusColor } from '../lib/app-layer';
import { formatDateTime } from '../lib/date';
import { LeaveRequest } from '../types';
import { SortField } from '../lib/app-layer';

interface RequestTableProps {
  pagedRequests: LeaveRequest[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSort: (field: SortField) => void;
  sortLabel: (field: SortField, label: string) => string;
  totalCount: number;
  page: number;
  rowsPerPage: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rowsPerPage: number) => void;
}

export default function RequestTable({
  pagedRequests,
  selectedId,
  onSelect,
  onSort,
  sortLabel,
  totalCount,
  page,
  rowsPerPage,
  onPageChange,
  onRowsPerPageChange
}: RequestTableProps) {
  return (
    <Paper>
      <TableContainer sx={{ maxHeight: '65vh' }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>
                <Button size="small" onClick={() => onSort('userName')}>
                  {sortLabel('userName', 'User')}
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => onSort('client')}>
                  {sortLabel('client', 'Client')}
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => onSort('leaveType')}>
                  {sortLabel('leaveType', 'Leave Type')}
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => onSort('startDate')}>
                  {sortLabel('startDate', 'Start Date')}
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => onSort('endDate')}>
                  {sortLabel('endDate', 'End Date')}
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => onSort('durationDays')}>
                  {sortLabel('durationDays', 'Days')}
                </Button>
              </TableCell>
              <TableCell>
                <Button size="small" onClick={() => onSort('status')}>
                  {sortLabel('status', 'Status')}
                </Button>
              </TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRequests.map((item) => (
              <TableRow
                key={item.id}
                hover
                sx={{ cursor: 'pointer' }}
                selected={item.id === selectedId}
                onClick={() => onSelect(item.id)}
              >
                <TableCell>{item.userName}</TableCell>
                <TableCell>{item.client}</TableCell>
                <TableCell>{item.leaveType}</TableCell>
                <TableCell>{formatDateTime(item.startDate)}</TableCell>
                <TableCell>{formatDateTime(item.endDate)}</TableCell>
                <TableCell>{item.durationDays.toFixed(2)}</TableCell>
                <TableCell>
                  <Chip size="small" color={statusColor(item.status)} label={item.status} />
                </TableCell>
                <TableCell>{item.reason}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={totalCount}
        page={page}
        onPageChange={(_, nextPage) => onPageChange(nextPage)}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(event) => onRowsPerPageChange(Number(event.target.value))}
        rowsPerPageOptions={[25, 50, 100]}
      />
    </Paper>
  );
}
