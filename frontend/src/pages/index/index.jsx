import React from 'react';
import { useNavigate } from 'react-router-dom';
import './index.scss';

function Index() {
  const navigate = useNavigate();
  
  const handleNavigate = () => {
    navigate('/course-list');
  };

  return (
    <div className='index'>
      <p>Hello World!</p>
      <div onClick={handleNavigate}>Go to Course List</div>
    </div>
  );
}

export default Index;
