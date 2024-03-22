import { Button, TextField, Select, MenuItem, FormControl, InputLabel } from '@mui/material';
import { useForm } from 'react-hook-form';
import { DatePicker } from '@mui/lab';

interface FormValues {
  leaveType: string;
  leaveReason: string;
  startDate: Date | null;
  endDate: Date | null;
  assignedUser: string;
}

const LeaveRequestForm: React.FC = () => {
  const { register, handleSubmit} = useForm<FormValues>();
  
  const onSubmit = (data: FormValues) => {
    console.log(data);
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <DatePicker 
        label="Start Date"
        {...register("startDate", { required: true })}
      />
      <DatePicker 
        label="End Date"
        {...register("endDate", { required: true })}
      />
      <FormControl>
        <InputLabel id="leave-type">Leave Type</InputLabel>
        <Select
          labelId="leave-type"
          {...register("leaveType", { required: true })}
        >
          {/* Leave types */}
          <MenuItem value="Personal">Personal</MenuItem>
          <MenuItem value="Sick">Sick</MenuItem>
          <MenuItem value="Vacation">Vacation</MenuItem>
          <MenuItem value="Bereavement">Bereavement</MenuItem>
        </Select>
      </FormControl>
      <TextField 
        label="Leave Reason" 
        {...register("leaveReason", { required: true, maxLength: 50 })}
      />
      <FormControl>
        <InputLabel id="assigned-user">Assigned User</InputLabel>
        <Select
          labelId="assigned-user"
          {...register("assignedUser", { required: true })}
        >
          {/* Add users here */}
          <MenuItem value={"User1"}>{"User1"}</MenuItem>
          <MenuItem value={"User2"}>{"User2"}</MenuItem>
        </Select>
      </FormControl>
      <Button type="submit">Submit</Button>
    </form>
  );
};

export default LeaveRequestForm;