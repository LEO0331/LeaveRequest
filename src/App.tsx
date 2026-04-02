import { ChangeEvent, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Snackbar,
  Stack,
  TextField,
  Link,
  Typography
} from '@mui/material';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import Toolbar from './components/Toolbar';
import Filters from './components/Filters';
import RequestTable from './components/RequestTable';
import DetailsDrawer from './components/DetailsDrawer';
import {
  ActionType,
  actionDialogCopy,
  appendHistory,
  buildPdfSummary,
  downloadTextFile,
  draftFromRequest,
  emptyDraft,
  SortDirection,
  SortField,
  sortRequests,
  timestampSuffix
} from './lib/app-layer';
import { LEAVE_QUOTAS, LEAVE_TYPES, USERS } from './lib/constants';
import { csvTemplate, importErrorsToCsv, parseCsv, requestsToCsv } from './lib/csv';
import { calculateDurationDays } from './lib/date';
import { exportRequestsToPdf } from './lib/pdf';
import { loadLeaveRequests, saveLeaveRequests, toLeaveRequest } from './lib/storage';
import { getUsedLeaveDays, validateDraft } from './lib/validation';
import { ActorRole, LeaveRequest, LeaveRequestDraft, LeaveStatus, ValidationErrors } from './types';

export default function App() {
  const [viewMode, setViewMode] = useState<'home' | 'dashboard'>('home');
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

  const activePdfSummary = useMemo(
    () =>
      buildPdfSummary({
        actingRole,
        globalSearch,
        userFilter,
        statusFilter,
        startFromFilter,
        endToFilter,
        sortField,
        sortDirection
      }),
    [
      actingRole,
      globalSearch,
      userFilter,
      statusFilter,
      startFromFilter,
      endToFilter,
      sortField,
      sortDirection
    ]
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

  function onChangeUserFilter(value: string): void {
    setUserFilter(value);
    setPage(0);
  }

  function handleExportCsv(): void {
    const csv = requestsToCsv(filteredRequests);
    const stamp = timestampSuffix();
    downloadTextFile(csv, `leave-requests-${stamp}.csv`, 'text/csv;charset=utf-8;');
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

    const isCsvName = file.name.toLowerCase().endsWith('.csv');
    if (!isCsvName) {
      setErrorMessage('Only .csv files are allowed for import.');
      setShowError(true);
      event.target.value = '';
      return;
    }

    const maxImportBytes = 2 * 1024 * 1024;
    if (file.size > maxImportBytes) {
      setErrorMessage('CSV import file is too large. Maximum supported size is 2MB.');
      setShowError(true);
      event.target.value = '';
      return;
    }

    try {
      const content = await file.text();
      const { rows: parsedRows, errors: importErrors } = parseCsv(content);

      if (importErrors.length > 0) {
        const report = importErrorsToCsv(importErrors);
        const stamp = timestampSuffix();
        downloadTextFile(report, `leave-import-errors-${stamp}.csv`, 'text/csv;charset=utf-8;');
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

  function handleDownloadTemplate(): void {
    const template = csvTemplate();
    downloadTextFile(template, 'leave-import-template.csv', 'text/csv;charset=utf-8;');
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

  const dialogCopy = useMemo(() => actionDialogCopy(actionType), [actionType]);
  const dashboardStats = useMemo(
    () => ({
      total: requests.length,
      submitted: requests.filter((entry) => entry.status === 'Submitted').length,
      approved: requests.filter((entry) => entry.status === 'Approved').length,
      activeUsers: new Set(requests.map((entry) => entry.userId)).size
    }),
    [requests]
  );

  return (
    <Container maxWidth="xl" className="editorial-shell" sx={{ py: { xs: 2.2, md: 4 }, px: { xs: 1.1, sm: 2.3 } }}>
      {viewMode === 'home' ? (
        <Stack spacing={{ xs: 1.6, md: 2.4 }}>
          <Box className="stagger-reveal">
            <span className="hero-kicker">Leave Atelier</span>
            <Typography className="hero-title">
              Approvals that feel less like admin, more like orchestration.
            </Typography>
            <Typography sx={{ maxWidth: 760, color: 'text.secondary', fontSize: '1.03rem' }}>
              A designer-led leave workflow with intelligent validation, crisp reporting, and a dashboard your team will actually enjoy opening.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', lg: 'row' }} spacing={{ xs: 1.3, md: 2 }}>
            <Box className="hero-panel stagger-reveal delay-1" sx={{ p: { xs: 1.55, md: 3 }, flex: 1.45 }}>
              <Typography className="section-title" variant="h4" sx={{ mb: 1.5 }}>
                First Version Ready
              </Typography>
              <Typography sx={{ color: 'text.secondary', mb: 2 }}>
                Validate leave rules, track balance, process approvals, and export polished reports from one unified control room.
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 0.9, md: 1.2 }}>
                <Button
                  className="cta-strong"
                  variant="contained"
                  size="large"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => setViewMode('dashboard')}
                >
                  Enter Dashboard
                </Button>
                <Button variant="outlined" size="large" href="privacy-security.html" target="_blank" rel="noopener noreferrer">
                  Review Privacy & Security
                </Button>
              </Stack>
            </Box>
            <Stack sx={{ flex: 1 }} spacing={{ xs: 1, md: 1.5 }}>
              <Box className="frosted-block stagger-reveal delay-2" sx={{ p: { xs: 1.25, md: 2 } }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                  Total Requests
                </Typography>
                <Typography className="section-title" variant="h3">{dashboardStats.total.toLocaleString()}</Typography>
              </Box>
              <Box className="frosted-block stagger-reveal delay-3" sx={{ p: { xs: 1.25, md: 2 } }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                  Awaiting Decision
                </Typography>
                <Typography className="section-title" variant="h3">{dashboardStats.submitted.toLocaleString()}</Typography>
              </Box>
              <Box className="frosted-block stagger-reveal delay-4" sx={{ p: { xs: 1.25, md: 2 } }}>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', letterSpacing: '0.1em', color: 'text.secondary' }}>
                  Active Contributors
                </Typography>
                <Typography className="section-title" variant="h3">{dashboardStats.activeUsers.toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Stack>
        </Stack>
      ) : (
        <Stack spacing={2.2}>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" spacing={1.5}>
            <Box className="stagger-reveal">
              <Typography className="section-title" variant="h3">
                Leave Operations Studio
              </Typography>
              <Typography color="text.secondary">
                Editorial dashboard for approvals, balance governance, and export-ready reporting.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                variant="outlined"
                startIcon={<HomeRoundedIcon />}
                onClick={() => setViewMode('home')}
              >
                Home
              </Button>
            </Stack>
          </Stack>

          <Toolbar
            actingRole={actingRole}
            onChangeRole={setActingRole}
            onExportCsv={handleExportCsv}
            onExportPdf={() => {
              void handleExportPdf();
            }}
            isExportingPdf={isExportingPdf}
            onImportCsv={() => importInputRef.current?.click()}
            canImportCsv={actingRole === 'Manager'}
            onDownloadTemplate={handleDownloadTemplate}
            onAddRequest={openCreateForm}
          />
          <input
            ref={importInputRef}
            type="file"
            aria-label="Import CSV file"
            accept=".csv,text/csv"
            style={{ display: 'none' }}
            onChange={(event) => {
              void handleImportFile(event);
            }}
          />

          <Filters
            globalSearch={globalSearch}
            onGlobalSearchChange={(value) => {
              setGlobalSearch(value);
              setPage(0);
            }}
            userFilter={userFilter}
            onUserFilterChange={onChangeUserFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={(value) => {
              setStatusFilter(value);
              setPage(0);
            }}
            startFromFilter={startFromFilter}
            onStartFromFilterChange={(value) => {
              setStartFromFilter(value);
              setPage(0);
            }}
            endToFilter={endToFilter}
            onEndToFilterChange={(value) => {
              setEndToFilter(value);
              setPage(0);
            }}
            groupByClient={groupByClient}
            onGroupByClientChange={setGroupByClient}
            groupSummary={groupSummary}
          />

          <RequestTable
            pagedRequests={pagedRequests}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onSort={onSort}
            sortLabel={sortLabel}
            totalCount={filteredRequests.length}
            page={page}
            rowsPerPage={rowsPerPage}
            onPageChange={setPage}
            onRowsPerPageChange={(nextRowsPerPage) => {
              setRowsPerPage(nextRowsPerPage);
              setPage(0);
            }}
          />
        </Stack>
      )}

      <DetailsDrawer
        request={selectedRequest}
        canEdit={Boolean(canEdit)}
        canApproveReject={Boolean(canApproveReject)}
        canCancel={Boolean(canCancel)}
        canDelete={Boolean(canDelete)}
        onClose={() => setSelectedId(null)}
        onEdit={openEditForm}
        onAction={openActionDialog}
      />

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
        <DialogTitle>{dialogCopy.title}</DialogTitle>
        <DialogContent>
          <DialogContentText>{dialogCopy.body}</DialogContentText>
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
            {isActionPending ? 'Processing...' : dialogCopy.confirm}
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
      <Box sx={{ mt: 3, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          By using this app, you agree to our{' '}
          <Link href="privacy-security.html" target="_blank" rel="noopener noreferrer">
            Privacy & Security Policy
          </Link>
          .
        </Typography>
      </Box>
    </Container>
  );
}
