import { Button, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DescriptionIcon from '@mui/icons-material/Description';
import DownloadIcon from '@mui/icons-material/Download';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { ActorRole } from '../types';

interface ToolbarProps {
  actingRole: ActorRole;
  onChangeRole: (role: ActorRole) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  isExportingPdf: boolean;
  onImportCsv: () => void;
  canImportCsv: boolean;
  onDownloadTemplate: () => void;
  onAddRequest: () => void;
}

export default function Toolbar({
  actingRole,
  onChangeRole,
  onExportCsv,
  onExportPdf,
  isExportingPdf,
  onImportCsv,
  canImportCsv,
  onDownloadTemplate,
  onAddRequest
}: ToolbarProps) {
  return (
    <Stack
      className="frosted-block stagger-reveal delay-2"
      direction={{ xs: 'column', lg: 'row' }}
      spacing={{ xs: 0.8, md: 1.2 }}
      sx={{ p: { xs: 0.85, md: 1.3 }, alignItems: { xs: 'stretch', lg: 'center' } }}
    >
      <Typography variant="caption" sx={{ letterSpacing: '0.11em', textTransform: 'uppercase', px: { xs: 0.3, md: 1.2 } }}>
        Workspace Controls
      </Typography>
      <FormControl size="small" sx={{ minWidth: 140 }}>
        <InputLabel id="role-select-label">Role</InputLabel>
        <Select
          labelId="role-select-label"
          label="Role"
          value={actingRole}
          onChange={(event) => onChangeRole(event.target.value as ActorRole)}
        >
          <MenuItem value="Employee">Employee</MenuItem>
          <MenuItem value="Manager">Manager</MenuItem>
        </Select>
      </FormControl>
      <Button variant="outlined" startIcon={<DownloadIcon />} onClick={onExportCsv}>
        Export CSV
      </Button>
      <Button variant="outlined" startIcon={<PictureAsPdfIcon />} onClick={onExportPdf} disabled={isExportingPdf}>
        {isExportingPdf ? 'Exporting PDF...' : 'Export PDF'}
      </Button>
      <Button variant="outlined" startIcon={<FileUploadIcon />} onClick={onImportCsv} disabled={!canImportCsv}>
        Import CSV
      </Button>
      <Button variant="outlined" startIcon={<DescriptionIcon />} onClick={onDownloadTemplate}>
        CSV Template
      </Button>
      <Button className="cta-strong" variant="contained" startIcon={<AddIcon />} onClick={onAddRequest}>
        Add New Leave Request
      </Button>
    </Stack>
  );
}
