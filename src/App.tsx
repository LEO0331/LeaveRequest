import { ChangeEvent, useMemo, useRef, useState } from 'react';
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
  DialogContentText,
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
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import DownloadIcon from '@mui/icons-material/Download';
import EditIcon from '@mui/icons-material/Edit';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { LEAVE_QUOTAS, LEAVE_TYPES, USERS } from './lib/constants';
import { importErrorsToCsv, parseCsv, requestsToCsv } from './lib/csv';
import { calculateDurationDays, formatDateTime, toInputDateTime } from './lib/date';
import { exportRequestsToPdf } from './lib/pdf';
import { loadLeaveRequests, saveLeaveRequests, toLeaveRequest } from './lib/storage';
import { getUsedLeaveDays, validateDraft } from './lib/validation';
import { ActorRole, LeaveRequest, LeaveRequestDraft, LeaveStatus, ValidationErrors } from './types';

type SortField =
  | 'userName'
  | 'client'
  | 'leaveType'
  | 'startDate'
  | 'endDate'
  | 'durationDays'
  | 'status';
type SortDirection = 'asc' | 'desc';
type ActionType = 'cancel' | 'delete' | 'approve' | 'reject';

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

function statusColor(status: LeaveStatus): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'Approved') {
    return 'success';
  }

  if (status === 'Submitted') {
    return 'warning';
  }

  if (status === 'Rejected') {
    return 'error';
  }

  return 'default';
}

function appendHistory(
  record: LeaveRequest,
  action: 'Edited' | 'Approved' | 'Rejected' | 'Cancelled' | 'Deleted' | 'Imported',
  actorRole: ActorRole,
  note?: string
): LeaveRequest {
  return {
    ...record,
    updatedAt: new Date().toISOString(),
    history: [
      ...record.history,
      {
        action,
        at: new Date().toISOString(),
        actorRole,
        note
      }
    ]
  };
}

function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function App() {
  const [requests, setRequests] = useState<LeaveRequest[]>(() => loadLeaveRequests());
  const [actingRole, setActingRole] = useState<ActorRole>('Employee');
  const [globalSearch, setGlobalSearch] = useState('');
  const [userFilter, setUserFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | LeaveStatus>('all');
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
  const [successMessage, setSuccessMessage] = useState('Leave request submitted.');
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isActionPending, setIsActionPending] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  const [actionTarget, setActionTarget] = useState<LeaveRequest | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

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

      if (statusFilter !== 'all' && item.status !== statusFilter) {
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

      const haystack = `${item.id} ${item.userName} ${item.client} ${item.leaveType} ${item.status} ${item.reason}`.toLowerCase();
      return haystack.includes(q);
    });

    return sortRequests(filtered, sortField, sortDirection);
  }, [requests, globalSearch, userFilter, statusFilter, startFromFilter, endToFilter, sortField, sortDirection]);

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

  const balanceSummary = useMemo(() => {
    if (!formDraft.userId || !formDraft.leaveType) {
      return null;
    }

    const quota = LEAVE_QUOTAS[formDraft.leaveType];
    const used = getUsedLeaveDays(requests, formDraft.userId, formDraft.leaveType, isEditMode ? formDraft.id : undefined);
    const remaining = quota - used;

    return {
      quota,
      used,
      remaining
    };
  }, [formDraft.userId, formDraft.leaveType, requests, isEditMode, formDraft.id]);

  const activePdfSummary = useMemo(() => {
    const userName =
      userFilter === 'all'
        ? 'All Users'
        : USERS.find((user) => user.id === userFilter)?.name ?? userFilter;
    const statusName = statusFilter === 'all' ? 'All Statuses' : statusFilter;
    const sortName = `${sortField} (${sortDirection})`;

    return {
      role: actingRole,
      search: globalSearch.trim(),
      user: userName,
      status: statusName,
      startFrom: startFromFilter,
      endTo: endToFilter,
      sort: sortName
    };
  }, [
    userFilter,
    statusFilter,
    sortField,
    sortDirection,
    actingRole,
    globalSearch,
    startFromFilter,
    endToFilter
  ]);

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

  function persistAndNotify(next: LeaveRequest[], message: string): void {
    setRequests(next);
    saveLeaveRequests(next);
    setSuccessMessage(message);
    setShowSuccess(true);
  }

  async function handleSave(): Promise<void> {
    const errors = validateDraft(formDraft, requests, isEditMode ? formDraft.id : undefined);
    setFormErrors(errors);

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 400);
    });

    const nowIso = new Date().toISOString();
    const normalized = toLeaveRequest(formDraft, nowIso, actingRole);

    const next = isEditMode
      ? requests.map((entry) => {
          if (entry.id !== normalized.id) {
            return entry;
          }

          const edited = {
            ...entry,
            ...normalized,
            status: entry.status,
            createdAt: entry.createdAt,
            updatedAt: nowIso,
            history: entry.history
          };

          return appendHistory(edited, 'Edited', actingRole);
        })
      : [normalized, ...requests];

    persistAndNotify(next, isEditMode ? 'Leave request updated.' : 'Leave request submitted.');
    setFormOpen(false);
    setSelectedId(normalized.id);
    setIsSubmitting(false);
  }

  function openActionDialog(type: ActionType, request: LeaveRequest): void {
    setActionType(type);
    setActionTarget(request);
  }

  async function handleConfirmAction(): Promise<void> {
    if (!actionTarget || !actionType) {
      return;
    }

    setIsActionPending(true);
    await new Promise((resolve) => {
      window.setTimeout(resolve, 300);
    });

    if (actionType === 'delete') {
      const next = requests.filter((entry) => entry.id !== actionTarget.id);
      persistAndNotify(next, 'Leave request deleted.');
      if (selectedId === actionTarget.id) {
        setSelectedId(null);
      }
    } else {
      const statusMap: Record<Exclude<ActionType, 'delete'>, LeaveStatus> = {
        cancel: 'Cancelled',
        approve: 'Approved',
        reject: 'Rejected'
      };

      const actionMap: Record<Exclude<ActionType, 'delete'>, 'Cancelled' | 'Approved' | 'Rejected'> = {
        cancel: 'Cancelled',
        approve: 'Approved',
        reject: 'Rejected'
      };

      const next = requests.map((entry) => {
        if (entry.id !== actionTarget.id) {
          return entry;
        }

        const updated: LeaveRequest = {
          ...entry,
          status: statusMap[actionType],
          updatedAt: new Date().toISOString()
        };

        return appendHistory(updated, actionMap[actionType], actingRole);
      });

      const messageMap: Record<Exclude<ActionType, 'delete'>, string> = {
        cancel: 'Leave request cancelled.',
        approve: 'Leave request approved.',
        reject: 'Leave request rejected.'
      };

      persistAndNotify(next, messageMap[actionType]);
    }

    setActionType(null);
    setActionTarget(null);
    setIsActionPending(false);
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

  function handleExportCsv(): void {
    const csv = requestsToCsv(filteredRequests);
    const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    downloadCsv(csv, `leave-requests-${stamp}.csv`);
  }

  async function handleExportPdf(): Promise<void> {
    try {
      setIsExportingPdf(true);
      await exportRequestsToPdf(filteredRequests, activePdfSummary);
    } catch {
      setErrorMessage('PDF export failed. Please try again.');
      setShowError(true);
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const content = await file.text();
      const { rows: parsedRows, errors: importErrors } = parseCsv(content);

      if (importErrors.length > 0) {
        const report = importErrorsToCsv(importErrors);
        const stamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
        downloadCsv(report, `leave-import-errors-${stamp}.csv`);
      }

      if (parsedRows.length === 0) {
        setErrorMessage(
          importErrors.length > 0
            ? 'No valid rows imported. Error report downloaded.'
            : 'No valid rows found in CSV import file.'
        );
        setShowError(true);
        return;
      }

      const map = new Map(requests.map((row) => [row.id, row]));
      parsedRows.forEach((row) => {
        const existing = map.get(row.id);
        if (existing) {
          map.set(
            row.id,
            appendHistory(
              {
                ...existing,
                ...row,
                history: existing.history,
                updatedAt: new Date().toISOString()
              },
              'Imported',
              'Manager',
              'Row updated from CSV import'
            )
          );
          return;
        }

        map.set(row.id, row);
      });

      const next = Array.from(map.values());
      const suffix =
        importErrors.length > 0 ? ` ${importErrors.length} row error(s) reported in download.` : '';
      persistAndNotify(next, `Imported ${parsedRows.length} record(s) from CSV.${suffix}`);
    } catch {
      setErrorMessage('CSV import failed. Please verify file format.');
      setShowError(true);
    } finally {
      event.target.value = '';
    }
  }

  const canApproveReject = actingRole === 'Manager' && selectedRequest?.status === 'Submitted';
  const canCancel =
    actingRole === 'Employee' &&
    selectedRequest &&
    (selectedRequest.status === 'Submitted' || selectedRequest.status === 'Approved');
  const canDelete = actingRole === 'Manager' && Boolean(selectedRequest);
  const canEdit =
    selectedRequest &&
    (selectedRequest.status === 'Submitted' || selectedRequest.status === 'Approved');

  const actionDialogTitle =
    actionType === 'approve'
      ? 'Approve Leave Request'
      : actionType === 'reject'
        ? 'Reject Leave Request'
        : actionType === 'cancel'
          ? 'Cancel Leave Request'
          : 'Delete Leave Request';

  const actionDialogBody =
    actionType === 'approve'
      ? 'This will mark the request as approved.'
      : actionType === 'reject'
        ? 'This will mark the request as rejected.'
        : actionType === 'cancel'
          ? 'This will mark the request as cancelled and keep it in history.'
          : 'This will permanently remove the request from local storage.';

  const actionDialogConfirm =
    actionType === 'approve'
      ? 'Confirm Approve'
      : actionType === 'reject'
        ? 'Confirm Reject'
        : actionType === 'cancel'
          ? 'Confirm Cancel'
          : 'Confirm Delete';

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack spacing={3}>
        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
          <Box>
            <Typography variant="h4" fontWeight={700}>
              Leave Management System
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Approval workflow, leave balance controls, and CSV import/export
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <FormControl sx={{ minWidth: 130 }}>
              <InputLabel id="role-select-label">Role</InputLabel>
              <Select
                labelId="role-select-label"
                label="Role"
                value={actingRole}
                onChange={(event) => setActingRole(event.target.value as ActorRole)}
              >
                <MenuItem value="Employee">Employee</MenuItem>
                <MenuItem value="Manager">Manager</MenuItem>
              </Select>
            </FormControl>
            <Button variant="outlined" startIcon={<DownloadIcon />} onClick={handleExportCsv}>
              Export CSV
            </Button>
            <Button
              variant="outlined"
              startIcon={<PictureAsPdfIcon />}
              onClick={() => {
                void handleExportPdf();
              }}
              disabled={isExportingPdf}
            >
              {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => importInputRef.current?.click()}
              disabled={actingRole !== 'Manager'}
            >
              Import CSV
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateForm}>
              Add New Leave Request
            </Button>
          </Stack>
          <input
            ref={importInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(event) => {
              void handleImportFile(event);
            }}
          />
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
              placeholder="Search by user, leave type, status, reason, or id"
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

            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel id="filter-status-label">Status</InputLabel>
              <Select
                labelId="filter-status-label"
                label="Status"
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value as 'all' | LeaveStatus);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                <MenuItem value="Submitted">Submitted</MenuItem>
                <MenuItem value="Approved">Approved</MenuItem>
                <MenuItem value="Rejected">Rejected</MenuItem>
                <MenuItem value="Cancelled">Cancelled</MenuItem>
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
            <Switch checked={groupByClient} onChange={(event) => setGroupByClient(event.target.checked)} />
            <Typography variant="body2">Group by client summary</Typography>
            {groupByClient &&
              groupSummary.map(([client, count]) => <Chip key={client} size="small" label={`${client}: ${count}`} />)}
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
                    onClick={() => setSelectedId(item.id)}
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

      <Drawer anchor="right" open={Boolean(selectedRequest)} onClose={() => setSelectedId(null)}>
        <Box sx={{ width: { xs: 320, sm: 450 }, p: 3 }}>
          {selectedRequest && (
            <Stack spacing={2}>
              <Typography variant="h6">Leave Request Details</Typography>
              <Typography variant="body2">ID: {selectedRequest.id}</Typography>
              <Typography variant="body2">User: {selectedRequest.userName}</Typography>
              <Typography variant="body2">Client: {selectedRequest.client}</Typography>
              <Typography variant="body2">Type: {selectedRequest.leaveType}</Typography>
              <Typography variant="body2">
                Status: <Chip size="small" color={statusColor(selectedRequest.status)} label={selectedRequest.status} />
              </Typography>
              <Typography variant="body2">Start: {formatDateTime(selectedRequest.startDate)}</Typography>
              <Typography variant="body2">End: {formatDateTime(selectedRequest.endDate)}</Typography>
              <Typography variant="body2">Duration: {selectedRequest.durationDays.toFixed(2)} business days</Typography>
              <Typography variant="body2">Reason: {selectedRequest.reason}</Typography>

              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                Audit Trail
              </Typography>
              <Stack spacing={0.75}>
                {selectedRequest.history.slice().reverse().slice(0, 8).map((entry, index) => (
                  <Typography key={`${entry.at}-${index}`} variant="caption" color="text.secondary">
                    {formatDateTime(entry.at)} | {entry.actorRole} | {entry.action}
                    {entry.note ? ` | ${entry.note}` : ''}
                  </Typography>
                ))}
              </Stack>

              <Button
                variant="outlined"
                startIcon={<EditIcon />}
                onClick={() => openEditForm(selectedRequest)}
                disabled={!canEdit}
              >
                Edit Request
              </Button>
              <Button
                variant="outlined"
                color="success"
                startIcon={<CheckCircleIcon />}
                disabled={!canApproveReject}
                onClick={() => openActionDialog('approve', selectedRequest)}
              >
                Approve Request
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<HighlightOffIcon />}
                disabled={!canApproveReject}
                onClick={() => openActionDialog('reject', selectedRequest)}
              >
                Reject Request
              </Button>
              <Button
                variant="outlined"
                color="warning"
                startIcon={<BlockIcon />}
                disabled={!canCancel}
                onClick={() => openActionDialog('cancel', selectedRequest)}
              >
                Cancel Request
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                disabled={!canDelete}
                onClick={() => openActionDialog('delete', selectedRequest)}
              >
                Delete Request
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
            {formErrors.balance && <Alert severity="error">{formErrors.balance}</Alert>}

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

            {balanceSummary && (
              <Alert severity={balanceSummary.remaining < formDuration ? 'warning' : 'info'}>
                Quota: {balanceSummary.quota.toFixed(2)} days | Used: {balanceSummary.used.toFixed(2)} days |
                Remaining: {balanceSummary.remaining.toFixed(2)} days
              </Alert>
            )}

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
              label="Calculated Business Days (weekends/holidays excluded)"
              value={formDuration.toFixed(2)}
              InputProps={{ readOnly: true }}
              fullWidth
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeForm} disabled={isSubmitting}>
            Close
          </Button>
          <Button
            variant="contained"
            onClick={() => {
              void handleSave();
            }}
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {isSubmitting ? 'Saving...' : isEditMode ? 'Save Changes' : 'Submit Request'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(actionType && actionTarget)} onClose={() => setActionType(null)}>
        <DialogTitle>{actionDialogTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{actionDialogBody}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setActionType(null);
              setActionTarget(null);
            }}
            disabled={isActionPending}
          >
            Back
          </Button>
          <Button
            variant="contained"
            color={actionType === 'delete' || actionType === 'reject' ? 'error' : actionType === 'cancel' ? 'warning' : 'success'}
            disabled={isActionPending}
            onClick={() => {
              void handleConfirmAction();
            }}
          >
            {isActionPending ? 'Processing...' : actionDialogConfirm}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2200}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" variant="filled" onClose={() => setShowSuccess(false)}>
          {successMessage}
        </Alert>
      </Snackbar>

      <Snackbar
        open={showError}
        autoHideDuration={2600}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="error" variant="filled" onClose={() => setShowError(false)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
}
