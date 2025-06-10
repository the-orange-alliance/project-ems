import React from 'react';
import { Col, Divider, Flex, Row, Space, Typography } from 'antd';

interface SettingsRowProps {
    title: string;
    inputComponent: React.ReactNode;
    noDivider?: boolean;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ title, inputComponent, noDivider }) => (
    <>        
        <Row style={{ margin: '0.5em 0' }} align="middle">
            <Col span={16}><Typography.Title level={4} style={{margin: 0}}>{title}</Typography.Title></Col>
            <Col span={8} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                {inputComponent}
            </Col>
        </Row>
        {!noDivider && <Divider />}
    </>
);

export default SettingsRow;