import { Chip, FormControl, InputLabel, MenuItem, Paper, Select, Stack, Switch, TextField, Typography } from '@mui/material';
import { USERS } from '../lib/constants';
import { LeaveStatus } from '../types';

interface FiltersProps {
  globalSearch: string;
  onGlobalSearchChange: (value: string) => void;
  userFilter: string;
  onUserFilterChange: (value: string) => void;
  statusFilter: 'all' | LeaveStatus;
  onStatusFilterChange: (value: 'all' | LeaveStatus) => void;
  startFromFilter: string;
  onStartFromFilterChange: (value: string) => void;
  endToFilter: string;
  onEndToFilterChange: (value: string) => void;
  groupByClient: boolean;
  onGroupByClientChange: (value: boolean) => void;
  groupSummary: Array<[string, number]>;
}

export default function Filters({
  globalSearch,
  onGlobalSearchChange,
  userFilter,
  onUserFilterChange,
  statusFilter,
  onStatusFilterChange,
  startFromFilter,
  onStartFromFilterChange,
  endToFilter,
  onEndToFilterChange,
  groupByClient,
  onGroupByClientChange,
  groupSummary
}: FiltersProps) {
  return (
    <Paper sx={{ p: 2 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <TextField
          fullWidth
          label="Global Search"
          value={globalSearch}
          onChange={(event) => onGlobalSearchChange(event.target.value)}
          placeholder="Search by user, leave type, status, reason, or id"
        />

        <FormControl sx={{ minWidth: 180 }}>
          <InputLabel id="filter-user-label">User</InputLabel>
          <Select
            labelId="filter-user-label"
            label="User"
            value={userFilter}
            onChange={(event) => onUserFilterChange(event.target.value)}
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
            onChange={(event) => onStatusFilterChange(event.target.value as 'all' | LeaveStatus)}
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
          onChange={(event) => onStartFromFilterChange(event.target.value)}
        />

        <TextField
          label="End Date To"
          type="datetime-local"
          InputLabelProps={{ shrink: true }}
          value={endToFilter}
          onChange={(event) => onEndToFilterChange(event.target.value)}
        />
      </Stack>

      <Stack mt={2} direction="row" alignItems="center" spacing={1}>
        <Switch checked={groupByClient} onChange={(event) => onGroupByClientChange(event.target.checked)} />
        <Typography variant="body2">Group by client summary</Typography>
        {groupByClient &&
          groupSummary.map(([client, count]) => <Chip key={client} size="small" label={`${client}: ${count}`} />)}
      </Stack>
    </Paper>
  );
}
