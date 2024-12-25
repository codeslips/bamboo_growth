import React, { useState, useEffect } from 'react';
import {
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Avatar,
    Chip,
    Tooltip,
    CircularProgress,
    Box,
    Typography,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    InputAdornment,
    MenuItem,
    Select
} from '@mui/material';
import { PersonOutline as PersonOutlineIcon, Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Search as SearchIcon } from '@mui/icons-material';
import * as api from '../../api';

const STATUS_OPTIONS = [
    { value: 'not_started', label: 'Not Started' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'locked', label: 'Locked' },
    { value: 'archived', label: 'Archived' },
    { value: 'deleted', label: 'Deleted' }
];

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'} ago`;
    } else if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    } else if (minutes > 0) {
        return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    } else {
        return 'just now';
    }
};

const handleStatusUpdate = async (lessonHash, userHash, newStatus) => {
    try {
        const response = await api.put(`/user-lessons/${lessonHash}`, {
            user_hash: userHash,
            status: newStatus
        });
        return response;
    } catch (error) {
        console.error('Error updating status:', error);
        throw error;
    }
};

const getStatusColor = (status) => {
    const statusColors = {
        not_started: 'default',
        in_progress: 'primary',
        completed: 'success',
        locked: 'warning',
        archived: 'secondary',
        deleted: 'error'
    };
    return statusColors[status] || 'default';
};

const LessonUsers = ({ lessonHash }) => {
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [orderBy, setOrderBy] = useState('last_accessed');
    const [order, setOrder] = useState('desc');
    const [openAddUsers, setOpenAddUsers] = useState(false);
    const [userHashes, setUserHashes] = useState('');
    const [addingUsers, setAddingUsers] = useState(false);
    const [availableUsers, setAvailableUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUsers, setSelectedUsers] = useState([]);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        if (lessonHash) {
            fetchLessonUsers();
        }
    }, [lessonHash, page, rowsPerPage]);

    const fetchLessonUsers = async () => {
        try {
            const response = await api.get(
                `/user-lessons?lesson_hash=${lessonHash}&current_user=false&page=${page + 1}&page_size=${rowsPerPage}`
            );
            setUsers(response.data.items);
            setTotalCount(response.data.total);
        } catch (error) {
            console.error('Error fetching lesson users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === 'asc';
        setOrder(isAsc ? 'desc' : 'asc');
        setOrderBy(property);
    };

    const sortData = (data) => {
        return data.sort((a, b) => {
            let compareA = a[orderBy];
            let compareB = b[orderBy];

            if (orderBy === 'last_accessed') {
                compareA = compareA ? new Date(compareA).getTime() : 0;
                compareB = compareB ? new Date(compareB).getTime() : 0;
            } else if (orderBy === 'progress' || orderBy === 'score') {
                compareA = compareA || 0;
                compareB = compareB || 0;
            }

            if (order === 'desc') {
                return compareB - compareA;
            }
            return compareA - compareB;
        });
    };

    const fetchAvailableUsers = async () => {
        try {
            const response = await api.get('/users');
            const filteredUsers = response.data.filter(
                user => !users.some(existingUser => existingUser.user_hash === user.hash)
            );
            setAvailableUsers(filteredUsers);
        } catch (error) {
            console.error('Error fetching users:', error);
        }
    };

    const handleAddUsers = async () => {
        if (selectedUsers.length === 0) return;
        
        setAddingUsers(true);
        try {
            const userHashes = selectedUsers.map(user => user.hash);
            await api.post_json(`/user-lessons/${lessonHash}/users`, {
                user_hashes: userHashes
            });
            
            await fetchLessonUsers();
            setOpenAddUsers(false);
            setSelectedUsers([]);
            setSearchQuery('');
        } catch (error) {
            console.error('Error adding users:', error);
        } finally {
            setAddingUsers(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
                <CircularProgress />
            </Box>
        );
    }

    const sortedUsers = sortData([...users]);

    return (
        <Paper elevation={2}>
            <Box p={2} display="flex" justifyContent="flex-end">
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => {
                        fetchAvailableUsers();
                        setOpenAddUsers(true);
                    }}
                >
                    Add Users
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell 
                                onClick={() => handleSort('progress')}
                                style={{ cursor: 'pointer' }}
                            >
                                Progress
                            </TableCell>
                            <TableCell 
                                onClick={() => handleSort('score')}
                                style={{ cursor: 'pointer' }}
                            >
                                Score
                            </TableCell>
                            <TableCell 
                                onClick={() => handleSort('last_accessed')}
                                style={{ cursor: 'pointer' }}
                            >
                                Last Accessed
                            </TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Avatar>
                                            <PersonOutlineIcon />
                                        </Avatar>
                                        <Typography variant="body2">
                                            {user.user_hash}
                                        </Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={user.status || 'not_started'}
                                        size="small"
                                        onChange={async (event) => {
                                            try {
                                                await handleStatusUpdate(user.lesson_hash, user.user_hash, event.target.value);
                                                // Update the local state
                                                setUsers(users.map(u => 
                                                    u.id === user.id 
                                                        ? { ...u, status: event.target.value }
                                                        : u
                                                ));
                                            } catch (error) {
                                                console.error('Failed to update status:', error);
                                                // You might want to add a snackbar or other error notification here
                                            }
                                        }}
                                        sx={{ minWidth: 120 }}
                                    >
                                        {STATUS_OPTIONS.map((option) => (
                                            <MenuItem key={option.value} value={option.value}>
                                                <Chip
                                                    label={option.label}
                                                    color={getStatusColor(option.value)}
                                                    size="small"
                                                    sx={{ width: '100%' }}
                                                />
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    {Math.round(user.progress)}%
                                </TableCell>
                                <TableCell>
                                    {user.score ? `${Math.round(user.score)}%` : '-'}
                                </TableCell>
                                <TableCell>
                                    {user.last_accessed ? (
                                        <Tooltip title={new Date(user.last_accessed).toLocaleString()}>
                                            <span>{formatTimeAgo(user.last_accessed)}</span>
                                        </Tooltip>
                                    ) : '-'}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
            <TablePagination
                rowsPerPageOptions={[5, 10, 25]}
                component="div"
                count={totalCount}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
            />
            <Dialog 
                open={openAddUsers} 
                onClose={() => setOpenAddUsers(false)} 
                maxWidth="md" 
                fullWidth
            >
                <DialogTitle>Add Users to Lesson</DialogTitle>
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
                                        user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
                                    )
                                    .map((user) => (
                                        <TableRow 
                                            key={user.hash}
                                            selected={selectedUsers.some(u => u.hash === user.hash)}
                                        >
                                            <TableCell>{user.full_name}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant={selectedUsers.some(u => u.hash === user.hash) 
                                                        ? "contained" 
                                                        : "outlined"}
                                                    size="small"
                                                    onClick={() => {
                                                        if (selectedUsers.some(u => u.hash === user.hash)) {
                                                            setSelectedUsers(selectedUsers.filter(u => u.hash !== user.hash));
                                                        } else {
                                                            setSelectedUsers([...selectedUsers, user]);
                                                        }
                                                    }}
                                                >
                                                    {selectedUsers.some(u => u.hash === user.hash) 
                                                        ? 'Selected' 
                                                        : 'Select'}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => {
                        setOpenAddUsers(false);
                        setSelectedUsers([]);
                        setSearchQuery('');
                    }}>
                        Cancel
                    </Button>
                    <Button 
                        onClick={handleAddUsers} 
                        color="primary" 
                        disabled={addingUsers || selectedUsers.length === 0}
                        variant="contained"
                    >
                        {addingUsers ? 'Adding...' : `Add Selected Users (${selectedUsers.length})`}
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
};

export default LessonUsers;
