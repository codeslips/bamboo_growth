import React, { useState, useEffect } from 'react';
import { Typography, Button, Box, CircularProgress, Switch, FormControlLabel, TextField, Dialog, DialogContent, DialogActions } from '@mui/material';
import MarkdownEditor from '@uiw/react-markdown-editor';
import { EditorView } from '@codemirror/view';
import GeneratePage from './GeneratePage';
import { fetch_file, post_json, get } from '../../api/index';
import { useTranslation } from 'react-i18next';
import Markdown from '@uiw/react-markdown-preview';

const Page = ({
  pageHash,
  mode,
  pageType,
  setMarkdownContent,
  focusContent = false,
}) => {
  const { t } = useTranslation();
  const [isEditMode, setIsEditMode] = useState(false);
  const [showGeneratePage, setShowGeneratePage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (mode === 'edit') {
      setIsEditMode(true);
    } else {
      setIsEditMode(false);
    }
  }, [mode]);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      try {
        console.log('pageHash', pageHash);
        if (pageHash && pageHash !== '' && pageHash !== 'undefined') {
          try {
            const response = await get(`/pages/${pageHash}`);
            if (response && response.data.page_content) {
              setContent(response.data.page_content);
              setTitle(response.data.page_title);
              setDescription(response.data.page_description);
              if (setMarkdownContent) {
                setMarkdownContent(response.data.page_content);
              }
            } else {
              throw new Error('Invalid response from get_user_page API');
            }
          } catch (error) {
            console.error('Error fetching content:', error, error.response);
            if (error.response && error.response.status === 404) {
              // If page not found, create a new one
              const pageData = {
                page_hash: pageHash,
                page_title: '',
                page_content: "New page content",
                page_type: pageType, // Using one of the valid PAGE_TYPES from backend
                page_version: 'bamboo0.6',
                page_history: [{ content: "New page content", timestamp: new Date().toISOString() }]
              };

              const createResponse = await post_json('/pages', pageData);
              if (createResponse.data && createResponse.data.hash) {
                setContent("New page content");
                if (setMarkdownContent) {
                  setMarkdownContent("New page content");
                  setTitle("New page title");
                  setDescription("New page description");
                }
              } else {
                throw new Error('Failed to create new page');
              }
            } else {
              throw error;
            }
          }
        } else {
          setContent("No content found");
        }
      } catch (error) {
        console.error('Error fetching/creating content:', error);
        setContent("Error loading content");
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [pageHash]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const pageData = {
        page_title: title,
        page_content: content,
        page_description: description,
        page_type: 'lesson',
        page_version: 'bamboo0.6',
        page_history: [{ content: content, timestamp: new Date().toISOString() }]
      };

      let response;
      if (pageHash && pageHash !== '' && pageHash !== 'undefined') {
        response = await post_json(`/pages/${pageHash}`, pageData, 'PUT');
      } else {
        response = await post_json('/pages', pageData);
      }

      if (response.data && response.data.hash) {
        // Handle successful save
        console.log('Page saved successfully');
      }
    } catch (error) {
      console.error('Error saving page:', error);
      setSaveError('Failed to save the page. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNewContent = (newContent) => {
    setContent(newContent);
    setShowGeneratePage(false);
  };

  const toggleGeneratePage = () => {
    setShowGeneratePage(!showGeneratePage);
  };

  return (
    <Box>
      {isEditMode && !focusContent ? (
        <>
          <TextField
            fullWidth
            variant="outlined"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={{ mb: 2 }}
          />
          <TextField
            fullWidth
            variant="outlined"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            multiline
            rows={3}
            sx={{ mb: 2 }}
          />
        </>
      ) : (
        <>
          <Typography variant="h4" gutterBottom>
            {title}
          </Typography>
          <Typography variant="body1" paragraph>
            {description}
          </Typography>
        </>
      )}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          {isEditMode && (
            <>
              <Button
                variant="contained"
                color="primary"
                onClick={handleSave}
                disabled={isSaving}
                sx={{ ml: 2 }}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                onClick={toggleGeneratePage}
                sx={{ ml: 2 }}
              >
                Generate New Content
              </Button>
            </>
          )}
        </Box>
      </Box>
      {isLoading ? (
        <CircularProgress />
      ) : isEditMode ? (
        <MarkdownEditor
          value={content}
          onChange={setContent}
          height="300px"
          extensions={[EditorView.lineWrapping]}
        />
      ) : (
        <Box sx={{ border: '0.1px solid #e0e0e0', p: 2, mb: 3 }}>
          <Markdown source={content} />
        </Box>
      )}
      {saveError && (
        <Typography color="error" sx={{ mt: 2 }}>
          {saveError}
        </Typography>
      )}
      {showGeneratePage && (
        <Dialog
          fullScreen
          open={showGeneratePage}
          onClose={toggleGeneratePage}
        >
          <DialogContent>
            <GeneratePage onGenerateContent={handleNewContent} />
          </DialogContent>
          <DialogActions>
            <Button
              variant="outlined"
              color="secondary"
              onClick={toggleGeneratePage}
            >
              Cancel
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
};

export default Page;
