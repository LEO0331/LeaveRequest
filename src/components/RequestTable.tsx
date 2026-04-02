import { Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination, TableRow, Typography } from '@mui/material';
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
    <Paper className="hero-panel stagger-reveal delay-4" sx={{ overflow: 'hidden' }}>
      <Typography className="section-title" variant="h6" sx={{ px: 2.2, pt: 2.2 }}>
        Request Ledger
      </Typography>
      <TableContainer sx={{ maxHeight: '62vh', px: 0.8, pb: 0.8 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell><Button size="small" onClick={() => onSort('userName')}>{sortLabel('userName', 'User')}</Button></TableCell>
              <TableCell><Button size="small" onClick={() => onSort('client')}>{sortLabel('client', 'Client')}</Button></TableCell>
              <TableCell><Button size="small" onClick={() => onSort('leaveType')}>{sortLabel('leaveType', 'Leave Type')}</Button></TableCell>
              <TableCell><Button size="small" onClick={() => onSort('startDate')}>{sortLabel('startDate', 'Start Date')}</Button></TableCell>
              <TableCell><Button size="small" onClick={() => onSort('endDate')}>{sortLabel('endDate', 'End Date')}</Button></TableCell>
              <TableCell><Button size="small" onClick={() => onSort('durationDays')}>{sortLabel('durationDays', 'Days')}</Button></TableCell>
              <TableCell><Button size="small" onClick={() => onSort('status')}>{sortLabel('status', 'Status')}</Button></TableCell>
              <TableCell>Reason</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pagedRequests.map((item) => (
              <TableRow
                className="ledger-row"
                key={item.id}
                hover
                sx={{
                  cursor: 'pointer',
                  '& td': { borderColor: 'rgba(17, 24, 39, 0.09)' },
                  transition: 'background-color 200ms ease, transform 180ms ease'
                }}
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
                  <Chip className="interactive-chip" size="small" color={statusColor(item.status)} label={item.status} />
                </TableCell>
                <TableCell sx={{ maxWidth: 240 }}>{item.reason}</TableCell>
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
