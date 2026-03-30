import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  SelectChangeEvent,
  Snackbar,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import { LEAVE_TYPES, USERS } from './lib/constants';
import { calculateDurationDays, formatDateTime, toInputDateTime } from './lib/date';
import { loadLeaveRequests, saveLeaveRequests, toLeaveRequest } from './lib/storage';
import { validateDraft } from './lib/validation';
import { LeaveRequest, LeaveRequestDraft, ValidationErrors } from './types';

type SortField = 'userName' | 'client' | 'leaveType' | 'startDate' | 'endDate' | 'durationDays';
type SortDirection = 'asc' | 'desc';

function sortRequests(items: LeaveRequest[], field: SortField, direction: SortDirection): LeaveRequest[] {
  const sorted = [...items].sort((a, b) => {
    const first = a[field];
    const second = b[field];

    if (typeof first === 'number' && typeof second === 'number') {
      return first - second;
    }

    return String(first).localeCompare(String(second));
  });

  return direction === 'asc' ? sorted : sorted.reverse();
}

function emptyDraft(): LeaveRequestDraft {
  return {
    userId: '',
    leaveType: '',
    startDate: '',
    endDate: '',
    reason: ''
  };
}

function draftFromRequest(item: LeaveRequest): LeaveRequestDraft {
  return {
    id: item.id,
    userId: item.userId,
    leaveType: item.leaveType,
    startDate: toInputDateTime(item.startDate),
    endDate: toInputDateTime(item.endDate),
    reason: item.reason
  };
}

export default function App() {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => loadLeaveRequests());
  const [globalSearch, setGlobalSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [startFromFilter, setStartFromFilter] = useState('');
  const [endToFilter, setEndToFilter] = useState('');
  const [sortField, setSortField] = useState<SortField>('startDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [groupByClient, setGroupByClient] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [formDraft, setFormDraft] = useState<LeaveRequestDraft>(emptyDraft());
  const [formErrors, setFormErrors] = useState<ValidationErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [showSuccess, setShowSuccess] = useState(false);

  const selectedRequest = useMemo(
    () => requests.find((entry) => entry.id === selectedId) ?? null,
    [requests, selectedId]
  );

  const filteredRequests = useMemo(() => {
    const q = globalSearch.trim().toLowerCase();

    const filtered = requests.filter((item) => {
      if (userFilter !== 'all' && item.userId !== userFilter) {
        return false;
      }

      if (startFromFilter) {
        const startAt = new Date(startFromFilter).getTime();
        if (new Date(item.startDate).getTime() < startAt) {
          return false;
        }
      }

      if (endToFilter) {
        const endAt = new Date(endToFilter).getTime();
        if (new Date(item.endDate).getTime() > endAt) {
          return false;
        }
      }

      if (!q) {
        return true;
      }

      const haystack = `${item.id} ${item.userName} ${item.client} ${item.leaveType} ${item.reason}`.toLowerCase();
      return haystack.includes(q);
    });

    return sortRequests(filtered, sortField, sortDirection);
  }, [requests, globalSearch, userFilter, startFromFilter, endToFilter, sortField, sortDirection]);

  const pagedRequests = useMemo(() => {
    const start = page * rowsPerPage;
    return filteredRequests.slice(start, start + rowsPerPage);
  }, [filteredRequests, page, rowsPerPage]);

  const groupSummary = useMemo(() => {
    const map = new Map<string, number>();
    filteredRequests.forEach((item) => {
      map.set(item.client, (map.get(item.client) ?? 0) + 1);
    });

    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredRequests]);

  const formDuration = useMemo(
    () => calculateDurationDays(formDraft.startDate, formDraft.endDate),
    [formDraft.startDate, formDraft.endDate]
  );

  function onSort(nextField: SortField): void {
    if (sortField === nextField) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(nextField);
    setSortDirection('asc');
  }

  function openCreateForm(): void {
    setIsEditMode(false);
    setFormDraft(emptyDraft());
    setFormErrors({});
    setFormOpen(true);
  }

  function openEditForm(record: LeaveRequest): void {
    setIsEditMode(true);
    setFormDraft(draftFromRequest(record));
    setFormErrors({});
    setFormOpen(true);
  }

  function closeForm(): void {
    if (isSubmitting) {
      return;
    }

    setFormOpen(false);
  }

  function handleFormField<K extends keyof LeaveRequestDraft>(key: K, value: LeaveRequestDraft[K]): void {
    setFormDraft((current) => ({ ...current, [key]: value }));
  }

  async function handleSave(): Promise<void> {
    const errors = validateDraft(formDraft, requests, isEditMode ? formDraft.id : undefined);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);

    await new Promise((resolve) => {
      window.setTimeout(resolve, 500);
    });

    const createdAtFallback = new Date().toISOString();
    const normalized = toLeaveRequest(formDraft, createdAtFallback);

    const next = isEditMode
      ? requests.map((entry) => {
          if (entry.id !== normalized.id) {
            return entry;
          }

          return {
            ...normalized,
            createdAt: entry.createdAt
          };
        })
      : [normalized, ...requests];

    setRequests(next);
    saveLeaveRequests(next);
    setFormOpen(false);
    setSelectedId(normalized.id);
    setShowSuccess(true);
    setIsSubmitting(false);
  }

  function sortLabel(field: SortField, label: string): string {
    if (sortField !== field) {
      return `${label} ⇅`;
    }

    return `${label} ${sortDirection === 'asc' ? '↑' : '↓'}`;
  }

  function onChangeUserFilter(event: SelectChangeEvent): void {
    setUserFilter(event.target.value);
    setPage(0);
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Leave Management System
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Local-storage backed dashboard with 10,000+ records for load testing
            </Typography>
          </Box>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
            Add New Leave Request
          </Button>
        </Stack>

        <Paper sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              fullWidth
              label="Global Search"
              value={globalSearch}
              onChange={(event) => {
                setGlobalSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search by keyword, user, leave type, reason, or id"
            />

            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel id="filter-user-label">User</InputLabel>
              <Select
                labelId="filter-user-label"
                label="User"
                value={userFilter}
                onChange={onChangeUserFilter}
              >
                <MenuItem value="all">All Users</MenuItem>
                {USERS.map((user) => (
                  <MenuItem value={user.id} key={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Start Date From"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={startFromFilter}
              onChange={(event) => {
                setStartFromFilter(event.target.value);
                setPage(0);
              }}
            />

            <TextField
              label="End Date To"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={endToFilter}
              onChange={(event) => {
                setEndToFilter(event.target.value);
                setPage(0);
              }}
            />
          </Stack>

          <Stack mt={2} direction="row" alignItems="center" spacing={1}>
            <Switch
              checked={groupByClient}
              onChange={(event) => setGroupByClient(event.target.checked)}
            />
            <Typography variant="body2">Group by client summary</Typography>
            {groupByClient &&
              groupSummary.map(([client, count]) => (
                <Chip key={client} size="small" label={`${client}: ${count}`} />
              ))}
          </Stack>
        </Paper>

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
                    onClick={() => setSelectedId(item.id)}
                  >
                    <TableCell>{item.userName}</TableCell>
                    <TableCell>{item.client}</TableCell>
                    <TableCell>{item.leaveType}</TableCell>
                    <TableCell>{formatDateTime(item.startDate)}</TableCell>
                    <TableCell>{formatDateTime(item.endDate)}</TableCell>
                    <TableCell>{item.durationDays.toFixed(2)}</TableCell>
                    <TableCell>{item.reason}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          <TablePagination
            component="div"
            count={filteredRequests.length}
            page={page}
            onPageChange={(_, nextPage) => setPage(nextPage)}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={(event) => {
              setRowsPerPage(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[25, 50, 100]}
          />
        </Paper>
      </Stack>

      <Drawer
        anchor="right"
        open={Boolean(selectedRequest)}
        onClose={() => setSelectedId(null)}
      >
        <Box sx={{ width: { xs: 320, sm: 420 }, p: 3 }}>
          {selectedRequest && (
            <Stack spacing={2}>
              <Typography variant="h6">Leave Request Details</Typography>
              <Typography variant="body2">ID: {selectedRequest.id}</Typography>
              <Typography variant="body2">User: {selectedRequest.userName}</Typography>
              <Typography variant="body2">Client: {selectedRequest.client}</Typography>
              <Typography variant="body2">Type: {selectedRequest.leaveType}</Typography>
              <Typography variant="body2">
                Start: {formatDateTime(selectedRequest.startDate)}
              </Typography>
              <Typography variant="body2">End: {formatDateTime(selectedRequest.endDate)}</Typography>
              <Typography variant="body2">
                Duration: {selectedRequest.durationDays.toFixed(2)} days
              </Typography>
              <Typography variant="body2">Reason: {selectedRequest.reason}</Typography>
              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => openEditForm(selectedRequest)}
              >
                Edit Request
              </Button>
            </Stack>
          )}
        </Box>
      </Drawer>

      <Dialog open={formOpen} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{isEditMode ? 'Edit Leave Request' : 'Add Leave Request'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} mt={1}>
            {formErrors.overlap && <Alert severity="error">{formErrors.overlap}</Alert>}
            {formErrors.duration && <Alert severity="error">{formErrors.duration}</Alert>}

            <FormControl fullWidth error={Boolean(formErrors.userId)}>
              <InputLabel id="form-user-label">User</InputLabel>
              <Select
                labelId="form-user-label"
                label="User"
                value={formDraft.userId}
                onChange={(event) => handleFormField('userId', event.target.value)}
              >
                {USERS.map((user) => (
                  <MenuItem value={user.id} key={user.id}>
                    {user.name}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.userId && (
                <Typography variant="caption" color="error">
                  {formErrors.userId}
                </Typography>
              )}
            </FormControl>

            <FormControl fullWidth error={Boolean(formErrors.leaveType)}>
              <InputLabel id="form-type-label">Leave Type</InputLabel>
              <Select
                labelId="form-type-label"
                label="Leave Type"
                value={formDraft.leaveType}
                onChange={(event) =>
                  handleFormField('leaveType', event.target.value as LeaveRequestDraft['leaveType'])
                }
              >
                {LEAVE_TYPES.map((leaveType) => (
                  <MenuItem value={leaveType} key={leaveType}>
                    {leaveType}
                  </MenuItem>
                ))}
              </Select>
              {formErrors.leaveType && (
                <Typography variant="caption" color="error">
                  {formErrors.leaveType}
                </Typography>
              )}
            </FormControl>

            <TextField
              label="Start Date"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={formDraft.startDate}
              onChange={(event) => handleFormField('startDate', event.target.value)}
              error={Boolean(formErrors.startDate)}
              helperText={formErrors.startDate}
              fullWidth
            />

            <TextField
              label="End Date"
              type="datetime-local"
              InputLabelProps={{ shrink: true }}
              value={formDraft.endDate}
              onChange={(event) => handleFormField('endDate', event.target.value)}
              error={Boolean(formErrors.endDate)}
              helperText={formErrors.endDate}
              fullWidth
            />

            <TextField
              label="Reason"
              multiline
              minRows={3}
              value={formDraft.reason}
              onChange={(event) => handleFormField('reason', event.target.value.slice(0, 50))}
              error={Boolean(formErrors.reason)}
              helperText={formErrors.reason ?? `${formDraft.reason.length}/50`}
              fullWidth
            />

            <TextField
              label="Calculated Days (floor to 2 decimals)"
              value={formDuration.toFixed(2)}
              InputProps={{ readOnly: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForm} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setShowSuccess(false)}>
          Leave request saved successfully.
        </Alert>
      </Snackbar>
    </Container>
  );
}
