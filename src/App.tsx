import { useState } from 'react';
import { Button, DatePicker, version } from 'antd';
import './App.less';

function App() {
  return (
    <div>
      <h1>antd version: {version}</h1>
      <DatePicker />
      <Button type='primary' style={{ marginLeft: 8 }}>
        Primary Button
      </Button>
    </div>
  );
}

export default App;
