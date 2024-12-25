import React from 'react';
import { Container, Typography, List, ListItem } from '@mui/material';

const Rank = ({ rankings }) => {
  return (
    <Container>
      <Typography variant="h4">Rankings</Typography>
      <List>
        {rankings.map((rank, index) => (
          <ListItem key={index}>
            {rank.name}: {rank.score}
          </ListItem>
        ))}
      </List>
    </Container>
  );
};

export default Rank;