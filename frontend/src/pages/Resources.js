import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Grid,
  IconButton,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
} from '@mui/material';
import { Delete, Edit, Add } from '@mui/icons-material';
import * as api from '../api';

const RESOURCE_TYPES = ['audio', 'video', 'page', 'image', 'document', 'subtitle', 'other'];
const STORAGE_TYPES = ['file', 'object'];
const STATUS_CHOICES = ['active', 'deleted', 'processing', 'error'];

const Resources = () => {
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState({ open: false, message: '', severity: 'success' });
  const [filters, setFilters] = useState({
    resource_type: '',
    storage_type: '',
    status: '',
    limit: 10,
    offset: 0,
  });
  const [total, setTotal] = useState(0);
  const [editingResource, setEditingResource] = useState(null);

  const showAlert = (message, severity = 'success') => {
    setAlert({ open: true, message, severity });
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, open: false });
  };

  const fetchResources = async () => {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        ...filters,
        current_user: 'true',
      }).toString();

      const response = await api.get(`/resources/list?${queryParams}`);
      console.log(response);
      setResources(response.data.items);
      setTotal(response.data.total);
    } catch (error) {
      showAlert(error.message || 'Failed to fetch resources', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
  }, [filters]);

  const handleFilterChange = (field) => (event) => {
    setFilters({
      ...filters,
      [field]: event.target.value,
      offset: 0, // Reset pagination when filters change
    });
  };

  const handleDelete = async (hash) => {
    try {
      await api.del(`/resources/${hash}`);
      showAlert('Resource deleted successfully');
      fetchResources();
    } catch (error) {
      showAlert(error.message || 'Failed to delete resource', 'error');
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.target);
    const resourceData = {
      title: formData.get('title'),
      description: formData.get('description'),
      resource_type: formData.get('resource_type'),
      storage_type: formData.get('storage_type'),
      status: formData.get('status') || 'active',
    };

    try {
      if (editingResource) {
        await api.put(`/resources/${editingResource.hash}`, resourceData);
        showAlert('Resource updated successfully');
      } else {
        await api.post_json('/resources', resourceData);
        showAlert('Resource created successfully');
      }
      setEditingResource(null);
      fetchResources();
    } catch (error) {
      showAlert(error.message || 'Failed to save resource', 'error');
    }
  };

  const handlePageChange = (newOffset) => {
    setFilters({
      ...filters,
      offset: newOffset,
    });
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Snackbar 
        open={alert.open} 
        autoHideDuration={6000} 
        onClose={handleCloseAlert}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseAlert} severity={alert.severity}>
          {alert.message}
        </Alert>
      </Snackbar>

      <Grid container spacing={3}>
        {/* Filters */}
        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Resource Type</InputLabel>
                  <Select
                    value={filters.resource_type}
                    onChange={handleFilterChange('resource_type')}
                    label="Resource Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    {RESOURCE_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Storage Type</InputLabel>
                  <Select
                    value={filters.storage_type}
                    onChange={handleFilterChange('storage_type')}
                    label="Storage Type"
                  >
                    <MenuItem value="">All</MenuItem>
                    {STORAGE_TYPES.map((type) => (
                      <MenuItem key={type} value={type}>
                        {type}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={4}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filters.status}
                    onChange={handleFilterChange('status')}
                    label="Status"
                  >
                    <MenuItem value="">All</MenuItem>
                    {STATUS_CHOICES.map((status) => (
                      <MenuItem key={status} value={status}>
                        {status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Resource Form */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="h6">
                      {editingResource ? 'Edit Resource' : 'Create New Resource'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="title"
                      label="Title"
                      required
                      defaultValue={editingResource?.title || ''}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      name="description"
                      label="Description"
                      defaultValue={editingResource?.description || ''}
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Resource Type</InputLabel>
                      <Select
                        name="resource_type"
                        label="Resource Type"
                        required
                        defaultValue={editingResource?.resource_type || ''}
                      >
                        {RESOURCE_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Storage Type</InputLabel>
                      <Select
                        name="storage_type"
                        label="Storage Type"
                        required
                        defaultValue={editingResource?.storage_type || ''}
                      >
                        {STORAGE_TYPES.map((type) => (
                          <MenuItem key={type} value={type}>
                            {type}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                  <Grid item xs={12}>
                    <Button
                      type="submit"
                      variant="contained"
                      startIcon={editingResource ? <Edit /> : <Add />}
                    >
                      {editingResource ? 'Update' : 'Create'} Resource
                    </Button>
                    {editingResource && (
                      <Button
                        sx={{ ml: 2 }}
                        onClick={() => setEditingResource(null)}
                        variant="outlined"
                      >
                        Cancel
                      </Button>
                    )}
                  </Grid>
                </Grid>
              </form>
            </CardContent>
          </Card>
        </Grid>

        {/* Resources Table */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Title</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Storage</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Created At</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resources.map((resource) => (
                  <TableRow key={resource.hash}>
                    <TableCell>{resource.title}</TableCell>
                    <TableCell>{resource.resource_type}</TableCell>
                    <TableCell>{resource.storage_type}</TableCell>
                    <TableCell>{resource.status}</TableCell>
                    <TableCell>
                      {new Date(resource.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <IconButton onClick={() => setEditingResource(resource)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => handleDelete(resource.hash)}>
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          
          {/* Pagination */}
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              disabled={filters.offset === 0}
              onClick={() => handlePageChange(filters.offset - filters.limit)}
            >
              Previous
            </Button>
            <Button
              disabled={filters.offset + filters.limit >= total}
              onClick={() => handlePageChange(filters.offset + filters.limit)}
            >
              Next
            </Button>
          </Box>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Resources;
