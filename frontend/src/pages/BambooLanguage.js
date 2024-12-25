import React from 'react';
import NavigationBar from '../components/NavigationBar.js';

const BambooLanguage = () => {
  // You should fetch or define the courses data here
  const courses = [
    { id: 1, name: 'Course 1' },
    { id: 2, name: 'Course 2' },
    // ... more courses
  ];

  return (
    <div className="bamboo-language">
      <NavigationBar />
      <h1>Welcome to Bamboo Language</h1>
      <ul>
        {courses.map(course => (
          <li key={course.id}>{course.name}</li>
        ))}
      </ul>
    </div>
  );
};

export default BambooLanguage;
