import React, { useEffect, useState } from 'react';
import { get, put } from '../api';
import {
  Box,
  Card,
  CardContent,
  Container,
  Typography,
  Grid,
  Divider,
  Alert,
  Stack,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  ThumbUp as ThumbUpIcon,
  Comment as CommentIcon,
  Share as ShareIcon,
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

const LessonResultsList = () => {
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [openShareDialog, setOpenShareDialog] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoadingShareToken, setIsLoadingShareToken] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const ITEMS_PER_PAGE = 10;
  const [lessonHash, setLessonHash] = useState(null);

  const fetchLessonResults = async () => {
    try {
      const offset = page * ITEMS_PER_PAGE;
      const queryParams = new URLSearchParams({
        lesson_hash: lessonHash,
        limit: ITEMS_PER_PAGE,
        offset: offset
      });

      const response = await get(`/user-lessons/results?${queryParams}`);
      console.log('response', response.data);
      const { results, total, has_more } = response.data;
      
      if (page === 0) {
        setResults(results);
      } else {
        setResults(prev => [...prev, ...results]);
      }
      
      setTotalResults(total);
      setHasMore(has_more);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    // Get the part after the hash and parse it
    const hashString = window.location.hash.split('?')[1];
    const urlParams = new URLSearchParams(hashString);
    setLessonHash(urlParams.get('lesson_hash'));
  }, []);

  useEffect(() => {
    if (!lessonHash) {
      return;
    }
    setPage(0);
    setResults([]);
    setHasMore(true);
    fetchLessonResults();
  }, [lessonHash]);

  useEffect(() => {
    if (page > 0) {
      fetchLessonResults();
    }
  }, [page]);

  const handleShareClick = (result) => {
    setSelectedResult(result);
    setOpenShareDialog(true);
  };

  const handleShareToggle = async () => {
    if (!selectedResult) return;

    setIsUpdating(true);
    try {
      // Toggle the sharing status
      const newIsShared = !selectedResult.is_shared;
      const response = await put(
        `/user-lessons/results/${selectedResult.hash}/share?is_shared=${newIsShared}`
      );

      // If sharing is enabled, open the share page
      if (newIsShared && response.data.share_token) {
        const shareUrl = `/#/share/${response.data.share_token}`;
        window.open(shareUrl, '_self');
      }

      // Update the results list with the new sharing status
      setResults(results.map(result => 
        result.hash === selectedResult.hash 
          ? { ...result, is_shared: newIsShared }
          : result
      ));

    } catch (error) {
      console.error('Error toggling share status:', error);
    } finally {
      setIsUpdating(false);
      setOpenShareDialog(false);
    }
  };

  const handleOpenSharePage = async (resultHash) => {
    setIsLoadingShareToken(true);
    try {
      const response = await get(`/user-lessons/results/${resultHash}/share-token`);
      if (response.data.share_token) {
        const shareUrl = `/#/share/${response.data.share_token}`;
        window.open(shareUrl, '_self');
      }
    } catch (error) {
      console.error('Error fetching share token:', error);
    } finally {
      setIsLoadingShareToken(false);
    }
  };

  const BackButton = () => (
    <Box sx={{ mb: 3 }}>
      <IconButton 
        component="a" 
        href="/#/user-lessons"
        sx={{ ml: -1 }}
      >
        <ArrowBackIcon />
      </IconButton>
    </Box>
  );

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  if (error) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <BackButton />
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (results.length === 0) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <BackButton />
        <Alert severity="info">No results found for this lesson.</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <BackButton />
      <Grid container spacing={3}>
        {results.map(result => (
          <Grid item xs={12} key={result.hash}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="h5" component="h2" gutterBottom>
                    {result.user.full_name}
                  </Typography>
                  <Typography variant="h4" color="primary" gutterBottom>
                    Score: {result.score}
                  </Typography>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                  <Chip
                    icon={<ThumbUpIcon />}
                    label={`${result.likes} Likes`}
                    variant="outlined"
                  />
                  <Chip
                    icon={<CommentIcon />}
                    label={`${result.comments} Comments`}
                    variant="outlined"
                  />
                  <Chip
                    icon={<ShareIcon />}
                    label={result.is_shared ? 'Shared' : 'Not Shared'}
                    color={result.is_shared ? 'success' : 'default'}
                    variant="outlined"
                    onClick={() => handleShareClick(result)}
                    sx={{ cursor: 'pointer' }}
                  />
                </Stack>
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary">
                    Created: {new Date(result.created_at).toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Last Updated: {new Date(result.updated_at).toLocaleString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {hasMore && (
        <button 
          onClick={loadMore}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Load More
        </button>
      )}

      {/* Modified Share Dialog */}
      <Dialog
        open={openShareDialog}
        onClose={() => setOpenShareDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedResult?.is_shared ? 'Manage Sharing' : 'Share Result'}
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ mb: 2 }}>
            {selectedResult?.is_shared 
              ? 'This result is currently shared. You can open the share page or disable sharing.'
              : 'Share this result to let others see your progress. A new sharing page will open automatically.'}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button 
            onClick={() => setOpenShareDialog(false)}
            color="inherit"
          >
            Cancel
          </Button>
          
          {selectedResult?.is_shared && (
            <Button
              onClick={() => handleOpenSharePage(selectedResult.hash)}
              variant="contained"
              color="primary"
              disabled={isLoadingShareToken}
              startIcon={isLoadingShareToken ? <CircularProgress size={20} /> : <ShareIcon />}
            >
              Open Share Page
            </Button>
          )}

          <Button
            onClick={handleShareToggle}
            variant="contained"
            color={selectedResult?.is_shared ? 'error' : 'primary'}
            disabled={isUpdating}
            startIcon={isUpdating ? <CircularProgress size={20} /> : <ShareIcon />}
          >
            {selectedResult?.is_shared ? 'Disable Sharing' : 'Share Result'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default LessonResultsList;
