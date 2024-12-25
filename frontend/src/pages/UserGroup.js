import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Paper,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Snackbar,
  Alert,
  IconButton
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon, Search as SearchIcon } from '@mui/icons-material';
import { get, post, put, post_json } from '../api';
import InputAdornment from '@mui/material/InputAdornment';

const UserGroup = () => {
  const { groupHash } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    is_open: true,
    is_closed: false
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const [groupResponse, membersResponse] = await Promise.all([
        get(`/user-groups/${groupHash}`),
        get(`/user-groups/${groupHash}/members`)
      ]);

      setGroup(groupResponse.data);
      setMembers(membersResponse.data);
      setLoading(false);
    } catch (err) {
      showSnackbar('Failed to load group data', 'error');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (groupHash) {
      fetchGroupData();
    }
  }, [groupHash]);

  const handleJoinGroup = async () => {
    try {
      await post_json(`/user-groups/${groupHash}/join`);
      await fetchGroupData();
      showSnackbar('Successfully joined the group');
    } catch (err) {
      showSnackbar(err.message || 'Failed to join group', 'error');
    }
  };

  const handleLeaveGroup = async () => {
    try {
      await post_json(`/user-groups/${groupHash}/leave`);
      await fetchGroupData();
      showSnackbar('Successfully left the group');
    } catch (err) {
      showSnackbar(err.message || 'Failed to leave group', 'error');
    }
  };

  const handleUpdateGroup = async (e) => {
    e.preventDefault();
    try {
      await put(`/user-groups/${groupHash}`, formData);
      await fetchGroupData();
      setModalOpen(false);
      showSnackbar('Group updated successfully');
    } catch (err) {
      showSnackbar('Failed to update group', 'error');
    }
  };

  const fetchAvailableUsers = async () => {
    try {
      const response = await get('/users');
      const filteredUsers = response.data.filter(
        user => !members.some(member => member.user_hash === user.hash)
      );
      setAvailableUsers(filteredUsers);
    } catch (err) {
      showSnackbar('Failed to load users', 'error');
    }
  };

  const handleAddUserToGroup = async () => {
    if (!selectedUser) {
      showSnackbar('Please select a user', 'error');
      return;
    }

    try {
      await post_json(`/user-groups/${groupHash}/join`, {
        user_hash: selectedUser.hash
      });
      await fetchGroupData();
      setAddUserDialogOpen(false);
      setSelectedUser(null);
      showSnackbar('User added to group successfully');
    } catch (err) {
      showSnackbar(err.message || 'Failed to add user to group', 'error');
    }
  };

  const handleRemoveMember = async (userHash) => {
    try {
      await post_json(`/user-groups/${groupHash}/leave`, {
        user_hash: userHash
      });
      await fetchGroupData();
      showSnackbar('Member removed successfully');
    } catch (err) {
      showSnackbar(err.message || 'Failed to remove member', 'error');
    }
  };

  const columns = [
    { id: 'full_name', label: 'Member Name' },
    { id: 'joined_at', label: 'Joined Date' },
    { id: 'actions', label: 'Actions' }
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
        <CircularProgress />
      </Box>
    );
  }

  if (!group) {
    return (
      <Box p={3}>
        <Typography variant="h6">Group not found</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h5">{group.name}</Typography>
          <Box>
            {group.is_open && !group.is_closed && (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  fetchAvailableUsers();
                  setAddUserDialogOpen(true);
                }}
                startIcon={<AddIcon />}
              >
                Add User
              </Button>
            )}
          </Box>
        </Box>
        
        <Typography variant="body1" color="text.secondary" mb={2}>
          {group.description}
        </Typography>

        <Box mb={4}>
          <Typography variant="h6" mb={2}>Members ({members.length})</Typography>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <TableCell key={column.id}>{column.label}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.user_hash}>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell>
                      {new Date(member.joined_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {user?.role === 'admin' && (
                        <IconButton 
                          color="error"
                          onClick={() => handleRemoveMember(member.user_hash)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* Edit Group Dialog */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit Group</DialogTitle>
        <form onSubmit={handleUpdateGroup}>
          <DialogContent>
            <TextField
              fullWidth
              margin="normal"
              label="Group Name"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              fullWidth
              margin="normal"
              label="Description"
              name="description"
              multiline
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained">Update</Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Add User Dialog */}
      <Dialog 
        open={addUserDialogOpen} 
        onClose={() => setAddUserDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add User to Group</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="Search Users"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Email</TableCell>
                  <TableCell>Action</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {availableUsers
                  .filter(user => 
                    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchQuery.toLowerCase())
                  )
                  .map((user) => (
                    <TableRow 
                      key={user.hash}
                      selected={selectedUser?.hash === user.hash}
                    >
                      <TableCell>{user.full_name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Button
                          variant={selectedUser?.hash === user.hash ? "contained" : "outlined"}
                          size="small"
                          onClick={() => setSelectedUser(user)}
                        >
                          Select
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddUserDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleAddUserToGroup}
            variant="contained"
            disabled={!selectedUser}
          >
            Add to Group
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserGroup;
