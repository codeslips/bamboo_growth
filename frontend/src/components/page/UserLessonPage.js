import React, { useEffect, useState } from 'react';
import Page from './Page';
import { Box, Paper, Container } from '@mui/material';
import Storage from '../../storage/index';

const UserLessonPage = ({
  lesson,
  studentHash,
  mode,
  setMarkdownContent,
  focusContent = false,
}) => {
    const [user, setUser] = useState(null);
    const [pageHash, setPageHash] = useState(null);
    const [student, setStudent] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            const userStr = await Storage.get('user');
            if (userStr) {
                const userData = JSON.parse(userStr);
                setUser(userData);
            }
        };
        loadUser();
    }, []);

    useEffect(() => {
        if (user && lesson) {
            if (studentHash) {
                setPageHash(studentHash + '-' + lesson.hash);
            } else {
                setPageHash(user.hash + '-' + lesson.hash);
            }
        }
    }, [user, lesson, studentHash]);

    return (
        <>
            {pageHash && (
                <Page
                    pageHash={pageHash}
                    mode={mode}
                    pageType={studentHash ? "user-student-lesson" : "user-lesson"}
                    focusContent={focusContent}
                    setMarkdownContent={setMarkdownContent}
                />
            )}
        </>
    );
};

export default UserLessonPage;
