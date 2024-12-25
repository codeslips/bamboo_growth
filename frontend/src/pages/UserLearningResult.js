import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Button,
  IconButton,
  Snackbar,
  Alert,
  Pagination,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { Share as ShareIcon, ContentCopy as ContentCopyIcon, Timeline as TimelineIcon } from '@mui/icons-material';
import { get, put } from '../api';
import { alpha } from '@mui/material/styles';
import { useLocation, useNavigate } from 'react-router-dom';
import ResultsCards from '../components/users/ResultsCards';
import ResultsTimeline from '../components/users/ResultsTimeline';
import { useTranslation } from 'react-i18next';

const UserLearningResult = () => {
  const [results, setResults] = useState([]);
  const [filters, setFilters] = useState({
    lesson_hash: '',
    is_shared: null
  });
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    hasMore: false
  });
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [shareDialog, setShareDialog] = useState({ open: false, result: null });
  const [timelineDialog, setTimelineDialog] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const lessonHash = searchParams.get('lesson_hash');
    if (lessonHash) {
      setFilters(prev => ({ ...prev, lesson_hash: lessonHash }));
    }
    fetchResults();
  }, [filters, pagination.page, location.search]);

  const fetchResults = async () => {
    try {
      const params = new URLSearchParams();
      params.append('limit', pagination.pageSize);
      params.append('offset', (pagination.page - 1) * pagination.pageSize);
      
      if (filters.lesson_hash) {
        params.append('lesson_hash', filters.lesson_hash);
      }
      if (filters.is_shared !== null) {
        params.append('is_shared', filters.is_shared);
      }

      const response = await get(`/user-lessons/results?${params.toString()}`);
      
      if (response.data) {
        setResults(response.data.results);
        setPagination(prev => ({
          ...prev,
          total: response.data.total,
          hasMore: response.data.has_more
        }));
      }
    } catch (error) {
      console.error('Error fetching results:', error);
      setSnackbar({
        open: true,
        message: error.message || 'Failed to fetch results',
        severity: 'error'
      });
    }
  };

  const handlePageChange = (event, newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage
    }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setPagination(prev => ({
      ...prev,
      page: 1
    }));
  };

  const handleShareToggle = async (result) => {
    try {
      const response = await put(`/user-lessons/results/${result.hash}/share?is_shared=${!result.is_shared}`);
      
      if (response.data) {
        // Update the result in the list
        setResults(prevResults => 
          prevResults.map(r => 
            r.hash === result.hash 
              ? { ...r, is_shared: response.data.is_shared }
              : r
          )
        );

        // If sharing was enabled, show the share dialog
        if (response.data.is_shared) {
          setShareDialog({ 
            open: true, 
            result: { ...result, share_token: response.data.share_token }
          });
        }

        setSnackbar({
          open: true,
          message: `Result ${response.data.is_shared ? 'shared' : 'unshared'} successfully`,
          severity: 'success'
        });
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to update sharing status',
        severity: 'error'
      });
    }
  };

  const handleCopyShareLink = (shareToken) => {
    const shareUrl = `${window.location.origin}/#/shared-result/${shareToken}`;
    navigator.clipboard.writeText(shareUrl);
    setSnackbar({
      open: true,
      message: 'Share link copied to clipboard',
      severity: 'success'
    });
  };

  const handleOpenSharePage = async (resultHash) => {
    try {
      const response = await get(`/user-lessons/results/${resultHash}/share-token`);
      if (response.data.share_token) {
        const shareUrl = `/#/share/${response.data.share_token}`;
        window.open(shareUrl, '_self');
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.message || 'Failed to get share token',
        severity: 'error'
      });
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 6,
        borderBottom: '2px solid',
        borderColor: 'primary.light',
        pb: 2
      }}>
        <Typography 
          variant="h4" 
          component="h1"
          sx={{ 
            fontWeight: 600,
            color: 'primary.main'
          }}
        >
          {t('learning-results')}
        </Typography>
        <IconButton
          onClick={() => setTimelineDialog(true)}
          color="primary"
          sx={{
            '&:hover': {
              backgroundColor: theme => alpha(theme.palette.primary.main, 0.1),
            }
          }}
        >
          <TimelineIcon />
        </IconButton>
      </Box>

      <ResultsCards 
        results={results}
        handleShareToggle={handleShareToggle}
        setShareDialog={setShareDialog}
        filters={filters}
        handleFilterChange={handleFilterChange}
        pagination={pagination}
        handlePageChange={handlePageChange}
      />

      <Dialog
        open={shareDialog.open}
        onClose={() => setShareDialog({ open: false, result: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('share-learning-result')}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <Typography variant="body2" gutterBottom>
              {shareDialog.result?.is_shared 
                ? 'This result is currently shared. You can open the share page or copy the share link:'
                : 'Share this result to let others see your progress:'}
            </Typography>
            {shareDialog.result?.is_shared && (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center',
                gap: 1,
                mt: 2 
              }}>
                <Button
                  variant="contained"
                  onClick={() => handleOpenSharePage(shareDialog.result.hash)}
                  startIcon={<ShareIcon />}
                >
                  {t('open-share-page')}
                </Button>
                <IconButton
                  onClick={() => handleCopyShareLink(shareDialog.result?.share_token)}
                  color="primary"
                >
                  <ContentCopyIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShareDialog({ open: false, result: null })}>
            {t('close')}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        fullScreen
        open={timelineDialog}
        onClose={() => setTimelineDialog(false)}
      >
        <Box sx={{ 
          p: 2, 
          display: 'flex', 
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: 1,
          borderColor: 'divider'
        }}>
          <Typography variant="h6">{t('learning-timeline')}</Typography>
          <Button onClick={() => setTimelineDialog(false)}>{t('close')}</Button>
        </Box>
        <Box sx={{ p: 2 }}>
          <ResultsTimeline
            results={results}
            handleShareToggle={handleShareToggle}
            setShareDialog={setShareDialog}
          />
        </Box>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default UserLearningResult;
