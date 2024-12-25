import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  Grid,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Snackbar,
  Alert,
  Pagination,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { get, post_json, put, del } from '../api';
import { alpha } from '@mui/material/styles';

const defaultLessonTypeForm = {
  name: '',
  description: '',
  content_template: '',
  is_active: true
};

const LessonTypes = () => {
  const [lessonTypes, setLessonTypes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [lessonTypeForm, setLessonTypeForm] = useState(defaultLessonTypeForm);
  const [isEditing, setIsEditing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 9,
    totalCount: 0,
    totalPages: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [lessonTypeToDelete, setLessonTypeToDelete] = useState(null);

  useEffect(() => {
    fetchLessonTypes();
  }, [pagination.page, searchTerm]);

  const fetchLessonTypes = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        page_size: pagination.pageSize
      });

      if (searchTerm) {
        params.append('search', searchTerm);
      }

      const response = await get(`/lesson-types/search?${params.toString()}`);
      
      if (response.data && response.data.items && response.data.pagination) {
        setLessonTypes(response.data.items);
        setPagination(prev => ({
          ...prev,
          totalCount: response.data.pagination.total_count,
          totalPages: response.data.pagination.total_pages
        }));
      }
    } catch (error) {
      console.error('Error fetching lesson types:', error);
      setSnackbar({ 
        open: true, 
        message: 'Error loading lesson types: ' + (error.message || 'Unknown error'), 
        severity: 'error' 
      });
    }
  };

  const handleOpenDialog = (lessonType = null) => {
    if (lessonType) {
      setLessonTypeForm(lessonType);
      setIsEditing(true);
    } else {
      setLessonTypeForm(defaultLessonTypeForm);
      setIsEditing(false);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setLessonTypeForm(defaultLessonTypeForm);
    setIsEditing(false);
  };

  const handleFormChange = (field, value) => {
    setLessonTypeForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async () => {
    try {
      if (isEditing) {
        await put(`/lesson-types/${lessonTypeForm.name}`, lessonTypeForm);
        setSnackbar({ open: true, message: 'Lesson type updated successfully', severity: 'success' });
      } else {
        await post_json('/lesson-types', lessonTypeForm);
        setSnackbar({ open: true, message: 'Lesson type created successfully', severity: 'success' });
      }
      handleCloseDialog();
      fetchLessonTypes();
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'An error occurred', severity: 'error' });
    }
  };

  const handleToggleStatus = async (lessonType, value) => {
    try {
      await post(`/lesson-types/${lessonType.name}/toggle-status`, { value });
      fetchLessonTypes();
      setSnackbar({ open: true, message: 'Status updated successfully', severity: 'success' });
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'An error occurred', severity: 'error' });
    }
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleDelete = async () => {
    try {
      await del(`/lesson-types/${lessonTypeToDelete.name}`);
      setSnackbar({ open: true, message: 'Lesson type deleted successfully', severity: 'success' });
      setDeleteConfirmOpen(false);
      setLessonTypeToDelete(null);
      fetchLessonTypes();
    } catch (error) {
      setSnackbar({ open: true, message: error.message || 'An error occurred', severity: 'error' });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box 
        sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: 6,
          borderBottom: '2px solid',
          borderColor: 'primary.light',
          pb: 2
        }}
      >
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          Lesson Types
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          sx={{
            borderRadius: 2,
            px: 3,
            py: 1,
            boxShadow: 2,
            '&:hover': {
              transform: 'translateY(-2px)',
              transition: 'transform 0.2s'
            }
          }}
        >
          Create Lesson Type
        </Button>
      </Box>

      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          label="Search lesson types"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ backgroundColor: 'background.paper' }}
        />
      </Box>

      <Grid container spacing={3}>
        {lessonTypes.map((lessonType) => (
          <Grid item xs={12} sm={6} md={4} key={lessonType.name}>
            <Card 
              sx={{ 
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease-in-out',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  transform: 'translateY(-8px)',
                  boxShadow: theme => `0 12px 24px ${alpha(theme.palette.primary.main, 0.15)}`,
                  borderColor: 'primary.main',
                }
              }}
            >
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'flex-start',
                  mb: 2
                }}>
                  <Typography 
                    variant="h6" 
                    component="h2" 
                    sx={{ 
                      fontWeight: 600,
                      color: 'text.primary',
                      fontSize: '1.1rem',
                      lineHeight: 1.3
                    }}
                  >
                    {lessonType.name}
                  </Typography>
                  <Box>
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog(lessonType)}
                      sx={{ 
                        color: 'primary.main',
                        backgroundColor: 'primary.lighter',
                        '&:hover': { 
                          backgroundColor: 'primary.light',
                          transform: 'rotate(15deg)',
                          transition: 'transform 0.2s'
                        }
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => {
                        setDeleteConfirmOpen(true);
                        setLessonTypeToDelete(lessonType);
                      }}
                      sx={{ 
                        color: 'primary.main',
                        backgroundColor: 'primary.lighter',
                        '&:hover': { 
                          backgroundColor: 'primary.light',
                          transform: 'rotate(15deg)',
                          transition: 'transform 0.2s'
                        }
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
                
                <Typography 
                  variant="body2" 
                  sx={{ 
                    mb: 2,
                    color: 'text.secondary',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    lineHeight: 1.6
                  }}
                >
                  {lessonType.description || 'No description provided'}
                </Typography>

                <Box sx={{ 
                  mt: 'auto',
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={lessonType.is_active}
                        onChange={(e) => handleToggleStatus(lessonType, e.target.checked)}
                        color="primary"
                      />
                    }
                    label="Active"
                  />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {lessonTypes.length === 0 && (
        <Box 
          sx={{ 
            mt: 4, 
            textAlign: 'center',
            py: 8,
            backgroundColor: 'background.paper',
            borderRadius: 2,
            boxShadow: 1
          }}
        >
          <Typography color="textSecondary">
            No lesson types found
          </Typography>
        </Box>
      )}

      {lessonTypes.length > 0 && (
        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <Pagination 
            count={pagination.totalPages}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton 
            showLastButton
          />
        </Box>
      )}

      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {isEditing ? 'Edit Lesson Type' : 'Create New Lesson Type'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              label="Name"
              fullWidth
              value={lessonTypeForm.name}
              onChange={(e) => handleFormChange('name', e.target.value)}
              disabled={isEditing}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={lessonTypeForm.description}
              onChange={(e) => handleFormChange('description', e.target.value)}
            />
            <TextField
              label="Content Template"
              fullWidth
              multiline
              rows={4}
              value={lessonTypeForm.content_template}
              onChange={(e) => handleFormChange('content_template', e.target.value)}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {isEditing ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Dialog
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Delete"}</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this lesson type?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDelete} color="primary" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LessonTypes;
