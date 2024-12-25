import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  FormControlLabel,
  Switch,
  IconButton,
  Pagination,
} from '@mui/material';
import { Share as ShareIcon } from '@mui/icons-material';
import { alpha } from '@mui/material/styles';
import NoImage from '../../../resources/no-image.png';

const ResultsCards = ({ 
  results, 
  handleShareToggle, 
  setShareDialog,
  filters,
  handleFilterChange,
  pagination,
  handlePageChange
}) => {
  return (
    <>
      <Box sx={{ mb: 6, backgroundColor: 'background.paper', p: 3, borderRadius: 2, boxShadow: 1 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <FormControlLabel
              control={
                <Switch
                  checked={filters.is_shared === true}
                  onChange={(e) => handleFilterChange('is_shared', e.target.checked)}
                  color="primary"
                />
              }
              label="Shared Only"
              sx={{ '& .MuiTypography-root': { color: 'text.secondary' } }}
            />
          </Grid>
        </Grid>
      </Box>

      <Grid container spacing={3}>
        {results.map((result) => (
          <Grid item xs={12} sm={6} md={4} key={result.hash}>
            <Card sx={{ 
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
            }}>
              <CardContent sx={{ flexGrow: 1, p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {result.lesson?.title || 'Untitled Lesson'}
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box
                    component="img"
                    src={result.lesson?.thumbnail_path || NoImage}
                    alt={result.lesson?.title || 'Lesson thumbnail'}
                    sx={{
                      width: '100%',
                      height: 160,
                      objectFit: 'cover',
                      borderRadius: 1,
                      mb: 2
                    }}
                  />
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    mb: 2,
                    p: 1.5,
                    bgcolor: 'primary.light',
                    borderRadius: 1,
                    color: 'primary.contrastText'
                  }}>
                    <Typography variant="subtitle1" fontWeight="medium">
                      Score: {(result.score * 100).toFixed(1)}%
                    </Typography>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {new Date(result.created_at).toLocaleDateString()}
                    </Typography>
                  </Box>
                  {result.lesson?.lesson_type && (
                    <Typography variant="body2" color="text.secondary">
                      Type: {result.lesson.lesson_type}
                    </Typography>
                  )}
                  {result.lesson?.duration_minutes && (
                    <Typography variant="body2" color="text.secondary">
                      Duration: {result.lesson.duration_minutes} minutes
                    </Typography>
                  )}
                  {result.lesson?.created_by && (
                    <Typography variant="body2" color="text.secondary">
                      Created by: {result.lesson.created_by}
                    </Typography>
                  )}
                </Box>

                <Box sx={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mt: 2,
                  pt: 2,
                  borderTop: '1px solid',
                  borderColor: 'divider'
                }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={result.is_shared}
                        onChange={() => handleShareToggle(result)}
                        color="primary"
                      />
                    }
                    label="Share"
                  />
                  {result.is_shared && (
                    <IconButton 
                      onClick={() => setShareDialog({ open: true, result })}
                      color="primary"
                    >
                      <ShareIcon />
                    </IconButton>
                  )}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {results.length === 0 && (
        <Box sx={{ 
          mt: 4, 
          textAlign: 'center',
          py: 8,
          backgroundColor: 'background.paper',
          borderRadius: 2,
          boxShadow: 1
        }}>
          <Typography color="textSecondary">
            No learning results found
          </Typography>
        </Box>
      )}

      {results.length > 0 && (
        <Box sx={{ mt: 6, display: 'flex', justifyContent: 'center' }}>
          <Pagination
            count={Math.ceil(pagination.total / pagination.pageSize)}
            page={pagination.page}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </>
  );
};

export default ResultsCards;
