import { Box, Button, Chip, Drawer, IconButton, Stack, Typography } from '@mui/material';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import CloseIcon from '@mui/icons-material/Close';
import { statusColor } from '../lib/app-layer';
import { formatDateTime } from '../lib/date';
import { ActionType } from '../lib/app-layer';
import { LeaveRequest } from '../types';

interface DetailsDrawerProps {
  request: LeaveRequest | null;
  canEdit: boolean;
  canApproveReject: boolean;
  canCancel: boolean;
  canDelete: boolean;
  onClose: () => void;
  onEdit: (request: LeaveRequest) => void;
  onAction: (action: ActionType, request: LeaveRequest) => void;
}

export default function DetailsDrawer({
  request,
  canEdit,
  canApproveReject,
  canCancel,
  canDelete,
  onClose,
  onEdit,
  onAction
}: DetailsDrawerProps) {
  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={Boolean(request)}
      onClose={onClose}
      PaperProps={{ sx: { borderLeft: '1px solid rgba(255,255,255,0.08)' } }}
    >
      <Box
        sx={{
          width: { xs: 330, sm: 460 },
          p: 3,
          height: '100%',
          background: 'linear-gradient(180deg, #1b2431 0%, #111827 100%)',
          color: '#f9fafb'
        }}
      >
        {request && (
          <Stack spacing={2}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography className="section-title" variant="h5" color="inherit">
                Request Chronicle
              </Typography>
              <IconButton aria-label="Close request details" onClick={onClose} sx={{ color: '#f9fafb' }}>
                <CloseIcon />
              </IconButton>
            </Stack>
            <Typography variant="body2">ID: {request.id}</Typography>
            <Typography variant="body2">User: {request.userName}</Typography>
            <Typography variant="body2">Client: {request.client}</Typography>
            <Typography variant="body2">Type: {request.leaveType}</Typography>
            <Typography variant="body2">
              Status: <Chip size="small" color={statusColor(request.status)} label={request.status} />
            </Typography>
            <Typography variant="body2">Start: {formatDateTime(request.startDate)}</Typography>
            <Typography variant="body2">End: {formatDateTime(request.endDate)}</Typography>
            <Typography variant="body2">Duration: {request.durationDays.toFixed(2)} business days</Typography>
            <Typography variant="body2">Reason: {request.reason}</Typography>

            <Typography variant="subtitle2" sx={{ mt: 1.5, opacity: 0.8 }}>
              Audit Trail
            </Typography>
            <Stack spacing={0.75}>
              {request.history.slice().reverse().slice(0, 8).map((entry, index) => (
                <Typography key={`${entry.at}-${index}`} variant="caption" sx={{ opacity: 0.78 }}>
                  {formatDateTime(entry.at)} | {entry.actorRole} | {entry.action}
                  {entry.note ? ` | ${entry.note}` : ''}
                </Typography>
              ))}
            </Stack>

            <Button variant="outlined" startIcon={<EditIcon />} onClick={() => onEdit(request)} disabled={!canEdit} sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.35)' }}>
              Edit Request
            </Button>
            <Button variant="outlined" color="success" startIcon={<CheckCircleIcon />} disabled={!canApproveReject} onClick={() => onAction('approve', request)}>
              Approve Request
            </Button>
            <Button variant="outlined" color="error" startIcon={<HighlightOffIcon />} disabled={!canApproveReject} onClick={() => onAction('reject', request)}>
              Reject Request
            </Button>
            <Button variant="outlined" color="warning" startIcon={<BlockIcon />} disabled={!canCancel} onClick={() => onAction('cancel', request)}>
              Cancel Request
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} disabled={!canDelete} onClick={() => onAction('delete', request)}>
              Delete Request
            </Button>
          </Stack>
        )}
      </Box>
    </Drawer>
  );
}
