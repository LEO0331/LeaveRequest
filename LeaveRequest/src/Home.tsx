/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  TextareaAutosize,
  FilledTextFieldProps,
  OutlinedTextFieldProps,
  StandardTextFieldProps,
  TextFieldVariants,
} from '@mui/material';
import { DatePicker } from '@mui/lab';
import { Add } from '@mui/icons-material';
import { JSX } from 'react/jsx-runtime';

// Sample list of users
const users = [
  'User 1',
  'User 2',
  'User 3',
  'User 4',
  'User 5',
  'User 6',
  'User 7',
  'User 8',
  'User 9',
  'User 10',
];

const Home: React.FC = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    startDate: new Date(),
    endDate: new Date(),
    leaveType: '',
    reason: '',
    user: '',
  });

  const handleAddRequest = () => {
    setShowAddDialog(true);
  };

  const handleCloseAddDialog = () => {
    setShowAddDialog(false);
  };

  const handleCreateRequest = () => {
    // Add validation logic here
    // If validation passes, add the new leave request to the list
    setLeaveRequests([...leaveRequests, formData]);
    setShowAddDialog(false);
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  return (
    <div>
      <Button variant="contained" startIcon={<Add />} onClick={handleAddRequest}>
        Add New Leave Request
      </Button>

      <Dialog open={showAddDialog} onClose={handleCloseAddDialog}>
        <DialogTitle>Create New Leave Request</DialogTitle>
        <DialogContent>
          <DatePicker
            label="Start Date"
            value={formData.startDate}
            onChange={(date: any) => setFormData({ ...formData, startDate: date })}
            renderInput={(params: JSX.IntrinsicAttributes & { variant?: TextFieldVariants | undefined; } & Omit<FilledTextFieldProps | OutlinedTextFieldProps | StandardTextFieldProps, "variant">) => <TextField {...params} />}
          />
          <DatePicker
            label="End Date"
            value={formData.endDate}
            onChange={(date: any) => setFormData({ ...formData, endDate: date })}
            renderInput={(params: JSX.IntrinsicAttributes & { variant?: TextFieldVariants | undefined; } & Omit<FilledTextFieldProps | OutlinedTextFieldProps | StandardTextFieldProps, "variant">) => <TextField {...params} />}
          />
          <FormControl>
            <InputLabel>Leave Type</InputLabel>
            <Select
              value={formData.leaveType}
              onChange={(event) => setFormData({ ...formData, leaveType: event.target.value as string })}
            >
              <MenuItem value="Personal">Personal</MenuItem>
              <MenuItem value="Sick">Sick</MenuItem>
              <MenuItem value="Vacation">Vacation</MenuItem>
              <MenuItem value="Bereavement">Bereavement</MenuItem>
            </Select>
          </FormControl>
          <TextareaAutosize
            aria-label="Leave Reason"
            placeholder="Leave Reason"
            name="reason"
            value={formData.reason}
            onChange={handleChange}
          />
          <FormControl>
            <InputLabel>User</InputLabel>
            <Select
              value={formData.user}
              onChange={(event) => setFormData({ ...formData, user: event.target.value as string })}
            >
              {users.map((user, index) => (
                <MenuItem key={index} value={user}>
                  {user}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAddDialog}>Cancel</Button>
          <Button onClick={handleCreateRequest}>Create</Button>
        </DialogActions>
      </Dialog>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Start Date</TableCell>
              <TableCell>End Date</TableCell>
              <TableCell>Leave Type</TableCell>
              <TableCell>Reason</TableCell>
              <TableCell>User</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {leaveRequests.map((request, index) => (
              <TableRow key={index}>
                <TableCell>{request.startDate}</TableCell>
                <TableCell>{request.endDate}</TableCell>
                <TableCell>{request.leaveType}</TableCell>
                <TableCell>{request.reason}</TableCell>
                <TableCell>{request.user}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </div>
  );
};

export default Home;
